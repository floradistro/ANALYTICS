'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useOrdersStore } from '@/stores/orders.store'
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

interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

export default function SalesAnalyticsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()

  // Centralized orders store - SINGLE SOURCE OF TRUTH
  const ordersStore = useOrdersStore()
  const {
    fetchOrders,
    isLoading: ordersLoading,
    getPaidOrders,
    getNetRevenue,
    getTotalOrders,
    getTotalTax,
    getRevenueByDay,
  } = ordersStore

  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])
  const [loading, setLoading] = useState(true)

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
          if (error) continue
          if (data) allOrderItems.push(...data)
        }
      }

      // Aggregate by product
      const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>()

      allOrderItems.forEach((item) => {
        const id = item.product_id || item.product_name
        const itemRevenue = (item.quantity || 0) * (item.unit_price || 0)
        const existing = productMap.get(id) || { name: item.product_name, totalSold: 0, revenue: 0 }
        productMap.set(id, {
          name: item.product_name,
          totalSold: existing.totalSold + (item.quantity || 0),
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

  // Fetch category sales (requires order_items + products + categories join)
  const fetchCategorySales = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)

    const paidOrders = getPaidOrders()
    const orderIds = paidOrders.map((o) => o.id)

    if (orderIds.length === 0) {
      setCategorySales([])
      setLoading(false)
      return
    }

    try {
      // Fetch categories for lookup
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .or(`vendor_id.is.null,vendor_id.eq.${vendorId}`)

      const categoryLookup = new Map<string, string>()
      categoriesData?.forEach((cat) => categoryLookup.set(cat.id, cat.name))

      // Fetch products with their category IDs
      const { data: productsData } = await supabase
        .from('products')
        .select('id, primary_category_id')
        .eq('vendor_id', vendorId)

      const productCategoryMap = new Map<string, string>()
      productsData?.forEach((p) => {
        if (p.primary_category_id) {
          productCategoryMap.set(p.id, p.primary_category_id)
        }
      })

      // Fetch order items in batches
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
          if (error) continue
          if (data) allOrderItems.push(...data)
        }
      }

      const categoryRevenueMap = new Map<string, { revenue: number; orders: number }>()

      allOrderItems.forEach((item: any) => {
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
  }, [vendorId, getPaidOrders])

  // Fetch additional data when orders are loaded
  useEffect(() => {
    if (vendorId && !ordersLoading) {
      fetchTopProducts()
      fetchCategorySales()
    }
  }, [vendorId, ordersLoading, fetchTopProducts, fetchCategorySales])

  // Compute values from centralized store
  const netRevenue = getNetRevenue()
  const totalOrders = getTotalOrders()
  const totalTax = getTotalTax()

  // Build sales data for charts
  const { startDate, endDate } = getDateRangeForQuery()
  const dateStrings = generateDateRange(startDate, endDate)
  const revenueByDay = getRevenueByDay()
  const revenueByDayMap = new Map(revenueByDay.map((d) => [d.date, d]))

  // Get tax by day from paid orders
  const paidOrders = getPaidOrders()
  const taxByDay = new Map<string, number>()
  paidOrders.forEach((o) => {
    const date = o.created_at.split('T')[0]
    taxByDay.set(date, (taxByDay.get(date) || 0) + (o.tax_amount || 0))
  })

  const salesData = dateStrings.map((date) => ({
    date,
    revenue: revenueByDayMap.get(date)?.revenue || 0,
    orders: revenueByDayMap.get(date)?.orders || 0,
    tax: taxByDay.get(date) || 0,
  }))

  const avgDailyRevenue = salesData.length > 0 ? netRevenue / salesData.length : 0

  // Calculate trend (last 7 days vs previous 7 days)
  const last7Days = salesData.slice(-7)
  const prev7Days = salesData.slice(-14, -7)
  const last7Revenue = last7Days.reduce((sum, d) => sum + d.revenue, 0)
  const prev7Revenue = prev7Days.reduce((sum, d) => sum + d.revenue, 0)
  const revenueTrend = prev7Revenue > 0 ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 : 0

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-light text-white tracking-wide">Sales Analytics</h1>
          <p className="text-zinc-500 text-xs lg:text-sm font-light mt-1">
            Track your sales performance and trends
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar showPaymentFilter={false} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
            </div>
            <div
              className={`flex items-center gap-0.5 lg:gap-1 text-[10px] lg:text-sm ${
                revenueTrend >= 0 ? 'text-slate-300' : 'text-zinc-500'
              }`}
            >
              {revenueTrend >= 0 ? (
                <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
              ) : (
                <TrendingDown className="w-3 h-3 lg:w-4 lg:h-4" />
              )}
              {Math.abs(revenueTrend).toFixed(1)}%
            </div>
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">
            Net Revenue
          </p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(netRevenue)}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Receipt className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">
            Tax Collected
          </p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(totalTax)}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">
            Total Orders
          </p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">
            {totalOrders.toLocaleString()}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">
            Avg Daily
          </p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(avgDailyRevenue)}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-6 col-span-2 sm:col-span-1">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Package className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-4">
            Avg Order Value
          </p>
          <p className="text-lg lg:text-2xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(totalOrders > 0 ? netRevenue / totalOrders : 0)}
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
        <h3 className="text-xs lg:text-sm font-light text-white mb-4 lg:mb-6 tracking-wide">
          Sales by Category
        </h3>
        {categorySales.length === 0 ? (
          <div className="text-center py-6 lg:py-8 text-zinc-500 text-xs lg:text-sm">
            No category data available
          </div>
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
                      <span className="text-xs lg:text-sm font-light text-white truncate">
                        {cat.category}
                      </span>
                      <span className="text-xs lg:text-sm text-zinc-400 font-light flex-shrink-0">
                        {formatCurrency(cat.revenue)}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden">
                      <div className="h-full bg-slate-400" style={{ width: `${percentage}%` }} />
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
