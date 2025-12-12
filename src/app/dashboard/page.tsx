'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, ShoppingCart, Users, TrendingUp, Receipt, Tag, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/charts/SalesChart'
import { OrderTypePieChart } from '@/components/charts/OrderTypePieChart'
import { TopProductsChart } from '@/components/charts/TopProductsChart'
import { FilterBar, useFilters } from '@/components/filters/FilterBar'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { getDateRangeForQuery, generateDateRange } from '@/lib/date-utils'

interface DashboardMetrics {
  // Cash Flow (all paid orders - money in the bank)
  cashCollected: number
  grossSales: number
  totalDiscounts: number
  totalTax: number
  paidOrders: number

  // Revenue Recognition (ASC 606 - for P&L)
  recognizedRevenue: number
  recognizedOrders: number
  deferredRevenue: number
  deferredOrders: number

  // Other
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

interface Order {
  id: string
  order_number: string
  order_type: string
  payment_status: string
  total_amount: number
  created_at: string
}

export default function DashboardOverview() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const { filters, setFilters } = useFilters()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [orderTypeBreakdown, setOrderTypeBreakdown] = useState<OrderTypeBreakdown[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    if (!vendorId) return
    setIsLoading(true)

    try {
      // Get validated date range from store - bulletproof for accounting
      const { start: startDate, end: endDate, startDate: startDateObj, endDate: endDateObj } = getDateRangeForQuery()

      // Previous period for growth calculation
      const periodMs = endDateObj.getTime() - startDateObj.getTime()
      const prevStartDate = new Date(startDateObj.getTime() - periodMs).toISOString()
      const prevEndDate = startDateObj.toISOString()

      // Fetch all orders with pagination
      const pageSize = 1000
      let allOrders: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('id, order_type, status, payment_status, total_amount, subtotal, tax_amount, discount_amount, metadata, created_at')
          .eq('vendor_id', vendorId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)

        if (filters.orderTypes.length > 0) {
          query = query.in('order_type', filters.orderTypes)
        }
        if (filters.locationIds.length > 0) {
          query = query.in('pickup_location_id', filters.locationIds)
        }

        query = query.range(page * pageSize, (page + 1) * pageSize - 1)

        const { data, error } = await query
        if (error) throw error

        if (data) {
          allOrders = [...allOrders, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      // ALL PAID ORDERS (cash in the bank)
      const paidOrders = allOrders.filter((o) => o.payment_status === 'paid')

      // RECOGNIZED REVENUE: paid AND (completed OR delivered) - ASC 606
      const recognizedOrdersList = paidOrders.filter(
        (o) => o.status === 'completed' || o.status === 'delivered'
      )

      // DEFERRED REVENUE: paid but not yet delivered (liability)
      const deferredOrdersList = paidOrders.filter(
        (o) => ['shipped', 'ready', 'ready_to_ship', 'pending'].includes(o.status)
      )

      // Fetch all previous period orders with pagination
      let allPrevOrders: any[] = []
      page = 0
      hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('total_amount, status, payment_status')
          .eq('vendor_id', vendorId)
          .gte('created_at', prevStartDate)
          .lte('created_at', prevEndDate)

        if (filters.orderTypes.length > 0) {
          query = query.in('order_type', filters.orderTypes)
        }
        if (filters.locationIds.length > 0) {
          query = query.in('pickup_location_id', filters.locationIds)
        }

        query = query.range(page * pageSize, (page + 1) * pageSize - 1)

        const { data, error } = await query
        if (error) throw error

        if (data) {
          allPrevOrders = [...allPrevOrders, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      // Filter previous period for recognized revenue only
      const prevOrders = allPrevOrders.filter(
        (o) => o.payment_status === 'paid' && (o.status === 'completed' || o.status === 'delivered')
      )

      // Fetch ALL customers with pagination
      let allCustomers: { id: string; created_at: string }[] = []
      let customerPage = 0
      let hasMoreCustomers = true

      while (hasMoreCustomers) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, created_at')
          .eq('vendor_id', vendorId)
          .range(customerPage * pageSize, (customerPage + 1) * pageSize - 1)

        if (customersData && customersData.length > 0) {
          allCustomers = [...allCustomers, ...customersData]
          hasMoreCustomers = customersData.length === pageSize
        } else {
          hasMoreCustomers = false
        }
        customerPage++
      }

      const customers = allCustomers

      // Fetch recent orders
      let recentQuery = supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (filters.orderTypes.length > 0) {
        recentQuery = recentQuery.in('order_type', filters.orderTypes)
      }
      if (filters.locationIds.length > 0) {
        recentQuery = recentQuery.in('pickup_location_id', filters.locationIds)
      }

      const { data: recentOrdersData } = await recentQuery

      // CASH METRICS (all paid orders - money in the bank)
      const cashCollected = paidOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const grossSales = paidOrders?.reduce((sum, o) => sum + (o.subtotal || 0), 0) || 0
      const totalTax = paidOrders?.reduce((sum, o) => sum + (o.tax_amount || 0), 0) || 0

      // Calculate total discounts from ALL paid orders (all sources)
      const totalDiscounts = paidOrders?.reduce((sum, o) => {
        const fieldDiscount = o.discount_amount || 0
        const campaignDiscount = o.metadata?.campaign_discount_amount || 0
        const loyaltyDiscount = o.metadata?.loyalty_discount_amount || 0
        const affiliateDiscount = o.affiliate_discount_amount || 0
        return sum + fieldDiscount + campaignDiscount + loyaltyDiscount + affiliateDiscount
      }, 0) || 0

      // REVENUE RECOGNITION (ASC 606 - for P&L)
      const recognizedRevenue = recognizedOrdersList?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const recognizedOrderCount = recognizedOrdersList?.length || 0

      // DEFERRED REVENUE (liability - paid but not delivered)
      const deferredRevenue = deferredOrdersList?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const deferredOrderCount = deferredOrdersList?.length || 0

      const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const paidOrderCount = paidOrders?.length || 0
      const prevTotalOrders = prevOrders?.length || 0
      const totalCustomers = customers?.length || 0

      const customersInPeriod = customers?.filter(
        (c) => new Date(c.created_at) >= startDateObj && new Date(c.created_at) <= endDateObj
      ).length || 0
      const customersInPrevPeriod = customers?.filter(
        (c) => new Date(c.created_at) >= new Date(prevStartDate) && new Date(c.created_at) < startDateObj
      ).length || 0

      // Growth based on recognized revenue (for P&L comparison)
      const revenueGrowth = prevRevenue > 0 ? ((recognizedRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const ordersGrowth = prevTotalOrders > 0 ? ((paidOrderCount - prevTotalOrders) / prevTotalOrders) * 100 : 0
      const customersGrowth = customersInPrevPeriod > 0
        ? ((customersInPeriod - customersInPrevPeriod) / customersInPrevPeriod) * 100
        : 0

      // Order type breakdown (all paid orders)
      const orderTypeMap = new Map<string, { count: number; revenue: number }>()
      paidOrders?.forEach((order) => {
        const existing = orderTypeMap.get(order.order_type) || { count: 0, revenue: 0 }
        orderTypeMap.set(order.order_type, {
          count: existing.count + 1,
          revenue: existing.revenue + (order.total_amount || 0),
        })
      })

      const breakdown = Array.from(orderTypeMap.entries()).map(([type, data]) => ({
        type,
        ...data,
      }))

      setMetrics({
        // Cash metrics
        cashCollected,
        grossSales,
        totalDiscounts,
        totalTax,
        paidOrders: paidOrderCount,
        // Revenue recognition
        recognizedRevenue,
        recognizedOrders: recognizedOrderCount,
        deferredRevenue,
        deferredOrders: deferredOrderCount,
        // Other
        totalCustomers,
        averageOrderValue: paidOrderCount > 0 ? cashCollected / paidOrderCount : 0,
        revenueGrowth,
        ordersGrowth,
        customersGrowth,
      })
      setRecentOrders(recentOrdersData || [])
      setOrderTypeBreakdown(breakdown)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [vendorId, dateRange, filters])

  const fetchSalesData = useCallback(async () => {
    if (!vendorId) return

    // Get validated date range from store - bulletproof for accounting
    const { start, end, startDate, endDate } = getDateRangeForQuery()

    try {
      // Fetch all orders with pagination
      const pageSize = 1000
      let allOrders: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('created_at, total_amount, status, payment_status')
          .eq('vendor_id', vendorId)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true })

        if (filters.orderTypes.length > 0) {
          query = query.in('order_type', filters.orderTypes)
        }
        if (filters.locationIds.length > 0) {
          query = query.in('pickup_location_id', filters.locationIds)
        }

        query = query.range(page * pageSize, (page + 1) * pageSize - 1)

        const { data, error } = await query
        if (error) throw error

        if (data) {
          allOrders = [...allOrders, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      // Filter for recognized revenue only (ASC 606)
      const orders = allOrders.filter(
        (o) => o.payment_status === 'paid' && (o.status === 'completed' || o.status === 'delivered')
      )

      // Initialize all dates in range for consistent charts
      const salesByDate = new Map<string, { revenue: number; orders: number }>()
      const dateStrings = generateDateRange(startDate, endDate)

      dateStrings.forEach(date => {
        salesByDate.set(date, { revenue: 0, orders: 0 })
      })

      orders?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const existing = salesByDate.get(date) || { revenue: 0, orders: 0 }
        salesByDate.set(date, {
          revenue: existing.revenue + (order.total_amount || 0),
          orders: existing.orders + 1,
        })
      })

      const data = Array.from(salesByDate.entries())
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setSalesData(data)
    } catch (err) {
      console.error('Failed to fetch sales data:', err)
    }
  }, [vendorId, dateRange, filters])

  const fetchTopProducts = useCallback(async () => {
    if (!vendorId) return

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch all orders with pagination (need status to filter)
      const pageSize = 1000
      let allOrders: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('id, status, payment_status')
          .eq('vendor_id', vendorId)
          .gte('created_at', start)
          .lte('created_at', end)

        if (filters.orderTypes.length > 0) {
          query = query.in('order_type', filters.orderTypes)
        }
        if (filters.locationIds.length > 0) {
          query = query.in('pickup_location_id', filters.locationIds)
        }

        query = query.range(page * pageSize, (page + 1) * pageSize - 1)

        const { data, error } = await query
        if (error) throw error

        if (data) {
          allOrders = [...allOrders, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      // Filter for recognized orders only (ASC 606)
      const orderIds = allOrders
        .filter((o) => o.payment_status === 'paid' && (o.status === 'completed' || o.status === 'delivered'))
        .map((o) => o.id)

      if (orderIds.length === 0) {
        setTopProducts([])
        return
      }

      const chunkSize = 50
      const chunks: string[][] = []
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize))
      }

      const allOrderItems: any[] = []
      for (const chunk of chunks) {
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, product_name, quantity, unit_price')
          .in('order_id', chunk)

        if (itemsError) throw itemsError
        if (orderItems) allOrderItems.push(...orderItems)
      }

      const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>()

      allOrderItems.forEach((item) => {
        const id = item.product_id || item.product_name
        const itemRevenue = item.quantity * item.unit_price
        const existing = productMap.get(id) || { name: item.product_name, totalSold: 0, revenue: 0 }
        productMap.set(id, {
          name: item.product_name,
          totalSold: existing.totalSold + item.quantity,
          revenue: existing.revenue + itemRevenue,
        })
      })

      const products = Array.from(productMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setTopProducts(products)
    } catch (err) {
      console.error('Failed to fetch top products:', err)
    }
  }, [vendorId, dateRange, filters])

  useEffect(() => {
    if (vendorId) {
      fetchDashboardData()
      fetchSalesData()
      fetchTopProducts()
    }
  }, [vendorId, dateRange, filters, fetchDashboardData, fetchSalesData, fetchTopProducts])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-light text-white tracking-wide">Dashboard Overview</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">Welcome back. Here's what's happening with your store.</p>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        showDateFilter={false}
        showPaymentFilter={false}
      />

      {/* CASH FLOW SECTION - Money in the bank */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h2 className="text-xs font-light text-zinc-500 uppercase tracking-wider mb-4">Cash Flow (All Paid Orders)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Cash Collected"
            value={metrics?.cashCollected || 0}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="Gross Sales"
            value={metrics?.grossSales || 0}
            icon={TrendingUp}
            format="currency"
          />
          <MetricCard
            title="Discounts Given"
            value={metrics?.totalDiscounts || 0}
            icon={Tag}
            format="currency"
          />
          <MetricCard
            title="Tax Collected"
            value={metrics?.totalTax || 0}
            icon={Receipt}
            format="currency"
          />
          <MetricCard
            title="Paid Orders"
            value={metrics?.paidOrders || 0}
            change={metrics?.ordersGrowth}
            icon={ShoppingCart}
          />
        </div>
      </div>

      {/* REVENUE RECOGNITION - ASC 606 P&L */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h2 className="text-xs font-light text-zinc-500 uppercase tracking-wider mb-4">Revenue Recognition (ASC 606)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Recognized Revenue"
            value={metrics?.recognizedRevenue || 0}
            change={metrics?.revenueGrowth}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="Recognized Orders"
            value={metrics?.recognizedOrders || 0}
            icon={ShoppingCart}
          />
          <MetricCard
            title="Deferred Revenue"
            value={metrics?.deferredRevenue || 0}
            icon={Clock}
            format="currency"
          />
          <MetricCard
            title="In Transit"
            value={metrics?.deferredOrders || 0}
            icon={Clock}
          />
        </div>
        {(metrics?.deferredOrders || 0) > 0 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 p-3 text-amber-400 text-xs font-light">
            <Clock className="inline w-3 h-3 mr-2" />
            {metrics?.deferredOrders} orders in transit — {formatCurrency(metrics?.deferredRevenue || 0)} will be recognized upon delivery
          </div>
        )}
      </div>

      {/* OTHER METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Customers"
          value={metrics?.totalCustomers || 0}
          change={metrics?.customersGrowth}
          icon={Users}
        />
        <MetricCard
          title="Avg Order Value"
          value={metrics?.averageOrderValue || 0}
          icon={TrendingUp}
          format="currency"
        />
        <MetricCard
          title="Discount Rate"
          value={metrics?.grossSales ? ((metrics.totalDiscounts / metrics.grossSales) * 100) : 0}
          icon={Tag}
          format="percent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesChart data={salesData} metric="revenue" />
        <OrderTypePieChart data={orderTypeBreakdown} />
      </div>

      {/* Top Products */}
      <TopProductsChart data={topProducts} />

      {/* Recent Orders */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h3 className="text-sm font-light text-white mb-6 tracking-wide">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No recent orders
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-4 text-sm font-light text-white">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-400 capitalize font-light">
                      {order.order_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-light ${
                          order.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : order.payment_status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-white font-light">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500 font-light">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
