'use client'

import { useState, useEffect } from 'react'
import { MapPin, CreditCard, ShoppingBag, X, ChevronDown, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore, type FilterState } from '@/stores/dashboard.store'

interface FilterBarProps {
  showLocationFilter?: boolean
  showPaymentFilter?: boolean
  showOrderTypeFilter?: boolean
}

interface Location {
  id: string
  name: string
}

const ORDER_TYPES = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'online', label: 'Online' },
]

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'gift_card', label: 'Gift Card' },
]

/**
 * Global filter bar that syncs with the dashboard store.
 * Date range is handled by the Header component - this only handles
 * location, payment method, and order type filters.
 */
export function FilterBar({
  showLocationFilter = true,
  showPaymentFilter = true,
  showOrderTypeFilter = true,
}: FilterBarProps) {
  const { storeId } = useAuthStore()
  const { filters, setFilters, resetFilters } = useDashboardStore()
  const [locations, setLocations] = useState<Location[]>([])
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    if (storeId && showLocationFilter) {
      fetchLocations()
    }
  }, [storeId, showLocationFilter])

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name')

    if (data) setLocations(data)
  }

  const toggleArrayFilter = (
    key: 'locationIds' | 'paymentMethods' | 'orderTypes',
    value: string
  ) => {
    const current = filters[key]
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setFilters({ ...filters, [key]: updated })
  }

  const clearFilter = (key: 'locationIds' | 'paymentMethods' | 'orderTypes') => {
    setFilters({ ...filters, [key]: [] })
  }

  const clearAllFilters = () => {
    setFilters({
      ...filters,
      locationIds: [],
      paymentMethods: [],
      orderTypes: [],
    })
  }

  const getActiveCount = () => {
    let count = 0
    if (filters.locationIds.length > 0) count++
    if (filters.paymentMethods.length > 0) count++
    if (filters.orderTypes.length > 0) count++
    return count
  }

  const activeCount = getActiveCount()

  // Don't render if no filters are enabled
  if (!showLocationFilter && !showPaymentFilter && !showOrderTypeFilter) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Location Filter */}
      {showLocationFilter && locations.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors rounded-sm ${
              filters.locationIds.length > 0
                ? 'bg-slate-700/30 border-slate-600/50 text-slate-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>
              {filters.locationIds.length === 0
                ? 'All Locations'
                : `${filters.locationIds.length} Location${filters.locationIds.length > 1 ? 's' : ''}`}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {openDropdown === 'location' && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-950 border border-zinc-800 shadow-xl z-50 rounded-sm">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Locations</span>
                {filters.locationIds.length > 0 && (
                  <button
                    onClick={() => clearFilter('locationIds')}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto">
                {locations.map((loc) => (
                  <label
                    key={loc.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.locationIds.includes(loc.id)}
                      onChange={() => toggleArrayFilter('locationIds', loc.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-400 focus:ring-slate-500 accent-slate-500"
                    />
                    <span className="text-sm text-zinc-300">{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Method Filter */}
      {showPaymentFilter && (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'payment' ? null : 'payment')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors rounded-sm ${
              filters.paymentMethods.length > 0
                ? 'bg-slate-700/30 border-slate-600/50 text-slate-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {filters.paymentMethods.length === 0
                ? 'All Payments'
                : `${filters.paymentMethods.length} Type${filters.paymentMethods.length > 1 ? 's' : ''}`}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {openDropdown === 'payment' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-950 border border-zinc-800 shadow-xl z-50 rounded-sm">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Payment Methods</span>
                {filters.paymentMethods.length > 0 && (
                  <button
                    onClick={() => clearFilter('paymentMethods')}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.paymentMethods.includes(method.value)}
                      onChange={() => toggleArrayFilter('paymentMethods', method.value)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-400 focus:ring-slate-500 accent-slate-500"
                    />
                    <span className="text-sm text-zinc-300">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Type Filter */}
      {showOrderTypeFilter && (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'orderType' ? null : 'orderType')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors rounded-sm ${
              filters.orderTypes.length > 0
                ? 'bg-slate-700/30 border-slate-600/50 text-slate-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              {filters.orderTypes.length === 0
                ? 'All Orders'
                : `${filters.orderTypes.length} Type${filters.orderTypes.length > 1 ? 's' : ''}`}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {openDropdown === 'orderType' && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-950 border border-zinc-800 shadow-xl z-50 rounded-sm">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Order Types</span>
                {filters.orderTypes.length > 0 && (
                  <button
                    onClick={() => clearFilter('orderTypes')}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div>
                {ORDER_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.orderTypes.includes(type.value)}
                      onChange={() => toggleArrayFilter('orderTypes', type.value)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-400 focus:ring-slate-500 accent-slate-500"
                    />
                    <span className="text-sm text-zinc-300">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear All Filters */}
      {activeCount > 0 && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
          Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      )}

      {/* Click outside to close */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  )
}

/**
 * @deprecated Use useDashboardStore() directly instead.
 * This hook is kept for backward compatibility during migration.
 */
export function useFilters() {
  const { filters, setFilters } = useDashboardStore()
  return { filters, setFilters }
}

// Re-export FilterState type for convenience
export type { FilterState }
