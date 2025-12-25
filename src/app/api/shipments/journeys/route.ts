import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATE_CENTROIDS: Record<string, [number, number]> = {
  'AL': [32.8, -86.8], 'AK': [61.4, -152.4], 'AZ': [33.7, -111.4], 'AR': [35.0, -92.4],
  'CA': [36.1, -119.7], 'CO': [39.1, -105.3], 'CT': [41.6, -72.8], 'DE': [39.3, -75.5],
  'FL': [27.8, -81.7], 'GA': [33.0, -83.6], 'HI': [21.1, -157.5], 'ID': [44.2, -114.5],
  'IL': [40.3, -89.0], 'IN': [39.8, -86.3], 'IA': [42.0, -93.2], 'KS': [38.5, -96.7],
  'KY': [37.7, -84.7], 'LA': [31.2, -91.9], 'ME': [44.7, -69.4], 'MD': [39.1, -76.8],
  'MA': [42.2, -71.5], 'MI': [43.3, -84.5], 'MN': [45.7, -93.9], 'MS': [32.7, -89.7],
  'MO': [38.5, -92.3], 'MT': [46.9, -110.5], 'NE': [41.1, -98.3], 'NV': [38.3, -117.1],
  'NH': [43.5, -71.6], 'NJ': [40.3, -74.5], 'NM': [34.8, -106.2], 'NY': [42.2, -75.0],
  'NC': [35.6, -79.8], 'ND': [47.5, -99.8], 'OH': [40.4, -82.8], 'OK': [35.6, -96.9],
  'OR': [44.6, -122.1], 'PA': [40.6, -77.2], 'RI': [41.7, -71.5], 'SC': [33.9, -80.9],
  'SD': [44.3, -99.4], 'TN': [35.7, -86.7], 'TX': [31.1, -97.6], 'UT': [40.2, -111.9],
  'VT': [44.0, -72.7], 'VA': [37.8, -78.2], 'WA': [47.4, -121.5], 'WV': [38.5, -81.0],
  'WI': [44.3, -89.6], 'WY': [42.8, -107.3], 'DC': [38.9, -77.0],
}

function extractState(city: string): string | null {
  if (!city) return null
  const match = city.toUpperCase().match(/\b([A-Z]{2})\s+(DISTRIBUTION|NETWORK|PROCESSING|FACILITY)/)
  if (match && STATE_CENTROIDS[match[1]]) return match[1]
  const endMatch = city.toUpperCase().match(/\s([A-Z]{2})$/)
  if (endMatch && STATE_CENTROIDS[endMatch[1]]) return endMatch[1]
  return null
}

function getCoords(city: string, state: string, zip: string): [number, number] | null {
  if (state && STATE_CENTROIDS[state.toUpperCase()]) return STATE_CENTROIDS[state.toUpperCase()]
  const extracted = extractState(city)
  if (extracted) return STATE_CENTROIDS[extracted]
  return null
}

// Normalize tracking number (remove spaces)
function normalizeTracking(num: string | null): string {
  return (num || '').replace(/\s+/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('vendorId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!storeId) {
      return NextResponse.json({ error: 'Missing vendorId' }, { status: 400 })
    }

    // 1. Get all tracking data from shipment_tracking
    const { data: trackingData, error: trackingError } = await supabase
      .from('shipment_tracking')
      .select('*')
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (trackingError) {
      console.error('[Journeys] Tracking error:', trackingError)
      return NextResponse.json({ error: trackingError.message }, { status: 500 })
    }

    // 2. Get all shipping orders with customers
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id, order_number, subtotal, total_amount, created_at,
        tracking_number,
        shipping_name, shipping_address_line1, shipping_city, shipping_state, shipping_zip, shipping_phone,
        customer_id,
        customers (id, first_name, last_name, email, phone)
      `)
      .eq('store_id', storeId)
      .eq('order_type', 'shipping')
      .order('created_at', { ascending: false })
      .limit(200)

    console.log('[Journeys] Found', trackingData?.length || 0, 'tracking,', ordersData?.length || 0, 'orders')

    // Build order lookup by NORMALIZED tracking number
    const ordersByTracking = new Map<string, any>()
    for (const order of ordersData || []) {
      const normalized = normalizeTracking(order.tracking_number)
      if (normalized) {
        ordersByTracking.set(normalized, order)
      }
    }

    console.log('[Journeys] Orders with valid tracking:', ordersByTracking.size)

    const journeys: any[] = []

    for (const tracking of trackingData || []) {
      const events = tracking.events || []
      if (events.length < 2) continue

      const sorted = [...events].sort((a: any, b: any) =>
        new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime()
      )

      const points = sorted.map((e: any) => {
        const coords = getCoords(e.eventCity, e.eventState, e.eventZIPCode)
        return coords ? {
          lat: coords[0], lng: coords[1],
          city: e.eventCity, state: e.eventState, zip: e.eventZIPCode,
          timestamp: e.eventTimestamp, eventType: e.eventType
        } : null
      }).filter(Boolean)

      if (points.length < 2) continue

      // Match order by NORMALIZED tracking number
      const normalizedTracking = normalizeTracking(tracking.tracking_number)
      const order = ordersByTracking.get(normalizedTracking)
      const customer = order?.customers as any

      const customerName = customer
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : order?.shipping_name || ''

      const shippingAddress = order ? [
        order.shipping_address_line1,
        order.shipping_city,
        order.shipping_state,
        order.shipping_zip
      ].filter(Boolean).join(', ') : ''

      // Transit time
      let transitDays = 0
      if (sorted.length >= 2) {
        const start = new Date(sorted[0].eventTimestamp).getTime()
        const end = new Date(sorted[sorted.length - 1].eventTimestamp).getTime()
        transitDays = Math.round(((end - start) / (1000 * 60 * 60 * 24)) * 10) / 10
      }

      console.log(`[Journeys] ${tracking.tracking_number}: Order=${order?.order_number || 'none'}, Customer=${customerName || 'none'}`)

      journeys.push({
        trackingNumber: tracking.tracking_number,
        orderId: order?.id || null,
        orderNumber: order?.order_number || '',
        status: tracking.status,
        carrier: tracking.carrier || 'USPS',
        estimatedDelivery: tracking.estimated_delivery,
        points,
        origin: points[0],
        destination: points[points.length - 1],
        customerName,
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || order?.shipping_phone || '',
        shippingAddress,
        orderTotal: order?.total_amount || 0,
        orderSubtotal: order?.subtotal || 0,
        orderDate: order?.created_at || '',
        transitDays,
        transitHours: Math.round(transitDays * 24),
      })
    }

    console.log('[Journeys] Returning', journeys.length, 'journeys')

    return NextResponse.json({
      journeys,
      totalJourneys: journeys.length,
    })

  } catch (error) {
    console.error('Journeys error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
