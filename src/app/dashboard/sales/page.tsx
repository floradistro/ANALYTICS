'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { SalesChart } from '@/components/charts/SalesChart'
import { TopProductsChart } from '@/components/charts/TopProductsChart'
import { FilterBar, useFilters, FilterState } from '@/components/filters/FilterBar'
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Package, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery, generateDateRange } from '@/lib/date-utils'

interface CategorySales {
  category: string
  revenue: number
  orders: number
}

interface SalesData {
  date: string
  revenue: number
  orders: number
  tax: number
}

interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

export default function SalesAnalyticsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const { filters, setFilters } = useFilters()
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])
  const [loading, setLoading] = useState(true)

  // Helper to fetch all rows with pagination
  const fetchAllRows = async <T,>(
    queryBuilder: () => ReturnType<typeof supabase.from>,
    select: string
  ): Promise<T[]> => {
    const pageSize = 1000
    let allData: T[] = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await queryBuilder()
        .select(select)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error
      if (data) {
        allData = [...allData, ...(data as T[])]
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
      page++
    }

    return allData
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
          .select('created_at, total_amount, tax_amount, order_type, status, payment_status')
          .eq('vendor_id', vendorId)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true })

        // Only filter by order type if selected
        if (filters.orderTypes.length > 0) {
          query = query.in('order_type', filters.orderTypes)
        }
        // Only filter by location if selected
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

      // Filter for recognized revenue only (ASC 606 compliant)
      // Revenue recognized when: paid AND (completed OR delivered)
      const orders = allOrders.filter(
        (o) => o.payment_status === 'paid' && (o.status === 'completed' || o.status === 'delivered')
      )

      // Group by date - initialize all dates in range for consistent charts
      const salesByDate = new Map<string, { revenue: number; orders: number; tax: number }>()
      const dateStrings = generateDateRange(startDate, endDate)

      // Initialize all dates with zero values
      dateStrings.forEach(date => {
        salesByDate.set(date, { revenue: 0, orders: 0, tax: 0 })
      })

      orders?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const existing = salesByDate.get(date) || { revenue: 0, orders: 0, tax: 0 }
        salesByDate.set(date, {
          revenue: existing.revenue + (order.total_amount || 0),
          orders: existing.orders + 1,
          tax: existing.tax + (order.tax_amount || 0),
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
      // Fetch all PAID order IDs with pagination (for top products)
      const pageSize = 1000
      let allOrderIds: string[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('id')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')  // Only count paid orders
          .neq('status', 'cancelled')     // Exclude cancelled
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
          allOrderIds = [...allOrderIds, ...data.map((o) => o.id)]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      const orderIds = allOrderIds

      if (orderIds.length === 0) {
        setTopProducts([])
        return
      }

      // Batch order IDs
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

      // Aggregate by product
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

  const fetchCategorySales = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch all PAID order IDs with pagination (for category sales)
      const pageSize = 1000
      let allOrderIds: string[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('id')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')  // Only count paid orders
          .neq('status', 'cancelled')     // Exclude cancelled
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
          allOrderIds = [...allOrderIds, ...data.map((o) => o.id)]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      const orderIds = allOrderIds

      if (orderIds.length === 0) {
        setCategorySales([])
        setLoading(false)
        return
      }

      // Batch order IDs
      const chunkSize = 50
      const chunks: string[][] = []
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize))
      }

      const allOrderItems: any[] = []
      for (const chunk of chunks) {
        const { data: chunkItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, product_name, quantity, unit_price')
          .in('order_id', chunk)

        if (itemsError) throw itemsError
        if (chunkItems) allOrderItems.push(...chunkItems)
      }

      const categoryMap = new Map<string, { revenue: number; orders: number }>()

      allOrderItems.forEach((item: any) => {
        const categoryName = item.product_name || 'Uncategorized'
        const itemRevenue = (item.quantity || 0) * (item.unit_price || 0)
        const existing = categoryMap.get(categoryName) || { revenue: 0, orders: 0 }
        categoryMap.set(categoryName, {
          revenue: existing.revenue + itemRevenue,
          orders: existing.orders + 1,
        })
      })

      const sortedCategories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setCategorySales(sortedCategories)
    } catch (error) {
      console.error('Failed to fetch category sales:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId, dateRange, filters])

  useEffect(() => {
    if (vendorId) {
      fetchSalesData()
      fetchTopProducts()
      fetchCategorySales()
    }
  }, [vendorId, filters, dateRange, fetchSalesData, fetchTopProducts, fetchCategorySales])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0)
  const totalTax = salesData.reduce((sum, d) => sum + d.tax, 0)
  const avgDailyRevenue = salesData.length > 0 ? totalRevenue / salesData.length : 0

  // Calculate trend (last 7 days vs previous 7 days)
  const last7Days = salesData.slice(-7)
  const prev7Days = salesData.slice(-14, -7)
  const last7Revenue = last7Days.reduce((sum, d) => sum + d.revenue, 0)
  const prev7Revenue = prev7Days.reduce((sum, d) => sum + d.revenue, 0)
  const revenueTrend = prev7Revenue > 0 ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-light text-white tracking-wide">Sales Analytics</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">Track your sales performance and trends</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        showDateFilter={false}
        showPaymentFilter={false}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${revenueTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {revenueTrend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(revenueTrend).toFixed(1)}%
            </div>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Total Revenue</p>
          <p className="text-2xl font-light text-white mt-1">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Tax Collected</p>
          <p className="text-2xl font-light text-white mt-1">{formatCurrency(totalTax)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Total Orders</p>
          <p className="text-2xl font-light text-white mt-1">{totalOrders.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Avg Daily Revenue</p>
          <p className="text-2xl font-light text-white mt-1">{formatCurrency(avgDailyRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Package className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Avg Order Value</p>
          <p className="text-2xl font-light text-white mt-1">
            {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesChart data={salesData} metric="revenue" />
        <SalesChart data={salesData} metric="orders" />
      </div>

      {/* Top Products */}
      <TopProductsChart data={topProducts} />

      {/* Category Sales */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h3 className="text-sm font-light text-white mb-6 tracking-wide">Sales by Category</h3>
        {categorySales.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">No category data available</div>
        ) : (
          <div className="space-y-4">
            {categorySales.map((cat, index) => {
              const maxRevenue = categorySales[0]?.revenue || 1
              const percentage = (cat.revenue / maxRevenue) * 100
              return (
                <div key={cat.category} className="flex items-center gap-4">
                  <span className="w-6 text-sm text-zinc-500">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-light text-white">{cat.category}</span>
                      <span className="text-sm text-zinc-400 font-light">{formatCurrency(cat.revenue)}</span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
