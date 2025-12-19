import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/qr/ctas?qr_code_id=xxx&city=xxx&region=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const qrCodeId = searchParams.get('qr_code_id')
    const city = searchParams.get('city')
    const region = searchParams.get('region')

    if (!qrCodeId) {
      return NextResponse.json(
        { error: 'qr_code_id is required' },
        { status: 400 }
      )
    }

    // Use the smart filtering function to get active CTAs
    const { data, error } = await supabase.rpc('get_active_ctas_for_qr', {
      p_qr_code_id: qrCodeId,
      p_city: city || null,
      p_region: region || null,
      p_check_time: new Date().toISOString()
    })

    if (error) {
      console.error('Error fetching CTAs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch CTAs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ctas: data || [] })
  } catch (error) {
    console.error('Error in GET /api/qr/ctas:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/qr/ctas - Create new CTA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      qr_code_id,
      label,
      url,
      icon,
      style,
      color,
      type,
      category,
      thumbnail_url,
      description,
      requires_age_verification,
      compliance_warning,
      license_display,
      display_order,
      auto_reorder,
      is_featured,
      is_visible,
      active_from,
      active_until,
      active_days_of_week,
      active_hours_range,
      show_in_cities,
      hide_in_cities,
      show_in_regions
    } = body

    // Validate required fields
    if (!qr_code_id || !label || !url || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: qr_code_id, label, url, type' },
        { status: 400 }
      )
    }

    // Verify the QR code belongs to this vendor
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('vendor_id')
      .eq('id', qr_code_id)
      .single()

    if (qrError || !qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      )
    }

    // Insert the CTA
    const { data: cta, error } = await supabase
      .from('qr_code_ctas')
      .insert({
        qr_code_id,
        label,
        url,
        icon,
        style: style || 'primary',
        color,
        type,
        category,
        thumbnail_url,
        description,
        requires_age_verification: requires_age_verification || false,
        compliance_warning,
        license_display,
        display_order: display_order ?? 0,
        auto_reorder: auto_reorder || false,
        is_featured: is_featured || false,
        is_visible: is_visible ?? true,
        active_from,
        active_until,
        active_days_of_week,
        active_hours_range,
        show_in_cities,
        hide_in_cities,
        show_in_regions
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating CTA:', error)
      return NextResponse.json(
        { error: 'Failed to create CTA' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cta })
  } catch (error) {
    console.error('Error in POST /api/qr/ctas:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/qr/ctas - Update existing CTA
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'CTA id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: cta, error: ctaError } = await supabase
      .from('qr_code_ctas')
      .select('qr_code_id, qr_codes!inner(vendor_id)')
      .eq('id', id)
      .single()

    if (ctaError || !cta) {
      return NextResponse.json(
        { error: 'CTA not found' },
        { status: 404 }
      )
    }

    // Update the CTA
    const { data: updatedCta, error } = await supabase
      .from('qr_code_ctas')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating CTA:', error)
      return NextResponse.json(
        { error: 'Failed to update CTA' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cta: updatedCta })
  } catch (error) {
    console.error('Error in PATCH /api/qr/ctas:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/qr/ctas?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'CTA id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: cta, error: ctaError } = await supabase
      .from('qr_code_ctas')
      .select('qr_code_id, qr_codes!inner(vendor_id)')
      .eq('id', id)
      .single()

    if (ctaError || !cta) {
      return NextResponse.json(
        { error: 'CTA not found' },
        { status: 404 }
      )
    }

    // Delete the CTA
    const { error } = await supabase
      .from('qr_code_ctas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting CTA:', error)
      return NextResponse.json(
        { error: 'Failed to delete CTA' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/qr/ctas:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
