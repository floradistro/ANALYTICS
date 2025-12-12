'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { SalesChart } from '@/components/charts/SalesChart'
import { TopProductsChart } from '@/components/charts/TopProductsChart'
import { FilterBar } from '@/components/filters/FilterBar'
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
  const { dateRange, filters } = useDashboardStore()
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
          .select('created_at, total_amount, subtotal, tax_amount, discount_amount, affiliate_discount_amount, metadata, order_type, status, payment_status')
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

      // For Sales Analytics: show ALL paid orders (cash collected)
      // This differs from Financial Reports which uses ASC 606 recognized revenue
      const orders = allOrders.filter(
        (o) => o.payment_status === 'paid' && o.status !== 'cancelled'
      )

      // Helper: Calculate net revenue (subtotal - discounts)
      const getNetRevenue = (order: any): number => {
        const subtotal = parseFloat(order.subtotal || 0)
        const discounts =
          parseFloat(order.discount_amount || 0) +
          parseFloat(order.affiliate_discount_amount || 0) +
          parseFloat(order.metadata?.loyalty_discount_amount || 0) +
          parseFloat(order.metadata?.campaign_discount_amount || 0)
        return subtotal - discounts
      }

      // Debug logging
      const debugNetRevenue = orders.reduce((sum, o) => sum + getNetRevenue(o), 0)
      console.log('[SalesData] Orders:', orders.length, '| Net Revenue:', debugNetRevenue.toFixed(2))

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
          revenue: existing.revenue + getNetRevenue(order),
          orders: existing.orders + 1,
          tax: existing.tax + parseFloat(order.tax_amount || 0),
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
      console.log('[TopProducts] Found order IDs:', orderIds.length)

      if (orderIds.length === 0) {
        console.log('[TopProducts] No orders found, returning empty')
        setTopProducts([])
        return
      }

      // Batch order IDs - use larger chunks and parallel fetching
      const chunkSize = 200
      const chunks: string[][] = []
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        chunks.push(orderIds.slice(i, i + chunkSize))
      }

      console.log('[TopProducts] Fetching order items in', chunks.length, 'parallel chunks')

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
        if (error) {
          console.error('[TopProducts] Error fetching order items:', error)
          throw error
        }
        if (data) allOrderItems.push(...data)
      }

      console.log('[TopProducts] Found order items:', allOrderItems.length)

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
      console.log('[CategorySales] Found order IDs:', orderIds.length)

      if (orderIds.length === 0) {
        console.log('[CategorySales] No orders found, returning empty')
        setCategorySales([])
        setLoading(false)
        return
      }

      // Fetch categories for lookup
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .or(`vendor_id.is.null,vendor_id.eq.${vendorId}`)

      console.log('[CategorySales] Found categories:', categoriesData?.length || 0)

      const categoryLookup = new Map<string, string>()
      categoriesData?.forEach(cat => categoryLookup.set(cat.id, cat.name))

      // Fetch products with their category IDs
      const { data: productsData } = await supabase
        .from('products')
        .select('id, primary_category_id')
        .eq('vendor_id', vendorId)

      console.log('[CategorySales] Found products:', productsData?.length || 0)

      const productCategoryMap = new Map<string, string>()
      productsData?.forEach(p => {
        if (p.primary_category_id) {
          productCategoryMap.set(p.id, p.primary_category_id)
        }
      })

      console.log('[CategorySales] Products with categories:', productCategoryMap.size)

      // Batch order IDs - use larger chunks and parallel fetching
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
        if (error) {
          console.error('[CategorySales] Error fetching order items:', error)
          throw error
        }
        if (data) allOrderItems.push(...data)
      }

      console.log('[CategorySales] Found order items:', allOrderItems.length)

      const categoryRevenueMap = new Map<string, { revenue: number; orders: number }>()

      allOrderItems.forEach((item: any) => {
        // Look up the category through product -> category chain
        const categoryId = productCategoryMap.get(item.product_id)
        const categoryName = categoryId ? categoryLookup.get(categoryId) : null
        const finalCategory = categoryName || 'Uncategorized'

        const itemRevenue = (item.quantity || 0) * (item.unit_price || 0)
        const existing = categoryRevenueMap.get(finalCategory) || { revenue: 0, orders: 0 }
        categoryRevenueMap.set(finalCategory, {
          revenue: existing.revenue + itemRevenue,
          orders: existing.orders + 1,
        })
      })

      const sortedCategories = Array.from(categoryRevenueMap.entries())
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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-light text-white tracking-wide">Sales Analytics</h1>
          <p className="text-zinc-500 text-xs lg:text-sm font-light mt-1">Track your sales performance and trends</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        showPaymentFilter={false}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
            </div>
            <div className={`flex items-center gap-0.5 lg:gap-1 text-[10px] lg:text-sm ${revenueTrend >= 0 ? 'text-slate-300' : 'text-zinc-500'}`}>
              {revenueTrend >= 0 ? <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" /> : <TrendingDown className="w-3 h-3 lg:w-4 lg:h-4" />}
              {Math.abs(revenueTrend).toFixed(1)}%
            </div>
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">Net Revenue</p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Receipt className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">Tax Collected</p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totalTax)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">Total Orders</p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">{totalOrders.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">Avg Daily</p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(avgDailyRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6 col-span-2 sm:col-span-1">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Package className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">Avg Order Value</p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <SalesChart data={salesData} metric="revenue" />
        <SalesChart data={salesData} metric="orders" />
      </div>

      {/* Top Products */}
      <TopProductsChart data={topProducts} />

      {/* Category Sales */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 lg:p-6">
        <h3 className="text-xs lg:text-sm font-light text-white mb-4 lg:mb-6 tracking-wide">Sales by Category</h3>
        {categorySales.length === 0 ? (
          <div className="text-center py-6 lg:py-8 text-zinc-500 text-xs lg:text-sm">No category data available</div>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            {categorySales.map((cat, index) => {
              const maxRevenue = categorySales[0]?.revenue || 1
              const percentage = (cat.revenue / maxRevenue) * 100
              return (
                <div key={cat.category} className="flex items-center gap-2 lg:gap-4">
                  <span className="w-5 lg:w-6 text-xs lg:text-sm text-zinc-500">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs lg:text-sm font-light text-white truncate">{cat.category}</span>
                      <span className="text-xs lg:text-sm text-zinc-400 font-light flex-shrink-0">{formatCurrency(cat.revenue)}</span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-slate-400"
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
