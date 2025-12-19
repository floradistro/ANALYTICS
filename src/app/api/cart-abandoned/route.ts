import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendor_id,
      visitor_id,
      fingerprint_id,
      cartItems,
      cartTotal,
      itemCount,
      email,
      phone,
      name,
      checkoutUrl,
    } = body

    if (!vendor_id || !visitor_id || !cartItems || !cartTotal) {
      return NextResponse.json(
        { error: 'vendor_id, visitor_id, cartItems, and cartTotal required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[Cart Abandoned API] Tracking abandoned cart:', {
      vendor_id,
      visitor_id,
      fingerprint_id,
      cartTotal,
      itemCount,
      hasEmail: !!email,
    })

    // Check if cart already exists for this visitor
    const { data: existing } = await supabase
      .from('abandoned_carts')
      .select('id, recovered')
      .eq('visitor_id', visitor_id)
      .eq('vendor_id', vendor_id)
      .eq('recovered', false)
      .order('abandoned_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      // Update existing abandoned cart
      const { error: updateError } = await supabase
        .from('abandoned_carts')
        .update({
          cart_items: cartItems,
          cart_total: cartTotal,
          item_count: itemCount,
          email: email || null,
          phone: phone || null,
          name: name || null,
          checkout_url: checkoutUrl || null,
          fingerprint_id: fingerprint_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[Cart Abandoned API] Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update cart' },
          { status: 500, headers: corsHeaders }
        )
      }

      console.log('[Cart Abandoned API] Updated existing cart')

      return NextResponse.json({
        success: true,
        cart_id: existing.id,
        updated: true,
      }, { headers: corsHeaders })
    }

    // Create new abandoned cart
    const { data, error: insertError } = await supabase
      .from('abandoned_carts')
      .insert({
        vendor_id,
        visitor_id,
        fingerprint_id: fingerprint_id || null,
        cart_items: cartItems,
        cart_total: cartTotal,
        item_count: itemCount,
        email: email || null,
        phone: phone || null,
        name: name || null,
        checkout_url: checkoutUrl || null,
        abandoned_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Cart Abandoned API] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to store cart' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('[Cart Abandoned API] Created new abandoned cart, ID:', data.id)

    return NextResponse.json({
      success: true,
      cart_id: data.id,
      created: true,
    }, { headers: corsHeaders })
  } catch (err) {
    console.error('[Cart Abandoned API] Error:', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET endpoint to retrieve abandoned carts
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const vendor_id = url.searchParams.get('vendor_id')
    const email = url.searchParams.get('email')
    const fingerprint_id = url.searchParams.get('fingerprint_id')

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'vendor_id required' },
        { status: 400, headers: corsHeaders }
      )
    }

    let query = supabase
      .from('abandoned_carts')
      .select('*')
      .eq('vendor_id', vendor_id)
      .eq('recovered', false)
      .order('abandoned_at', { ascending: false })

    if (email) {
      query = query.eq('email', email)
    } else if (fingerprint_id) {
      query = query.eq('fingerprint_id', fingerprint_id)
    }

    const { data, error } = await query.limit(10)

    if (error) {
      console.error('[Cart Abandoned API] Get error:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve carts' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      carts: data || [],
    }, { headers: corsHeaders })
  } catch (err) {
    console.error('[Cart Abandoned API] Get error:', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
