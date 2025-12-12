'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import { getStateCentroid, getCityCoordinates, normalizeState, batchGeocodeAddresses } from '@/lib/geocoding'
import { Loader2, Radio, Crosshair, Activity, Target, Zap, TrendingUp, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues
const MapboxMap = dynamic(() => import('@/components/map/MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <Crosshair className="w-8 h-8 text-teal-400 mx-auto mb-3 animate-pulse" />
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Loading map...</p>
      </div>
    </div>
  ),
})

interface GeoPoint {
  lat: number
  lng: number
  type: 'store' | 'shipping' | 'customer' | 'traffic'
  revenue: number
  orders: number
  customers?: number
  city?: string
  state?: string
  name?: string
  device?: string
  timestamp?: string
}

interface MapLayers {
  stores: GeoPoint[]
  customers: GeoPoint[]
  shipping: GeoPoint[]
  traffic: GeoPoint[]
}

interface MapStats {
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  stateCount: number
  topState: { name: string; revenue: number; orders: number } | null
}

export default function MapDashboardPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showAllTime, setShowAllTime] = useState(true) // Default to ALL data
  const [layers, setLayers] = useState<MapLayers>({ stores: [], customers: [], shipping: [], traffic: [] })
  const [visibleLayers, setVisibleLayers] = useState({ stores: true, customers: true, shipping: true, traffic: true })
  const [stats, setStats] = useState<MapStats>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    stateCount: 0,
    topState: null,
  })
  const [stateData, setStateData] = useState<Map<string, { orders: number; revenue: number }>>(new Map())
  const [customerCount, setCustomerCount] = useState(0)
  const [shippingCount, setShippingCount] = useState(0)
  const [trafficCount, setTrafficCount] = useState(0)

  // Live activity feed
  interface ActivityItem {
    id: string
    type: 'visitor' | 'event' | 'purchase'
    city?: string
    region?: string
    eventName?: string
    revenue?: number
    timestamp: string
  }
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!vendorId) return

    setIsLoading(true)

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch ALL orders (no limit - paginate if needed)
      let allOrders: any[] = []
      let page = 0
      const pageSize = 1000

      while (true) {
        let query = supabase
          .from('orders')
          .select('id, customer_id, shipping_name, shipping_address, shipping_city, shipping_state, total_amount, order_type, pickup_location_id, created_at')
          .eq('vendor_id', vendorId)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (!showAllTime) {
          query = query
            .gte('created_at', start)
            .lte('created_at', end)
        }

        const { data: orders, error } = await query
        if (error) {
          console.error('Orders fetch error:', error.message, error.code, error.details)
          break
        }
        if (!orders || orders.length === 0) break

        allOrders = allOrders.concat(orders)
        if (orders.length < pageSize) break
        page++
      }

      const orders = allOrders
      console.log('Fetched orders:', orders.length)

      // Fetch ALL customers with full address data (no limit)
      let allCustomers: any[] = []
      page = 0

      while (true) {
        const { data: customers, error } = await supabase
          .from('customers')
          .select('id, street_address, city, state, postal_code, total_spent, total_orders')
          .eq('vendor_id', vendorId)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Customers fetch error:', error)
          break
        }
        if (!customers || customers.length === 0) break

        allCustomers = allCustomers.concat(customers)
        if (customers.length < pageSize) break
        page++
      }

      const customers = allCustomers
      console.log('Fetched customers:', customers.length)

      // Fetch store locations WITH lat/lng coordinates
      const { data: stores } = await supabase
        .from('locations')
        .select('id, name, city, state, latitude, longitude, is_active')
        .eq('vendor_id', vendorId)

      // Create store lookup map
      const storeMap = new Map<string, {
        name: string; city: string | null; state: string | null; lat: number | null; lng: number | null
      }>()
      for (const s of stores || []) {
        storeMap.set(s.id, { name: s.name, city: s.city, state: s.state, lat: s.latitude, lng: s.longitude })
      }

      // Create customer lookup map (for shipping order fallback)
      const customerMap = new Map<string, { city: string | null; state: string | null }>()
      for (const c of customers || []) {
        customerMap.set(c.id, { city: c.city, state: c.state })
      }

      // === LAYER 1: STORE LOCATIONS with their order data ===
      const storeOrderAgg = new Map<string, { orders: number; revenue: number }>()
      for (const order of orders || []) {
        if (order.pickup_location_id && storeMap.has(order.pickup_location_id)) {
          const existing = storeOrderAgg.get(order.pickup_location_id) || { orders: 0, revenue: 0 }
          existing.orders += 1
          existing.revenue += order.total_amount || 0
          storeOrderAgg.set(order.pickup_location_id, existing)
        }
      }

      const storePoints: GeoPoint[] = []
      for (const [storeId, data] of storeOrderAgg) {
        const store = storeMap.get(storeId)
        if (store?.lat && store?.lng) {
          storePoints.push({
            lat: store.lat,
            lng: store.lng,
            type: 'store',
            revenue: data.revenue,
            orders: data.orders,
            city: store.city || undefined,
            state: store.state ? normalizeState(store.state) : undefined,
            name: store.name,
          })
        }
      }

      // === LAYER 2: CUSTOMER HEATMAP (individual customers with exact geocoding) ===
      const customerPoints: GeoPoint[] = []

      // Separate customers with full addresses from those with only city/state
      const customersWithAddresses: Array<{
        address: string; city: string; state: string; postalCode?: string; id: string;
        total_spent: number; total_orders: number
      }> = []
      const customersWithCityOnly: typeof customers = []

      for (const customer of customers || []) {
        if (!customer.state) continue
        const state = normalizeState(customer.state)
        if (!state) continue

        if (customer.street_address && customer.city) {
          customersWithAddresses.push({
            id: customer.id,
            address: customer.street_address,
            city: customer.city,
            state,
            postalCode: customer.postal_code,
            total_spent: customer.total_spent || 0,
            total_orders: customer.total_orders || 0,
          })
        } else {
          customersWithCityOnly.push({ ...customer, state })
        }
      }

      console.log('Customers with full addresses:', customersWithAddresses.length)
      console.log('Customers with city only:', customersWithCityOnly.length)

      // Create customer data map for lookup
      const customerDataMap = new Map<string, { total_spent: number; total_orders: number; city: string; state: string }>()
      for (const c of customersWithAddresses) {
        customerDataMap.set(c.id, { total_spent: c.total_spent, total_orders: c.total_orders, city: c.city, state: c.state })
      }

      // Geocode customer addresses using Mapbox (fast parallel processing!)
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      if (customersWithAddresses.length > 0 && mapboxToken) {
        console.log('Geocoding', customersWithAddresses.length, 'customer addresses...')
        const customerResults = await batchGeocodeAddresses(
          customersWithAddresses,
          mapboxToken
        )

        for (const [id, coords] of customerResults) {
          if (!coords) continue
          const data = customerDataMap.get(id)
          if (!data) continue

          const jitterLat = (Math.random() - 0.5) * 0.001
          const jitterLng = (Math.random() - 0.5) * 0.001

          customerPoints.push({
            lat: coords.lat + jitterLat,
            lng: coords.lng + jitterLng,
            type: 'customer',
            revenue: data.total_spent,
            orders: data.total_orders,
            customers: 1,
            city: data.city,
            state: data.state,
          })
        }
      }

      // Add city-only customers (no full address)
      for (const customer of customersWithCityOnly) {
        const coords = getCityCoordinates(customer.city, customer.state)
        if (!coords) continue

        const jitterLat = (Math.random() - 0.5) * 0.03
        const jitterLng = (Math.random() - 0.5) * 0.03

        customerPoints.push({
          lat: coords.lat + jitterLat,
          lng: coords.lng + jitterLng,
          type: 'customer',
          revenue: customer.total_spent || 0,
          orders: customer.total_orders || 0,
          customers: 1,
          city: customer.city || undefined,
          state: customer.state,
        })
      }

      const totalCustomers = customersWithAddresses.length + customersWithCityOnly.length
      console.log('Total customer points:', totalCustomers)

      // === LAYER 3: SHIPPING ORDERS (individual geocoded locations) ===
      const shippingWithAddresses: Array<{
        address: string; city: string; state: string; id: string;
        total_amount: number
      }> = []
      const shippingWithStateOnly: Array<{ state: string; total_amount: number; id: string }> = []
      const shippingStateAgg = new Map<string, { orders: number; revenue: number }>()

      for (const order of orders || []) {
        const isShippingOrder = order.order_type === 'shipping' || order.order_type === 'delivery'

        if (isShippingOrder || order.shipping_state) {
          const state = order.shipping_state ? normalizeState(order.shipping_state) : null

          if (state) {
            // Track state aggregation for sidebar
            const existing = shippingStateAgg.get(state) || { orders: 0, revenue: 0 }
            existing.orders += 1
            existing.revenue += order.total_amount || 0
            shippingStateAgg.set(state, existing)

            // Collect for geocoding
            if (order.shipping_address && order.shipping_city) {
              shippingWithAddresses.push({
                id: order.id,
                address: order.shipping_address,
                city: order.shipping_city,
                state,
                total_amount: order.total_amount || 0,
              })
            } else {
              shippingWithStateOnly.push({
                id: order.id,
                state,
                total_amount: order.total_amount || 0,
              })
            }
          }
        }
      }

      console.log('Shipping orders with addresses:', shippingWithAddresses.length)
      console.log('Shipping orders state-only:', shippingWithStateOnly.length)

      // Create shipping data map for lookup
      const shippingDataMap = new Map<string, { total_amount: number; city: string; state: string }>()
      for (const s of shippingWithAddresses) {
        shippingDataMap.set(s.id, { total_amount: s.total_amount, city: s.city, state: s.state })
      }

      const shippingPoints: GeoPoint[] = []

      // Geocode shipping addresses in parallel
      if (shippingWithAddresses.length > 0 && mapboxToken) {
        const shippingResults = await batchGeocodeAddresses(
          shippingWithAddresses,
          mapboxToken
        )

        for (const [id, coords] of shippingResults) {
          if (!coords) continue
          const data = shippingDataMap.get(id)
          if (!data) continue

          const jitterLat = (Math.random() - 0.5) * 0.001
          const jitterLng = (Math.random() - 0.5) * 0.001

          shippingPoints.push({
            lat: coords.lat + jitterLat,
            lng: coords.lng + jitterLng,
            type: 'shipping',
            revenue: data.total_amount,
            orders: 1,
            city: data.city,
            state: data.state,
          })
        }
      }

      // Add state-only shipping orders at state centroids
      for (const order of shippingWithStateOnly) {
        const coords = getStateCentroid(order.state)
        if (coords) {
          const jitterLat = (Math.random() - 0.5) * 0.1
          const jitterLng = (Math.random() - 0.5) * 0.1

          shippingPoints.push({
            lat: coords.lat + jitterLat,
            lng: coords.lng + jitterLng,
            type: 'shipping',
            revenue: order.total_amount,
            orders: 1,
            state: order.state,
          })
        }
      }

      // === COMBINED STATE DATA for sidebar ===
      const combinedStateAgg = new Map<string, { orders: number; revenue: number }>()

      // Add store orders by state
      for (const [storeId, data] of storeOrderAgg) {
        const store = storeMap.get(storeId)
        if (store?.state) {
          const state = normalizeState(store.state)
          const existing = combinedStateAgg.get(state) || { orders: 0, revenue: 0 }
          existing.orders += data.orders
          existing.revenue += data.revenue
          combinedStateAgg.set(state, existing)
        }
      }

      // Add shipping orders by state
      for (const [state, data] of shippingStateAgg) {
        const existing = combinedStateAgg.get(state) || { orders: 0, revenue: 0 }
        existing.orders += data.orders
        existing.revenue += data.revenue
        combinedStateAgg.set(state, existing)
      }

      // === LAYER 4: WEBSITE TRAFFIC (visitor geolocation) ===
      const trafficPoints: GeoPoint[] = []

      const { data: visitors } = await supabase
        .from('website_visitors')
        .select('latitude, longitude, city, region, country, device_type, created_at')
        .eq('vendor_id', vendorId)
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (visitors) {
        for (const visitor of visitors) {
          if (visitor.latitude && visitor.longitude) {
            trafficPoints.push({
              lat: visitor.latitude,
              lng: visitor.longitude,
              type: 'traffic',
              revenue: 0,
              orders: 0,
              city: visitor.city || undefined,
              state: visitor.region || undefined,
              device: visitor.device_type || undefined,
              timestamp: visitor.created_at,
            })
          }
        }
      }

      console.log('Traffic points:', trafficPoints.length)

      // Calculate total stats
      const totalStoreOrders = Array.from(storeOrderAgg.values()).reduce((sum, d) => sum + d.orders, 0)
      const totalStoreRevenue = Array.from(storeOrderAgg.values()).reduce((sum, d) => sum + d.revenue, 0)
      const totalShippingOrders = Array.from(shippingStateAgg.values()).reduce((sum, d) => sum + d.orders, 0)
      const totalShippingRevenue = Array.from(shippingStateAgg.values()).reduce((sum, d) => sum + d.revenue, 0)
      const customerTotal = customersWithAddresses.length + customersWithCityOnly.length

      const totalOrders = totalStoreOrders + totalShippingOrders
      const totalRevenue = totalStoreRevenue + totalShippingRevenue
      const topStateEntry = Array.from(combinedStateAgg.entries()).sort((a, b) => b[1].revenue - a[1].revenue)[0]

      console.log('Map data loaded:', {
        rawOrders: orders?.length,
        storeOrders: totalStoreOrders,
        shippingOrders: totalShippingOrders,
        customersWithState: customerTotal,
        trafficVisitors: trafficPoints.length,
        totalRevenue: Math.round(totalRevenue),
      })

      // Set all layers
      setLayers({ stores: storePoints, customers: customerPoints, shipping: shippingPoints, traffic: trafficPoints })
      setTrafficCount(trafficPoints.length)
      setStateData(combinedStateAgg)
      setCustomerCount(customerTotal)
      setShippingCount(totalShippingOrders)
      setStats({
        totalOrders,
        totalRevenue,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        stateCount: combinedStateAgg.size,
        topState: topStateEntry ? { name: topStateEntry[0], ...topStateEntry[1] } : null,
      })
    } catch (err) {
      console.error('Error fetching map data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [vendorId, dateRange, showAllTime])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Track last seen visitor timestamp for polling
  const lastVisitorTime = useRef<string | null>(null)

  // Real-time polling for live traffic updates (every 5 seconds)
  useEffect(() => {
    if (!vendorId) return

    const pollForNewVisitors = async () => {
      try {
        const query = supabase
          .from('website_visitors')
          .select('latitude, longitude, city, region, device_type, created_at')
          .eq('vendor_id', vendorId)
          .not('latitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)

        // Only get visitors newer than last seen
        if (lastVisitorTime.current) {
          query.gt('created_at', lastVisitorTime.current)
        }

        const { data: visitors } = await query

        if (visitors && visitors.length > 0) {
          // Update last seen time
          lastVisitorTime.current = visitors[0].created_at

          // Add new points to map
          const newPoints: GeoPoint[] = visitors
            .filter(v => v.latitude && v.longitude)
            .map(visitor => ({
              lat: visitor.latitude!,
              lng: visitor.longitude!,
              type: 'traffic' as const,
              revenue: 0,
              orders: 0,
              city: visitor.city || undefined,
              state: visitor.region || undefined,
              device: visitor.device_type || undefined,
              timestamp: visitor.created_at,
            }))

          if (newPoints.length > 0) {
            setLayers((prev) => ({
              ...prev,
              traffic: [...newPoints, ...prev.traffic],
            }))
            setTrafficCount((prev) => prev + newPoints.length)

            // Add to activity feed
            const newActivities: ActivityItem[] = visitors!.map(v => ({
              id: `v-${v.created_at}-${Math.random()}`,
              type: 'visitor' as const,
              city: v.city || undefined,
              region: v.region || undefined,
              timestamp: v.created_at,
            }))
            setActivityFeed((prev) => [...newActivities, ...prev].slice(0, 20))
          }
        }

        // Also poll for events
        const { data: events } = await supabase
          .from('analytics_events')
          .select('id, event_name, city, region, revenue, created_at')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (events && events.length > 0) {
          const newEventActivities: ActivityItem[] = events
            .filter(e => !activityFeed.some(a => a.id === `e-${e.id}`))
            .map(e => ({
              id: `e-${e.id}`,
              type: e.event_name === 'purchase' ? 'purchase' as const : 'event' as const,
              eventName: e.event_name,
              city: e.city || undefined,
              region: e.region || undefined,
              revenue: e.revenue || undefined,
              timestamp: e.created_at,
            }))

          if (newEventActivities.length > 0) {
            setActivityFeed((prev) => {
              const combined = [...newEventActivities, ...prev]
              // Sort by timestamp and dedupe
              const seen = new Set<string>()
              return combined
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .filter(item => {
                  if (seen.has(item.id)) return false
                  seen.add(item.id)
                  return true
                })
                .slice(0, 20)
            })
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Set initial last visitor time from current data
    if (layers.traffic.length > 0 && layers.traffic[0].timestamp) {
      lastVisitorTime.current = layers.traffic[0].timestamp
    }

    // Poll every 5 seconds
    const interval = setInterval(pollForNewVisitors, 5000)
    // Initial poll
    pollForNewVisitors()

    return () => clearInterval(interval)
  }, [vendorId, layers.traffic.length, activityFeed])

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString()

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col relative overflow-hidden bg-zinc-950">
      {/* Scanline overlay effect */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
           style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-black/40 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-[0.2em]">Live</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <h1 className="text-sm font-mono text-zinc-300 uppercase tracking-wider">Geographic Command</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Time range toggle */}
          <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 p-0.5">
            <button
              onClick={() => setShowAllTime(true)}
              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                showAllTime
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setShowAllTime(false)}
              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                !showAllTime
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Date Range
            </button>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <span>{stats.stateCount} Regions</span>
          </div>
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">{stats.totalOrders.toLocaleString()} Orders</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex relative">
        {/* Map */}
        <div className="flex-1 relative" style={{ minHeight: '500px' }}>
          <MapboxMap
            layers={layers}
            visibleLayers={visibleLayers}
            isLoading={isLoading}
          />

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-teal-500/30 z-20 pointer-events-none" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-teal-500/30 z-20 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-teal-500/30 z-20 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-teal-500/30 z-20 pointer-events-none" />

          {/* Coordinates display */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm border border-zinc-800/50 z-20 pointer-events-none">
            <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
              SECTOR: CONUS • GRID: ACTIVE • STATUS: MONITORING
            </span>
          </div>

        </div>

        {/* Stats panel */}
        <div className="w-64 bg-black/60 backdrop-blur-sm border-l border-zinc-800/50 p-4 space-y-4 z-20 overflow-y-auto">
          {/* Primary metrics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">
              <Activity className="w-3 h-3" />
              <span>Mission Stats</span>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Revenue</span>
                <Zap className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-xl font-mono text-teal-400">{formatCurrency(stats.totalRevenue)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-3">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Orders</span>
                <span className="text-lg font-mono text-white">{stats.totalOrders.toLocaleString()}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-3">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">AOV</span>
                <span className="text-lg font-mono text-white">{formatCurrency(stats.avgOrderValue)}</span>
              </div>
            </div>
          </div>

          {/* Top performing state */}
          {stats.topState && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                <Target className="w-3 h-3" />
                <span>Top Region</span>
              </div>
              <div className="bg-teal-500/10 border border-teal-500/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-teal-400 font-bold">{stats.topState.name}</span>
                  <span className="text-[10px] font-mono text-teal-400/60">#{1}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-zinc-500 block">Revenue</span>
                    <span className="text-white">{formatCurrency(stats.topState.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Orders</span>
                    <span className="text-white">{stats.topState.orders}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* State breakdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" />
              <span>Regional Intel</span>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {Array.from(stateData.entries())
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 10)
                .map(([state, data], i) => (
                  <div
                    key={state}
                    className="flex items-center justify-between py-1.5 px-2 bg-zinc-900/30 border border-zinc-800/30 hover:border-teal-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-600 w-4">{i + 1}</span>
                      <span className="text-xs font-mono text-zinc-300">{state}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="text-zinc-500">{data.orders}</span>
                      <span className="text-teal-400">{formatCurrency(data.revenue)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Layer Toggles */}
          <div className="pt-3 border-t border-zinc-800/50">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">Map Layers</div>
            <div className="space-y-2">
              <button
                onClick={() => setVisibleLayers(v => ({ ...v, stores: !v.stores }))}
                className={`w-full flex items-center justify-between py-2 px-2 border transition-colors ${
                  visibleLayers.stores
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-zinc-900/30 border-zinc-800/30 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${visibleLayers.stores ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                  <span className="text-[10px] font-mono uppercase">Stores</span>
                </div>
                <span className="text-[10px] font-mono">{layers.stores.length} locations</span>
              </button>

              <button
                onClick={() => setVisibleLayers(v => ({ ...v, customers: !v.customers }))}
                className={`w-full flex items-center justify-between py-2 px-2 border transition-colors ${
                  visibleLayers.customers
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    : 'bg-zinc-900/30 border-zinc-800/30 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${visibleLayers.customers ? 'bg-purple-400' : 'bg-zinc-600'}`} />
                  <span className="text-[10px] font-mono uppercase">Customers</span>
                </div>
                <span className="text-[10px] font-mono">{customerCount} total</span>
              </button>

              <button
                onClick={() => setVisibleLayers(v => ({ ...v, shipping: !v.shipping }))}
                className={`w-full flex items-center justify-between py-2 px-2 border transition-colors ${
                  visibleLayers.shipping
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                    : 'bg-zinc-900/30 border-zinc-800/30 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${visibleLayers.shipping ? 'bg-teal-400' : 'bg-zinc-600'}`} />
                  <span className="text-[10px] font-mono uppercase">Shipping</span>
                </div>
                <span className="text-[10px] font-mono">{shippingCount} orders</span>
              </button>

              <button
                onClick={() => setVisibleLayers(v => ({ ...v, traffic: !v.traffic }))}
                className={`w-full flex items-center justify-between py-2 px-2 border transition-colors ${
                  visibleLayers.traffic
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-zinc-900/30 border-zinc-800/30 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${visibleLayers.traffic ? 'bg-rose-400' : 'bg-zinc-600'}`} />
                  <span className="text-[10px] font-mono uppercase">Web Traffic</span>
                </div>
                <span className="text-[10px] font-mono">{trafficCount} visitors</span>
              </button>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="pt-3 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">
              <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
              <span>Live Activity</span>
            </div>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {activityFeed.length === 0 ? (
                <div className="text-[10px] font-mono text-zinc-600 text-center py-4">
                  Waiting for activity...
                </div>
              ) : (
                activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className={`py-1.5 px-2 border transition-all ${
                      item.type === 'purchase'
                        ? 'bg-green-500/10 border-green-500/30'
                        : item.type === 'event'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          item.type === 'purchase' ? 'bg-green-400' :
                          item.type === 'event' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        <span className={`text-[10px] font-mono ${
                          item.type === 'purchase' ? 'text-green-400' :
                          item.type === 'event' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {item.type === 'visitor' ? 'Visit' :
                           item.eventName === 'add_to_cart' ? 'Cart+' :
                           item.eventName === 'purchase' ? 'Sale!' :
                           item.eventName || 'Event'}
                        </span>
                      </div>
                      {item.revenue && (
                        <span className="text-[10px] font-mono text-green-400">
                          +${item.revenue.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
                      {item.city && item.region ? `${item.city}, ${item.region}` : item.region || 'Unknown'} •{' '}
                      {formatTimeAgo(item.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
