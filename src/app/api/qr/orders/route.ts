import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/qr/orders?qr_code_id=xxx
// Returns orders from customers who scanned this QR code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const qrCodeId = searchParams.get('qr_code_id')

    if (!qrCodeId) {
      return NextResponse.json(
        { error: 'qr_code_id is required' },
        { status: 400 }
      )
    }

    // Get fingerprint IDs of people who scanned this QR
    const { data: scans, error: scansError } = await supabase
      .from('qr_scans')
      .select('fingerprint_id')
      .eq('qr_code_id', qrCodeId)
      .not('fingerprint_id', 'is', null)

    if (scansError) {
      console.error('Error fetching scans:', scansError)
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      )
    }

    if (!scans || scans.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    const fingerprintIds = [...new Set(scans.map(s => s.fingerprint_id))]

    // Get orders from these fingerprints
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        created_at,
        status,
        customer_name,
        fingerprint_id
      `)
      .in('fingerprint_id', fingerprintIds)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Format orders for response
    const formattedOrders = (orders || []).map(order => ({
      order_id: order.id,
      order_number: order.order_number,
      total: order.total,
      created_at: order.created_at,
      status: order.status,
      customer_name: order.customer_name
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error) {
    console.error('Error in GET /api/qr/orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
