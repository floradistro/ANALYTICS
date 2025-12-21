'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Package,
  Search,
  Filter,
  MapPin,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Plus,
  Minus,
  MoreVertical,
  Download,
} from 'lucide-react'
import { useInventoryStore, type InventoryItem } from '@/stores/inventory.store'
import { useAuthStore } from '@/stores/auth.store'
import { InventoryAdjustmentModal } from './InventoryAdjustmentModal'

export function StockLevelsTab() {
  const vendorId = useAuthStore((s) => s.vendorId)
  const {
    inventory,
    locations,
    inventoryStats,
    isLoading,
    locationFilter,
    stockStatusFilter,
    loadInventory,
    loadLocations,
    setLocationFilter,
    setStockStatusFilter,
    subscribeToInventory,
    unsubscribe,
  } = useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [adjustmentModal, setAdjustmentModal] = useState<{
    isOpen: boolean
    item: InventoryItem | null
    type: 'add' | 'remove'
  }>({ isOpen: false, item: null, type: 'add' })

  // Load data on mount
  useEffect(() => {
    if (vendorId) {
      loadLocations(vendorId)
      loadInventory(vendorId)
      subscribeToInventory(vendorId)
    }
    return () => unsubscribe()
  }, [vendorId])

  // Reload when filters change
  useEffect(() => {
    if (vendorId) {
      loadInventory(vendorId, {
        locationId: locationFilter || undefined,
        stockStatus: stockStatusFilter === 'all' ? undefined : stockStatusFilter,
      })
    }
  }, [vendorId, locationFilter, stockStatusFilter])

  // Filter by search
  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventory
    const query = searchQuery.toLowerCase()
    return inventory.filter(
      (item) =>
        item.product_name?.toLowerCase().includes(query) ||
        item.product_sku?.toLowerCase().includes(query)
    )
  }, [inventory, searchQuery])

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set(inventory.map((i) => i.product_category).filter(Boolean))
    return Array.from(cats).sort()
  }, [inventory])

  const handleExportCSV = () => {
    const headers = ['Product', 'SKU', 'Location', 'Quantity', 'Reserved', 'Available', 'Status', 'Unit Cost']
    const rows = filteredInventory.map((item) => [
      item.product_name,
      item.product_sku,
      item.location_name,
      item.quantity,
      item.reserved_quantity,
      item.available_quantity,
      item.stock_status,
      item.unit_cost || item.average_cost || '',
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
            In Stock
          </span>
        )
      case 'low_stock':
        return (
          <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </span>
        )
      case 'out_of_stock':
        return (
          <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Out of Stock
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Total Items</div>
          <div className="text-xl font-light text-white">{inventoryStats.total_items}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Total Quantity</div>
          <div className="text-xl font-light text-white">{inventoryStats.total_quantity.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Total Value</div>
          <div className="text-xl font-light text-white">
            ${inventoryStats.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-zinc-950 border border-amber-500/30 p-4 rounded">
          <div className="text-xs text-amber-500 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </div>
          <div className="text-xl font-light text-amber-400">{inventoryStats.low_stock_count}</div>
        </div>
        <div className="bg-zinc-950 border border-red-500/30 p-4 rounded">
          <div className="text-xs text-red-500 mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Out of Stock
          </div>
          <div className="text-xl font-light text-red-400">{inventoryStats.out_of_stock_count}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
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
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2 ${
                    locationFilter === loc.id ? 'text-white bg-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  {loc.name}
                  {loc.is_primary && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                      Primary
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stock Status Filter */}
        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded">
          {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStockStatusFilter(status)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                stockStatusFilter === status
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {status === 'all' ? 'All' : status === 'in_stock' ? 'In Stock' : status === 'low_stock' ? 'Low' : 'Out'}
            </button>
          ))}
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
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Reserved
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                      Loading inventory...
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No inventory items found</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-white font-medium">{item.product_name}</div>
                        {item.product_sku && (
                          <div className="text-xs text-zinc-500">{item.product_sku}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{item.location_name}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-zinc-500 font-mono">{item.reserved_quantity || 0}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{item.available_quantity}</td>
                    <td className="px-4 py-3 text-center">{getStockStatusBadge(item.stock_status)}</td>
                    <td className="px-4 py-3 text-right text-zinc-400 font-mono">
                      {item.unit_cost || item.average_cost
                        ? `$${(item.unit_cost || item.average_cost || 0).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setAdjustmentModal({ isOpen: true, item, type: 'add' })}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Add stock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAdjustmentModal({ isOpen: true, item, type: 'remove' })}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove stock"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {adjustmentModal.isOpen && adjustmentModal.item && (
        <InventoryAdjustmentModal
          isOpen={adjustmentModal.isOpen}
          onClose={() => setAdjustmentModal({ isOpen: false, item: null, type: 'add' })}
          item={adjustmentModal.item}
          defaultType={adjustmentModal.type}
        />
      )}
    </div>
  )
}
