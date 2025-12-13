import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { EmailService } from '@/services/email.service'

/**
 * POST /api/users/invite
 *
 * Creates a new team member with proper Supabase Auth account.
 * Sends invitation email via Resend (not Supabase's built-in email).
 *
 * Flow:
 * 1. Create Supabase Auth user (without sending email)
 * 2. Generate magic link for password setup
 * 3. Create users table record with auth_user_id linked
 * 4. Send invitation email via Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendor_id,
      email,
      first_name,
      last_name,
      phone,
      role,
      employee_id,
    } = body

    // Validate required fields
    if (!vendor_id || !email || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: vendor_id, email, first_name, last_name, role' },
        { status: 400 }
      )
    }

    // Use server client with service role key for admin operations
    const supabase = createServerClient()

    // Check if email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Step 1: Try to create Supabase Auth user, or link to existing one
    let authUserId: string

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        vendor_id,
      },
    })

    if (authError) {
      // Check if user already exists in auth (e.g., customer account)
      if (authError.message?.includes('already been registered')) {
        console.log('[API] Auth user exists, looking up existing account...')

        // Query auth.users table directly using service role
        const { data: authUserData, error: queryError } = await supabase
          .from('auth.users')
          .select('id, email, raw_user_meta_data')
          .eq('email', email.toLowerCase())
          .single()

        // If direct query fails, try generating a recovery link to get user info
        if (queryError || !authUserData) {
          console.log('[API] Direct query failed, trying recovery link method...')

          // Generate recovery link - this will give us the user info
          const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email.toLowerCase(),
          })

          if (recoveryError || !recoveryData?.user) {
            console.error('[API] Failed to find existing user:', recoveryError)
            return NextResponse.json(
              { error: 'Email is registered but could not link account. The user can still log in with their existing password.' },
              { status: 409 }
            )
          }

          authUserId = recoveryData.user.id

          // Update their metadata
          await supabase.auth.admin.updateUserById(authUserId, {
            user_metadata: {
              ...recoveryData.user.user_metadata,
              first_name,
              last_name,
              role,
              vendor_id,
              is_staff: true,
            },
          })
        } else {
          // Use the ID from direct query
          authUserId = authUserData.id

          // Update their metadata to include staff role
          await supabase.auth.admin.updateUserById(authUserId, {
            user_metadata: {
              ...(authUserData.raw_user_meta_data || {}),
              first_name,
              last_name,
              role,
              vendor_id,
              is_staff: true,
            },
          })
        }

        console.log('[API] Converted existing customer to staff:', authUserId)
      } else {
        console.error('[API] Auth create error:', authError)
        return NextResponse.json(
          { error: `Failed to create auth account: ${authError.message}` },
          { status: 500 }
        )
      }
    } else {
      if (!authData.user) {
        return NextResponse.json(
          { error: 'Auth user creation returned no user data' },
          { status: 500 }
        )
      }
      authUserId = authData.user.id
    }

    // Step 2: Generate a recovery link for password setup
    // Redirects to floradistro.com password reset page
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: 'https://floradistro.com/reset-password',
      },
    })

    if (linkError) {
      console.error('[API] Generate link error:', linkError)
      // Don't fail - user is created, they can use "forgot password" flow
    }

    // Step 3: Create users table record with auth_user_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        vendor_id,
        auth_user_id: authUserId,
        email: email.toLowerCase(),
        first_name,
        last_name,
        phone: phone || null,
        role,
        employee_id: employee_id || null,
        status: 'active',
      })
      .select()
      .single()

    if (userError) {
      console.error('[API] User insert error:', userError)

      // Rollback: Delete the auth user only if we created it (not if it was existing)
      if (authData?.user) {
        await supabase.auth.admin.deleteUser(authUserId)
      }

      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 500 }
      )
    }

    // Step 4: Send invitation email via Resend (only for new users)
    const isExistingUser = !authData?.user // Was an existing customer account
    const loginUrl = 'https://floradistro.com/login'
    const magicLink = linkData?.properties?.action_link || loginUrl

    try {
      if (isExistingUser) {
        // Existing user - no email needed, they already have their password
        // Just log that we converted them
        console.log('[API] Existing customer converted to staff - no email sent (they have existing credentials)')
      } else {
        // New user - send password reset link so they can set their password
        const emailResult = await EmailService.send({
          to: email.toLowerCase(),
          toName: `${first_name} ${last_name}`,
          templateSlug: 'password_reset',
          vendorId: vendor_id,
          data: {
            customer_name: `${first_name} ${last_name}`,
            reset_url: magicLink,
          },
        })

        if (!emailResult.success) {
          console.error('[API] Email send failed:', emailResult.error)
        }
      }
    } catch (emailErr) {
      console.error('[API] Email error:', emailErr)
      // Don't fail - user is created
    }

    const message = isExistingUser
      ? `${email} has been added as staff. They can log in with their existing password.`
      : `Invitation sent to ${email}. They will receive an email to set up their account.`

    return NextResponse.json({
      success: true,
      user: userData,
      message,
    })

  } catch (err) {
    console.error('[API] Invite user error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/invite
 *
 * Deletes a user from both Supabase Auth and users table.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get the user to find their auth_user_id
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete from users table first
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Delete from Supabase Auth if auth_user_id exists
    if (user.auth_user_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        user.auth_user_id
      )

      if (authDeleteError) {
        console.error('[API] Auth delete error (user already removed from table):', authDeleteError)
      }
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[API] Delete user error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
