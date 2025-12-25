'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import { getStateCentroid, getCityCoordinates, normalizeState, batchGeocodeAddresses } from '@/lib/geocoding'
import {
  Radio, Crosshair, Activity, Target, Zap, TrendingUp,
  MapPin, Users, Package, Globe, Eye, EyeOff, Truck
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues
const MatrixRain = dynamic(() => import('@/components/map/MatrixRain'), { ssr: false })
const MapboxMap = dynamic(() => import('@/components/map/MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <Crosshair className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-pulse" />
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Initializing tactical display...</p>
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
  // Extended data for popups
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  address?: string
  orderNumber?: string
  orderDate?: string
  orderStatus?: string
  totalSpent?: number
  totalOrders?: number
  // Attribution data for traffic
  channel?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  browser?: string
  os?: string
  isReturning?: boolean
  country?: string
  // Session activity data
  sessionId?: string
  visitorId?: string
  pageViews?: number
  productViews?: number
  addToCarts?: number
  purchases?: number
  sessionRevenue?: number
  landingPage?: string
  // Geolocation accuracy
  geoSource?: string
  geoAccuracy?: number
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

interface JourneyPoint {
  lat: number
  lng: number
  city: string
  state: string
  zip: string
  timestamp: string
  eventType: string
}

interface ShipmentJourney {
  trackingNumber: string
  orderId: string | null
  orderNumber?: string
  status: string
  carrier: string
  estimatedDelivery: string | null
  origin: JourneyPoint | null
  destination: { city: string; state: string; zip: string; lat: number | null; lng: number | null } | null
  points: JourneyPoint[]
  // Order & customer details
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  orderTotal?: number
  orderSubtotal?: number
  orderDate?: string
  storeName?: string
  // Transit metrics
  transitStarted?: string
  transitEnded?: string
  transitHours?: number
  transitDays?: number
}

interface ActivityItem {
  id: string
  type: 'visitor' | 'event' | 'purchase'
  city?: string
  region?: string
  eventName?: string
  revenue?: number
  timestamp: string
  lat?: number
  lng?: number
}

export default function MapDashboardPage() {
  const { storeId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showAllTime, setShowAllTime] = useState(true)
  const [layers, setLayers] = useState<MapLayers>({ stores: [], customers: [], shipping: [], traffic: [] })
  const [visibleLayers, setVisibleLayers] = useState({ stores: true, customers: true, shipping: true, traffic: true, usps: true, journeys: true })
  const [journeys, setJourneys] = useState<ShipmentJourney[]>([])
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
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showRegionPanel, setShowRegionPanel] = useState(false)

  // Fetch shipment journeys from EasyPost tracking data
  const fetchJourneys = useCallback(async () => {
    if (!storeId) return
    try {
      const response = await fetch(`/api/shipments/journeys?storeId=${storeId}&limit=50`)
      const data = await response.json()
      if (data.journeys) {
        setJourneys(data.journeys)
      }
    } catch (err) {
      console.error('Error fetching journeys:', err)
    }
  }, [storeId])

  // Fetch data (same logic as before)
  const fetchData = useCallback(async () => {
    if (!storeId) return
    setIsLoading(true)
    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch ALL completed/paid/delivered orders
      let allOrders: any[] = []
      let page = 0
      const pageSize = 1000

      while (true) {
        let query = supabase
          .from('orders')
          .select(`
            id, order_number, customer_id, shipping_name, shipping_address, shipping_city, shipping_state, shipping_phone,
            total_amount, subtotal, discount_amount, affiliate_discount_amount, metadata, order_type, pickup_location_id,
            status, payment_status, created_at, tracking_number,
            customers (id, first_name, last_name, email, phone, total_spent, total_orders)
          `)
          .eq('store_id', storeId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (!showAllTime) {
          query = query.gte('created_at', start).lte('created_at', end)
        }

        const { data: orders, error } = await query
        if (error) break
        if (!orders || orders.length === 0) break
        allOrders = allOrders.concat(orders)
        if (orders.length < pageSize) break
        page++
      }

      const orders = allOrders
      const getRevenue = (order: any): number => parseFloat(order.subtotal || order.total_amount || 0)

      // Fetch customers
      let allCustomers: any[] = []
      page = 0
      while (true) {
        const { data: customers, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone, street_address, city, state, postal_code, total_spent, total_orders, created_at')
          .eq('store_id', storeId)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) break
        if (!customers || customers.length === 0) break
        allCustomers = allCustomers.concat(customers)
        if (customers.length < pageSize) break
        page++
      }

      const customers = allCustomers

      // Fetch store locations
      const { data: stores } = await supabase
        .from('locations')
        .select('id, name, city, state, latitude, longitude, is_active')
        .eq('store_id', storeId)

      const storeMap = new Map<string, { name: string; city: string | null; state: string | null; lat: number | null; lng: number | null }>()
      for (const s of stores || []) {
        storeMap.set(s.id, { name: s.name, city: s.city, state: s.state, lat: s.latitude, lng: s.longitude })
      }

      // Store orders aggregation
      const storeOrderAgg = new Map<string, { orders: number; revenue: number }>()
      for (const order of orders || []) {
        if (order.pickup_location_id && storeMap.has(order.pickup_location_id)) {
          const existing = storeOrderAgg.get(order.pickup_location_id) || { orders: 0, revenue: 0 }
          existing.orders += 1
          existing.revenue += getRevenue(order)
          storeOrderAgg.set(order.pickup_location_id, existing)
        }
      }

      const storePoints: GeoPoint[] = []
      for (const [storeId, data] of storeOrderAgg) {
        const store = storeMap.get(storeId)
        if (store?.lat && store?.lng) {
          storePoints.push({
            lat: store.lat, lng: store.lng, type: 'store',
            revenue: data.revenue, orders: data.orders,
            city: store.city || undefined, state: store.state ? normalizeState(store.state) : undefined,
            name: store.name,
          })
        }
      }

      // Customer points
      const customerPoints: GeoPoint[] = []
      const customersWithAddresses: Array<{ address: string; city: string; state: string; postalCode?: string; id: string; total_spent: number; total_orders: number; first_name?: string; last_name?: string; email?: string; phone?: string }> = []
      const customersWithCityOnly: typeof customers = []

      for (const customer of customers || []) {
        if (!customer.state) continue
        const state = normalizeState(customer.state)
        if (!state) continue

        if (customer.street_address && customer.city) {
          customersWithAddresses.push({
            id: customer.id, address: customer.street_address, city: customer.city,
            state, postalCode: customer.postal_code, total_spent: customer.total_spent || 0,
            total_orders: customer.total_orders || 0,
            first_name: customer.first_name, last_name: customer.last_name,
            email: customer.email, phone: customer.phone,
          })
        } else {
          customersWithCityOnly.push({ ...customer, state })
        }
      }

      const customerDataMap = new Map<string, { total_spent: number; total_orders: number; city: string; state: string; first_name?: string; last_name?: string; email?: string; phone?: string; address?: string }>()
      for (const c of customersWithAddresses) {
        customerDataMap.set(c.id, { total_spent: c.total_spent, total_orders: c.total_orders, city: c.city, state: c.state, first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, address: c.address })
      }

      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      if (customersWithAddresses.length > 0 && mapboxToken) {
        const customerResults = await batchGeocodeAddresses(customersWithAddresses, mapboxToken)
        for (const [id, coords] of customerResults) {
          if (!coords) continue
          const data = customerDataMap.get(id)
          if (!data) continue
          const jitterLat = (Math.random() - 0.5) * 0.001
          const jitterLng = (Math.random() - 0.5) * 0.001
          const customerName = [data.first_name, data.last_name].filter(Boolean).join(' ')
          customerPoints.push({
            lat: coords.lat + jitterLat, lng: coords.lng + jitterLng, type: 'customer',
            revenue: data.total_spent, orders: data.total_orders, customers: 1,
            city: data.city, state: data.state,
            customerName: customerName || undefined,
            customerEmail: data.email,
            customerPhone: data.phone,
            address: data.address,
            totalSpent: data.total_spent,
            totalOrders: data.total_orders,
          })
        }
      }

      for (const customer of customersWithCityOnly) {
        const coords = getCityCoordinates(customer.city, customer.state)
        if (!coords) continue
        // Spread within city (~1km radius)
        const jitterLat = (Math.random() - 0.5) * 0.015
        const jitterLng = (Math.random() - 0.5) * 0.015
        const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        customerPoints.push({
          lat: coords.lat + jitterLat, lng: coords.lng + jitterLng, type: 'customer',
          revenue: customer.total_spent || 0, orders: customer.total_orders || 0, customers: 1,
          city: customer.city || undefined, state: customer.state,
          customerName: customerName || undefined,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          totalSpent: customer.total_spent || 0,
          totalOrders: customer.total_orders || 0,
        })
      }

      // Shipping orders - store full order data
      interface ShippingOrderData {
        id: string; address: string; city: string; state: string; total_amount: number
        order_number?: string; shipping_name?: string; created_at?: string; status?: string
        customer_name?: string; customer_email?: string; customer_phone?: string
      }
      const shippingWithAddresses: ShippingOrderData[] = []
      const shippingWithStateOnly: ShippingOrderData[] = []
      const shippingStateAgg = new Map<string, { orders: number; revenue: number }>()

      for (const order of orders || []) {
        const isShippingOrder = order.order_type === 'shipping' || order.order_type === 'delivery'
        if (!isShippingOrder && !order.shipping_state) continue

        // Parse shipping_address JSON if flat fields are missing
        let shippingCity = order.shipping_city
        let shippingState = order.shipping_state
        let shippingAddress = typeof order.shipping_address === 'string' ? order.shipping_address : ''
        let shippingName = order.shipping_name

        // If flat fields are null, try to extract from shipping_address JSON object
        if ((!shippingCity || !shippingState) && order.shipping_address && typeof order.shipping_address === 'object') {
          const addrObj = order.shipping_address as any
          shippingCity = shippingCity || addrObj.city || ''
          shippingState = shippingState || addrObj.state || ''
          shippingAddress = addrObj.address_1 || addrObj.street || ''
          if (addrObj.address_2) shippingAddress += ' ' + addrObj.address_2
          if (!shippingName && (addrObj.first_name || addrObj.last_name)) {
            shippingName = `${addrObj.first_name || ''} ${addrObj.last_name || ''}`.trim()
          }
        }

        const state = shippingState ? normalizeState(shippingState) : null
        if (!state) continue

        const netRevenue = getRevenue(order)
        const existing = shippingStateAgg.get(state) || { orders: 0, revenue: 0 }
        existing.orders += 1
        existing.revenue += netRevenue
        shippingStateAgg.set(state, existing)

        const customer = order.customers as any
        const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : shippingName

        const orderData: ShippingOrderData = {
          id: order.id, address: shippingAddress, city: shippingCity || '', state,
          total_amount: netRevenue, order_number: order.order_number, shipping_name: shippingName,
          created_at: order.created_at, status: order.status, customer_name: customerName,
          customer_email: customer?.email, customer_phone: customer?.phone || order.shipping_phone,
        }

        if (shippingAddress && shippingCity) {
          shippingWithAddresses.push(orderData)
        } else if (shippingCity) {
          // Has city but no full address - can still geocode by city
          shippingWithAddresses.push(orderData)
        } else {
          shippingWithStateOnly.push(orderData)
        }
      }

      const shippingDataMap = new Map<string, ShippingOrderData>()
      for (const s of shippingWithAddresses) {
        shippingDataMap.set(s.id, s)
      }

      const shippingPoints: GeoPoint[] = []

      if (shippingWithAddresses.length > 0 && mapboxToken) {
        const shippingResults = await batchGeocodeAddresses(shippingWithAddresses, mapboxToken)
        for (const [id, coords] of shippingResults) {
          if (!coords) continue
          const data = shippingDataMap.get(id)
          if (!data) continue
          const jitterLat = (Math.random() - 0.5) * 0.001
          const jitterLng = (Math.random() - 0.5) * 0.001
          shippingPoints.push({
            lat: coords.lat + jitterLat, lng: coords.lng + jitterLng, type: 'shipping',
            revenue: data.total_amount, orders: 1, city: data.city, state: data.state,
            orderNumber: data.order_number, customerName: data.customer_name,
            customerEmail: data.customer_email, customerPhone: data.customer_phone,
            address: data.address, orderDate: data.created_at, orderStatus: data.status,
          })
        }
      }

      for (const order of shippingWithStateOnly) {
        const coords = getStateCentroid(order.state)
        if (coords) {
          // Spread within state area (~5km radius) for orders with no city
          const jitterLat = (Math.random() - 0.5) * 0.05
          const jitterLng = (Math.random() - 0.5) * 0.05
          shippingPoints.push({
            lat: coords.lat + jitterLat, lng: coords.lng + jitterLng, type: 'shipping',
            revenue: order.total_amount, orders: 1, state: order.state,
            orderNumber: order.order_number, customerName: order.customer_name,
            customerEmail: order.customer_email, customerPhone: order.customer_phone,
            orderDate: order.created_at, orderStatus: order.status,
          })
        }
      }

      // Combined state data
      const combinedStateAgg = new Map<string, { orders: number; revenue: number }>()
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
      for (const [state, data] of shippingStateAgg) {
        const existing = combinedStateAgg.get(state) || { orders: 0, revenue: 0 }
        existing.orders += data.orders
        existing.revenue += data.revenue
        combinedStateAgg.set(state, existing)
      }

      // Traffic points with full attribution data - fetch ALL visitors with geo
      const trafficPoints: GeoPoint[] = []
      let allVisitors: any[] = []
      let visitorPage = 0
      const visitorPageSize = 1000

      while (true) {
        const { data: visitors } = await supabase
          .from('website_visitors')
          .select('id, session_id, visitor_id, latitude, longitude, city, region, country, device_type, created_at, channel, utm_source, utm_medium, utm_campaign, referrer, browser, os, is_returning, page_url, geolocation_source, geolocation_accuracy')
          .eq('store_id', storeId)
          .not('latitude', 'is', null)
          .order('created_at', { ascending: false })
          .range(visitorPage * visitorPageSize, (visitorPage + 1) * visitorPageSize - 1)

        if (!visitors || visitors.length === 0) break
        allVisitors = allVisitors.concat(visitors)
        if (visitors.length < visitorPageSize) break
        visitorPage++
      }
      const visitors = allVisitors

      // Fetch page view counts per session
      const sessionIds = (visitors || []).map(v => v.session_id).filter(Boolean)
      const pageViewCounts = new Map<string, number>()
      const eventCounts = new Map<string, { total: number; products: number; carts: number; purchases: number; revenue: number }>()

      if (sessionIds.length > 0) {
        // Get page view counts
        const { data: pvData } = await supabase
          .from('page_views')
          .select('session_id')
          .eq('store_id', storeId)
          .in('session_id', sessionIds.slice(0, 100)) // Limit to avoid query size issues

        if (pvData) {
          for (const pv of pvData) {
            if (pv.session_id) {
              pageViewCounts.set(pv.session_id, (pageViewCounts.get(pv.session_id) || 0) + 1)
            }
          }
        }

        // Get event counts
        const { data: evData } = await supabase
          .from('analytics_events')
          .select('session_id, event_name, revenue')
          .eq('store_id', storeId)
          .in('session_id', sessionIds.slice(0, 100))

        if (evData) {
          for (const ev of evData) {
            if (ev.session_id) {
              const existing = eventCounts.get(ev.session_id) || { total: 0, products: 0, carts: 0, purchases: 0, revenue: 0 }
              existing.total += 1
              if (ev.event_name === 'view_product') existing.products += 1
              if (ev.event_name === 'add_to_cart') existing.carts += 1
              if (ev.event_name === 'purchase') {
                existing.purchases += 1
                existing.revenue += ev.revenue || 0
              }
              eventCounts.set(ev.session_id, existing)
            }
          }
        }
      }

      // Aggregate inaccurate locations by city
      const cityAggregates = new Map<string, { count: number; city: string; state: string; lat: number; lng: number }>()

      if (visitors) {
        for (const visitor of visitors) {
          const sessionEvents = eventCounts.get(visitor.session_id) || { total: 0, products: 0, carts: 0, purchases: 0, revenue: 0 }
          // Parse landing page path
          let landingPage = '/'
          if (visitor.page_url) {
            try { landingPage = new URL(visitor.page_url).pathname } catch {}
          }

          // Determine geo source
          const geoSource = visitor.geolocation_source || ''
          const isAccurate = geoSource === 'browser_gps' || geoSource === 'ipinfo'

          // For accurate sources, plot individual points
          if (isAccurate && visitor.latitude && visitor.longitude) {
            // Small jitter to spread visitors
            const jitterAmount = geoSource === 'browser_gps' ? 0.002 : 0.01
            const jitterLat = (Math.random() - 0.5) * jitterAmount
            const jitterLng = (Math.random() - 0.5) * jitterAmount

            trafficPoints.push({
              lat: visitor.latitude + jitterLat, lng: visitor.longitude + jitterLng, type: 'traffic',
              revenue: sessionEvents.revenue, orders: sessionEvents.purchases,
              city: visitor.city || undefined,
              state: visitor.region || undefined, device: visitor.device_type || undefined,
              timestamp: visitor.created_at,
              channel: visitor.channel || undefined,
              utmSource: visitor.utm_source || undefined,
              utmMedium: visitor.utm_medium || undefined,
              utmCampaign: visitor.utm_campaign || undefined,
              referrer: visitor.referrer || undefined,
              browser: visitor.browser || undefined,
              os: visitor.os || undefined,
              isReturning: visitor.is_returning || false,
              country: visitor.country || undefined,
              sessionId: visitor.session_id || undefined,
              visitorId: visitor.visitor_id || undefined,
              pageViews: pageViewCounts.get(visitor.session_id) || 1,
              productViews: sessionEvents.products,
              addToCarts: sessionEvents.carts,
              purchases: sessionEvents.purchases,
              sessionRevenue: sessionEvents.revenue,
              landingPage,
              geoSource: geoSource,
              geoAccuracy: visitor.geolocation_accuracy || undefined,
            })
          } else {
            // For inaccurate sources, aggregate by city
            const city = visitor.city || 'Unknown'
            const state = visitor.region || ''
            const cityKey = `${city}, ${state}`.toLowerCase()

            if (!cityAggregates.has(cityKey)) {
              // Get city coordinates for the aggregate marker
              let coords = getCityCoordinates(city, state)
              if (!coords && visitor.latitude && visitor.longitude) {
                coords = { lat: visitor.latitude, lng: visitor.longitude, confidence: 'low' as const }
              }
              if (coords) {
                cityAggregates.set(cityKey, { count: 0, city, state, lat: coords.lat, lng: coords.lng })
              }
            }
            const agg = cityAggregates.get(cityKey)
            if (agg) agg.count++
          }
        }
      }

      // Add city aggregate markers as special traffic points
      for (const [, agg] of cityAggregates) {
        if (agg.count > 0) {
          trafficPoints.push({
            lat: agg.lat, lng: agg.lng, type: 'traffic',
            revenue: 0, orders: 0, customers: agg.count,
            city: agg.city, state: agg.state,
            geoSource: 'city_aggregate',
            // Store count in a way the map can use for sizing
            pageViews: agg.count,
          })
        }
      }

      // Calculate stats
      const totalStoreOrders = Array.from(storeOrderAgg.values()).reduce((sum, d) => sum + d.orders, 0)
      const totalStoreRevenue = Array.from(storeOrderAgg.values()).reduce((sum, d) => sum + d.revenue, 0)
      const totalShippingOrders = Array.from(shippingStateAgg.values()).reduce((sum, d) => sum + d.orders, 0)
      const totalShippingRevenue = Array.from(shippingStateAgg.values()).reduce((sum, d) => sum + d.revenue, 0)
      const customerTotal = customersWithAddresses.length + customersWithCityOnly.length

      const totalOrders = totalStoreOrders + totalShippingOrders
      const totalRevenue = totalStoreRevenue + totalShippingRevenue
      const topStateEntry = Array.from(combinedStateAgg.entries()).sort((a, b) => b[1].revenue - a[1].revenue)[0]

      setLayers({ stores: storePoints, customers: customerPoints, shipping: shippingPoints, traffic: trafficPoints })
      setTrafficCount(trafficPoints.length)
      setStateData(combinedStateAgg)
      setCustomerCount(customerTotal)
      setShippingCount(totalShippingOrders)
      setStats({
        totalOrders, totalRevenue,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        stateCount: combinedStateAgg.size,
        topState: topStateEntry ? { name: topStateEntry[0], ...topStateEntry[1] } : null,
      })
    } catch (err) {
      console.error('Error fetching map data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [storeId, dateRange, showAllTime])

  useEffect(() => {
    fetchData()
    fetchJourneys()
  }, [fetchData, fetchJourneys])

  // Real-time polling
  const lastVisitorTime = useRef<string | null>(null)

  useEffect(() => {
    if (!storeId) return

    const pollForNewVisitors = async () => {
      try {
        const query = supabase
          .from('website_visitors')
          .select('latitude, longitude, city, region, country, device_type, created_at, channel, utm_source, utm_medium, utm_campaign, referrer, browser, os, is_returning')
          .eq('store_id', storeId)
          .not('latitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)

        if (lastVisitorTime.current) {
          query.gt('created_at', lastVisitorTime.current)
        }

        const { data: visitors } = await query

        if (visitors && visitors.length > 0) {
          lastVisitorTime.current = visitors[0].created_at

          const newPoints: GeoPoint[] = visitors
            .filter(v => v.latitude && v.longitude)
            .map(visitor => ({
              lat: visitor.latitude!, lng: visitor.longitude!, type: 'traffic' as const,
              revenue: 0, orders: 0, city: visitor.city || undefined,
              state: visitor.region || undefined, device: visitor.device_type || undefined,
              timestamp: visitor.created_at,
              // Attribution data
              channel: visitor.channel || undefined,
              utmSource: visitor.utm_source || undefined,
              utmMedium: visitor.utm_medium || undefined,
              utmCampaign: visitor.utm_campaign || undefined,
              referrer: visitor.referrer || undefined,
              browser: visitor.browser || undefined,
              os: visitor.os || undefined,
              isReturning: visitor.is_returning || false,
              country: visitor.country || undefined,
            }))

          if (newPoints.length > 0) {
            setLayers((prev) => ({ ...prev, traffic: [...newPoints, ...prev.traffic] }))
            setTrafficCount((prev) => prev + newPoints.length)

            const newActivities: ActivityItem[] = visitors!.map(v => ({
              id: `v-${v.created_at}-${Math.random()}`, type: 'visitor' as const,
              city: v.city || undefined, region: v.region || undefined,
              timestamp: v.created_at, lat: v.latitude, lng: v.longitude,
            }))
            setActivityFeed((prev) => [...newActivities, ...prev].slice(0, 15))
          }
        }

        // Poll for events
        const { data: events } = await supabase
          .from('analytics_events')
          .select('id, event_name, city, region, revenue, created_at')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (events && events.length > 0) {
          const newEventActivities: ActivityItem[] = events
            .filter(e => !activityFeed.some(a => a.id === `e-${e.id}`))
            .map(e => ({
              id: `e-${e.id}`, type: e.event_name === 'purchase' ? 'purchase' as const : 'event' as const,
              eventName: e.event_name, city: e.city || undefined, region: e.region || undefined,
              revenue: e.revenue || undefined, timestamp: e.created_at,
            }))

          if (newEventActivities.length > 0) {
            setActivityFeed((prev) => {
              const combined = [...newEventActivities, ...prev]
              const seen = new Set<string>()
              return combined
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })
                .slice(0, 15)
            })
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    if (layers.traffic.length > 0 && layers.traffic[0].timestamp) {
      lastVisitorTime.current = layers.traffic[0].timestamp
    }

    const interval = setInterval(pollForNewVisitors, 5000)
    pollForNewVisitors()

    return () => clearInterval(interval)
  }, [storeId, layers.traffic.length, activityFeed])

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString()

  const topRegions = Array.from(stateData.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)

  return (
    <div className="h-screen w-full relative overflow-hidden bg-black">
      {/* Matrix rain background */}
      <div className="absolute inset-0 z-0">
        <MatrixRain opacity={0.12} speed={0.15} density={0.96} />
      </div>

      {/* Map fills entire screen - with transparency to show matrix */}
      <div className="absolute inset-0 z-10">
        <MapboxMap layers={layers} visibleLayers={visibleLayers} isLoading={isLoading} journeys={journeys} />
      </div>

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Corner brackets with glow */}
      <div className="absolute top-4 left-4 w-16 h-16 z-40 pointer-events-none">
        <div className="absolute inset-0 border-l-2 border-t-2 border-slate-400/50" />
        <div className="absolute -inset-1 border-l border-t border-slate-400/20 blur-sm" />
      </div>
      <div className="absolute top-4 right-4 w-16 h-16 z-40 pointer-events-none">
        <div className="absolute inset-0 border-r-2 border-t-2 border-slate-400/50" />
        <div className="absolute -inset-1 border-r border-t border-slate-400/20 blur-sm" />
      </div>
      <div className="absolute bottom-4 left-4 w-16 h-16 z-40 pointer-events-none">
        <div className="absolute inset-0 border-l-2 border-b-2 border-slate-400/50" />
        <div className="absolute -inset-1 border-l border-b border-slate-400/20 blur-sm" />
      </div>
      <div className="absolute bottom-4 right-4 w-16 h-16 z-40 pointer-events-none">
        <div className="absolute inset-0 border-r-2 border-b-2 border-slate-400/50" />
        <div className="absolute -inset-1 border-r border-b border-slate-400/20 blur-sm" />
      </div>

      {/* TOP LEFT: Primary Stats HUD */}
      <div className="absolute top-6 left-6 z-40 space-y-3 animate-fade-in">
        {/* Live indicator */}
        <div className="hud-panel flex items-center gap-2 px-3 py-2">
          <div className="relative">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-[10px] font-mono text-green-400 uppercase tracking-[0.2em]">Live</span>
          <span className="text-[10px] font-mono text-zinc-600">|</span>
          <span className="text-[10px] font-mono text-zinc-400">{stats.stateCount} regions</span>
        </div>

        {/* Revenue card */}
        <div className="hud-panel p-4 min-w-[220px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Revenue</span>
            <Zap className="w-4 h-4 text-amber-400/70" />
          </div>
          <span className="text-3xl font-mono text-white font-light tracking-tight tabular-nums">
            {formatCurrency(stats.totalRevenue)}
          </span>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-2">
          <div className="hud-panel px-4 py-3 flex-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Orders</span>
            <span className="text-xl font-mono text-white tabular-nums">{stats.totalOrders.toLocaleString()}</span>
          </div>
          <div className="hud-panel px-4 py-3 flex-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">AOV</span>
            <span className="text-xl font-mono text-white tabular-nums">{formatCurrency(stats.avgOrderValue)}</span>
          </div>
        </div>

        {/* Top region */}
        {stats.topState && (
          <div className="hud-panel-accent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Top Region</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-mono text-white font-semibold">{stats.topState.name}</span>
              <span className="text-sm font-mono text-slate-300 tabular-nums">{formatCurrency(stats.topState.revenue)}</span>
            </div>
          </div>
        )}
      </div>

      {/* TOP RIGHT: Layer controls */}
      <div className="absolute top-6 right-6 z-40 animate-fade-in">
        <div className="flex gap-2">
          {/* Time toggle */}
          <div className="hud-panel flex p-1">
            <button
              onClick={() => setShowAllTime(true)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-200 ${
                showAllTime ? 'bg-slate-500/40 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >All Time</button>
            <button
              onClick={() => setShowAllTime(false)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-200 ${
                !showAllTime ? 'bg-slate-500/40 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >Range</button>
          </div>

          {/* Layer toggle button */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`hud-button ${showLayerPanel ? 'active' : ''}`}
          >
            {showLayerPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Region panel toggle */}
          <button
            onClick={() => setShowRegionPanel(!showRegionPanel)}
            className={`hud-button ${showRegionPanel ? 'active' : ''}`}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>

        {/* Layer controls dropdown */}
        <div className={`mt-2 hud-panel p-3 min-w-[220px] transition-all duration-300 origin-top ${
          showLayerPanel ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">Map Layers</div>
          <div className="space-y-2">
            {[
              { key: 'stores', label: 'Stores', count: layers.stores.length, color: 'bg-amber-400', icon: MapPin },
              { key: 'customers', label: 'Customers', count: customerCount, color: 'bg-purple-400', icon: Users },
              { key: 'shipping', label: 'Shipping', count: shippingCount, color: 'bg-teal-400', icon: Package },
              { key: 'traffic', label: 'Traffic', count: trafficCount, color: 'bg-rose-400', icon: Globe },
              { key: 'usps', label: 'USPS Centers', count: 168, color: 'bg-blue-400', icon: Truck },
              { key: 'journeys', label: 'Journeys', count: journeys.length, color: 'bg-cyan-400', icon: Activity },
            ].map(({ key, label, count, color, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setVisibleLayers(v => ({ ...v, [key]: !v[key as keyof typeof v] }))}
                className={`w-full flex items-center justify-between py-2.5 px-3 border transition-all duration-200 ${
                  visibleLayers[key as keyof typeof visibleLayers]
                    ? 'bg-zinc-800/60 border-zinc-600/50 text-white'
                    : 'bg-transparent border-zinc-800/30 text-zinc-500 hover:border-zinc-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                    visibleLayers[key as keyof typeof visibleLayers] ? color : 'bg-zinc-700'
                  }`} />
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono uppercase">{label}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 tabular-nums">{count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Region stats panel */}
        <div className={`mt-2 hud-panel p-3 min-w-[260px] max-h-[400px] overflow-y-auto transition-all duration-300 origin-top ${
          showRegionPanel ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">Regional Intel</div>
          <div className="space-y-1.5">
            {topRegions.map(([state, data], i) => (
              <div
                key={state}
                className="flex items-center justify-between py-2 px-3 bg-zinc-900/40 border border-zinc-800/30 hover:border-slate-600/40 transition-colors duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-zinc-600 w-4">{i + 1}</span>
                  <span className="text-xs font-mono text-zinc-300">{state}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="text-zinc-500 tabular-nums">{data.orders}</span>
                  <span className="text-slate-300 tabular-nums">{formatCurrency(data.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: Live Activity Feed */}
      <div className="absolute bottom-6 left-6 z-40 w-80 animate-fade-in">
        <div className="hud-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/20 bg-zinc-900/30">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className="w-3 h-3 text-green-400" />
                <div className="absolute inset-0 w-3 h-3 text-green-400 animate-ping opacity-40">
                  <Radio className="w-3 h-3" />
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Live Feed</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">{activityFeed.length} events</span>
          </div>
          <div className="max-h-[180px] overflow-y-auto activity-feed">
            {activityFeed.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 text-center py-8">
                <div className="inline-block w-4 h-4 border border-zinc-700 border-t-zinc-500 rounded-full animate-spin mb-2" />
                <div>Monitoring...</div>
              </div>
            ) : (
              <div>
                {activityFeed.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`px-4 py-2.5 border-b border-zinc-800/20 transition-all duration-300 ${
                      idx === 0 ? 'animate-slide-in' : ''
                    } ${
                      item.type === 'purchase' ? 'bg-green-500/5' :
                      item.type === 'event' ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          item.type === 'purchase' ? 'bg-green-400' :
                          item.type === 'event' ? 'bg-amber-400' : 'bg-zinc-500'
                        }`} />
                        <span className={`text-[10px] font-mono font-medium ${
                          item.type === 'purchase' ? 'text-green-400' :
                          item.type === 'event' ? 'text-amber-400' : 'text-zinc-400'
                        }`}>
                          {item.type === 'visitor' ? 'Visit' :
                           item.eventName === 'add_to_cart' ? 'Cart+' :
                           item.eventName === 'purchase' ? 'Sale' :
                           item.eventName || 'Event'}
                        </span>
                        {item.city && (
                          <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[120px]">
                            {item.city}{item.region ? `, ${item.region}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.revenue && (
                          <span className="text-[10px] font-mono text-green-400 font-medium tabular-nums">
                            +{formatCurrency(item.revenue)}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-zinc-600">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CENTER: Status bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
        <div className="hud-panel flex items-center gap-4 px-5 py-2.5">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
            Sector: CONUS
          </span>
          <span className="text-zinc-700">•</span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
            Grid: Active
          </span>
          <span className="text-zinc-700">•</span>
          <span className="text-[9px] font-mono text-green-500/80 uppercase tracking-wider flex items-center gap-1.5">
            <span className="relative">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full block" />
              <span className="absolute inset-0 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            </span>
            Online
          </span>
        </div>
      </div>

      {/* BOTTOM RIGHT: Quick layer toggles */}
      <div className="absolute bottom-6 right-6 z-40 animate-fade-in">
        <div className="flex gap-1.5">
          {[
            { key: 'stores', color: visibleLayers.stores ? 'bg-amber-400' : 'bg-zinc-700' },
            { key: 'customers', color: visibleLayers.customers ? 'bg-purple-400' : 'bg-zinc-700' },
            { key: 'shipping', color: visibleLayers.shipping ? 'bg-teal-400' : 'bg-zinc-700' },
            { key: 'traffic', color: visibleLayers.traffic ? 'bg-rose-400' : 'bg-zinc-700' },
          ].map(({ key, color }) => (
            <button
              key={key}
              onClick={() => setVisibleLayers(v => ({ ...v, [key]: !v[key as keyof typeof v] }))}
              className="hud-button-small"
              title={key}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${color} transition-all duration-200`} />
            </button>
          ))}
        </div>
      </div>

      {/* Global styles for HUD - Matrix themed */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 65, 0.1), inset 0 1px 0 rgba(0, 255, 65, 0.03); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 65, 0.15), inset 0 1px 0 rgba(0, 255, 65, 0.05); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
        .hud-panel {
          background: rgba(0, 5, 0, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 255, 65, 0.15);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 65, 0.05), inset 0 1px 0 rgba(0, 255, 65, 0.05);
          animation: glow-pulse 4s ease-in-out infinite;
        }
        .hud-panel-accent {
          background: rgba(0, 20, 5, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 255, 65, 0.25);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 65, 0.08), inset 0 1px 0 rgba(0, 255, 65, 0.08);
        }
        .hud-button {
          padding: 0.5rem 0.75rem;
          background: rgba(0, 5, 0, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 255, 65, 0.15);
          color: rgba(0, 200, 65, 0.7);
          transition: all 0.2s ease;
        }
        .hud-button:hover {
          border-color: rgba(0, 255, 65, 0.4);
          color: rgba(0, 255, 65, 1);
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.15);
        }
        .hud-button.active {
          border-color: rgba(0, 255, 65, 0.5);
          color: rgba(0, 255, 65, 1);
          background: rgba(0, 30, 10, 0.9);
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
        }
        .hud-button-small {
          width: 2.25rem;
          height: 2.25rem;
          background: rgba(0, 5, 0, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 255, 65, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .hud-button-small:hover {
          border-color: rgba(0, 255, 65, 0.4);
          background: rgba(0, 20, 5, 0.9);
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.1);
        }
        .activity-feed::-webkit-scrollbar {
          width: 4px;
        }
        .activity-feed::-webkit-scrollbar-track {
          background: transparent;
        }
        .activity-feed::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.2);
          border-radius: 2px;
        }
        .activity-feed::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.4);
        }
      `}</style>
    </div>
  )
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}
