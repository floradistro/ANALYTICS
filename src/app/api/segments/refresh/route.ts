import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { segmentId } = await request.json()

    if (!segmentId) {
      return NextResponse.json({ error: 'segmentId required' }, { status: 400 })
    }

    // Fetch the segment
    const { data: segment, error: segmentError } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('id', segmentId)
      .single()

    if (segmentError || !segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const storeId = segment.store_id
    const criteria = segment.filter_criteria || {}
    let customerIds: string[] = []

    // Build query based on segment criteria
    let query = supabase
      .from('customers')
      .select('id')
      .eq('store_id', storeId)

    // VIP Customers - high spenders
    if (criteria.total_spent?.min) {
      query = query.gte('total_spent', criteria.total_spent.min)
    }

    // At Risk - days since last order
    if (criteria.days_since_last_order) {
      const minDays = criteria.days_since_last_order.min || 0
      const maxDays = criteria.days_since_last_order.max || 365
      const minDate = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString()
      const maxDate = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', minDate).lte('last_order_at', maxDate)
    }

    // New Customers - recent first order
    if (segment.name.toLowerCase().includes('new customer')) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('first_order_at', thirtyDaysAgo)
    }

    // Never Ordered
    if (segment.name.toLowerCase().includes('never ordered')) {
      query = query.is('first_order_at', null)
    }

    // Weekly Regulars - ordered in last 7 days
    if (segment.name.toLowerCase().includes('weekly') || segment.name.toLowerCase().includes('regular')) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('last_order_at', sevenDaysAgo)
    }

    // Category affinities (flower, vape, edibles, etc.)
    if (criteria.category_affinity) {
      // For category-based segments, we need to check order history
      // This would require a more complex query through order_items
      // For now, skip and use existing customer_count
    }

    const { data: customers } = await query.limit(10000)
    customerIds = (customers || []).map(c => c.id)

    // Clear old memberships
    await supabase
      .from('customer_segment_memberships')
      .delete()
      .eq('segment_id', segmentId)

    // Insert new memberships
    if (customerIds.length > 0) {
      const memberships = customerIds.map(customerId => ({
        segment_id: segmentId,
        customer_id: customerId,
        added_at: new Date().toISOString(),
      }))

      // Insert in batches
      const batchSize = 500
      for (let i = 0; i < memberships.length; i += batchSize) {
        const batch = memberships.slice(i, i + batchSize)
        await supabase.from('customer_segment_memberships').insert(batch)
      }
    }

    // Update segment count
    await supabase
      .from('customer_segments')
      .update({
        customer_count: customerIds.length,
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('id', segmentId)

    return NextResponse.json({
      success: true,
      customer_count: customerIds.length,
    })

  } catch (error) {
    console.error('Refresh segment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
