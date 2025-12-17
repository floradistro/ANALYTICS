'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import {
  Users, Eye, Globe,
  TrendingUp, ShoppingCart, DollarSign,
  Target, RefreshCw, CreditCard, CheckCircle,
  XCircle, ArrowRight
} from 'lucide-react'
import { ResponsiveBar } from '@nivo/bar'
import { nivoTheme, colors, chartGradients } from '@/lib/theme'

interface VisitorRecord {
  id: string
  session_id: string
  visitor_id: string | null
  city: string | null
  region: string | null
  country: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  channel: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer: string | null
  is_returning: boolean
  created_at: string
}

interface PageViewRecord {
  id: string
  page_url: string | null
  page_title: string | null
  session_id: string | null
  visitor_id: string | null
  created_at: string
}

interface EventRecord {
  id: string
  event_name: string
  event_properties: any
  revenue: number | null
  city: string | null
  region: string | null
  channel: string | null
  utm_source: string | null
  utm_campaign: string | null
  device_type: string | null
  created_at: string
}

interface CheckoutAttemptRecord {
  id: string
  status: 'pending' | 'approved' | 'declined' | 'error' | 'fraud_review'
  total_amount: number
  processor_error_message?: string
  customer_error_message?: string
  payment_method?: string
  source?: string
  created_at: string
}

