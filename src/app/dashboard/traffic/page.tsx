'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import {
  Users, Eye, MousePointer, Globe, Smartphone, Monitor, Laptop,
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, ArrowRight,
  Chrome, Share2, Mail, Search, Link2, Zap, Clock, MapPin,
  Activity, BarChart3, Target, Megaphone, RefreshCw, FileText
} from 'lucide-react'

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
  page_path: string | null
  page_url: string | null
  page_title: string | null
  session_id: string | null
  visitor_id: string | null
  referrer: string | null
  city: string | null
  region: string | null
  country: string | null
  device_type: string | null
  browser: string | null
  os: string | null
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

export default function WebAnalyticsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Raw data
  const [visitors, setVisitors] = useState<VisitorRecord[]>([])
  const [pageViews, setPageViews] = useState<PageViewRecord[]>([])
  const [events, setEvents] = useState<EventRecord[]>([])

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

      // Fetch current period page views
      const { data: pageViewData } = await supabase
        .from('page_views')
        .select('*')
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
      setPrevVisitors(prevVisitorData || [])
      setPrevPageViews(prevPageViewData || [])
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
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [fetchAnalytics])

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

  // Top pages
  const pageStats = pageViews.reduce((acc, pv) => {
    const path = pv.page_path || '/'
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

  // Daily trend for chart
  const dailyStats = pageViews.reduce((acc, pv) => {
    const date = new Date(pv.created_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const dailyData = Object.entries(dailyStats)
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Conversion stats
  const productViews = events.filter(e => e.event_name === 'view_product').length
  const addToCarts = events.filter(e => e.event_name === 'add_to_cart').length
  const purchases = events.filter(e => e.event_name === 'purchase')
  const totalRevenue = purchases.reduce((sum, p) => sum + (p.revenue || 0), 0)

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
        isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
      }`}>
        {isPositive ? '+' : ''}{value.toFixed(0)}%
      </span>
    )
  }

  if (isLoading && visitors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
          <h1 className="text-xl font-light text-white tracking-wide">Web Analytics</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-zinc-500 text-sm">floradistro.com</span>
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {realtimeVisitors} online
            </span>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors text-xs"
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

      {/* Traffic Chart */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <div className="h-48">
          {dailyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500">
              No traffic data available yet
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Y-axis labels */}
              <div className="flex-1 flex">
                <div className="w-12 flex flex-col justify-between text-right pr-3 text-xs text-zinc-600">
                  <span>{Math.max(...dailyData.map(d => d.views))}</span>
                  <span>{Math.round(Math.max(...dailyData.map(d => d.views)) / 2)}</span>
                  <span>0</span>
                </div>
                {/* Chart area */}
                <div className="flex-1 relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    <div className="border-t border-zinc-800/50" />
                    <div className="border-t border-zinc-800/50" />
                    <div className="border-t border-zinc-800/50" />
                  </div>
                  {/* Line chart */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(45, 212, 191)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(45, 212, 191)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {dailyData.length > 1 && (
                      <>
                        {/* Area fill */}
                        <path
                          d={`M 0 ${100} ${dailyData.map((d, i) => {
                            const x = (i / (dailyData.length - 1)) * 100
                            const maxViews = Math.max(...dailyData.map(d => d.views)) || 1
                            const y = 100 - (d.views / maxViews) * 100
                            return `L ${x} ${y}`
                          }).join(' ')} L 100 100 Z`}
                          fill="url(#chartGradient)"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Line */}
                        <path
                          d={`M ${dailyData.map((d, i) => {
                            const x = (i / (dailyData.length - 1)) * 100
                            const maxViews = Math.max(...dailyData.map(d => d.views)) || 1
                            const y = 100 - (d.views / maxViews) * 100
                            return `${x} ${y}`
                          }).join(' L ')}`}
                          fill="none"
                          stroke="rgb(45, 212, 191)"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      </>
                    )}
                  </svg>
                </div>
              </div>
              {/* X-axis labels */}
              <div className="flex ml-12 mt-2">
                {dailyData.filter((_, i) => i % Math.ceil(dailyData.length / 7) === 0).map((d) => (
                  <div key={d.date} className="flex-1 text-xs text-zinc-600">
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>
            </div>
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
                    <div className="h-1 bg-teal-500/30 flex-shrink-0" style={{
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

      {/* Conversion Metrics */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h3 className="text-sm font-light text-white mb-6 tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-teal-400" />
          E-commerce Conversion
        </h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-4 bg-zinc-900/50 border border-zinc-800">
            <Users className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
            <p className="text-2xl font-light text-white">{totalVisitors}</p>
            <p className="text-xs text-zinc-500 mt-1">Visitors</p>
          </div>
          <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30">
            <Eye className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-light text-white">{productViews}</p>
            <p className="text-xs text-zinc-500 mt-1">Product Views</p>
          </div>
          <div className="text-center p-4 bg-amber-500/10 border border-amber-500/30">
            <ShoppingCart className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-light text-white">{addToCarts}</p>
            <p className="text-xs text-zinc-500 mt-1">Add to Cart</p>
          </div>
          <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30">
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-light text-emerald-400">{purchases.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Purchases</p>
          </div>
          <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-light text-emerald-400">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-zinc-500 mt-1">Revenue</p>
          </div>
        </div>
      </div>
    </div>
  )
}
