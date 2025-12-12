'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, ShoppingCart, Users, TrendingUp, Receipt, Tag, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/charts/SalesChart'
import { OrderTypePieChart } from '@/components/charts/OrderTypePieChart'
import { TopProductsChart } from '@/components/charts/TopProductsChart'
import { FilterBar } from '@/components/filters/FilterBar'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { getDateRangeForQuery, generateDateRange } from '@/lib/date-utils'

interface DashboardMetrics {
  // Cash Flow (all paid orders - money in the bank)
  cashCollected: number
  grossSales: number
  netRevenue: number
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
  const { dateRange, filters } = useDashboardStore()
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
          .select('id, order_type, status, payment_status, total_amount, subtotal, tax_amount, discount_amount, affiliate_discount_amount, metadata, created_at')
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

      // Fetch recent PAID orders (exclude failed/cancelled)
      let recentQuery = supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
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

      // Helper: Calculate net revenue (subtotal - discounts)
      const calcNetRevenue = (order: any): number => {
        const subtotal = parseFloat(order.subtotal || 0)
        const discounts =
          parseFloat(order.discount_amount || 0) +
          parseFloat(order.affiliate_discount_amount || 0) +
          parseFloat(order.metadata?.loyalty_discount_amount || 0) +
          parseFloat(order.metadata?.campaign_discount_amount || 0)
        return subtotal - discounts
      }

      // Order type breakdown (all paid orders) - using Net Revenue
      const orderTypeMap = new Map<string, { count: number; revenue: number }>()
      paidOrders?.forEach((order) => {
        const existing = orderTypeMap.get(order.order_type) || { count: 0, revenue: 0 }
        orderTypeMap.set(order.order_type, {
          count: existing.count + 1,
          revenue: existing.revenue + calcNetRevenue(order),
        })
      })

      const breakdown = Array.from(orderTypeMap.entries()).map(([type, data]) => ({
        type,
        ...data,
      }))

      // Net Revenue = Gross Sales - All Discounts
      const netRevenue = grossSales - totalDiscounts

      setMetrics({
        // Cash metrics
        cashCollected,
        grossSales,
        netRevenue,
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
        averageOrderValue: paidOrderCount > 0 ? netRevenue / paidOrderCount : 0,
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

  // Helper: Calculate net revenue (subtotal - discounts) - consistent across all pages
  const getNetRevenue = (order: any): number => {
    const subtotal = parseFloat(order.subtotal || 0)
    const discounts =
      parseFloat(order.discount_amount || 0) +
      parseFloat(order.affiliate_discount_amount || 0) +
      parseFloat(order.metadata?.loyalty_discount_amount || 0) +
      parseFloat(order.metadata?.campaign_discount_amount || 0)
    return subtotal - discounts
  }

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
          .select('created_at, subtotal, discount_amount, affiliate_discount_amount, metadata, status, payment_status')
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

      // Filter for all paid orders (cash collected) - consistent with Sales Analytics
      const orders = allOrders.filter(
        (o) => o.payment_status === 'paid' && o.status !== 'cancelled'
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
          revenue: existing.revenue + getNetRevenue(order),
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

      // Use larger chunks and parallel fetching for speed
      const chunkSize = 200
      const chunks: string[][] = []
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize))
      }

      // Fetch all chunks in parallel
      const chunkResults = await Promise.all(
        chunks.map(chunk =>
          supabase
            .from('order_items')
            .select('product_id, product_name, quantity, unit_price')
            .in('order_id', chunk)
        )
      )

      const allOrderItems: any[] = []
      for (const { data, error } of chunkResults) {
        if (error) throw error
        if (data) allOrderItems.push(...data)
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
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg lg:text-xl font-light text-white tracking-wide">Dashboard Overview</h1>
        <p className="text-zinc-500 text-xs lg:text-sm font-light mt-1">Welcome back. Here's what's happening with your store.</p>
      </div>

      {/* Filters */}
      <FilterBar
        showPaymentFilter={false}
      />

      {/* CASH FLOW SECTION - Money in the bank */}
      <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-4">
        <h2 className="text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider mb-3 lg:mb-4">Cash Flow (All Paid Orders)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
          <MetricCard
            title="Gross Sales"
            value={metrics?.grossSales || 0}
            icon={TrendingUp}
            format="currency"
          />
          <MetricCard
            title="Net Revenue"
            value={metrics?.netRevenue || 0}
            icon={DollarSign}
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
            title="Cash Collected"
            value={metrics?.cashCollected || 0}
            icon={DollarSign}
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
      <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-4">
        <h2 className="text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider mb-3 lg:mb-4">Revenue Recognition (ASC 606)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
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
          <div className="mt-3 lg:mt-4 bg-slate-800/30 border border-slate-700/30 p-2 lg:p-3 text-slate-300 text-[10px] lg:text-xs font-light">
            <Clock className="inline w-3 h-3 mr-1 lg:mr-2" />
            {metrics?.deferredOrders} orders in transit — {formatCurrency(metrics?.deferredRevenue || 0)} recognized upon delivery
          </div>
        )}
      </div>

      {/* OTHER METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <SalesChart data={salesData} metric="revenue" />
        <OrderTypePieChart data={orderTypeBreakdown} />
      </div>

      {/* Top Products */}
      <TopProductsChart data={topProducts} />

      {/* Recent Orders */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 lg:p-6">
        <h3 className="text-xs lg:text-sm font-light text-white mb-4 lg:mb-6 tracking-wide">Recent Orders</h3>
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[500px]">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Order #</th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Amount</th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 lg:px-4 py-6 lg:py-8 text-center text-zinc-500 text-xs lg:text-sm">
                    No recent orders
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm font-light text-white">
                      {order.order_number}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-zinc-400 capitalize font-light">
                      {order.order_type.replace('_', ' ')}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4">
                      <span
                        className={`inline-flex px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs font-light ${
                          order.payment_status === 'paid'
                            ? 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                            : order.payment_status === 'pending'
                            ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30'
                            : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800/30'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-white font-light">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-zinc-500 font-light whitespace-nowrap">
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
