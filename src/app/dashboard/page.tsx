'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, MapPin, Package, Users, ArrowUpRight, ArrowDownRight, Globe, Smartphone, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useOrdersStore } from '@/stores/orders.store'
import { FilterBar } from '@/components/filters/FilterBar'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { getDateRangeForQuery, generateDateRange } from '@/lib/date-utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

interface LocationPerformance {
  id: string
  name: string
  orders: number
  revenue: number
  avgOrder: number
}

interface TopProduct {
  name: string
  units: number
  revenue: number
}

interface HourlyData {
  hour: number
  orders: number
  revenue: number
}

interface WebAnalytics {
  visitors: number
  sessions: number
  mobilePercent: number
  trafficSources: { channel: string; visitors: number }[]
  dailyVisitors: { date: string; visitors: number }[]
}

export default function DashboardOverview() {
  const { storeId } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()
  const ordersStore = useOrdersStore()
  const { fetchOrders, isLoading: ordersLoading, getPaidOrders, getTotalRevenue, getTotalOrders, getRevenueByDay } = ordersStore

  const [locationData, setLocationData] = useState<LocationPerformance[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [prevPeriodRevenue, setPrevPeriodRevenue] = useState(0)
  const [prevPeriodOrders, setPrevPeriodOrders] = useState(0)
  const [uniqueCustomers, setUniqueCustomers] = useState(0)
  const [webAnalytics, setWebAnalytics] = useState<WebAnalytics>({
    visitors: 0,
    sessions: 0,
    mobilePercent: 0,
    trafficSources: [],
    dailyVisitors: [],
  })

  // Sync filters
  useEffect(() => {
    ordersStore.setFilters({
      orderTypes: filters.orderTypes,
      locationIds: filters.locationIds,
    })
  }, [filters.orderTypes, filters.locationIds])

  // Fetch orders
  useEffect(() => {
    if (storeId) {
      fetchOrders(storeId)
    }
  }, [storeId, dateRange, fetchOrders])

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!storeId) return

    const paidOrders = getPaidOrders()
    const orderIds = paidOrders.map(o => o.id)
    const { start, end, startDate, endDate } = getDateRangeForQuery()
    const dateStrings = generateDateRange(startDate, endDate)

    // Calculate previous period
    const periodMs = endDate.getTime() - startDate.getTime()
    const prevStart = new Date(startDate.getTime() - periodMs).toISOString()
    const prevEnd = startDate.toISOString()

    try {
      // Previous period for comparison
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('store_id', storeId)
        .eq('payment_status', 'paid')
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd)

      setPrevPeriodRevenue(prevOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0)
      setPrevPeriodOrders(prevOrders?.length || 0)

      // Unique customers in period
      const customerIds = new Set(paidOrders.map(o => o.customer_id).filter(Boolean))
      setUniqueCustomers(customerIds.size)

      // Location performance
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('store_id', storeId)

      if (locations) {
        const locationMap = new Map(locations.map(l => [l.id, l.name]))
        const locStats = new Map<string, { orders: number; revenue: number }>()

        paidOrders.forEach(order => {
          const locId = order.pickup_location_id
          if (locId) {
            const existing = locStats.get(locId) || { orders: 0, revenue: 0 }
            locStats.set(locId, {
              orders: existing.orders + 1,
              revenue: existing.revenue + (order.total_amount || 0),
            })
          }
        })

        const locPerf: LocationPerformance[] = Array.from(locStats.entries())
          .map(([id, stats]) => ({
            id,
            name: locationMap.get(id) || 'Unknown',
            orders: stats.orders,
            revenue: stats.revenue,
            avgOrder: stats.orders > 0 ? stats.revenue / stats.orders : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)

        setLocationData(locPerf)
      }

      // Top products
      if (orderIds.length > 0) {
        const chunks: string[][] = []
        for (let i = 0; i < orderIds.length; i += 20) {
          chunks.push(orderIds.slice(i, i + 20))
        }

        const allItems: any[] = []
        for (let i = 0; i < chunks.length; i += 5) {
          const batch = chunks.slice(i, i + 5)
          const results = await Promise.all(
            batch.map(chunk =>
              supabase
                .from('order_items')
                .select('product_name, quantity, line_total')
                .in('order_id', chunk)
            )
          )
          results.forEach(({ data }) => {
            if (data) allItems.push(...data)
          })
        }

        const productMap = new Map<string, { units: number; revenue: number }>()
        allItems.forEach(item => {
          const name = item.product_name
          const existing = productMap.get(name) || { units: 0, revenue: 0 }
          productMap.set(name, {
            units: existing.units + (parseFloat(item.quantity) || 0),
            revenue: existing.revenue + (parseFloat(item.line_total) || 0),
          })
        })

        const products = Array.from(productMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8)

        setTopProducts(products)
      }

      // Hourly distribution
      const hourlyStats = new Map<number, { orders: number; revenue: number }>()
      for (let h = 0; h < 24; h++) {
        hourlyStats.set(h, { orders: 0, revenue: 0 })
      }

      paidOrders.forEach(order => {
        const hour = new Date(order.created_at).getHours()
        const existing = hourlyStats.get(hour)!
        hourlyStats.set(hour, {
          orders: existing.orders + 1,
          revenue: existing.revenue + (order.total_amount || 0),
        })
      })

      setHourlyData(
        Array.from(hourlyStats.entries())
          .map(([hour, stats]) => ({ hour, ...stats }))
          .sort((a, b) => a.hour - b.hour)
      )

      // Web analytics - paginate to get ALL records (bypass 1000 limit)
      const allWebVisitors: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: webPage, error } = await supabase
          .from('website_visitors')
          .select('visitor_id, session_id, device_type, channel, created_at')
          .eq('store_id', storeId)
          .gte('created_at', start)
          .lte('created_at', end)
          .or('is_bot.is.null,is_bot.eq.false')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('created_at', { ascending: true })

        if (error || !webPage || webPage.length === 0) {
          hasMore = false
        } else {
          allWebVisitors.push(...webPage)
          hasMore = webPage.length === pageSize
          page++
        }
      }

      const webVisitors = allWebVisitors

      if (webVisitors.length > 0) {
        const uniqueVisitors = new Set(webVisitors.map(v => v.visitor_id)).size
        const uniqueSessions = new Set(webVisitors.map(v => v.session_id)).size
        const mobileCount = webVisitors.filter(v => v.device_type === 'mobile').length
        const mobilePercent = (mobileCount / webVisitors.length) * 100

        // Traffic sources
        const channelMap = new Map<string, Set<string>>()
        webVisitors.forEach(v => {
          const ch = v.channel || 'direct'
          if (!channelMap.has(ch)) channelMap.set(ch, new Set())
          channelMap.get(ch)!.add(v.visitor_id)
        })
        const trafficSources = Array.from(channelMap.entries())
          .map(([channel, visitors]) => ({ channel, visitors: visitors.size }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, 5)

        // Daily visitors
        const dailyMap = new Map<string, Set<string>>()
        webVisitors.forEach(v => {
          const date = format(new Date(v.created_at), 'yyyy-MM-dd')
          if (!dailyMap.has(date)) dailyMap.set(date, new Set())
          dailyMap.get(date)!.add(v.visitor_id)
        })
        const dailyVisitors = dateStrings.map(date => ({
          date,
          visitors: dailyMap.get(date)?.size || 0,
        }))

        setWebAnalytics({
          visitors: uniqueVisitors,
          sessions: uniqueSessions,
          mobilePercent,
          trafficSources,
          dailyVisitors,
        })
      }

    } catch (err) {
      console.error('Dashboard data fetch error:', err)
    }
  }, [storeId, getPaidOrders, dateRange])

  useEffect(() => {
    if (storeId && !ordersLoading) {
      fetchDashboardData()
    }
  }, [storeId, ordersLoading, fetchDashboardData])

  // Computed values
  const totalRevenue = getTotalRevenue()
  const totalOrders = getTotalOrders()
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const revenueChange = prevPeriodRevenue > 0 ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0
  const ordersChange = prevPeriodOrders > 0 ? ((totalOrders - prevPeriodOrders) / prevPeriodOrders) * 100 : 0

  // Chart data
  const { startDate, endDate } = getDateRangeForQuery()
  const dateStrings = generateDateRange(startDate, endDate)
  const revenueByDay = getRevenueByDay()
  const revenueMap = new Map(revenueByDay.map(d => [d.date, d]))

  const chartData = dateStrings.map(date => ({
    date,
    revenue: revenueMap.get(date)?.revenue || 0,
    orders: revenueMap.get(date)?.orders || 0,
  }))

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
  const formatNumber = (v: number) => new Intl.NumberFormat('en-US').format(Math.round(v))

  const maxLocationRevenue = Math.max(...locationData.map(l => l.revenue), 1)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-white">Overview</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Real-time business performance</p>
        </div>
      </div>

      <FilterBar showPaymentFilter={false} />

      {/* Key Metrics - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Revenue</span>
            <DollarSign className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-xl font-semibold text-white">{formatCurrency(totalRevenue)}</div>
          <div className={`flex items-center gap-1 mt-1 text-xs ${revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(revenueChange).toFixed(1)}% vs prev period
          </div>
        </div>

        {/* Orders */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Orders</span>
            <ShoppingCart className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-xl font-semibold text-white">{formatNumber(totalOrders)}</div>
          <div className={`flex items-center gap-1 mt-1 text-xs ${ordersChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {ordersChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(ordersChange).toFixed(1)}% vs prev period
          </div>
        </div>

        {/* AOV */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Order</span>
            <TrendingUp className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-xl font-semibold text-white">{formatCurrency(avgOrderValue)}</div>
          <div className="text-xs text-zinc-500 mt-1">per transaction</div>
        </div>

        {/* Customers */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Customers</span>
            <Users className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-xl font-semibold text-white">{formatNumber(uniqueCustomers)}</div>
          <div className="text-xs text-zinc-500 mt-1">{totalOrders > 0 ? (totalOrders / uniqueCustomers).toFixed(1) : 0} orders/customer</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h3 className="text-xs font-medium text-white mb-4">Daily Revenue</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={(v) => format(new Date(v), 'M/d')}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
                labelStyle={{ color: '#fff', fontSize: 11 }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Location Performance */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-medium text-white">Location Performance</h3>
          </div>
          <div className="space-y-3">
            {locationData.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs">No location data</div>
            ) : (
              locationData.map((loc, i) => (
                <div key={loc.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white truncate flex-1">{loc.name}</span>
                    <span className="text-xs text-zinc-400 ml-2">{formatCurrency(loc.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(loc.revenue / maxLocationRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
                    <span>{loc.orders} orders</span>
                    <span>{formatCurrency(loc.avgOrder)} avg</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-medium text-white">Top Products</h3>
          </div>
          <div className="space-y-2">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs">No product data</div>
            ) : (
              topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center justify-between py-1.5 border-b border-zinc-900 last:border-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] text-zinc-600 w-4">{i + 1}</span>
                    <span className="text-xs text-white truncate">{product.name}</span>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-xs text-white">{formatCurrency(product.revenue)}</div>
                    <div className="text-[10px] text-zinc-600">{Math.round(product.units)} units</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sales by Hour */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h3 className="text-xs font-medium text-white mb-4">Sales by Hour</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 9 }}
                tickFormatter={(v) => v % 3 === 0 ? `${v}:00` : ''}
                interval={0}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
                labelStyle={{ color: '#fff', fontSize: 11 }}
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                  name === 'revenue' ? 'Revenue' : 'Orders'
                ]}
                labelFormatter={(label) => `${label}:00 - ${label}:59`}
              />
              <Bar dataKey="revenue" radius={0}>
                {hourlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.hour >= 16 && entry.hour <= 22 ? '#10b981' : '#27272a'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500" /> Peak hours (4PM-10PM)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-zinc-800" /> Off-peak
          </span>
        </div>
      </div>

      {/* Web Analytics Section */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-medium text-white">Website Traffic</h3>
          </div>
          <a href="/dashboard/traffic" className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1">
            View details <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Visitors */}
          <div className="bg-zinc-900/50 p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Visitors</div>
            <div className="text-lg font-semibold text-white">{formatNumber(webAnalytics.visitors)}</div>
          </div>
          {/* Sessions */}
          <div className="bg-zinc-900/50 p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Sessions</div>
            <div className="text-lg font-semibold text-white">{formatNumber(webAnalytics.sessions)}</div>
          </div>
          {/* Mobile % */}
          <div className="bg-zinc-900/50 p-3">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              <Smartphone className="w-3 h-3" /> Mobile
            </div>
            <div className="text-lg font-semibold text-white">{webAnalytics.mobilePercent.toFixed(0)}%</div>
          </div>
          {/* Conversion */}
          <div className="bg-zinc-900/50 p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Conversion</div>
            <div className="text-lg font-semibold text-white">
              {webAnalytics.visitors > 0 ? ((uniqueCustomers / webAnalytics.visitors) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily Visitors Chart */}
          <div className="lg:col-span-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Daily Visitors</div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={webAnalytics.dailyVisitors} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 9 }}
                    tickFormatter={(v) => format(new Date(v), 'M/d')}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
                    labelStyle={{ color: '#fff', fontSize: 11 }}
                    formatter={(value: number) => [formatNumber(value), 'Visitors']}
                    labelFormatter={(label) => format(new Date(label), 'MMM d')}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#visitorsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Sources */}
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Traffic Sources</div>
            <div className="space-y-2">
              {webAnalytics.trafficSources.length === 0 ? (
                <div className="text-xs text-zinc-600">No traffic data</div>
              ) : (
                webAnalytics.trafficSources.map((source) => {
                  const maxVisitors = Math.max(...webAnalytics.trafficSources.map(s => s.visitors), 1)
                  const colors: Record<string, string> = {
                    direct: '#10b981',
                    organic: '#6366f1',
                    paid: '#f59e0b',
                    referral: '#ec4899',
                    social: '#06b6d4',
                  }
                  return (
                    <div key={source.channel}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white capitalize">{source.channel}</span>
                        <span className="text-[10px] text-zinc-500">{formatNumber(source.visitors)}</span>
                      </div>
                      <div className="h-1 bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${(source.visitors / maxVisitors) * 100}%`,
                            backgroundColor: colors[source.channel] || '#71717a',
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
