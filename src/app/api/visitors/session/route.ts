import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const vendorId = searchParams.get('vendorId')

    if (!sessionId || !vendorId) {
      return NextResponse.json({ error: 'Missing sessionId or vendorId' }, { status: 400 })
    }

    // Fetch page views for this session
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('id, page_url, page_title, created_at')
      .eq('vendor_id', vendorId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50)

    // Fetch events for this session
    const { data: events } = await supabase
      .from('analytics_events')
      .select('id, event_name, event_properties, revenue, created_at')
      .eq('vendor_id', vendorId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50)

    // Parse page views into clean format
    const pages = (pageViews || []).map(pv => {
      let path = '/'
      try {
        path = new URL(pv.page_url || '').pathname
      } catch {}
      return {
        id: pv.id,
        path,
        title: pv.page_title || path,
        timestamp: pv.created_at,
      }
    })

    // Parse events into clean format
    const actions = (events || []).map(ev => ({
      id: ev.id,
      type: ev.event_name,
      data: ev.event_properties || {},
      revenue: ev.revenue,
      timestamp: ev.created_at,
    }))

    // Build timeline combining pages and events
    const timeline = [
      ...pages.map(p => ({ ...p, kind: 'page' as const })),
      ...actions.map(a => ({ ...a, kind: 'event' as const })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Calculate summary stats
    const totalPageViews = pages.length
    const totalEvents = actions.length
    const productViews = actions.filter(a => a.type === 'view_product').length
    const addToCarts = actions.filter(a => a.type === 'add_to_cart').length
    const purchases = actions.filter(a => a.type === 'purchase')
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.revenue || 0), 0)

    // Session duration (first to last activity)
    let sessionDurationMinutes = 0
    if (timeline.length >= 2) {
      const first = new Date(timeline[0].timestamp).getTime()
      const last = new Date(timeline[timeline.length - 1].timestamp).getTime()
      sessionDurationMinutes = Math.round((last - first) / 60000)
    }

    // Unique pages visited
    const uniquePages = new Set(pages.map(p => p.path)).size

    return NextResponse.json({
      sessionId,
      summary: {
        totalPageViews,
        uniquePages,
        totalEvents,
        productViews,
        addToCarts,
        purchases: purchases.length,
        totalRevenue,
        sessionDurationMinutes,
        converted: purchases.length > 0,
      },
      timeline,
      pages,
      events: actions,
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
