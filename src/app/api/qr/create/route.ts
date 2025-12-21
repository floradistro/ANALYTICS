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

    // Check if QR code already exists
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('id, code')
      .eq('code', code)
      .eq('vendor_id', vendor_id)
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

    // Build landing page config
    const landingPage = buildLandingPage(qrType, {
      title: landing_page_title || name,
      description: landing_page_description,
      image_url: landing_page_image_url,
      cta_text: landing_page_cta_text,
      cta_url: landing_page_cta_url || destination_url
    })

    // Create QR code
    const qrData: any = {
      vendor_id,
      code,
      name,
      type: qrType,
      is_active: true,
      total_scans: 0,
      unique_scans: 0,
      landing_page: landingPage,
      created_at: new Date().toISOString()
    }

    if (product_id) qrData.product_id = product_id
    if (order_id) qrData.order_id = order_id
    if (campaign_name) qrData.campaign_name = campaign_name

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
        destination_url,
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

function buildLandingPage(type: string, config: {
  title?: string
  description?: string
  image_url?: string
  cta_text?: string
  cta_url?: string
}) {
  const baseConfig = {
    title: config.title || 'Welcome',
    description: config.description || '',
    theme: 'dark' as const,
    cta_buttons: [] as any[]
  }

  switch (type) {
    case 'product':
      return {
        ...baseConfig,
        show_product_info: true,
        show_coa: true,
        image_url: config.image_url,
        cta_buttons: [
          {
            label: config.cta_text || 'View Lab Results',
            action: config.cta_url ? 'url' : 'coa',
            url: config.cta_url,
            style: 'primary'
          },
          {
            label: 'Shop Online',
            action: 'shop',
            style: 'secondary'
          }
        ]
      }
    case 'order':
      return {
        ...baseConfig,
        show_order_status: true,
        show_tracking: true,
        cta_buttons: [
          {
            label: config.cta_text || 'Track Order',
            action: 'track',
            style: 'primary'
          },
          {
            label: 'Contact Support',
            action: 'support',
            style: 'secondary'
          }
        ]
      }
    case 'marketing':
    default:
      return {
        ...baseConfig,
        image_url: config.image_url,
        cta_buttons: config.cta_url ? [
          {
            label: config.cta_text || 'Learn More',
            action: 'url',
            url: config.cta_url,
            style: 'primary'
          }
        ] : []
      }
  }
}
