'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Order, Customer, Product, CheckoutAttempt } from '@/types/database'

interface DashboardMetrics {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  averageOrderValue: number
  revenueGrowth: number
  ordersGrowth: number
  customersGrowth: number
}

interface SalesData {
  date: string
  revenue: number
  orders: number
}

interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

interface OrderTypeBreakdown {
  type: string
  count: number
  revenue: number
}

interface PaymentStats {
  successful: number
  failed: number
  pending: number
  successRate: number
}

interface DashboardState {
  metrics: DashboardMetrics | null
  recentOrders: Order[]
  salesData: SalesData[]
  topProducts: TopProduct[]
  orderTypeBreakdown: OrderTypeBreakdown[]
  paymentStats: PaymentStats | null
  isLoading: boolean
  error: string | null
  dateRange: { start: Date; end: Date }

  setDateRange: (start: Date, end: Date) => void
  fetchDashboardData: (vendorId: string) => Promise<void>
  fetchSalesData: (vendorId: string, days: number) => Promise<void>
  fetchTopProducts: (vendorId: string) => Promise<void>
  fetchPaymentStats: (vendorId: string) => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  metrics: null,
  recentOrders: [],
  salesData: [],
  topProducts: [],
  orderTypeBreakdown: [],
  paymentStats: null,
  isLoading: false,
  error: null,
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },

  setDateRange: (start, end) => set({ dateRange: { start, end } }),

  fetchDashboardData: async (vendorId: string) => {
    set({ isLoading: true, error: null })

    try {
      const { dateRange } = get()
      const startDate = dateRange.start.toISOString()
      const endDate = dateRange.end.toISOString()

      // Previous period for growth calculation
      const periodMs = dateRange.end.getTime() - dateRange.start.getTime()
      const prevStartDate = new Date(dateRange.start.getTime() - periodMs).toISOString()
      const prevEndDate = dateRange.start.toISOString()

      // Fetch ALL current period orders with pagination
      const pageSize = 1000
      let allOrders: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('vendor_id', vendorId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('payment_status', 'paid')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (ordersError) throw ordersError

        if (ordersData && ordersData.length > 0) {
          allOrders = [...allOrders, ...ordersData]
          hasMore = ordersData.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      const orders = allOrders

      // Fetch ALL previous period orders with pagination
      const prevPageSize = 1000
      let allPrevOrders: { total_amount: number }[] = []
      let prevPage = 0
      let hasMorePrev = true

      while (hasMorePrev) {
        const { data: prevOrdersData } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('vendor_id', vendorId)
          .gte('created_at', prevStartDate)
          .lte('created_at', prevEndDate)
          .eq('payment_status', 'paid')
          .range(prevPage * prevPageSize, (prevPage + 1) * prevPageSize - 1)

        if (prevOrdersData && prevOrdersData.length > 0) {
          allPrevOrders = [...allPrevOrders, ...prevOrdersData]
          hasMorePrev = prevOrdersData.length === prevPageSize
        } else {
          hasMorePrev = false
        }
        prevPage++
      }

      const prevOrders = allPrevOrders

      // Fetch ALL customers with pagination
      const customerPageSize = 1000
      let allCustomers: { id: string; created_at: string }[] = []
      let customerPage = 0
      let hasMoreCustomers = true

      while (hasMoreCustomers) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, created_at')
          .eq('vendor_id', vendorId)
          .range(customerPage * customerPageSize, (customerPage + 1) * customerPageSize - 1)

        if (customersError) throw customersError

        if (customersData && customersData.length > 0) {
          allCustomers = [...allCustomers, ...customersData]
          hasMoreCustomers = customersData.length === customerPageSize
        } else {
          hasMoreCustomers = false
        }
        customerPage++
      }

      const customers = allCustomers

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(10)

      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const totalOrders = orders?.length || 0
      const prevTotalOrders = prevOrders?.length || 0
      const totalCustomers = customers?.length || 0

      // Calculate customers in current and previous period
      const customersInPeriod = customers?.filter(
        (c) => new Date(c.created_at) >= dateRange.start && new Date(c.created_at) <= dateRange.end
      ).length || 0
      const customersInPrevPeriod = customers?.filter(
        (c) => new Date(c.created_at) >= new Date(prevStartDate) && new Date(c.created_at) < dateRange.start
      ).length || 0

      // Calculate growth percentages
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const ordersGrowth = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0
      const customersGrowth = customersInPrevPeriod > 0
        ? ((customersInPeriod - customersInPrevPeriod) / customersInPrevPeriod) * 100
        : 0

      // Order type breakdown
      const orderTypeMap = new Map<string, { count: number; revenue: number }>()
      orders?.forEach((order) => {
        const existing = orderTypeMap.get(order.order_type) || { count: 0, revenue: 0 }
        orderTypeMap.set(order.order_type, {
          count: existing.count + 1,
          revenue: existing.revenue + (order.total_amount || 0),
        })
      })

      const orderTypeBreakdown = Array.from(orderTypeMap.entries()).map(([type, data]) => ({
        type,
        ...data,
      }))

      set({
        metrics: {
          totalRevenue,
          totalOrders,
          totalCustomers,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          revenueGrowth,
          ordersGrowth,
          customersGrowth,
        },
        recentOrders: recentOrders || [],
        orderTypeBreakdown,
        isLoading: false,
      })
    } catch (err) {
      set({ error: 'Failed to fetch dashboard data', isLoading: false })
    }
  },

  fetchSalesData: async (vendorId: string, days: number = 30) => {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('vendor_id', vendorId)
        .gte('created_at', startDate)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by date
      const salesByDate = new Map<string, { revenue: number; orders: number }>()

      orders?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const existing = salesByDate.get(date) || { revenue: 0, orders: 0 }
        salesByDate.set(date, {
          revenue: existing.revenue + (order.total_amount || 0),
          orders: existing.orders + 1,
        })
      })

      // Fill in missing dates
      const salesData: SalesData[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const data = salesByDate.get(date) || { revenue: 0, orders: 0 }
        salesData.push({ date, ...data })
      }

      set({ salesData })
    } catch (err) {
      console.error('Failed to fetch sales data:', err)
    }
  },

  fetchTopProducts: async (vendorId: string) => {
    try {
      const { dateRange } = get()

      // First, get order IDs for the vendor in the date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('payment_status', 'paid')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      if (ordersError) throw ordersError

      const orderIds = orders?.map((o) => o.id) || []

      if (orderIds.length === 0) {
        set({ topProducts: [] })
        return
      }

      // Batch order IDs to avoid URL length limits (chunks of 50)
      const chunkSize = 50
      const chunks = []
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize))
      }

      // Fetch order items in batches
      const allOrderItems: any[] = []
      for (const chunk of chunks) {
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, product_name, quantity, unit_price')
          .in('order_id', chunk)

        if (itemsError) throw itemsError
        if (orderItems) allOrderItems.push(...orderItems)
      }

      const orderItems = allOrderItems

      // Aggregate by product
      const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>()

      orderItems?.forEach((item) => {
        const id = item.product_id || item.product_name
        const itemRevenue = item.quantity * item.unit_price
        const existing = productMap.get(id) || { name: item.product_name, totalSold: 0, revenue: 0 }
        productMap.set(id, {
          name: item.product_name,
          totalSold: existing.totalSold + item.quantity,
          revenue: existing.revenue + itemRevenue,
        })
      })

      const topProducts = Array.from(productMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      set({ topProducts })
    } catch (err) {
      console.error('Failed to fetch top products:', err)
    }
  },

  fetchPaymentStats: async (vendorId: string) => {
    try {
      const { dateRange } = get()

      const { data: attempts, error } = await supabase
        .from('checkout_attempts')
        .select('status')
        .eq('vendor_id', vendorId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      if (error) throw error

      const successful = attempts?.filter((a) => a.status === 'approved' || a.status === 'completed').length || 0
      const failed = attempts?.filter((a) => a.status === 'declined' || a.status === 'error').length || 0
      const pending = attempts?.filter((a) => a.status === 'pending' || a.status === 'processing').length || 0
      const total = attempts?.length || 0

      set({
        paymentStats: {
          successful,
          failed,
          pending,
          successRate: total > 0 ? (successful / total) * 100 : 0,
        },
      })
    } catch (err) {
      console.error('Failed to fetch payment stats:', err)
    }
  },
}))
