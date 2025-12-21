'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { getDateRangeForQuery } from '@/lib/date-utils'
import {
  Users, Eye, Globe, TrendingUp, ShoppingCart, DollarSign,
  Target, RefreshCw, CreditCard, CheckCircle, XCircle, ArrowRight,
  MousePointer, Scroll, AlertTriangle, Fingerprint, Bot, UserCheck,
  Monitor, Smartphone, Tablet, MapPin, Activity, Zap, Clock
} from 'lucide-react'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { nivoTheme, colors } from '@/lib/theme'

interface AnalyticsData {
  visitors: {
    total: number
    unique: number
    sessions: number
    returning: number
  }
  pageViews: {
    total: number
    bounceRate: number
  }
  topPages: Array<{ page: string; views: number }>
  topReferrers: Array<{ referrer: string; visitors: number }>
  devices: Array<{ device: string; count: number; percentage: number }>
  browsers: Array<{ browser: string; count: number; percentage: number }>
  os: Array<{ os: string; count: number; percentage: number }>
  countries: Array<{ country: string; count: number; percentage: number }>
  channels: Array<{ channel: string; count: number; percentage: number }>
  timeSeries: Array<{ time: string; views: number }>
  events: { events: Record<string, number>; totalRevenue: number }
  checkouts: { total: number; approved: number; declined: number; failedRevenue: number }
  behavioral: { rageClicks: number; avgScrollDepth: number; totalClicks: number; pagesWithData: number }
  realtime: number
  quality: {
    bots: number
    humans: number
    withFingerprint: number
    withJs: number
    geoSources: Record<string, number>
  }
}

