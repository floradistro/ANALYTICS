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

    // Step 1: Create Supabase Auth user WITHOUT sending email
    // We'll send our own email via Resend
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true, // Auto-confirm email so they can log in after setting password
      user_metadata: {
        first_name,
        last_name,
        role,
        vendor_id,
      },
    })

    if (authError) {
      console.error('[API] Auth create error:', authError)

      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please contact support.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: `Failed to create auth account: ${authError.message}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Auth user creation returned no user data' },
        { status: 500 }
      )
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
        auth_user_id: authData.user.id,
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

      // Rollback: Delete the auth user we just created
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 500 }
      )
    }

    // Step 4: Send invitation email via Resend
    const magicLink = linkData?.properties?.action_link || `${appUrl}/login`

    try {
      // Use password_reset template (exists in edge function) for team invites
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
        // Don't fail the request - user is created, they can use "forgot password"
      }
    } catch (emailErr) {
      console.error('[API] Email error:', emailErr)
      // Don't fail - user is created
    }

    return NextResponse.json({
      success: true,
      user: userData,
      message: `Invitation sent to ${email}. They will receive an email to set up their account.`,
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
