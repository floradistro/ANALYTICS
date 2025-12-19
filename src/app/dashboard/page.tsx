'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, ShoppingCart, Users, TrendingUp, Receipt, Tag, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useOrdersStore, isPaidOrder } from '@/stores/orders.store'
import { MetricCard } from '@/components/ui/MetricCard'
import { SalesChart } from '@/components/charts/SalesChart'
import { OrderTypePieChart } from '@/components/charts/OrderTypePieChart'
import { TopProductsChart } from '@/components/charts/TopProductsChart'
import { CheckoutSuccessChart } from '@/components/charts/CheckoutSuccessChart'
import { FilterBar } from '@/components/filters/FilterBar'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { getDateRangeForQuery, generateDateRange } from '@/lib/date-utils'

interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

export default function DashboardOverview() {
  const { vendorId } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()

  // Centralized orders store - SINGLE SOURCE OF TRUTH
  const ordersStore = useOrdersStore()
  const {
    fetchOrders,
    isLoading: ordersLoading,
    getPaidOrders,
    getTotalRevenue,
    getNetRevenue,
    getTotalOrders,
    getAverageOrderValue,
    getTotalDiscounts,
    getTotalTax,
    getRevenueByDay,
    getRevenueByOrderType,
    getOrderCountByOrderType,
    getRecentOrders,
  } = ordersStore

  // Additional state for data not in orders store
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [customerCount, setCustomerCount] = useState(0)
  const [customerGrowth, setCustomerGrowth] = useState(0)
  const [revenueGrowth, setRevenueGrowth] = useState(0)
  const [ordersGrowth, setOrdersGrowth] = useState(0)
  const [checkoutData, setCheckoutData] = useState<{
    daily: Array<{
      date: string
      approved: number
      declined: number
      error: number
      total: number
      successRate: number
    }>
    totals: {
      approved: number
      declined: number
      error: number
      total: number
      successRate: number
      totalRevenue: number
      lostRevenue: number
    }
  }>({
    daily: [],
    totals: {
      approved: 0,
      declined: 0,
      error: 0,
      total: 0,
      successRate: 0,
      totalRevenue: 0,
      lostRevenue: 0,
    },
  })

  // Sync filters with orders store
  useEffect(() => {
    ordersStore.setFilters({
      orderTypes: filters.orderTypes,
      locationIds: filters.locationIds,
    })
  }, [filters.orderTypes, filters.locationIds])

  // Fetch orders when vendor/date changes
  useEffect(() => {
    if (vendorId) {
      fetchOrders(vendorId)
    }
  }, [vendorId, dateRange, fetchOrders])

  // Fetch additional data (growth metrics, customers, products)
  const fetchAdditionalData = useCallback(async () => {
    if (!vendorId) return

    const { start, end, startDate: startDateObj, endDate: endDateObj } = getDateRangeForQuery()

    // Previous period for growth calculation
    const periodMs = endDateObj.getTime() - startDateObj.getTime()
    const prevStartDate = new Date(startDateObj.getTime() - periodMs).toISOString()
    const prevEndDate = startDateObj.toISOString()

    try {
      // Fetch previous period orders for growth comparison
      const { data: prevOrdersData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('vendor_id', vendorId)
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .gte('created_at', prevStartDate)
        .lte('created_at', prevEndDate)

      const prevRevenue = prevOrdersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const prevOrderCount = prevOrdersData?.length || 0

      const currentRevenue = getTotalRevenue()
      const currentOrders = getTotalOrders()

      setRevenueGrowth(prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0)
      setOrdersGrowth(prevOrderCount > 0 ? ((currentOrders - prevOrderCount) / prevOrderCount) * 100 : 0)

      // Fetch customer counts
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)

      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)

      const { count: prevCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .gte('created_at', prevStartDate)
        .lte('created_at', prevEndDate)

      setCustomerCount(totalCustomers || 0)
      setCustomerGrowth(
        prevCustomers && prevCustomers > 0
          ? (((newCustomers || 0) - prevCustomers) / prevCustomers) * 100
          : 0
      )
    } catch (err) {
      console.error('Failed to fetch additional data:', err)
    }
  }, [vendorId, dateRange, getTotalRevenue, getTotalOrders])

  // Fetch checkout analytics data
  const fetchCheckoutAnalytics = useCallback(async () => {
    if (!vendorId) return

    const { start, end, startDate: startDateObj, endDate: endDateObj } = getDateRangeForQuery()

    try {
      const { data: checkoutAttempts, error } = await supabase
        .from('checkout_attempts')
        .select('status, total_amount, created_at, source')
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch checkout attempts:', error)
        return
      }

      if (!checkoutAttempts || checkoutAttempts.length === 0) {
        setCheckoutData({
          daily: [],
          totals: {
            approved: 0,
            declined: 0,
            error: 0,
            total: 0,
            successRate: 0,
            totalRevenue: 0,
            lostRevenue: 0,
          },
        })
        return
      }

      // Group by date
      const dailyMap = new Map<string, {
        approved: number
        declined: number
        error: number
        total: number
        approvedRevenue: number
        lostRevenue: number
      }>()

      // Generate all dates in range
      const dateStrings = generateDateRange(startDateObj, endDateObj)
      dateStrings.forEach(date => {
        dailyMap.set(date, { approved: 0, declined: 0, error: 0, total: 0, approvedRevenue: 0, lostRevenue: 0 })
      })

      // Aggregate data
      let totalApproved = 0
      let totalDeclined = 0
      let totalError = 0
      let totalRevenue = 0
      let lostRevenue = 0

      checkoutAttempts.forEach((attempt: { status: string; total_amount: number; created_at: string }) => {
        const date = format(new Date(attempt.created_at), 'yyyy-MM-dd')
        const dayData = dailyMap.get(date) || { approved: 0, declined: 0, error: 0, total: 0, approvedRevenue: 0, lostRevenue: 0 }

        dayData.total++

        if (attempt.status === 'approved') {
          dayData.approved++
          dayData.approvedRevenue += attempt.total_amount || 0
          totalApproved++
          totalRevenue += attempt.total_amount || 0
        } else if (attempt.status === 'declined') {
          dayData.declined++
          dayData.lostRevenue += attempt.total_amount || 0
          totalDeclined++
          lostRevenue += attempt.total_amount || 0
        } else if (attempt.status === 'error') {
          dayData.error++
          dayData.lostRevenue += attempt.total_amount || 0
          totalError++
          lostRevenue += attempt.total_amount || 0
        }

        dailyMap.set(date, dayData)
      })

      const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        approved: data.approved,
        declined: data.declined,
        error: data.error,
        total: data.total,
        successRate: data.total > 0 ? (data.approved / data.total) * 100 : 0,
      }))

      const total = totalApproved + totalDeclined + totalError

      setCheckoutData({
        daily,
        totals: {
          approved: totalApproved,
          declined: totalDeclined,
          error: totalError,
          total,
          successRate: total > 0 ? (totalApproved / total) * 100 : 0,
          totalRevenue,
          lostRevenue,
        },
      })
    } catch (err) {
      console.error('Error fetching checkout analytics:', err)
    }
  }, [vendorId, dateRange])

  // Fetch top products (requires order_items join)
  const fetchTopProducts = useCallback(async () => {
    if (!vendorId) return

    const paidOrders = getPaidOrders()
    const orderIds = paidOrders.map((o) => o.id)

    if (orderIds.length === 0) {
      setTopProducts([])
      return
    }

    try {
      // Fetch in small batches to avoid URL length limits
      const chunkSize = 20
      const chunks: string[][] = []
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize))
      }

      const allOrderItems: any[] = []
      const batchSize = 5

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        const chunkResults = await Promise.all(
          batch.map((chunk) =>
            supabase
              .from('order_items')
              .select('product_id, product_name, quantity, unit_price')
              .in('order_id', chunk)
          )
        )

        for (const { data, error } of chunkResults) {
          if (error) {
            console.error('Order items query error:', error)
            continue
          }
          if (data) allOrderItems.push(...data)
        }
      }

      // Aggregate by product
      const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>()

      allOrderItems.forEach((item) => {
        const id = item.product_id || item.product_name
        const qty = parseFloat(item.quantity || 0)
        const itemRevenue = qty * parseFloat(item.unit_price || 0)
        const existing = productMap.get(id) || { name: item.product_name, totalSold: 0, revenue: 0 }
        productMap.set(id, {
          name: item.product_name,
          totalSold: existing.totalSold + qty,
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
  }, [vendorId, getPaidOrders])

  // Fetch additional data when orders are loaded
  useEffect(() => {
    if (vendorId && !ordersLoading) {
      fetchAdditionalData()
      fetchTopProducts()
      fetchCheckoutAnalytics()
    }
  }, [vendorId, ordersLoading, fetchAdditionalData, fetchTopProducts, fetchCheckoutAnalytics])

  // Compute derived values from centralized store
  const paidOrders = getPaidOrders()
  const totalRevenue = getTotalRevenue()
  const netRevenue = getNetRevenue()
  const totalOrders = getTotalOrders()
  const avgOrderValue = getAverageOrderValue()
  const totalDiscounts = getTotalDiscounts()
  const totalTax = getTotalTax()

  // Gross sales = net revenue + discounts (reverse the discount)
  const grossSales = netRevenue + totalDiscounts

  // Revenue recognition: recognized = delivered, deferred = in transit
  const recognizedOrders = paidOrders.filter(
    (o) => o.status === 'completed' || o.status === 'delivered'
  )
  const deferredOrders = paidOrders.filter((o) =>
    ['shipped', 'ready', 'ready_to_ship', 'pending', 'in_transit', 'preparing', 'packing'].includes(o.status)
  )

  const recognizedRevenue = recognizedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const deferredRevenue = deferredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  // Order type breakdown for pie chart
  const revenueByType = getRevenueByOrderType()
  const countByType = getOrderCountByOrderType()
  const orderTypeBreakdown = Object.keys(revenueByType).map((type) => ({
    type,
    revenue: revenueByType[type] || 0,
    count: countByType[type] || 0,
  }))

  // Sales data for chart
  const { startDate, endDate } = getDateRangeForQuery()
  const dateStrings = generateDateRange(startDate, endDate)
  const revenueByDay = getRevenueByDay()
  const revenueByDayMap = new Map(revenueByDay.map((d) => [d.date, d]))

  const salesData = dateStrings.map((date) => ({
    date,
    revenue: revenueByDayMap.get(date)?.revenue || 0,
    orders: revenueByDayMap.get(date)?.orders || 0,
  }))

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
        <p className="text-zinc-500 text-xs lg:text-sm font-light mt-1">
          Welcome back. Here's what's happening with your store.
        </p>
      </div>

      {/* Filters */}
      <FilterBar showPaymentFilter={false} />

      {/* CASH FLOW SECTION - Money in the bank */}
      <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-4">
        <h2 className="text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider mb-3 lg:mb-4">
          Cash Flow (All Paid Orders)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
          <MetricCard title="Gross Sales" value={grossSales} icon={TrendingUp} format="currency" />
          <MetricCard title="Net Revenue" value={netRevenue} icon={DollarSign} format="currency" />
          <MetricCard title="Discounts Given" value={totalDiscounts} icon={Tag} format="currency" />
          <MetricCard title="Tax Collected" value={totalTax} icon={Receipt} format="currency" />
          <MetricCard title="Cash Collected" value={totalRevenue} icon={DollarSign} format="currency" />
          <MetricCard
            title="Paid Orders"
            value={totalOrders}
            change={ordersGrowth}
            icon={ShoppingCart}
          />
        </div>
      </div>

      {/* REVENUE RECOGNITION - ASC 606 P&L */}
      <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-4">
        <h2 className="text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider mb-3 lg:mb-4">
          Revenue Recognition (ASC 606)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
          <MetricCard
            title="Recognized Revenue"
            value={recognizedRevenue}
            change={revenueGrowth}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard title="Recognized Orders" value={recognizedOrders.length} icon={ShoppingCart} />
          <MetricCard title="Deferred Revenue" value={deferredRevenue} icon={Clock} format="currency" />
          <MetricCard title="In Transit" value={deferredOrders.length} icon={Clock} />
        </div>
        {deferredOrders.length > 0 && (
          <div className="mt-3 lg:mt-4 bg-slate-800/30 border border-slate-700/30 p-2 lg:p-3 text-slate-300 text-[10px] lg:text-xs font-light">
            <Clock className="inline w-3 h-3 mr-1 lg:mr-2" />
            {deferredOrders.length} orders in transit — {formatCurrency(deferredRevenue)} recognized
            upon delivery
          </div>
        )}
      </div>

      {/* OTHER METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4">
        <MetricCard
          title="Total Customers"
          value={customerCount}
          change={customerGrowth}
          icon={Users}
        />
        <MetricCard title="Avg Order Value" value={avgOrderValue} icon={TrendingUp} format="currency" />
        <MetricCard
          title="Discount Rate"
          value={grossSales ? (totalDiscounts / grossSales) * 100 : 0}
          icon={Tag}
          format="percent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <SalesChart data={salesData} metric="revenue" />
        <OrderTypePieChart data={orderTypeBreakdown} />
      </div>

      {/* Checkout Analytics */}
      <CheckoutSuccessChart data={checkoutData.daily} totals={checkoutData.totals} />

      {/* Top Products */}
      <TopProductsChart data={topProducts} />

      {/* Recent Orders */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 lg:p-6">
        <h3 className="text-xs lg:text-sm font-light text-white mb-4 lg:mb-6 tracking-wide">
          Recent Orders
        </h3>
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[500px]">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {getRecentOrders(10).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 lg:px-4 py-6 lg:py-8 text-center text-zinc-500 text-xs lg:text-sm">
                    No recent orders
                  </td>
                </tr>
              ) : (
                getRecentOrders(10).map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm font-light text-white">
                      {order.order_number}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-zinc-400 capitalize font-light">
                      {order.order_type.replace('_', ' ')}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4">
                      <span className="inline-flex px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs font-light bg-slate-700/30 text-slate-300 border border-slate-600/30">
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
