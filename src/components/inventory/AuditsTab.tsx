'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  ClipboardList,
  Search,
  ChevronDown,
  MapPin,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  User,
} from 'lucide-react'
import { useInventoryStore, type AdjustmentType } from '@/stores/inventory.store'
import { useAuthStore } from '@/stores/auth.store'
import { format } from 'date-fns'

const ADJUSTMENT_TYPE_CONFIG: Record<AdjustmentType, { label: string; color: string }> = {
  count_correction: { label: 'Count Correction', color: 'blue' },
  damage: { label: 'Damage', color: 'orange' },
  shrinkage: { label: 'Shrinkage', color: 'amber' },
  theft: { label: 'Theft', color: 'red' },
  expired: { label: 'Expired', color: 'purple' },
  received: { label: 'Received', color: 'emerald' },
  return: { label: 'Return', color: 'cyan' },
  other: { label: 'Other', color: 'zinc' },
}

export function AuditsTab() {
  const storeId = useAuthStore((s) => s.storeId)
  const {
    adjustments,
    adjustmentStats,
    locations,
    isLoadingAdjustments,
    loadAdjustments,
    loadLocations,
  } = useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<AdjustmentType | 'all'>('all')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })

  // Load data on mount
  useEffect(() => {
    if (storeId) {
      loadLocations(storeId)
      loadAdjustments(storeId, { limit: 100 })
    }
  }, [storeId])

  // Reload when filters change
  useEffect(() => {
    if (storeId) {
      loadAdjustments(storeId, {
        locationId: locationFilter || undefined,
        adjustmentType: typeFilter === 'all' ? undefined : typeFilter,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        limit: 100,
      })
    }
  }, [storeId, locationFilter, typeFilter, dateRange])

  // Filter by search
  const filteredAdjustments = useMemo(() => {
    if (!searchQuery) return adjustments
    const query = searchQuery.toLowerCase()
    return adjustments.filter(
      (adj) =>
        adj.product_name?.toLowerCase().includes(query) ||
        adj.product_sku?.toLowerCase().includes(query) ||
        adj.reason?.toLowerCase().includes(query)
    )
  }, [adjustments, searchQuery])

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Product',
      'SKU',
      'Location',
      'Type',
      'Change',
      'Before',
      'After',
      'Reason',
      'Notes',
      'By',
    ]
    const rows = filteredAdjustments.map((adj) => [
      format(new Date(adj.created_at), 'yyyy-MM-dd HH:mm'),
      adj.product_name,
      adj.product_sku,
      adj.location_name,
      ADJUSTMENT_TYPE_CONFIG[adj.adjustment_type]?.label || adj.adjustment_type,
      adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change,
      adj.quantity_before,
      adj.quantity_after,
      adj.reason,
      adj.notes || '',
      adj.created_by_name || '',
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-adjustments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getTypeBadge = (type: AdjustmentType) => {
    const config = ADJUSTMENT_TYPE_CONFIG[type]
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded border
          bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/20`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Total Adjustments</div>
          <div className="text-xl font-light text-white">{adjustmentStats.total}</div>
        </div>
        <div className="bg-zinc-950 border border-emerald-500/30 p-4 rounded">
          <div className="text-xs text-emerald-500 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Stock Added
          </div>
          <div className="text-xl font-light text-emerald-400">
            +{adjustmentStats.total_increase.toLocaleString()}
          </div>
        </div>
        <div className="bg-zinc-950 border border-red-500/30 p-4 rounded">
          <div className="text-xs text-red-500 mb-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Stock Removed
          </div>
          <div className="text-xl font-light text-red-400">
            -{adjustmentStats.total_decrease.toLocaleString()}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Net Change</div>
          <div
            className={`text-xl font-light ${
              adjustmentStats.total_increase - adjustmentStats.total_decrease >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {adjustmentStats.total_increase - adjustmentStats.total_decrease >= 0 ? '+' : ''}
            {(adjustmentStats.total_increase - adjustmentStats.total_decrease).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by product, SKU, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Location Filter */}
        <div className="relative">
          <button
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            <MapPin className="w-4 h-4" />
            {locationFilter
              ? locations.find((l) => l.id === locationFilter)?.name || 'All Locations'
              : 'All Locations'}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showLocationDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-20">
              <button
                onClick={() => {
                  setLocationFilter(null)
                  setShowLocationDropdown(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                  !locationFilter ? 'text-white bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                All Locations
              </button>
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => {
                    setLocationFilter(loc.id)
                    setShowLocationDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                    locationFilter === loc.id ? 'text-white bg-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div className="relative">
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            {typeFilter === 'all'
              ? 'All Types'
              : ADJUSTMENT_TYPE_CONFIG[typeFilter]?.label || typeFilter}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showTypeDropdown && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-20">
              <button
                onClick={() => {
                  setTypeFilter('all')
                  setShowTypeDropdown(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                  typeFilter === 'all' ? 'text-white bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                All Types
              </button>
              {Object.entries(ADJUSTMENT_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type as AdjustmentType)
                    setShowTypeDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                    typeFilter === type ? 'text-white bg-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-zinc-700"
          />
          <span className="text-zinc-600">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-white hover:border-zinc-700"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Before → After
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoadingAdjustments ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                      Loading adjustments...
                    </div>
                  </td>
                </tr>
              ) : filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <ClipboardList className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No adjustments found</p>
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {format(new Date(adj.created_at), 'MMM d, yyyy')}
                      <div className="text-xs text-zinc-600">
                        {format(new Date(adj.created_at), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">{adj.product_name}</div>
                      {adj.product_sku && (
                        <div className="text-xs text-zinc-500">{adj.product_sku}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{adj.location_name}</td>
                    <td className="px-4 py-3 text-center">{getTypeBadge(adj.adjustment_type)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono ${
                          adj.quantity_change > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {adj.quantity_change > 0 ? (
                          <Plus className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {Math.abs(adj.quantity_change)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      {adj.quantity_before} → {adj.quantity_after}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">
                      {adj.reason}
                      {adj.notes && (
                        <div className="text-xs text-zinc-600 truncate">{adj.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {adj.created_by_name || (
                        <span className="text-zinc-600 italic">System</span>
                      )}
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
