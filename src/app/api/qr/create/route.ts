import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST - Create a QR code (called by Swift app when printing labels)
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const {
      vendor_id,
      code,
      name,
      type,
      destination_url,
      product_id,
      order_id,
      location_id,
      campaign_name,
      // Landing page fields from Swift app
      landing_page_title,
      landing_page_description,
      landing_page_image_url,
      landing_page_cta_text,
      landing_page_cta_url,
      logo_url,
      brand_color,
      tags
    } = body

    if (!vendor_id || !code || !name) {
      return NextResponse.json(
        { success: false, error: 'vendor_id, code, and name are required' },
        { status: 400 }
      )
    }

    // Check if QR code already exists (code is globally unique)
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('id, code, name, type, destination_url')
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      // Return existing QR code (idempotent)
      return NextResponse.json({
        success: true,
        qr_code: {
          id: existing.id,
          code: existing.code,
          name,
          type: type || 'product',
          destination_url,
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
