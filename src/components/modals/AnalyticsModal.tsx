'use client'

import React, { useState } from 'react'
import { X, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { formatCurrency } from '@/lib/theme'
import { format } from 'date-fns'

// Analytics modal for expanded category/product views
interface TierData {
  tier: string
  count: number
  percentage: number
}

interface CategoryAnalytics {
  type: 'category'
  name: string
  revenue: number
  cost: number
  profit: number
  margin: number
  units: number
  grams: number
  avgRevPerItem: number
  avgRevPerGram: number
  tierDistribution: TierData[]
  dateRange?: { start: Date; end: Date }
}

interface ProductAnalytics {
  type: 'product'
  name: string
  variantName?: string | null
  pricingTemplateName?: string | null
  category: string
  revenue: number
  cost: number
  profit: number
  margin: number
  units: number
  grams: number
  avgRevPerItem: number
  avgRevPerGram: number
  tierDistribution: TierData[]
  dateRange?: { start: Date; end: Date }
}

interface InventoryItem {
  product_id: string
  product_name: string
  location_id: string
  location_name: string
  category_name?: string
  quantity: number
  unit_cost: number
  average_cost: number
  nrv_per_unit: number
  lcm_value: number
  total_value: number
  total_lcm_value: number
}

interface InventoryAnalytics {
  type: 'inventory'
  items: InventoryItem[]
  totalQuantity: number
  totalValue: number
  totalLCMValue: number
  totalImpairment: number
}

type AnalyticsData = CategoryAnalytics | ProductAnalytics | InventoryAnalytics

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  data: AnalyticsData | null
}

