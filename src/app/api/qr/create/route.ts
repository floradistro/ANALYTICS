import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST - Create a QR code (called by Swift app when printing labels)
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()

    // Accept both snake_case and camelCase (Swift sends camelCase)
    const vendor_id = body.vendor_id || body.vendorId
    const code = body.code
    const name = body.name
    const type = body.type
    const destination_url = body.destination_url || body.destinationUrl
    const product_id = body.product_id || body.productId
    const order_id = body.order_id || body.orderId
    const location_id = body.location_id || body.locationId
    const campaign_name = body.campaign_name || body.campaignName
    const landing_page_title = body.landing_page_title || body.landingPageTitle
    const landing_page_description = body.landing_page_description || body.landingPageDescription
    const landing_page_image_url = body.landing_page_image_url || body.landingPageImageUrl
    const landing_page_cta_text = body.landing_page_cta_text || body.landingPageCtaText
    const landing_page_cta_url = body.landing_page_cta_url || body.landingPageCtaUrl
    const logo_url = body.logo_url || body.logoUrl
    const brand_color = body.brand_color || body.brandColor
    const tags = body.tags

    if (!vendor_id || !code || !name) {
      return NextResponse.json(
        { success: false, error: 'vendor_id, code, and name are required' },
        { status: 400 }
      )
    }

    // Check if QR code already exists (code is globally unique)
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      // If existing QR is missing product_id but we have one now, update it
      if (product_id && !existing.product_id) {
        const updates: any = { product_id }
        if (landing_page_title) updates.landing_page_title = landing_page_title
        if (landing_page_description) updates.landing_page_description = landing_page_description
        if (landing_page_image_url) updates.landing_page_image_url = landing_page_image_url
        if (landing_page_cta_text) updates.landing_page_cta_text = landing_page_cta_text
        if (landing_page_cta_url) updates.landing_page_cta_url = landing_page_cta_url
        if (name && name !== existing.name) updates.name = name

        await supabase
          .from('qr_codes')
          .update(updates)
          .eq('id', existing.id)
      }

      // Return existing QR code (idempotent)
      return NextResponse.json({
        success: true,
        qr_code: {
          id: existing.id,
          code: existing.code,
          name: name || existing.name,
          type: existing.type || type || 'product',
          destination_url: existing.destination_url,
          tracking_url: `https://floradistro.com/qr/${code}`
        }
      })
    }

    // Determine QR type from code prefix or provided type
    let qrType = type || 'product'
    if (!type) {
      if (code.startsWith('P')) qrType = 'product'
      else if (code.startsWith('O')) qrType = 'order'
      else if (code.startsWith('M') || code.startsWith('C')) qrType = 'marketing'
    }

    // Create QR code with existing table structure
    const qrData: any = {
      vendor_id,
      code,
      name,
      type: qrType,
      destination_url: destination_url || `https://floradistro.com/qr/${code}`,
      is_active: true,
      total_scans: 0,
      unique_scans: 0,
      // Landing page individual columns
      landing_page_title: landing_page_title || name,
      landing_page_description: landing_page_description || null,
      landing_page_image_url: landing_page_image_url || null,
      landing_page_cta_text: landing_page_cta_text || (qrType === 'product' ? 'View Lab Results' : 'Learn More'),
      landing_page_cta_url: landing_page_cta_url || destination_url || null,
      landing_page_theme: 'dark',
      logo_url: logo_url || null,
      brand_color: brand_color || null,
      created_at: new Date().toISOString()
    }

    if (product_id) qrData.product_id = product_id
    if (order_id) qrData.order_id = order_id
    if (location_id) qrData.location_id = location_id
    if (campaign_name) qrData.campaign_name = campaign_name
    if (tags) qrData.tags = tags

    const { data, error } = await supabase
      .from('qr_codes')
      .insert(qrData)
      .select()
      .single()

    if (error) {
      console.error('Error creating QR code:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create QR code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      qr_code: {
        id: data.id,
        code: data.code,
        name: data.name,
        type: data.type,
        destination_url: data.destination_url,
        tracking_url: `https://floradistro.com/qr/${code}`
      }
    })
  } catch (err) {
    console.error('Error parsing request:', err)
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
