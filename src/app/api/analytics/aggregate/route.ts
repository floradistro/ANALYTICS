import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const storeId = url.searchParams.get('store_id')
  const startDate = url.searchParams.get('start')
  const endDate = url.searchParams.get('end')

  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const end = endDate || new Date().toISOString()

  try {
    // Run all aggregation queries in parallel
    const [
      visitorStats,
      pageViewStats,
      topPages,
      topReferrers,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      countryBreakdown,
      channelBreakdown,
      hourlyData,
      eventStats,
      checkoutStats,
      behavioralStats,
      realtimeCount,
      botStats,
      geoAccuracyStats,
    ] = await Promise.all([
      // Total visitors with unique counts
      supabase.rpc('get_visitor_stats', { p_store_id: storeId, p_start: start, p_end: end }),

      // Page view stats
      supabase.rpc('get_pageview_stats', { p_store_id: storeId, p_start: start, p_end: end }),

      // Top pages (aggregated)
      supabase
        .from('page_views')
        .select('page_url')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(pv => {
            try {
              const path = new URL(pv.page_url || '/').pathname
              counts[path] = (counts[path] || 0) + 1
            } catch {
              counts['/'] = (counts['/'] || 0) + 1
            }
          })
          return Object.entries(counts)
            .map(([page, views]) => ({ page, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 20)
        }),

      // Top referrers
      supabase
        .from('website_visitors')
        .select('referrer')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .not('referrer', 'is', null)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(v => {
            try {
              const domain = new URL(v.referrer).hostname.replace('www.', '')
              counts[domain] = (counts[domain] || 0) + 1
            } catch {}
          })
          return Object.entries(counts)
            .map(([referrer, count]) => ({ referrer, visitors: count }))
            .sort((a, b) => b.visitors - a.visitors)
            .slice(0, 15)
        }),

      // Device breakdown
      supabase
        .from('website_visitors')
        .select('device_type')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(v => {
            const device = v.device_type || 'unknown'
            counts[device] = (counts[device] || 0) + 1
          })
          const total = data.length
          return Object.entries(counts)
            .map(([device, count]) => ({
              device: device.charAt(0).toUpperCase() + device.slice(1),
              count,
              percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
        }),

      // Browser breakdown
      supabase
        .from('website_visitors')
        .select('browser')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(v => {
            const browser = v.browser || 'Unknown'
            counts[browser] = (counts[browser] || 0) + 1
          })
          const total = data.length
          return Object.entries(counts)
            .map(([browser, count]) => ({
              browser,
              count,
              percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        }),

      // OS breakdown
      supabase
        .from('website_visitors')
        .select('os')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(v => {
            const os = v.os || 'Unknown'
            counts[os] = (counts[os] || 0) + 1
          })
          const total = data.length
          return Object.entries(counts)
            .map(([os, count]) => ({
              os,
              count,
              percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        }),

      // Country breakdown
      supabase
        .from('website_visitors')
        .select('country')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(v => {
            const country = v.country || 'Unknown'
            counts[country] = (counts[country] || 0) + 1
          })
          const total = data.length
          return Object.entries(counts)
            .map(([country, count]) => ({
              country: country === 'US' ? 'United States' : country,
              count,
              percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        }),

      // Channel breakdown
      supabase
        .from('website_visitors')
        .select('channel')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const counts: Record<string, number> = {}
          data.forEach(v => {
            const channel = v.channel || 'direct'
            counts[channel] = (counts[channel] || 0) + 1
          })
          const total = data.length
          return Object.entries(counts)
            .map(([channel, count]) => ({
              channel: channel.charAt(0).toUpperCase() + channel.slice(1),
              count,
              percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
        }),

      // Hourly/daily data for charts
      supabase
        .from('page_views')
        .select('created_at')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return []
          const startD = new Date(start)
          const endD = new Date(end)
          const daysDiff = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24))
          const useHourly = daysDiff <= 3

          const counts: Record<string, number> = {}
          data.forEach(pv => {
            const date = new Date(pv.created_at)
            let key: string
            if (useHourly) {
              key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString()
            } else {
              key = date.toISOString().split('T')[0]
            }
            counts[key] = (counts[key] || 0) + 1
          })

          return Object.entries(counts)
            .map(([time, views]) => ({ time, views }))
            .sort((a, b) => a.time.localeCompare(b.time))
        }),

      // Event stats
      supabase
        .from('analytics_events')
        .select('event_name, revenue')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return { events: {}, totalRevenue: 0 }
          const events: Record<string, number> = {}
          let totalRevenue = 0
          data.forEach(e => {
            events[e.event_name] = (events[e.event_name] || 0) + 1
            if (e.revenue) totalRevenue += e.revenue
          })
          return { events, totalRevenue }
        }),

      // Checkout stats
      supabase
        .from('checkout_attempts')
        .select('status, total_amount')
        .eq('store_id', storeId)
        .eq('source', 'web')
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return { total: 0, approved: 0, declined: 0, failedRevenue: 0 }
          let approved = 0, declined = 0, failedRevenue = 0
          data.forEach(c => {
            if (c.status === 'approved') approved++
            else if (c.status === 'declined' || c.status === 'error') {
              declined++
              failedRevenue += c.total_amount || 0
            }
          })
          return { total: data.length, approved, declined, failedRevenue }
        }),

      // Behavioral stats (rage clicks, scroll depth, etc)
      supabase
        .from('behavioral_data')
        .select('data_type, data, page_path')
        .eq('store_id', storeId)
        .gte('collected_at', start)
        .lte('collected_at', end)
        .then(async ({ data }) => {
          if (!data) return { rageClicks: 0, avgScrollDepth: 0, totalClicks: 0, pagesWithData: 0 }

          let rageClicks = 0
          let totalScrollDepth = 0
          let scrollCount = 0
          let totalClicks = 0
          const pagesWithData = new Set<string>()

          data.forEach(d => {
            if (d.page_path) pagesWithData.add(d.page_path)

            if (d.data_type === 'rage' && Array.isArray(d.data)) {
              rageClicks += d.data.length
            }
            if (d.data_type === 'scroll' && d.data?.maxDepth) {
              totalScrollDepth += d.data.maxDepth
              scrollCount++
            }
            if (d.data_type === 'heatmap' && d.data?.clicks) {
              totalClicks += d.data.clicks.length
            }
          })

          return {
            rageClicks,
            avgScrollDepth: scrollCount > 0 ? Math.round(totalScrollDepth / scrollCount) : 0,
            totalClicks,
            pagesWithData: pagesWithData.size
          }
        }),

      // Realtime count (last 5 mins)
      supabase
        .from('website_visitors')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()),

      // Bot vs human stats
      supabase
        .from('website_visitors')
        .select('is_bot, has_js_execution, fingerprint_id')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return { total: 0, bots: 0, humans: 0, withFingerprint: 0, withJs: 0 }
          let bots = 0, humans = 0, withFingerprint = 0, withJs = 0
          data.forEach(v => {
            if (v.is_bot) bots++
            else humans++
            if (v.fingerprint_id) withFingerprint++
            if (v.has_js_execution) withJs++
          })
          return { total: data.length, bots, humans, withFingerprint, withJs }
        }),

      // Geo accuracy stats
      supabase
        .from('website_visitors')
        .select('geolocation_source')
        .eq('store_id', storeId)
        .gte('created_at', start)
        .lte('created_at', end)
        .then(async ({ data }) => {
          if (!data) return {}
          const counts: Record<string, number> = {}
          data.forEach(v => {
            const source = v.geolocation_source || 'unknown'
            counts[source] = (counts[source] || 0) + 1
          })
          return counts
        }),
    ])

    // Extract counts from RPC results or use fallback
    // RPC functions return an array (RETURNS TABLE), so extract the first row
    const visitorData = visitorStats.data?.[0] || { total: 0, unique_visitors: 0, unique_sessions: 0, returning_count: 0 }
    const pageViewData = pageViewStats.data?.[0] || { total: 0, bounced_sessions: 0, total_sessions: 0 }

    return NextResponse.json({
      visitors: {
        total: visitorData.total || 0,
        unique: visitorData.unique_visitors || 0,
        sessions: visitorData.unique_sessions || 0,
        returning: visitorData.returning_count || 0,
      },
      pageViews: {
        total: pageViewData.total || 0,
        bounceRate: pageViewData.total_sessions > 0
          ? (pageViewData.bounced_sessions / pageViewData.total_sessions) * 100
          : 0,
      },
      topPages,
      topReferrers,
      devices: deviceBreakdown,
      browsers: browserBreakdown,
      os: osBreakdown,
      countries: countryBreakdown,
      channels: channelBreakdown,
      timeSeries: hourlyData,
      events: eventStats,
      checkouts: checkoutStats,
      behavioral: behavioralStats,
      realtime: realtimeCount.count || 0,
      quality: {
        bots: botStats.bots || 0,
        humans: botStats.humans || 0,
        withFingerprint: botStats.withFingerprint || 0,
        withJs: botStats.withJs || 0,
        geoSources: geoAccuracyStats,
      },
    })
  } catch (error) {
    console.error('[Analytics Aggregate] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