export function AnalyticsModal({ isOpen, onClose, data }: AnalyticsModalProps) {
  if (!isOpen || !data) return null

  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set())

  // Handle inventory modal
  if (data.type === 'inventory') {
    const inventoryData = data as InventoryAnalytics
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Inventory Valuation Details</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Complete inventory breakdown by location and product</p>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="text-xs text-zinc-400 mb-1">Total Quantity</div>
                <div className="text-2xl font-semibold text-white">{inventoryData.totalQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="text-xs text-zinc-400 mb-1">Book Value (Cost)</div>
                <div className="text-2xl font-semibold text-blue-400">{formatCurrency(inventoryData.totalValue)}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="text-xs text-zinc-400 mb-1">Market Value</div>
                <div className="text-2xl font-semibold text-green-400">{formatCurrency(inventoryData.totalLCMValue)}</div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="border-b border-zinc-700">
                    <tr className="bg-zinc-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '18%' }}>Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '22%' }}>Product</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '10%' }}>Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '10%' }}>Avg Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '13%' }}>Avg Sale Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '13%' }}>Book Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider" style={{ width: '14%' }}>Market Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group items by category, then by location
                      const categoryGroups = new Map<string, Map<string, InventoryItem[]>>()
                      inventoryData.items.forEach(item => {
                        const category = item.category_name || 'Uncategorized'
                        const location = item.location_name || 'Unknown'

                        if (!categoryGroups.has(category)) {
                          categoryGroups.set(category, new Map())
                        }
                        const locationMap = categoryGroups.get(category)!
                        if (!locationMap.has(location)) {
                          locationMap.set(location, [])
                        }
                        locationMap.get(location)!.push(item)
                      })

                      // Sort categories by total market value
                      const sortedCategories = Array.from(categoryGroups.entries())
                        .map(([category, locationMap]) => {
                          const allItems = Array.from(locationMap.values()).flat()
                          return {
                            category,
                            locationMap,
                            totalQty: allItems.reduce((sum, item) => sum + item.quantity, 0),
                            totalBookValue: allItems.reduce((sum, item) => sum + item.total_value, 0),
                            totalMarketValue: allItems.reduce((sum, item) => sum + item.total_lcm_value, 0),
                          }
                        })
                        .sort((a, b) => b.totalMarketValue - a.totalMarketValue)

                      return sortedCategories.map(({ category, locationMap, totalQty, totalBookValue, totalMarketValue }) => (
                        <React.Fragment key={category}>
                          {/* Category Header Row */}
                          <tr className="bg-zinc-700/30">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-white uppercase tracking-wide">{category}</span>
                                <div className="flex gap-8 text-xs text-zinc-400 tabular-nums">
                                  <span>Qty: {totalQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  <span>Book: {formatCurrency(totalBookValue)}</span>
                                  <span className="text-green-400">Market: {formatCurrency(totalMarketValue)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {/* Location Groups within Category */}
                          {Array.from(locationMap.entries())
                            .sort((a, b) => {
                              const aTotal = a[1].reduce((sum, item) => sum + item.total_lcm_value, 0)
                              const bTotal = b[1].reduce((sum, item) => sum + item.total_lcm_value, 0)
                              return bTotal - aTotal
                            })
                            .map(([location, items]) => {
                              const locationQty = items.reduce((sum, item) => sum + item.quantity, 0)
                              const locationBook = items.reduce((sum, item) => sum + item.total_value, 0)
                              const locationMarket = items.reduce((sum, item) => sum + item.total_lcm_value, 0)

                              return (
                                <React.Fragment key={`${category}-${location}`}>
                                  {/* Location Subheader */}
                                  <tr className="bg-zinc-800/40">
                                    <td colSpan={7} className="px-4 py-2 pl-8">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-zinc-300">{location}</span>
                                        <div className="flex gap-6 text-xs text-zinc-500 tabular-nums">
                                          <span>Qty: {locationQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          <span>Book: {formatCurrency(locationBook)}</span>
                                          <span className="text-green-400">Market: {formatCurrency(locationMarket)}</span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  {/* Location Items */}
                                  {items
                                    .sort((a, b) => b.total_lcm_value - a.total_lcm_value)
                                    .map((item, idx) => (
                                    <tr key={`${item.product_id}-${item.location_id}-${idx}`} className="hover:bg-zinc-800/30 transition-colors border-t border-zinc-800/50">
                                      <td className="px-4 py-3 text-sm text-zinc-400 pl-12">{item.location_name}</td>
                                      <td className="px-4 py-3 text-sm text-white">{item.product_name}</td>
                                      <td className="px-4 py-3 text-sm text-zinc-400 text-right tabular-nums">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="px-4 py-3 text-sm text-zinc-400 text-right tabular-nums">{formatCurrency(item.average_cost || item.unit_cost)}</td>
                                      <td className="px-4 py-3 text-sm text-blue-400 text-right tabular-nums">
                                        {item.nrv_per_unit > 0 ? formatCurrency(item.nrv_per_unit) : '-'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-zinc-300 text-right tabular-nums">{formatCurrency(item.total_value)}</td>
                                      <td className="px-4 py-3 text-sm text-green-400 text-right tabular-nums">
                                        {formatCurrency(item.total_lcm_value)}
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              )
                            })
                          }
                        </React.Fragment>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isCategory = data.type === 'category'
  const productData = data as ProductAnalytics
  const title = isCategory ? `Category: ${data.name}` : `Product: ${data.name}`
  const subtitle = isCategory ? 'Category Performance Analytics' : `${productData.category} • Product Analytics`
  const variantName = !isCategory ? productData.variantName : null
  const pricingTemplateName = !isCategory ? productData.pricingTemplateName : null

  // Group tiers by base tier name (without pricing template)
  const groupedTiers = new Map<string, Array<{ tier: string; templateName: string | null; count: number; percentage: number }>>()

  for (const tier of data.tierDistribution) {
    const [tierName, pricingTemplate] = tier.tier.includes('::')
      ? tier.tier.split('::')
      : [tier.tier, null]

    if (!groupedTiers.has(tierName)) {
      groupedTiers.set(tierName, [])
    }

    groupedTiers.get(tierName)!.push({
      tier: tierName,
      templateName: pricingTemplate,
      count: tier.count,
      percentage: tier.percentage
    })
  }

  // Convert to sorted array
  const sortedGroupedTiers = Array.from(groupedTiers.entries())
    .map(([tierName, variants]) => ({
      tierName,
      variants,
      totalCount: variants.reduce((sum, v) => sum + v.count, 0),
      totalPercentage: variants.reduce((sum, v) => sum + v.percentage, 0)
    }))
    .sort((a, b) => b.totalCount - a.totalCount)

  const toggleTier = (tierName: string) => {
    const newExpanded = new Set(expandedTiers)
    if (newExpanded.has(tierName)) {
      newExpanded.delete(tierName)
    } else {
      newExpanded.add(tierName)
    }
    setExpandedTiers(newExpanded)
  }

  // Prepare data for charts - group by base tier (without pricing template)
  const chartData = sortedGroupedTiers.slice(0, 8).map((tierGroup) => ({
    id: tierGroup.tierName,
    label: tierGroup.tierName,
    value: tierGroup.totalCount,
    percentage: tierGroup.totalPercentage,
  }))

  const barData = sortedGroupedTiers.slice(0, 10).map((tierGroup) => ({
    tier: tierGroup.tierName,
    sales: tierGroup.totalCount,
  }))

  const profitabilityData = [
    { id: 'Revenue', label: 'Revenue', value: data.revenue },
    { id: 'Cost', label: 'COGS', value: data.cost },
    { id: 'Profit', label: 'Profit', value: data.profit },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                {pricingTemplateName && (
                  <span className="px-2.5 py-1 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-sm">
                    {pricingTemplateName}
                  </span>
                )}
                {variantName && (
                  <span className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-sm">
                    {variantName}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>
              {data.dateRange && (
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                  <Calendar size={14} />
                  <span>
                    {format(new Date(data.dateRange.start), 'MMM d, yyyy')} - {format(new Date(data.dateRange.end), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Total Revenue</div>
              <div className="text-2xl font-semibold text-white">{formatCurrency(data.revenue)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Total COGS</div>
              <div className="text-2xl font-semibold text-orange-400">{formatCurrency(data.cost)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Gross Profit</div>
              <div className={`text-2xl font-semibold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(data.profit)}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Profit Margin</div>
              <div className={`text-2xl font-semibold ${
                data.margin >= 50 ? 'text-green-400' : data.margin >= 30 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {data.margin.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
              <div className="text-xs text-zinc-400 mb-1">Units Sold</div>
              <div className="text-lg font-medium text-zinc-200">{data.units.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
              <div className="text-xs text-zinc-400 mb-1">Total Grams</div>
              <div className="text-lg font-medium text-zinc-200">{data.grams.toLocaleString()}g</div>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
              <div className="text-xs text-zinc-400 mb-1">Avg Rev/Item</div>
              <div className="text-lg font-medium text-zinc-200">{formatCurrency(data.avgRevPerItem)}</div>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
              <div className="text-xs text-zinc-400 mb-1">Avg Rev/Gram</div>
              <div className="text-lg font-medium text-blue-400">{formatCurrency(data.avgRevPerGram)}</div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-6">
            {/* Tier Distribution - Pie Chart */}
            {data.tierDistribution.length > 0 && (
              <div className="bg-zinc-800/30 rounded-lg p-6 border border-zinc-700/30">
                <h3 className="text-lg font-semibold text-white mb-4">Tier Distribution</h3>
                <div className="h-80">
                  <ResponsivePie
                    data={chartData}
                    margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
                    innerRadius={0.6}
                    padAngle={1}
                    cornerRadius={3}
                    activeOuterRadiusOffset={8}
                    colors={{ scheme: 'category10' }}
                    borderWidth={1}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor="#e4e4e7"
                    arcLinkLabelsThickness={2}
                    arcLinkLabelsColor={{ from: 'color' }}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor="#000"
                    arcLabel={(d) => `${d.data.percentage.toFixed(0)}%`}
                    legends={[
                      {
                        anchor: 'right',
                        direction: 'column',
                        justify: false,
                        translateX: 100,
                        translateY: 0,
                        itemsSpacing: 8,
                        itemWidth: 80,
                        itemHeight: 20,
                        itemTextColor: '#a1a1aa',
                        itemDirection: 'left-to-right',
                        itemOpacity: 1,
                        symbolSize: 14,
                        symbolShape: 'circle',
                      },
                    ]}
                    theme={{
                      background: 'transparent',
                      text: {
                        fontSize: 12,
                        fill: '#e4e4e7',
                      },
                      tooltip: {
                        container: {
                          background: '#18181b',
                          color: '#e4e4e7',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid #3f3f46',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                        },
                      },
                    }}
                    tooltip={({ datum }) => (
                      <div className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded shadow-lg">
                        <div className="text-xs font-medium text-white mb-1">{datum.id}</div>
                        <div className="text-xs text-zinc-400">
                          {datum.value.toLocaleString()} sales ({datum.data.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Tier Sales - Bar Chart */}
            {data.tierDistribution.length > 0 && (
              <div className="bg-zinc-800/30 rounded-lg p-6 border border-zinc-700/30">
                <h3 className="text-lg font-semibold text-white mb-4">Tier Sales Volume</h3>
                <div className="h-80">
                  <ResponsiveBar
                    data={barData}
                    keys={['sales']}
                    indexBy="tier"
                    margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={{ scheme: 'nivo' }}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                      legend: 'Tier Size',
                      legendPosition: 'middle',
                      legendOffset: 50,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: 'Number of Sales',
                      legendPosition: 'middle',
                      legendOffset: -50,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor="#000"
                    theme={{
                      background: 'transparent',
                      text: {
                        fontSize: 12,
                        fill: '#e4e4e7',
                      },
                      axis: {
                        domain: {
                          line: {
                            stroke: '#52525b',
                            strokeWidth: 1,
                          },
                        },
                        ticks: {
                          line: {
                            stroke: '#52525b',
                            strokeWidth: 1,
                          },
                          text: {
                            fill: '#a1a1aa',
                          },
                        },
                        legend: {
                          text: {
                            fill: '#e4e4e7',
                            fontSize: 13,
                          },
                        },
                      },
                      grid: {
                        line: {
                          stroke: '#3f3f46',
                          strokeWidth: 1,
                        },
                      },
                      tooltip: {
                        container: {
                          background: '#18181b',
                          color: '#e4e4e7',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid #3f3f46',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                        },
                      },
                    }}
                    tooltip={({ indexValue, value }) => (
                      <div className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded shadow-lg">
                        <div className="text-xs font-medium text-white mb-1">{indexValue}</div>
                        <div className="text-xs text-zinc-400">
                          {value.toLocaleString()} sales
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Top Tiers Ranked List with Accordion */}
            {data.tierDistribution.length > 0 && (
              <div className="bg-zinc-800/30 rounded-lg p-6 border border-zinc-700/30">
                <h3 className="text-lg font-semibold text-white mb-4">Most Popular Tiers</h3>
                <div className="space-y-2">
                  {sortedGroupedTiers.slice(0, 10).map((tierGroup, idx) => {
                    const isExpanded = expandedTiers.has(tierGroup.tierName)
                    // Always show expand for visibility into pricing templates
                    const hasVariants = tierGroup.variants.length > 0

                    return (
                      <div key={tierGroup.tierName} className="border border-zinc-700/30 rounded-lg overflow-hidden">
                        {/* Main Tier Row */}
                        <div
                          className="flex items-center gap-4 p-3 bg-zinc-800/50 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                          onClick={() => toggleTier(tierGroup.tierName)}
                        >
                          {/* Expand Icon */}
                          <div className="w-5 h-5 flex items-center justify-center text-zinc-400">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>

                          {/* Rank */}
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                            idx === 1 ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' :
                            idx === 2 ? 'bg-orange-700/20 text-orange-300 border border-orange-700/30' :
                            'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30'
                          }`}>
                            {idx + 1}
                          </div>

                          {/* Tier name */}
                          <div className="min-w-[100px]">
                            <span className="text-sm font-semibold text-white">{tierGroup.tierName}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    idx === 0 ? 'bg-yellow-400' :
                                    idx === 1 ? 'bg-gray-400' :
                                    idx === 2 ? 'bg-orange-500' :
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${tierGroup.totalPercentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-zinc-300 min-w-[50px] text-right">
                                {tierGroup.totalPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Count */}
                          <div className="text-sm text-zinc-400 min-w-[80px] text-right">
                            {tierGroup.totalCount.toLocaleString()} sales
                          </div>
                        </div>

                        {/* Expanded Pricing Template Breakdown */}
                        {isExpanded && hasVariants && (
                          <div className="bg-zinc-900/50 border-t border-zinc-700/30">
                            {tierGroup.variants.map((variant, vIdx) => (
                              <div key={`${variant.tier}-${variant.templateName || 'no-template'}`} className="flex items-center gap-4 p-3 pl-16 hover:bg-zinc-800/30 transition-colors">
                                {/* Pricing Template Badge */}
                                <div className="min-w-[140px]">
                                  <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-sm">
                                    {variant.templateName || 'No Template'}
                                  </span>
                                </div>

                                {/* Sub Progress bar */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all bg-purple-500"
                                        style={{ width: `${(variant.count / tierGroup.totalCount) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-zinc-400 min-w-[50px] text-right">
                                      {variant.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>

                                {/* Sub Count */}
                                <div className="text-xs text-zinc-500 min-w-[80px] text-right">
                                  {variant.count.toLocaleString()} sales
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
