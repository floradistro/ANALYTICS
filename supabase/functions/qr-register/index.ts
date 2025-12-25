import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()

    // Accept both snake_case and camelCase
    const store_id = body.store_id || body.storeId
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

    // Sale-level tracking fields
    const customer_id = body.customer_id || body.customerId
    const staff_id = body.staff_id || body.staffId
    const sold_at = body.sold_at || body.soldAt
    const unit_price = body.unit_price || body.unitPrice
    const quantity_index = body.quantity_index || body.quantityIndex
    const location_name = body.location_name || body.locationName

    if (!store_id || !code || !name) {
      return new Response(
        JSON.stringify({ success: false, error: 'store_id, code, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if QR code already exists
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      // Return existing (idempotent)
      return new Response(
        JSON.stringify({
          success: true,
          qr_code: {
            id: existing.id,
            code: existing.code,
            name: name || existing.name,
            type: existing.type || type || 'product',
            destination_url: existing.destination_url,
            tracking_url: `https://floradistro.com/qr/${code}`
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine QR type from code prefix
    let qrType = type || 'product'
    if (!type) {
      if (code.startsWith('S')) qrType = 'sale'
      else if (code.startsWith('P')) qrType = 'product'
      else if (code.startsWith('O')) qrType = 'order'
      else if (code.startsWith('M') || code.startsWith('C')) qrType = 'marketing'
    }

    // Build QR code record
    const qrData: Record<string, unknown> = {
      store_id,
      code,
      name,
      type: qrType,
      destination_url: destination_url || `https://floradistro.com/qr/${code}`,
      is_active: true,
      total_scans: 0,
      unique_scans: 0,
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

    // Sale-level tracking fields
    if (customer_id) qrData.customer_id = customer_id
    if (staff_id) qrData.staff_id = staff_id
    if (sold_at) qrData.sold_at = sold_at
    if (unit_price !== undefined) qrData.unit_price = unit_price
    if (quantity_index !== undefined) qrData.quantity_index = quantity_index
    if (location_name) qrData.location_name = location_name

    const { data, error } = await supabase
      .from('qr_codes')
      .insert(qrData)
      .select()
      .single()

    if (error) {
      console.error('Error creating QR code:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create QR code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        qr_code: {
          id: data.id,
          code: data.code,
          name: data.name,
          type: data.type,
          destination_url: data.destination_url,
          tracking_url: `https://floradistro.com/qr/${code}`
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
