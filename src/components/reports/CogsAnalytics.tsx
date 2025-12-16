'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useCogsAnalyticsStore } from '@/stores/cogs-analytics.store'
import { format } from 'date-fns'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Percent,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { nivoTheme, colors } from '@/lib/theme'
import { AnalyticsModal } from '@/components/modals/AnalyticsModal'

export default function CogsAnalytics() {
  const { vendorId } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAnalytics, setSelectedAnalytics] = useState<any>(null)

  const {
    productProfitability,
    dailySalesProfit,
    supplierCostComparison,
    inventoryValuation,
    costTrends,
    isLoadingProducts,
    isLoadingDaily,
    isLoadingSuppliers,
    isLoadingInventory,
    isLoadingTrends,
    fetchProductProfitability,
    fetchDailySalesProfit,
    fetchSupplierCostComparison,
    fetchInventoryValuation,
    fetchCostTrends,
  } = useCogsAnalyticsStore()

  // Fetch all data on mount and date/location change
  useEffect(() => {
    if (vendorId) {
      const locationIds = filters.locationIds.length > 0 ? filters.locationIds : undefined
      fetchProductProfitability(vendorId, dateRange.start, dateRange.end, locationIds)
      fetchDailySalesProfit(vendorId, dateRange.start, dateRange.end, locationIds)
      fetchSupplierCostComparison(vendorId, locationIds)
      fetchInventoryValuation(vendorId, locationIds)
      fetchCostTrends(vendorId, undefined, locationIds)
    }
  }, [vendorId, dateRange, filters.locationIds, fetchProductProfitability, fetchDailySalesProfit, fetchSupplierCostComparison, fetchInventoryValuation, fetchCostTrends])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = dailySalesProfit.reduce((sum, day) => sum + day.subtotal, 0)
    const totalCOGS = dailySalesProfit.reduce((sum, day) => sum + day.cost_of_goods, 0)
    const totalProfit = dailySalesProfit.reduce((sum, day) => sum + day.gross_profit, 0)
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    const totalInventoryValue = inventoryValuation.reduce((sum, item) => sum + item.total_value, 0)
    const totalInventoryLCMValue = inventoryValuation.reduce((sum, item) => sum + item.total_lcm_value, 0)
    const totalInventoryUnits = inventoryValuation.reduce((sum, item) => sum + item.quantity, 0)

    return {
      totalRevenue,
      totalCOGS,
      totalProfit,
      overallMargin,
      totalInventoryValue,
      totalInventoryLCMValue,
      totalInventoryUnits,
    }
  }, [dailySalesProfit, inventoryValuation])

  // Top products by profitability
  const topProducts = useMemo(() => {
    return [...productProfitability]
      .sort((a, b) => b.estimated_profit - a.estimated_profit)
      .slice(0, 10)
  }, [productProfitability])

  // Category performance - average margin by category
  const categoryPerformance = useMemo(() => {
    const categoryMap = new Map<string, {
      revenue: number
      cost: number
      profit: number
      units: number
      grams: number
      tierCounts: Map<string, number> // Track frequency of each actual tier selection
    }>()

    for (const product of productProfitability) {
      const category = product.category_name || 'Uncategorized'
      const existing = categoryMap.get(category) || {
        revenue: 0,
        cost: 0,
        profit: 0,
        units: 0,
        grams: 0,
        tierCounts: new Map()
      }

      existing.revenue += product.revenue
      existing.cost += product.estimated_cost
      existing.profit += product.estimated_profit
      existing.units += product.units_sold
      existing.grams += product.total_grams || 0

      // Merge tier breakdown from this product into category totals
      if (product.tier_breakdown) {
        for (const [tierKey, count] of product.tier_breakdown.entries()) {
          existing.tierCounts.set(tierKey, (existing.tierCounts.get(tierKey) || 0) + count)
        }
      }

      categoryMap.set(category, existing)
    }

    return Array.from(categoryMap.entries())
      .map(([category, data]) => {
        // Find most common tier and build distribution
        let mostCommonTier = 'N/A'
        let maxCount = 0
        const totalTierCount = Array.from(data.tierCounts.values()).reduce((sum, count) => sum + count, 0)

        // Build distribution array sorted by count
        const tierDistribution = Array.from(data.tierCounts.entries())
          .map(([tier, count]) => ({
            tier,
            count,
            percentage: totalTierCount > 0 ? (count / totalTierCount) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count) // Sort by popularity

        // Get most common tier
        if (tierDistribution.length > 0) {
          mostCommonTier = tierDistribution[0].tier
          maxCount = tierDistribution[0].count
        }

        return {
          category,
          revenue: data.revenue,
          cost: data.cost,
          profit: data.profit,
          margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
          units: data.units,
          grams: data.grams,
          avgRevPerItem: data.units > 0 ? data.revenue / data.units : 0,
          avgRevPerGram: data.grams > 0 ? data.revenue / data.grams : 0,
          mostCommonTier,
          tierDistribution,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [productProfitability])

  // Product profitability breakdown by margin
  const profitabilityBreakdown = useMemo(() => {
    const highMargin = productProfitability.filter(p => p.margin_percentage >= 40)
    const mediumMargin = productProfitability.filter(p => p.margin_percentage >= 20 && p.margin_percentage < 40)
    const lowMargin = productProfitability.filter(p => p.margin_percentage < 20 && p.margin_percentage >= 0)
    const negative = productProfitability.filter(p => p.margin_percentage < 0)

    return [
      { range: 'High (40%+)', count: highMargin.length, revenue: highMargin.reduce((sum, p) => sum + p.revenue, 0) },
      { range: 'Medium (20-40%)', count: mediumMargin.length, revenue: mediumMargin.reduce((sum, p) => sum + p.revenue, 0) },
      { range: 'Low (0-20%)', count: lowMargin.length, revenue: lowMargin.reduce((sum, p) => sum + p.revenue, 0) },
      { range: 'Negative', count: negative.length, revenue: negative.reduce((sum, p) => sum + p.revenue, 0) },
    ]
  }, [productProfitability])

  // Supplier comparison - find best prices
  const supplierComparison = useMemo(() => {
    // Group by product
    const byProduct = new Map<string, typeof supplierCostComparison>()

    for (const item of supplierCostComparison) {
      const existing = byProduct.get(item.product_id) || []
      existing.push(item)
      byProduct.set(item.product_id, existing)
    }

    // Find products with multiple suppliers
    return Array.from(byProduct.entries())
      .filter(([_, suppliers]) => suppliers.length > 1)
      .map(([productId, suppliers]) => {
        const sorted = [...suppliers].sort((a, b) => a.avg_unit_cost - b.avg_unit_cost)
        const cheapest = sorted[0]
        const mostExpensive = sorted[sorted.length - 1]
        const savings = mostExpensive.avg_unit_cost - cheapest.avg_unit_cost
        const savingsPercent = (savings / mostExpensive.avg_unit_cost) * 100

        return {
          product_id: productId,
          product_name: cheapest.product_name,
          cheapest_supplier: cheapest.supplier_name,
          cheapest_cost: cheapest.avg_unit_cost,
          most_expensive_supplier: mostExpensive.supplier_name,
          most_expensive_cost: mostExpensive.avg_unit_cost,
          potential_savings: savings,
          savings_percent: savingsPercent,
        }
      })
      .sort((a, b) => b.potential_savings - a.potential_savings)
      .slice(0, 10)
  }, [supplierCostComparison])

  // Recent cost changes
  const recentCostChanges = useMemo(() => {
    return costTrends.slice(0, 10)
  }, [costTrends])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  const loading = isLoadingProducts || isLoadingDaily || isLoadingSuppliers || isLoadingInventory || isLoadingTrends

  return (
    <div className="space-y-4">
      {/* COGS Section Header */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h2 className="text-sm font-light text-white tracking-wide">Cost of Goods Sold (COGS) Analytics</h2>
        <p className="text-xs text-zinc-500 mt-1">Profitability, inventory valuation, and cost analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Total COGS</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(summaryMetrics.totalCOGS)}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Gross Profit</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(summaryMetrics.totalProfit)}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <Percent className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Avg Margin</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">
            {formatPercent(summaryMetrics.overallMargin)}
          </p>
        </div>

        <div
          className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm cursor-pointer hover:bg-zinc-900/50 transition-colors"
          onClick={() => {
            const totalImpairment = inventoryValuation.reduce((sum, item) => {
              const cost = item.average_cost || item.unit_cost
              return sum + ((cost - item.lcm_value) * item.quantity)
            }, 0)

            setSelectedAnalytics({
              type: 'inventory',
              items: inventoryValuation,
              totalQuantity: summaryMetrics.totalInventoryUnits,
              totalValue: summaryMetrics.totalInventoryValue,
              totalLCMValue: summaryMetrics.totalInventoryLCMValue,
              totalImpairment: totalImpairment,
            })
            setIsModalOpen(true)
          }}
        >
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <Package className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Inventory (Cost)</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">
            {formatCurrency(summaryMetrics.totalInventoryValue)}
          </p>
          <p className="text-[10px] text-green-600 mt-1">
            Market: {formatCurrency(summaryMetrics.totalInventoryLCMValue)}
          </p>
        </div>

        <div
          className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm cursor-pointer hover:bg-zinc-900/50 transition-colors"
          onClick={() => {
            const totalImpairment = inventoryValuation.reduce((sum, item) => {
              const cost = item.average_cost || item.unit_cost
              return sum + ((cost - item.lcm_value) * item.quantity)
            }, 0)

            setSelectedAnalytics({
              type: 'inventory',
              items: inventoryValuation,
              totalQuantity: summaryMetrics.totalInventoryUnits,
              totalValue: summaryMetrics.totalInventoryValue,
              totalLCMValue: summaryMetrics.totalInventoryLCMValue,
              totalImpairment: totalImpairment,
            })
            setIsModalOpen(true)
          }}
        >
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Inventory Units</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">
            {summaryMetrics.totalInventoryUnits.toLocaleString()}
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Products Tracked</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">
            {productProfitability.length}
          </p>
        </div>
      </div>

      {/* Daily Profit Trend Chart */}
      <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
        <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">
          Daily Profit Trend
        </h3>
        <div className="h-[200px] lg:h-[300px]">
          {loading || dailySalesProfit.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
              {loading ? 'Loading...' : 'No data available'}
            </div>
          ) : (
            <ResponsiveLine
              data={[
                {
                  id: 'Revenue',
                  data: dailySalesProfit.map((d) => ({ x: d.sale_date, y: d.subtotal })),
                },
                {
                  id: 'COGS',
                  data: dailySalesProfit.map((d) => ({ x: d.sale_date, y: d.cost_of_goods })),
                },
                {
                  id: 'Gross Profit',
                  data: dailySalesProfit.map((d) => ({ x: d.sale_date, y: d.gross_profit })),
                },
              ]}
              theme={nivoTheme}
              margin={{ top: 20, right: 120, bottom: 50, left: 70 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              curve="catmullRom"
              colors={['#cbd5e1', '#ef4444', '#10b981']}
              lineWidth={2.5}
              enablePoints={true}
              pointSize={6}
              pointColor="#18181b"
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              enableArea={false}
              enableGridX={false}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 12,
                format: (v) => {
                  try {
                    return format(new Date(v), 'MMM d')
                  } catch {
                    return v
                  }
                },
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 12,
                format: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
                tickValues: 5,
              }}
              useMesh={true}
              tooltip={({ point }) => {
                const dateStr = String(point.data.x)
                const value = Number(point.data.y)
                const dayData = dailySalesProfit.find(d => d.sale_date === dateStr)

                return (
                  <div className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded shadow-lg">
                    <div className="text-xs text-zinc-400 mb-1">
                      {format(new Date(dateStr), 'MMMM d, yyyy')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        <span className="text-xs text-zinc-300">Revenue:</span>
                        <span className="text-xs text-white font-medium">
                          {formatCurrency(dayData?.subtotal || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs text-zinc-300">COGS:</span>
                        <span className="text-xs text-white font-medium">
                          {formatCurrency(dayData?.cost_of_goods || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-zinc-300">Profit:</span>
                        <span className="text-xs text-white font-medium">
                          {formatCurrency(dayData?.gross_profit || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-700 mt-1">
                        <span className="text-xs text-zinc-400">Margin:</span>
                        <span className="text-xs text-emerald-400 font-medium">
                          {dayData?.subtotal && dayData.subtotal > 0
                            ? `${((dayData.gross_profit / dayData.subtotal) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Orders:</span>
                        <span className="text-xs text-white">{dayData?.order_count || 0}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'column',
                  translateX: 100,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 10,
                  symbolShape: 'circle',
                },
              ]}
              animate={true}
              motionConfig="gentle"
            />
          )}
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-900">
          <h3 className="text-sm font-light text-white tracking-wide">Performance by Category</h3>
          <p className="text-xs text-zinc-500 mt-1">Average margin and profitability for each product category</p>
        </div>
        <div className="overflow-x-auto">
          {categoryPerformance.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">
              {loading ? 'Loading...' : 'No category data available'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    COGS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Avg $/Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Avg $/g
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Units
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {categoryPerformance.map((category) => (
                  <tr
                    key={category.category}
                    className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAnalytics({
                        type: 'category',
                        name: category.category,
                        revenue: category.revenue,
                        cost: category.cost,
                        profit: category.profit,
                        margin: category.margin,
                        units: category.units,
                        grams: category.grams,
                        avgRevPerItem: category.avgRevPerItem,
                        avgRevPerGram: category.avgRevPerGram,
                        tierDistribution: category.tierDistribution,
                        dateRange: dateRange,
                      })
                      setIsModalOpen(true)
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-light text-white">
                      {category.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                      {formatCurrency(category.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right font-light">
                      {formatCurrency(category.cost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400 text-right font-light">
                      {formatCurrency(category.profit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-medium ${
                          category.margin >= 40
                            ? 'text-emerald-400'
                            : category.margin >= 20
                            ? 'text-yellow-400'
                            : category.margin >= 0
                            ? 'text-orange-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPercent(category.margin)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right font-light">
                      {formatCurrency(category.avgRevPerItem)}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400 text-right font-light">
                      {formatCurrency(category.avgRevPerGram)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                      {category.units.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Top 10 Products by Profit */}
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Top 10 Products by Profit</h3>
            <p className="text-xs text-zinc-500 mt-1">Highest gross profit contributors</p>
          </div>
          <div className="overflow-x-auto">
            {topProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-sm">
                {loading ? 'Loading...' : 'No product data available'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {topProducts.map((product) => (
                    <tr
                      key={product.product_id}
                      className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Convert tier_breakdown Map to TierData array
                        const tierDistribution = product.tier_breakdown
                          ? Array.from(product.tier_breakdown.entries()).map(([tier, count]) => {
                              const totalCount = Array.from(product.tier_breakdown!.values()).reduce((sum, c) => sum + c, 0)
                              return {
                                tier,
                                count,
                                percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
                              }
                            }).sort((a, b) => b.count - a.count)
                          : []

                        setSelectedAnalytics({
                          type: 'product',
                          name: product.product_name,
                          variantName: product.variant_name,
                          pricingTemplateName: product.pricing_template_name,
                          category: product.category_name || 'Unknown',
                          revenue: product.revenue,
                          cost: product.estimated_cost,
                          profit: product.estimated_profit,
                          margin: product.margin_percentage,
                          units: product.units_sold,
                          grams: product.total_grams || 0,
                          avgRevPerItem: product.units_sold > 0 ? product.revenue / product.units_sold : 0,
                          avgRevPerGram: (product.total_grams || 0) > 0 ? product.revenue / (product.total_grams || 0) : 0,
                          tierDistribution,
                          dateRange: dateRange,
                        })
                        setIsModalOpen(true)
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-light text-white max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{product.product_name}</span>
                          {product.pricing_template_name && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-sm whitespace-nowrap">
                              {product.pricing_template_name}
                            </span>
                          )}
                          {product.variant_name && (
                            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-sm whitespace-nowrap">
                              {product.variant_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">
                        {formatCurrency(product.estimated_profit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-light">
                        <span
                          className={
                            product.margin_percentage >= 40
                              ? 'text-green-400'
                              : product.margin_percentage >= 20
                              ? 'text-slate-300'
                              : product.margin_percentage >= 0
                              ? 'text-orange-400'
                              : 'text-red-400'
                          }
                        >
                          {formatPercent(product.margin_percentage)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Profitability Breakdown */}
        <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
          <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">
            Profitability Breakdown
          </h3>
          <div className="h-[250px]">
            {profitabilityBreakdown.length === 0 || loading ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                {loading ? 'Loading...' : 'No data available'}
              </div>
            ) : (
              <ResponsiveBar
                data={profitabilityBreakdown}
                keys={['count']}
                indexBy="range"
                theme={nivoTheme}
                margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                padding={0.4}
                colors={['#cbd5e1']}
                borderRadius={5}
                enableGridX={false}
                enableGridY={true}
                gridYValues={5}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 12,
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 12,
                  legend: 'Products',
                  legendPosition: 'middle',
                  legendOffset: -50,
                }}
                enableLabel={true}
                label={(d) => `${d.value}`}
                labelTextColor="#18181b"
                animate={true}
                motionConfig="gentle"
              />
            )}
          </div>
        </div>
      </div>

      {/* Supplier Cost Comparison */}
      {supplierComparison.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Supplier Cost Comparison</h3>
            <p className="text-xs text-zinc-500 mt-1">Products with multiple suppliers - potential savings</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Best Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Highest Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Savings
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {supplierComparison.map((item) => (
                  <tr key={item.product_id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-light text-white max-w-xs truncate">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400 font-light">{item.cheapest_supplier}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                      {formatCurrency(item.cheapest_cost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 font-light">{item.most_expensive_supplier}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                      {formatCurrency(item.most_expensive_cost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-light">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">{formatCurrency(item.potential_savings)}</span>
                        <span className="text-zinc-500 text-xs">({formatPercent(item.savings_percent)})</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Cost Changes */}
      {recentCostChanges.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Recent Cost Changes</h3>
            <p className="text-xs text-zinc-500 mt-1">Latest product cost updates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Old Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    New Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recentCostChanges.map((change, index) => (
                  <tr key={`${change.product_id}-${index}`} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-400 font-light">
                      {format(new Date(change.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm font-light text-white max-w-xs truncate">
                      {change.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                      {change.old_cost_price !== null ? formatCurrency(change.old_cost_price) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-light">
                      {formatCurrency(change.new_cost_price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-light">
                      <div className="flex items-center justify-end gap-1">
                        {change.change_amount > 0 ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-red-400">
                              +{formatCurrency(change.change_amount)}
                            </span>
                          </>
                        ) : change.change_amount < 0 ? (
                          <>
                            <ArrowDownRight className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">
                              {formatCurrency(change.change_amount)}
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                        {change.change_percentage !== 0 && (
                          <span className="text-zinc-500 text-xs">
                            ({change.change_percentage > 0 ? '+' : ''}
                            {formatPercent(change.change_percentage)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 font-light">
                      {change.change_reason || 'No reason provided'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Valuation by Location */}
      {inventoryValuation.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Inventory Valuation Summary</h3>
            <p className="text-xs text-zinc-500 mt-1">Current inventory value by location (Lower of Cost or Market method)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Avg Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    NRV
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    LCM Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Total (LCM)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {inventoryValuation
                  .sort((a, b) => b.total_lcm_value - a.total_lcm_value)
                  .slice(0, 20)
                  .map((item, index) => {
                    const isImpaired = item.lcm_value < (item.average_cost || item.unit_cost)
                    return (
                      <tr key={`${item.product_id}-${item.location_id}-${index}`} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-zinc-400 font-light">{item.location_name}</td>
                        <td className="px-4 py-3 text-sm font-light text-white max-w-xs truncate">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">
                          {formatCurrency(item.average_cost || item.unit_cost)}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-400 text-right font-light">
                          {item.nrv_per_unit > 0 ? formatCurrency(item.nrv_per_unit) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-light ${isImpaired ? 'text-yellow-400' : 'text-zinc-300'}`}>
                          {formatCurrency(item.lcm_value)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-light ${isImpaired ? 'text-yellow-300' : 'text-slate-300'}`}>
                          {formatCurrency(item.total_lcm_value)}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm font-light text-white">
                    Total (Top 20)
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">
                    {formatCurrency(
                      inventoryValuation
                        .sort((a, b) => b.total_lcm_value - a.total_lcm_value)
                        .slice(0, 20)
                        .reduce((sum, item) => sum + item.total_lcm_value, 0)
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-xs text-zinc-500">
                    Book Value (Cost Basis)
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400 text-right">
                    {formatCurrency(
                      inventoryValuation
                        .sort((a, b) => b.total_lcm_value - a.total_lcm_value)
                        .slice(0, 20)
                        .reduce((sum, item) => sum + item.total_value, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={selectedAnalytics}
      />
    </div>
  )
}
