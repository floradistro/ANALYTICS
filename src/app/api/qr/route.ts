import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// QR Code Types
export type QRCodeType = 'product' | 'order' | 'marketing'

// GET - List QR codes with optional filtering
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const vendorId = searchParams.get('vendor_id')
  const type = searchParams.get('type') as QRCodeType | null
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id is required' }, { status: 400 })
  }

  let query = supabase
    .from('qr_codes')
    .select('*', { count: 'exact' })
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching QR codes:', error)
    return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
  }

  // Build landing_page objects for each QR code
  const qrCodesWithLanding = (data || []).map((row: any) => ({
    ...row,
    landing_page: buildLandingPageFromRow(row)
  }))

  return NextResponse.json({
    success: true,
    qr_codes: qrCodesWithLanding,
    total: count || 0,
    limit,
    offset
  })
}

// POST - Create a new QR code
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const {
      vendor_id,
      type,
      name,
      // Type-specific fields
      product_id,
      order_id,
      campaign_name,
      // Landing page configuration (will be converted to individual columns)
      landing_page
    } = body

    if (!vendor_id || !type || !name) {
      return NextResponse.json(
        { error: 'vendor_id, type, and name are required' },
        { status: 400 }
      )
    }

    if (!['product', 'order', 'marketing'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be product, order, or marketing' },
        { status: 400 }
      )
    }

    // Generate a short unique code
    const prefix = type === 'product' ? 'P' : type === 'order' ? 'O' : 'M'
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase()
    const code = `${prefix}${randomPart}`

    // Get default landing page config
    const defaultLanding = getDefaultLandingPage(type)
    const lp = landing_page || defaultLanding

    const qrData: any = {
      vendor_id,
      code,
      type,
      name,
      is_active: true,
      total_scans: 0,
      unique_scans: 0,
      destination_url: `https://floradistro.com/qr/${code}`,
      // Landing page individual columns
      landing_page_title: lp.title || name,
      landing_page_description: lp.description || null,
      landing_page_image_url: lp.image_url || null,
      landing_page_cta_text: lp.cta_buttons?.[0]?.label || null,
      landing_page_cta_url: lp.cta_buttons?.[0]?.url || null,
      landing_page_theme: lp.theme || 'dark',
      created_at: new Date().toISOString()
    }

    // Add type-specific fields
    if (type === 'product' && product_id) {
      qrData.product_id = product_id
    }
    if (type === 'order' && order_id) {
      qrData.order_id = order_id
    }
    if (campaign_name) {
      qrData.campaign_name = campaign_name
    }

    const { data, error } = await supabase
      .from('qr_codes')
      .insert(qrData)
      .select()
      .single()

    if (error) {
      console.error('Error creating QR code:', error)
      return NextResponse.json({ error: 'Failed to create QR code' }, { status: 500 })
    }

    // Build landing_page object for response
    const responseData = {
      ...data,
      landing_page: buildLandingPageFromRow(data)
    }

    return NextResponse.json({ success: true, qr_code: responseData })
  } catch (err) {
    console.error('Error parsing request:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH - Update a QR code
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { id, vendor_id, landing_page, ...updates } = body

    if (!id || !vendor_id) {
      return NextResponse.json(
        { error: 'id and vendor_id are required' },
        { status: 400 }
      )
    }

    // Build updates object
    const dbUpdates: Record<string, any> = {}

    // Handle simple fields
    const allowedFields = ['name', 'is_active', 'campaign_name', 'expires_at', 'max_scans']
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        dbUpdates[field] = updates[field]
      }
    }

    // Handle landing_page object - convert to individual columns
    if (landing_page) {
      if (landing_page.title !== undefined) dbUpdates.landing_page_title = landing_page.title
      if (landing_page.description !== undefined) dbUpdates.landing_page_description = landing_page.description
      if (landing_page.image_url !== undefined) dbUpdates.landing_page_image_url = landing_page.image_url
      if (landing_page.theme !== undefined) dbUpdates.landing_page_theme = landing_page.theme
      // Extract CTA from buttons array
      if (landing_page.cta_buttons && landing_page.cta_buttons.length > 0) {
        const primaryBtn = landing_page.cta_buttons[0]
        dbUpdates.landing_page_cta_text = primaryBtn.label || null
        dbUpdates.landing_page_cta_url = primaryBtn.url || null
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    dbUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('qr_codes')
      .update(dbUpdates)
      .eq('id', id)
      .eq('vendor_id', vendor_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating QR code:', error)
      return NextResponse.json({ error: 'Failed to update QR code' }, { status: 500 })
    }

    // Build landing_page object for response
    const responseData = {
      ...data,
      landing_page: buildLandingPageFromRow(data)
    }

    return NextResponse.json({ success: true, qr_code: responseData })
  } catch (err) {
    console.error('Error parsing request:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE - Delete a QR code
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const id = searchParams.get('id')
  const vendorId = searchParams.get('vendor_id')

  if (!id || !vendorId) {
    return NextResponse.json(
      { error: 'id and vendor_id are required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', id)
    .eq('vendor_id', vendorId)

  if (error) {
    console.error('Error deleting QR code:', error)
    return NextResponse.json({ error: 'Failed to delete QR code' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Build landing_page object from database row (individual columns)
function buildLandingPageFromRow(row: any) {
  const type = row.type || 'product'
  const defaultConfig = getDefaultLandingPage(type)

  // Build CTA buttons based on stored values
  const ctaButtons: any[] = []

  if (row.landing_page_cta_text) {
    ctaButtons.push({
      label: row.landing_page_cta_text,
      action: row.landing_page_cta_url ? 'url' : (type === 'product' ? 'coa' : 'url'),
      url: row.landing_page_cta_url || undefined,
      style: 'primary'
    })
  }

  // Add default secondary button based on type
  if (type === 'product') {
    ctaButtons.push({ label: 'Shop Online', action: 'shop', style: 'secondary' })
  } else if (type === 'order') {
    ctaButtons.push({ label: 'Contact Support', action: 'support', style: 'secondary' })
  }

  // If no buttons were added, use defaults
  if (ctaButtons.length === 0) {
    ctaButtons.push(...defaultConfig.cta_buttons)
  }

  return {
    title: row.landing_page_title || row.name || defaultConfig.title,
    description: row.landing_page_description || defaultConfig.description,
    theme: row.landing_page_theme || 'dark',
    image_url: row.landing_page_image_url || undefined,
    show_product_info: type === 'product',
    show_coa: type === 'product',
    show_order_status: type === 'order',
    show_tracking: type === 'order',
    cta_buttons: ctaButtons
  }
}

// Default landing page configurations by type
function getDefaultLandingPage(type: QRCodeType) {
  switch (type) {
    case 'product':
      return {
        title: 'Product Details',
        description: 'View product information and lab results',
        show_product_info: true,
        show_coa: true,
        cta_buttons: [
          { label: 'View Lab Results', action: 'coa', style: 'primary' },
          { label: 'Shop Online', action: 'shop', style: 'secondary' }
        ],
        theme: 'dark'
      }
    case 'order':
      return {
        title: 'Order Status',
        description: 'Track your order',
        show_order_status: true,
        show_tracking: true,
        cta_buttons: [
          { label: 'Track Order', action: 'track', style: 'primary' },
          { label: 'Contact Support', action: 'support', style: 'secondary' }
        ],
        theme: 'dark'
      }
    case 'marketing':
      return {
        title: 'Welcome',
        description: 'Thanks for scanning!',
        custom_content: '',
        cta_buttons: [
          { label: 'Learn More', action: 'url', url: '', style: 'primary' }
        ],
        theme: 'dark'
      }
  }
}