export default function WebAnalyticsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'quality'>('overview')

  const fetchAnalytics = useCallback(async () => {
    if (!vendorId) return
    setIsLoading(true)
    setError(null)

    const { start, end } = getDateRangeForQuery()

    try {
      const response = await fetch(
        `/api/analytics/aggregate?vendor_id=${vendorId}&start=${start}&end=${end}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }, [vendorId, dateRange])

  useEffect(() => {
    fetchAnalytics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [fetchAnalytics])

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button onClick={fetchAnalytics} className="mt-4 text-sm text-zinc-400 hover:text-white">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const conversionRate = data.visitors.total > 0
    ? ((data.checkouts.approved / data.visitors.total) * 100).toFixed(2)
    : '0'

  const checkoutSuccessRate = data.checkouts.total > 0
    ? ((data.checkouts.approved / data.checkouts.total) * 100).toFixed(1)
    : '0'

  const humanRate = data.quality.humans + data.quality.bots > 0
    ? ((data.quality.humans / (data.quality.humans + data.quality.bots)) * 100).toFixed(1)
    : '100'

  const fingerprintRate = data.quality.humans > 0
    ? ((data.quality.withFingerprint / data.quality.humans) * 100).toFixed(1)
    : '0'

  // Prepare time series data for Nivo
  const lineData = [{
    id: 'views',
    data: data.timeSeries.map(d => ({
      x: d.time,
      y: d.views
    }))
  }]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light text-zinc-100 tracking-wide">Web Analytics</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-zinc-500 text-sm">floradistro.com</span>
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {data.realtime} online now
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-sm">
            {(['overview', 'behavior', 'quality'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
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
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Users className="w-3.5 h-3.5" />
                Visitors
              </div>
              <div className="text-3xl font-light text-white">{formatNumber(data.visitors.total)}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {formatNumber(data.visitors.unique)} unique
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Eye className="w-3.5 h-3.5" />
                Page Views
              </div>
              <div className="text-3xl font-light text-white">{formatNumber(data.pageViews.total)}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {(data.pageViews.total / Math.max(data.visitors.sessions, 1)).toFixed(1)} per session
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Bounce Rate
              </div>
              <div className="text-3xl font-light text-white">{data.pageViews.bounceRate.toFixed(0)}%</div>
              <div className="text-xs text-zinc-500 mt-1">
                {data.visitors.sessions} sessions
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Target className="w-3.5 h-3.5" />
                Conversion
              </div>
              <div className="text-3xl font-light text-white">{conversionRate}%</div>
              <div className="text-xs text-zinc-500 mt-1">
                {data.checkouts.approved} purchases
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                Revenue
              </div>
              <div className="text-3xl font-light text-white">{formatCurrency(data.events.totalRevenue)}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {formatCurrency(data.checkouts.failedRevenue)} lost
              </div>
            </div>
          </div>

          {/* Traffic Chart */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
            <h3 className="text-xs text-zinc-400 mb-4 tracking-wide uppercase">Traffic Over Time</h3>
            <div className="h-64">
              {data.timeSeries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600">
                  No traffic data available
                </div>
              ) : (
                <ResponsiveLine
                  data={lineData}
                  theme={nivoTheme}
                  margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  curve="monotoneX"
                  enableArea={true}
                  areaBaselineValue={0}
                  areaOpacity={0.15}
                  colors={['#64748b']}
                  lineWidth={2}
                  pointSize={0}
                  enableGridX={false}
                  enableGridY={true}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 12,
                    tickRotation: -45,
                    format: (value) => {
                      const date = new Date(String(value))
                      if (isNaN(date.getTime())) return value
                      if (String(value).includes('T')) {
                        return date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
                      }
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    },
                    tickValues: data.timeSeries.length > 20
                      ? data.timeSeries.filter((_, i) => i % Math.ceil(data.timeSeries.length / 10) === 0).map(d => d.time)
                      : undefined
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 12,
                    tickValues: 5,
                  }}
                  useMesh={true}
                  tooltip={({ point }) => (
                    <div className="bg-zinc-900/95 border border-zinc-700 rounded px-3 py-2 text-sm">
                      <div className="text-zinc-400 text-xs">{String(point.data.xFormatted)}</div>
                      <div className="text-white font-medium">{point.data.y.toLocaleString()} views</div>
                    </div>
                  )}
                />
              )}
            </div>
          </div>

          {/* Pages, Referrers, Channels */}
          <div className="grid grid-cols-3 gap-4">
            {/* Top Pages */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Top Pages</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.topPages.slice(0, 15).map((page, i) => (
                  <div key={page.page} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                      <div className="h-1 bg-slate-500/40" style={{
                        width: `${(page.views / data.topPages[0].views) * 40}%`,
                        minWidth: '4px'
                      }} />
                      <span className="text-sm text-zinc-300 truncate">{page.page}</span>
                    </div>
                    <span className="text-sm text-white ml-2">{formatNumber(page.views)}</span>
                  </div>
                ))}
                {data.topPages.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Referrers */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Top Referrers</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.topReferrers.slice(0, 15).map((ref) => (
                  <div key={ref.referrer} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-sm text-zinc-300 truncate max-w-[150px]">{ref.referrer}</span>
                    </div>
                    <span className="text-sm text-white">{formatNumber(ref.visitors)}</span>
                  </div>
                ))}
                {data.topReferrers.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 text-sm">No referrer data</div>
                )}
              </div>
            </div>

            {/* Channels */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Traffic Channels</h3>
              <div className="space-y-3">
                {data.channels.map((ch) => (
                  <div key={ch.channel}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{ch.channel}</span>
                      <span className="text-sm text-zinc-500">{ch.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-500 to-slate-400"
                        style={{ width: `${ch.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Devices & Geography */}
          <div className="grid grid-cols-4 gap-4">
            {/* Devices */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Devices</h3>
              <div className="space-y-3">
                {data.devices.map((d) => (
                  <div key={d.device} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {d.device.toLowerCase() === 'mobile' && <Smartphone className="w-4 h-4 text-zinc-500" />}
                      {d.device.toLowerCase() === 'desktop' && <Monitor className="w-4 h-4 text-zinc-500" />}
                      {d.device.toLowerCase() === 'tablet' && <Tablet className="w-4 h-4 text-zinc-500" />}
                      <span className="text-sm text-zinc-300">{d.device}</span>
                    </div>
                    <span className="text-sm text-zinc-400">{d.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Browsers */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Browsers</h3>
              <div className="space-y-2">
                {data.browsers.slice(0, 6).map((b) => (
                  <div key={b.browser} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{b.browser}</span>
                    <span className="text-sm text-zinc-400">{b.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OS */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Operating Systems</h3>
              <div className="space-y-2">
                {data.os.slice(0, 6).map((o) => (
                  <div key={o.os} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{o.os}</span>
                    <span className="text-sm text-zinc-400">{o.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Countries */}
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Countries</h3>
              <div className="space-y-2">
                {data.countries.slice(0, 6).map((c) => (
                  <div key={c.country} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{c.country}</span>
                    <span className="text-sm text-zinc-400">{c.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-sm">
            <h3 className="text-sm text-zinc-200 mb-6 tracking-wide uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400" />
              Conversion Funnel
            </h3>

            <div className="flex items-center justify-between gap-2">
              {/* Visitors */}
              <div className="flex-1 text-center">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-4">
                  <Users className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
                  <p className="text-2xl font-light text-white">{formatNumber(data.visitors.total)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Visitors</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700" />

              {/* Product Views */}
              <div className="flex-1 text-center">
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-sm p-4">
                  <Eye className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                  <p className="text-2xl font-light text-white">{formatNumber(data.events.events.view_product || 0)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Product Views</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700" />

              {/* Add to Cart */}
              <div className="flex-1 text-center">
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-sm p-4">
                  <ShoppingCart className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                  <p className="text-2xl font-light text-white">{formatNumber(data.events.events.add_to_cart || 0)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Add to Cart</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700" />

              {/* Checkouts */}
              <div className="flex-1 text-center">
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-sm p-4">
                  <CreditCard className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                  <p className="text-2xl font-light text-white">{formatNumber(data.checkouts.total)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Checkouts</p>
                </div>
                <p className="text-xs text-zinc-600 mt-2">{checkoutSuccessRate}% success</p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700" />

              {/* Completed */}
              <div className="flex-1 text-center">
                <div className="bg-green-900/20 border border-green-800/50 rounded-sm p-4">
                  <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-light text-green-300">{formatNumber(data.checkouts.approved)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Completed</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-800/50">
              <div className="text-center p-3 bg-zinc-900/30 rounded-sm">
                <p className="text-lg font-light text-white">{formatCurrency(data.events.totalRevenue)}</p>
                <p className="text-xs text-zinc-500">Total Revenue</p>
              </div>
              <div className="text-center p-3 bg-zinc-900/30 rounded-sm">
                <p className="text-lg font-light text-white">{conversionRate}%</p>
                <p className="text-xs text-zinc-500">Overall Conversion</p>
              </div>
              <div className="text-center p-3 bg-red-900/20 rounded-sm">
                <p className="text-lg font-light text-red-300">{formatCurrency(data.checkouts.failedRevenue)}</p>
                <p className="text-xs text-zinc-500">Lost to Failed Checkouts</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'behavior' && (
        <>
          {/* Behavioral Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <MousePointer className="w-3.5 h-3.5" />
                Total Clicks
              </div>
              <div className="text-3xl font-light text-white">{formatNumber(data.behavioral.totalClicks)}</div>
              <div className="text-xs text-zinc-500 mt-1">tracked interactions</div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Scroll className="w-3.5 h-3.5" />
                Avg Scroll Depth
              </div>
              <div className="text-3xl font-light text-white">{data.behavioral.avgScrollDepth}%</div>
              <div className="text-xs text-zinc-500 mt-1">content engagement</div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-red-400 uppercase tracking-wider mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Rage Clicks
              </div>
              <div className="text-3xl font-light text-red-400">{data.behavioral.rageClicks}</div>
              <div className="text-xs text-zinc-500 mt-1">frustration events</div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5" />
                Pages Tracked
              </div>
              <div className="text-3xl font-light text-white">{data.behavioral.pagesWithData}</div>
              <div className="text-xs text-zinc-500 mt-1">with behavioral data</div>
            </div>
          </div>

          {/* Engagement Analysis */}
          <div className="bg-zinc-950 border border-zinc-900 p-6">
            <h3 className="text-sm text-white mb-6 pb-3 border-b border-zinc-800">Engagement Insights</h3>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-4">Scroll Behavior</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Average scroll depth</span>
                    <span className="text-sm text-white">{data.behavioral.avgScrollDepth}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${data.behavioral.avgScrollDepth}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {data.behavioral.avgScrollDepth > 75
                      ? 'Excellent! Users are reading most of your content.'
                      : data.behavioral.avgScrollDepth > 50
                      ? 'Good engagement. Consider adding hooks to keep users scrolling.'
                      : 'Low scroll depth. Review content above the fold.'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-4">UX Health</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Rage clicks detected</span>
                    <span className={`text-sm ${data.behavioral.rageClicks > 10 ? 'text-red-400' : 'text-green-400'}`}>
                      {data.behavioral.rageClicks}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {data.behavioral.rageClicks === 0
                      ? 'No frustration detected. Great UX!'
                      : data.behavioral.rageClicks < 5
                      ? 'Minor friction points. Worth investigating.'
                      : 'Significant UX issues. Check for broken buttons or slow loads.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="bg-zinc-950/50 border border-dashed border-zinc-800 p-8 text-center">
            <Zap className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-zinc-400 mb-2">Heatmap Visualization Coming Soon</h3>
            <p className="text-xs text-zinc-600">Click and scroll heatmaps will appear here</p>
          </div>
        </>
      )}

      {activeTab === 'quality' && (
        <>
          {/* Data Quality Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <UserCheck className="w-3.5 h-3.5" />
                Human Traffic
              </div>
              <div className="text-3xl font-light text-white">{humanRate}%</div>
              <div className="text-xs text-zinc-500 mt-1">{formatNumber(data.quality.humans)} humans</div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Bot className="w-3.5 h-3.5" />
                Bot Traffic
              </div>
              <div className="text-3xl font-light text-zinc-400">{formatNumber(data.quality.bots)}</div>
              <div className="text-xs text-zinc-500 mt-1">filtered from analytics</div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Fingerprint className="w-3.5 h-3.5" />
                Device Fingerprints
              </div>
              <div className="text-3xl font-light text-white">{fingerprintRate}%</div>
              <div className="text-xs text-zinc-500 mt-1">{formatNumber(data.quality.withFingerprint)} linked</div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Zap className="w-3.5 h-3.5" />
                JS Execution
              </div>
              <div className="text-3xl font-light text-white">{formatNumber(data.quality.withJs)}</div>
              <div className="text-xs text-zinc-500 mt-1">verified browsers</div>
            </div>
          </div>

          {/* Geolocation Quality */}
          <div className="bg-zinc-950 border border-zinc-900 p-6">
            <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-500" />
              Geolocation Data Quality
            </h3>

            <div className="grid grid-cols-4 gap-4">
              {Object.entries(data.quality.geoSources).map(([source, count]) => {
                const total = Object.values(data.quality.geoSources).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? (count / total) * 100 : 0
                const isAccurate = source === 'browser_gps' || source === 'ipinfo'

                return (
                  <div key={source} className="bg-zinc-900/50 p-4 rounded-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-300">
                        {source === 'browser_gps' ? 'GPS' :
                         source === 'ipinfo' ? 'IP Geolocation' :
                         source === 'vercel_headers' ? 'Datacenter' :
                         source}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isAccurate ? 'bg-green-900/50 text-green-400' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {isAccurate ? 'accurate' : 'approximate'}
                      </span>
                    </div>
                    <div className="text-2xl font-light text-white">{formatNumber(count)}</div>
                    <div className="text-xs text-zinc-500">{pct.toFixed(1)}% of traffic</div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                GPS and IP geolocation provide accurate coordinates. Datacenter IPs show approximate city centers.
              </div>
            </div>
          </div>

          {/* Data Collection Status */}
          <div className="bg-zinc-950 border border-zinc-900 p-6">
            <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Data Collection Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-zinc-300">Edge middleware tracking</span>
                </div>
                <span className="text-xs text-green-400">Active</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-zinc-300">Device fingerprinting</span>
                </div>
                <span className="text-xs text-green-400">Active</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-zinc-300">Behavioral tracking (heatmaps, scroll)</span>
                </div>
                <span className="text-xs text-green-400">Active</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-zinc-300">Bot detection & filtering</span>
                </div>
                <span className="text-xs text-green-400">Active</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-zinc-300">Browser GPS collection (via age gate)</span>
                </div>
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
