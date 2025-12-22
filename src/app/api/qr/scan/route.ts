import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST - Record a QR code scan
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const {
      code,
      vendor_id,
      // Visitor tracking
      visitor_id,
      fingerprint_id,
      session_id,
      // Location
      latitude,
      longitude,
      city,
      region,
      country,
      // Device info
      user_agent,
      device_type,
      browser_name,
      os_name,
      // Marketing
      referrer,
      utm_source,
      utm_medium,
      utm_campaign
    } = body

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    // Get IP from headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Find the QR code
    let query = supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)

    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id)
    }

    const { data: qrCode, error: qrError } = await query.maybeSingle()

    if (qrError) {
      console.error('Error fetching QR code:', qrError)
      return NextResponse.json({ error: 'Failed to fetch QR code' }, { status: 500 })
    }

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
    }

    // Check if QR code is active
    if (!qrCode.is_active) {
      return NextResponse.json({
        error: 'QR code is inactive',
        qr_code: {
          id: qrCode.id,
          code: qrCode.code,
          type: qrCode.type,
          is_active: false
        }
      }, { status: 410 })
    }

    // Check expiration
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'QR code has expired',
        qr_code: {
          id: qrCode.id,
          code: qrCode.code,
          type: qrCode.type,
          expired: true
        }
      }, { status: 410 })
    }

    // Check max scans
    if (qrCode.max_scans && qrCode.total_scans >= qrCode.max_scans) {
      return NextResponse.json({
        error: 'QR code has reached maximum scans',
        qr_code: {
          id: qrCode.id,
          code: qrCode.code,
          type: qrCode.type,
          max_reached: true
        }
      }, { status: 410 })
    }

    // Check if this is a unique scan (by fingerprint or visitor_id)
    let isUnique = true
    if (fingerprint_id || visitor_id) {
      const { data: existingScan } = await supabase
        .from('qr_scans')
        .select('id')
        .eq('qr_code_id', qrCode.id)
        .or(`fingerprint_id.eq.${fingerprint_id || 'null'},visitor_id.eq.${visitor_id || 'null'}`)
        .limit(1)
        .maybeSingle()

      isUnique = !existingScan
    }

    // Create scan record
    const scanData: any = {
      qr_code_id: qrCode.id,
      vendor_id: qrCode.vendor_id,
      visitor_id,
      fingerprint_id,
      session_id,
      latitude,
      longitude,
      city,
      region,
      country,
      ip_address: ip,
      user_agent,
      device_type,
      browser_name,
      os_name,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      is_unique: isUnique,
      scanned_at: new Date().toISOString()
    }

    const { data: scan, error: scanError } = await supabase
      .from('qr_scans')
      .insert(scanData)
      .select()
      .single()

    if (scanError) {
      console.error('Error creating scan:', scanError)
      // Don't fail the request, just log it
    }

    // Update QR code scan counts
    const updateData: any = {
      total_scans: (qrCode.total_scans || 0) + 1,
      last_scanned_at: new Date().toISOString()
    }
    if (isUnique) {
      updateData.unique_scans = (qrCode.unique_scans || 0) + 1
    }

    await supabase
      .from('qr_codes')
      .update(updateData)
      .eq('id', qrCode.id)

    // Build landing page config from individual columns
    const landingPage = {
      title: qrCode.landing_page_title || qrCode.name,
      description: qrCode.landing_page_description || '',
      theme: qrCode.landing_page_theme || 'dark',
      image_url: qrCode.landing_page_image_url,
      cta_text: qrCode.landing_page_cta_text,
      cta_url: qrCode.landing_page_cta_url,
      show_product_info: qrCode.type === 'product',
      show_coa: qrCode.type === 'product',
      cta_buttons: qrCode.landing_page_cta_text ? [
        {
          label: qrCode.landing_page_cta_text,
          action: qrCode.landing_page_cta_url ? 'url' : 'coa',
          url: qrCode.landing_page_cta_url,
          style: 'primary'
        },
        {
          label: 'Shop Online',
          action: 'shop',
          style: 'secondary'
        }
      ] : [
        {
          label: 'Shop Online',
          action: 'shop',
          style: 'primary'
        }
      ]
    }

    // Return QR code data for landing page
    return NextResponse.json({
      success: true,
      scan_id: scan?.id || null,
      is_first_scan: isUnique,
      qr_code: {
        id: qrCode.id,
        code: qrCode.code,
        type: qrCode.type,
        name: qrCode.name,
        product_id: qrCode.product_id,
        order_id: qrCode.order_id,
        campaign_name: qrCode.campaign_name,
        landing_page: landingPage,
        // Sale-level tracking info (for display on landing page)
        sold_at: qrCode.sold_at,
        location_name: qrCode.location_name,
        location_id: qrCode.location_id
      }
    })
  } catch (err) {
    console.error('Error processing scan:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET - Fetch QR code without recording a scan (for previews)
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const vendorId = searchParams.get('vendor_id')

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  let query = supabase
    .from('qr_codes')
    .select('*')
    .eq('code', code)

  if (vendorId) {
    query = query.eq('vendor_id', vendorId)
  }

  const { data: qrCode, error } = await query.maybeSingle()

  if (error) {
    console.error('Error fetching QR code:', error)
    return NextResponse.json({ error: 'Failed to fetch QR code' }, { status: 500 })
  }

  if (!qrCode) {
    return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
  }

  // Build landing page config from individual columns
  const landingPage = {
    title: qrCode.landing_page_title || qrCode.name,
    description: qrCode.landing_page_description || '',
    theme: qrCode.landing_page_theme || 'dark',
    image_url: qrCode.landing_page_image_url,
    cta_text: qrCode.landing_page_cta_text,
    cta_url: qrCode.landing_page_cta_url,
    show_product_info: qrCode.type === 'product',
    show_coa: qrCode.type === 'product',
    cta_buttons: qrCode.landing_page_cta_text ? [
      {
        label: qrCode.landing_page_cta_text,
        action: qrCode.landing_page_cta_url ? 'url' : 'coa',
        url: qrCode.landing_page_cta_url,
        style: 'primary'
      },
      {
        label: 'Shop Online',
        action: 'shop',
        style: 'secondary'
      }
    ] : [
      {
        label: 'Shop Online',
        action: 'shop',
        style: 'primary'
      }
    ]
  }

  return NextResponse.json({
    success: true,
    qr_code: {
      id: qrCode.id,
      code: qrCode.code,
      type: qrCode.type,
      name: qrCode.name,
      product_id: qrCode.product_id,
      order_id: qrCode.order_id,
      campaign_name: qrCode.campaign_name,
      landing_page: landingPage,
      is_active: qrCode.is_active,
      total_scans: qrCode.total_scans,
      unique_scans: qrCode.unique_scans,
      // Sale-level tracking info
      sold_at: qrCode.sold_at,
      location_name: qrCode.location_name,
      location_id: qrCode.location_id
    }
  })
}