export default function WebAnalyticsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Raw data
  const [visitors, setVisitors] = useState<VisitorRecord[]>([])
  const [pageViews, setPageViews] = useState<PageViewRecord[]>([])
  const [events, setEvents] = useState<EventRecord[]>([])
  const [checkoutAttempts, setCheckoutAttempts] = useState<CheckoutAttemptRecord[]>([])

  // Previous period data for growth
  const [prevVisitors, setPrevVisitors] = useState<VisitorRecord[]>([])
  const [prevPageViews, setPrevPageViews] = useState<PageViewRecord[]>([])

  // Realtime stats
  const [realtimeVisitors, setRealtimeVisitors] = useState(0)

  const fetchAnalytics = useCallback(async () => {
    if (!vendorId) return
    setIsLoading(true)

    const { start, end, startDate, endDate } = getDateRangeForQuery()

    // Calculate previous period
    const periodMs = endDate.getTime() - startDate.getTime()
    const prevStart = new Date(startDate.getTime() - periodMs).toISOString()
    const prevEnd = startDate.toISOString()

    try {
      // Fetch current period visitors
      const { data: visitorData } = await supabase
        .from('website_visitors')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      // Fetch current period page views (only existing columns)
      const { data: pageViewData } = await supabase
        .from('page_views')
        .select('id,page_url,page_title,session_id,visitor_id,created_at')
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      // Fetch previous period for growth calculation
      const { data: prevVisitorData } = await supabase
        .from('website_visitors')
        .select('id')
        .eq('vendor_id', vendorId)
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd)

      const { data: prevPageViewData } = await supabase
        .from('page_views')
        .select('id')
        .eq('vendor_id', vendorId)
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd)

      // Fetch events
      const { data: eventData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      // Fetch checkout attempts (e-commerce only for funnel)
      const { data: checkoutData } = await supabase
        .from('checkout_attempts')
        .select('id, status, total_amount, processor_error_message, customer_error_message, payment_method, source, created_at')
        .eq('vendor_id', vendorId)
        .eq('source', 'web') // Only e-commerce checkouts
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      // Realtime visitors (last 5 minutes for "online" count)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: realtimeData } = await supabase
        .from('website_visitors')
        .select('id')
        .eq('vendor_id', vendorId)
        .gte('created_at', fiveMinsAgo)

      setVisitors(visitorData || [])
      setPageViews(pageViewData || [])
      setEvents(eventData || [])
      setCheckoutAttempts(checkoutData || [])
      setPrevVisitors(prevVisitorData as VisitorRecord[] || [])
      setPrevPageViews(prevPageViewData as PageViewRecord[] || [])
      setRealtimeVisitors(realtimeData?.length || 0)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [vendorId, dateRange])

  useEffect(() => {
    fetchAnalytics()
    // Poll every 10 seconds for near-realtime updates
    const interval = setInterval(fetchAnalytics, 10000)
    return () => clearInterval(interval)
  }, [fetchAnalytics])

  // Supabase realtime subscription for instant event updates
  useEffect(() => {
    if (!vendorId) return

    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => {
          console.log('[Realtime] New event:', payload.new)
          // Add new event to state immediately
          setEvents((prev) => [payload.new as EventRecord, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'website_visitors',
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => {
          console.log('[Realtime] New visitor:', payload.new)
          setVisitors((prev) => [payload.new as VisitorRecord, ...prev])
          setRealtimeVisitors((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'page_views',
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => {
          console.log('[Realtime] New page view:', payload.new)
          setPageViews((prev) => [payload.new as PageViewRecord, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [vendorId])

  // Calculate metrics
  const totalVisitors = visitors.length
  const totalPageViews = pageViews.length
  const uniqueSessions = new Set(visitors.map(v => v.session_id)).size

  // Growth calculations
  const visitorGrowth = prevVisitors.length > 0
    ? ((totalVisitors - prevVisitors.length) / prevVisitors.length) * 100
    : 0
  const pageViewGrowth = prevPageViews.length > 0
    ? ((totalPageViews - prevPageViews.length) / prevPageViews.length) * 100
    : 0

  // Bounce rate: sessions with only 1 page view
  const sessionPageCounts = pageViews.reduce((acc, pv) => {
    if (pv.session_id) {
      acc[pv.session_id] = (acc[pv.session_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  const totalSessions = Object.keys(sessionPageCounts).length
  const bouncedSessions = Object.values(sessionPageCounts).filter(c => c === 1).length
  const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0

  // Top pages - derive path from page_url
  const pageStats = pageViews.reduce((acc, pv) => {
    let path = '/'
    if (pv.page_url) {
      try {
        path = new URL(pv.page_url).pathname
      } catch {
        path = '/'
      }
    }
    acc[path] = (acc[path] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topPages = Object.entries(pageStats)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Referrers
  const referrerStats = visitors.reduce((acc, v) => {
    if (v.referrer) {
      try {
        const url = new URL(v.referrer)
        const domain = url.hostname.replace('www.', '')
        acc[domain] = (acc[domain] || 0) + 1
      } catch {
        // Skip invalid URLs
      }
    }
    return acc
  }, {} as Record<string, number>)

  const topReferrers = Object.entries(referrerStats)
    .map(([referrer, count]) => ({ referrer, visitors: count }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 8)

  // Countries
  const countryStats = visitors.reduce((acc, v) => {
    const country = v.country || 'Unknown'
    acc[country] = (acc[country] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const countryData = Object.entries(countryStats)
    .map(([country, count]) => ({
      country: country === 'US' ? 'United States' : country,
      visitors: count,
      percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5)

  // Device breakdown
  const deviceStats = visitors.reduce((acc, v) => {
    const device = v.device_type || 'unknown'
    acc[device] = (acc[device] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const deviceData = Object.entries(deviceStats)
    .map(([device, count]) => ({
      device: device.charAt(0).toUpperCase() + device.slice(1),
      visitors: count,
      percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
    }))
    .sort((a, b) => b.visitors - a.visitors)

  // Browser breakdown
  const browserStats = visitors.reduce((acc, v) => {
    const browser = v.browser || 'Unknown'
    acc[browser] = (acc[browser] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const browserData = Object.entries(browserStats)
    .map(([browser, count]) => ({
      browser,
      visitors: count,
      percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
    }))
    .sort((a, b) => b.visitors - a.visitors)

  // OS breakdown
  const osStats = visitors.reduce((acc, v) => {
    const os = v.os || 'Unknown'
    acc[os] = (acc[os] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const osData = Object.entries(osStats)
    .map(([os, count]) => ({
      os,
      visitors: count,
      percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0
    }))
    .sort((a, b) => b.visitors - a.visitors)

  // Hourly trend for chart (like Vercel)
  const hourlyStats = pageViews.reduce((acc, pv) => {
    const date = new Date(pv.created_at)
    // Round down to the hour
    const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString()
    acc[hourKey] = (acc[hourKey] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Fill in missing hours for a continuous chart
  const { startDate, endDate } = getDateRangeForQuery()
  const hourlyData: { hour: string; views: number; [key: string]: string | number }[] = []

  // For ranges > 7 days, show daily instead of hourly
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const showHourly = daysDiff <= 7

  if (showHourly) {
    // Generate all hours in the range
    const current = new Date(startDate)
    current.setMinutes(0, 0, 0)
    while (current <= endDate) {
      const hourKey = current.toISOString()
      hourlyData.push({
        hour: hourKey,
        views: hourlyStats[hourKey] || 0
      })
      current.setHours(current.getHours() + 1)
    }
  } else {
    // Fall back to daily for longer ranges
    const dailyStats = pageViews.reduce((acc, pv) => {
      const date = new Date(pv.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(dailyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, views]) => {
        hourlyData.push({ hour: date, views })
      })
  }

  // Conversion stats
  const productViews = events.filter(e => e.event_name === 'view_product').length
  const addToCarts = events.filter(e => e.event_name === 'add_to_cart').length
  const beginCheckouts = events.filter(e => e.event_name === 'begin_checkout' || e.event_name === 'checkout_started').length
  const purchases = events.filter(e => e.event_name === 'purchase')
  const totalRevenue = purchases.reduce((sum, p) => sum + (p.revenue || 0), 0)

  // Checkout attempt stats (from checkout_attempts table)
  const totalCheckoutAttempts = checkoutAttempts.length
  const successfulCheckouts = checkoutAttempts.filter(c => c.status === 'approved').length
  const failedCheckouts = checkoutAttempts.filter(c => c.status === 'declined' || c.status === 'error').length
  const pendingCheckouts = checkoutAttempts.filter(c => c.status === 'pending' || c.status === 'fraud_review').length
  const checkoutSuccessRate = totalCheckoutAttempts > 0
    ? (successfulCheckouts / totalCheckoutAttempts) * 100
    : 0
  const failedCheckoutRevenue = checkoutAttempts
    .filter(c => c.status === 'declined' || c.status === 'error')
    .reduce((sum, c) => sum + (c.total_amount || 0), 0)

  const formatNumber = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const GrowthBadge = ({ value }: { value: number }) => {
    if (value === 0) return null
    const isPositive = value > 0
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
        isPositive ? 'bg-slate-700/50 text-slate-300' : 'bg-zinc-700/50 text-zinc-400'
      }`}>
        {isPositive ? '+' : ''}{value.toFixed(0)}%
      </span>
    )
  }

  if (isLoading && visitors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light text-zinc-100 tracking-wide">Web Analytics</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-zinc-500 text-sm">floradistro.com</span>
            <span className="flex items-center gap-1.5 text-slate-400 text-sm">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
              {realtimeVisitors} online
            </span>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors text-xs rounded-sm"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Key Metrics - Vercel Style */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Visitors</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white">{formatNumber(totalVisitors)}</span>
            <GrowthBadge value={visitorGrowth} />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Page Views</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white">{formatNumber(totalPageViews)}</span>
            <GrowthBadge value={pageViewGrowth} />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Bounce Rate</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-light text-white">{bounceRate.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Traffic Chart - Vercel Style Hourly Bar Chart */}
      <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
        <h3 className="text-xs text-zinc-200 mb-4 tracking-wide uppercase">Page Views Over Time</h3>
        <div className="h-48">
          {hourlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600">
              No traffic data available yet
            </div>
          ) : (
            <ResponsiveBar
              data={hourlyData}
              keys={['views']}
              indexBy="hour"
              theme={nivoTheme}
              margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
              padding={0.4}
              colors={['url(#barGradient)']}
              borderRadius={6}
              enableGridX={false}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 12,
                tickRotation: 0,
                format: (value) => {
                  const date = new Date(String(value))
                  if (showHourly) {
                    const hour = date.getHours()
                    if (hour === 0) {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    return ''
                  }
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                },
                tickValues: showHourly
                  ? hourlyData.filter((_, i) => i % 24 === 0).map(d => d.hour)
                  : undefined,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 12,
                tickValues: 5,
              }}
              enableLabel={false}
              defs={[
                {
                  id: 'barGradient',
                  type: 'linearGradient',
                  colors: [
                    { offset: 0, color: '#cbd5e1', opacity: 0.95 },
                    { offset: 100, color: '#64748b', opacity: 0.7 },
                  ],
                },
              ]}
              fill={[{ match: '*', id: 'barGradient' }]}
              tooltip={({ data, value }) => (
                <div
                  style={{
                    background: 'rgba(24, 24, 27, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${colors.chart.tooltip.border}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div className="text-xs text-zinc-400 mb-1.5">
                    {showHourly
                      ? new Date(String(data.hour)).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      : new Date(String(data.hour)).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                    }
                  </div>
                  <div className="text-base font-medium text-white">
                    {value.toLocaleString()} <span className="text-zinc-400 text-sm font-normal">views</span>
                  </div>
                </div>
              )}
              animate={true}
              motionConfig="gentle"
            />
          )}
        </div>
      </div>

      {/* Pages and Referrers - Vercel Style */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pages */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="flex items-center gap-4 mb-4 border-b border-zinc-800 pb-3">
            <span className="text-sm text-white">Pages</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-3">
            <span>Page</span>
            <span>Visitors</span>
          </div>
          <div className="space-y-2">
            {topPages.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">No page data yet</div>
            ) : (
              topPages.map((page) => (
                <div key={page.page} className="flex items-center justify-between py-2 group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-1 bg-slate-500/40 flex-shrink-0" style={{
                      width: `${(page.views / topPages[0].views) * 60}%`,
                      minWidth: '4px'
                    }} />
                    <span className="text-sm text-zinc-300 truncate">{page.page}</span>
                  </div>
                  <span className="text-sm text-white ml-4">{formatNumber(page.views)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Referrers */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="flex items-center gap-4 mb-4 border-b border-zinc-800 pb-3">
            <span className="text-sm text-white">Referrers</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-3">
            <span>Source</span>
            <span>Visitors</span>
          </div>
          <div className="space-y-2">
            {topReferrers.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">No referrer data yet</div>
            ) : (
              topReferrers.map((ref) => (
                <div key={ref.referrer} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-300">{ref.referrer}</span>
                  </div>
                  <span className="text-sm text-white">{ref.visitors}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Countries, Devices, Browsers, OS - Vercel Style */}
      <div className="grid grid-cols-4 gap-4">
        {/* Countries */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Countries</div>
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-3">
            <span></span>
            <span>Visitors</span>
          </div>
          <div className="space-y-2">
            {countryData.map((c) => (
              <div key={c.country} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-300">{c.country}</span>
                <span className="text-sm text-zinc-400">
                  {c.percentage < 1 ? '<0.5%' : `${c.percentage.toFixed(0)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Devices</div>
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-3">
            <span></span>
            <span>Visitors</span>
          </div>
          <div className="space-y-2">
            {deviceData.map((d) => (
              <div key={d.device} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-300">{d.device}</span>
                <span className="text-sm text-zinc-400">{d.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browsers */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Browsers</div>
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-3">
            <span></span>
            <span>Visitors</span>
          </div>
          <div className="space-y-2">
            {browserData.slice(0, 5).map((b) => (
              <div key={b.browser} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-300">{b.browser}</span>
                <span className="text-sm text-zinc-400">{b.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Systems */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Operating Systems</div>
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-3">
            <span></span>
            <span>Visitors</span>
          </div>
          <div className="space-y-2">
            {osData.slice(0, 5).map((o) => (
              <div key={o.os} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-300">{o.os}</span>
                <span className="text-sm text-zinc-400">{o.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
        <h3 className="text-sm font-light text-zinc-200 mb-4 tracking-wide uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live Activity Feed
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {(() => {
            // Combine events and key page views into a single feed
            // Prioritize events over page views, dedupe by path
            const seenPaths = new Set<string>()
            const recentPageViews = pageViews
              .slice(0, 50)
              .filter(pv => {
                try {
                  const path = new URL(pv.page_url || '').pathname
                  // Skip duplicate paths and common pages
                  if (seenPaths.has(path)) return false
                  seenPaths.add(path)
                  return true
                } catch {
                  return false
                }
              })
              .slice(0, 8)

            const combined = [
              ...recentPageViews.map(pv => ({
                id: pv.id,
                type: 'page_view' as const,
                label: (() => {
                  try {
                    return new URL(pv.page_url || '').pathname
                  } catch {
                    return pv.page_url || '/'
                  }
                })(),
                time: new Date(pv.created_at),
                revenue: null,
              })),
              ...events.slice(0, 10).map(ev => ({
                id: ev.id,
                type: ev.event_name as string,
                label: ev.event_properties?.productName || ev.event_properties?.product_name || '',
                time: new Date(ev.created_at),
                revenue: ev.revenue,
              })),
            ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10)

            if (combined.length === 0) {
              return <p className="text-zinc-500 text-sm text-center py-4">Waiting for activity...</p>
            }

            return combined.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-3 bg-zinc-900/50 border border-zinc-800/50 rounded-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    item.type === 'purchase' ? 'bg-green-900/50 text-green-400' :
                    item.type === 'add_to_cart' ? 'bg-blue-900/50 text-blue-400' :
                    item.type === 'view_product' ? 'bg-purple-900/50 text-purple-400' :
                    item.type === 'page_view' ? 'bg-zinc-800 text-zinc-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-zinc-400 truncate max-w-[200px]">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {item.revenue && (
                    <span className="text-sm text-green-400">${item.revenue.toFixed(2)}</span>
                  )}
                  <span className="text-xs text-zinc-600">
                    {item.time.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Checkout Conversion Funnel */}
      <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
        <h3 className="text-sm font-light text-zinc-200 mb-6 tracking-wide uppercase flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-400" />
          Checkout Conversion Funnel
        </h3>

        {/* Visual Funnel */}
        <div className="flex items-center justify-between gap-2 mb-8">
          {/* Stage 1: Visitors */}
          <div className="flex-1 text-center">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-4">
              <Users className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
              <p className="text-2xl font-light text-white">{formatNumber(totalVisitors)}</p>
              <p className="text-xs text-zinc-500 mt-1">Visitors</p>
            </div>
            {totalVisitors > 0 && productViews > 0 && (
              <p className="text-xs text-zinc-600 mt-2">
                {((productViews / totalVisitors) * 100).toFixed(1)}%
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />

          {/* Stage 2: Product Views */}
          <div className="flex-1 text-center">
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-sm p-4">
              <Eye className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-2xl font-light text-white">{formatNumber(productViews)}</p>
              <p className="text-xs text-zinc-500 mt-1">Product Views</p>
            </div>
            {productViews > 0 && addToCarts > 0 && (
              <p className="text-xs text-zinc-600 mt-2">
                {((addToCarts / productViews) * 100).toFixed(1)}%
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />

          {/* Stage 3: Add to Cart */}
          <div className="flex-1 text-center">
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-sm p-4">
              <ShoppingCart className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-2xl font-light text-white">{formatNumber(addToCarts)}</p>
              <p className="text-xs text-zinc-500 mt-1">Add to Cart</p>
            </div>
            {addToCarts > 0 && totalCheckoutAttempts > 0 && (
              <p className="text-xs text-zinc-600 mt-2">
                {((totalCheckoutAttempts / addToCarts) * 100).toFixed(1)}%
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />

          {/* Stage 4: Checkout Attempts */}
          <div className="flex-1 text-center">
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-sm p-4">
              <CreditCard className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-2xl font-light text-white">{formatNumber(totalCheckoutAttempts)}</p>
              <p className="text-xs text-zinc-500 mt-1">Checkout Attempts</p>
            </div>
            {totalCheckoutAttempts > 0 && (
              <p className="text-xs text-zinc-600 mt-2">
                {checkoutSuccessRate.toFixed(1)}% success
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />

          {/* Stage 5: Successful Purchases */}
          <div className="flex-1 text-center">
            <div className="bg-green-900/20 border border-green-800/50 rounded-sm p-4">
              <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-light text-green-300">{formatNumber(successfulCheckouts)}</p>
              <p className="text-xs text-zinc-500 mt-1">Completed</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-zinc-800/50">
          <div className="text-center p-3 bg-zinc-900/30 rounded-sm">
            <p className="text-lg font-light text-white">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-zinc-500">Total Revenue</p>
          </div>
          <div className="text-center p-3 bg-zinc-900/30 rounded-sm">
            <p className="text-lg font-light text-white">
              {totalVisitors > 0 ? ((successfulCheckouts / totalVisitors) * 100).toFixed(2) : '0'}%
            </p>
            <p className="text-xs text-zinc-500">Overall Conversion</p>
          </div>
          <div className="text-center p-3 bg-red-900/20 rounded-sm">
            <p className="text-lg font-light text-red-300">{failedCheckouts}</p>
            <p className="text-xs text-zinc-500">Failed Checkouts</p>
          </div>
          <div className="text-center p-3 bg-red-900/20 rounded-sm">
            <p className="text-lg font-light text-red-300">{formatCurrency(failedCheckoutRevenue)}</p>
            <p className="text-xs text-zinc-500">Lost Revenue</p>
          </div>
        </div>

        {/* Failed Checkout Breakdown (if any) */}
        {failedCheckouts > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800/50">
            <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <XCircle className="w-3 h-3 text-red-400" />
              Recent Failed Checkouts
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {checkoutAttempts
                .filter(c => c.status === 'declined' || c.status === 'error')
                .slice(0, 5)
                .map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between py-2 px-3 bg-red-900/10 border border-red-900/30 rounded-sm text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        attempt.status === 'declined' ? 'bg-red-900/50 text-red-300' : 'bg-orange-900/50 text-orange-300'
                      }`}>
                        {attempt.status}
                      </span>
                      <span className="text-zinc-400 truncate max-w-[200px]">
                        {attempt.customer_error_message || attempt.processor_error_message || 'Payment failed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-300">${(attempt.total_amount || 0).toFixed(2)}</span>
                      <span className="text-xs text-zinc-600">
                        {new Date(attempt.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
