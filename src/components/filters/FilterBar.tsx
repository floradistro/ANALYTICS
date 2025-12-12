'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, CreditCard, ShoppingBag, X, ChevronDown, Clock } from 'lucide-react'
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfYear } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export interface FilterState {
  dateRange: { start: Date; end: Date }
  locationIds: string[]
  paymentMethods: string[]
  orderTypes: string[]
}

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  showLocationFilter?: boolean
  showPaymentFilter?: boolean
  showOrderTypeFilter?: boolean
  showDateFilter?: boolean
}

interface Location {
  id: string
  name: string
}

const ORDER_TYPES = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'shipping', label: 'Shipping' },
]

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'gift_card', label: 'Gift Card' },
]

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

export function FilterBar({
  filters,
  onChange,
  showLocationFilter = true,
  showPaymentFilter = true,
  showOrderTypeFilter = true,
  showDateFilter = true,
}: FilterBarProps) {
  const { vendorId } = useAuthStore()
  const [locations, setLocations] = useState<Location[]>([])
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<string>('30days')
  const [showCustomDates, setShowCustomDates] = useState(false)

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset)
    const today = new Date()
    let start: Date
    let end: Date = endOfDay(today)

    switch (preset) {
      case 'today':
        start = startOfDay(today)
        break
      case '7days':
        start = startOfDay(subDays(today, 6))
        break
      case '30days':
        start = startOfDay(subDays(today, 29))
        break
      case 'this_month':
        start = startOfMonth(today)
        break
      case 'this_year':
        start = startOfYear(today)
        break
      case 'custom':
        setShowCustomDates(true)
        return
      default:
        start = startOfDay(subDays(today, 29))
    }

    setShowCustomDates(false)
    onChange({
      ...filters,
      dateRange: { start, end },
    })
  }

  useEffect(() => {
    if (vendorId && showLocationFilter) {
      fetchLocations()
    }
  }, [vendorId, showLocationFilter])

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('name')

    if (data) setLocations(data)
  }

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (!value) return // Ignore empty values

    const newDate = new Date(value + 'T00:00:00') // Add time to avoid timezone issues
    if (isNaN(newDate.getTime())) return // Ignore invalid dates

    // Mark as custom when manually changing dates
    setDatePreset('custom')
    setShowCustomDates(true)

    onChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: field === 'end' ? endOfDay(newDate) : startOfDay(newDate),
      },
    })
  }

  const toggleArrayFilter = (
    key: 'locationIds' | 'paymentMethods' | 'orderTypes',
    value: string
  ) => {
    const current = filters[key]
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...filters, [key]: updated })
  }

  const clearFilter = (key: 'locationIds' | 'paymentMethods' | 'orderTypes') => {
    onChange({ ...filters, [key]: [] })
  }

  const getActiveCount = () => {
    let count = 0
    if (filters.locationIds.length > 0) count++
    if (filters.paymentMethods.length > 0) count++
    if (filters.orderTypes.length > 0) count++
    return count
  }

  const activeCount = getActiveCount()

  const formatDateValue = (date: Date): string => {
    try {
      if (!date || isNaN(date.getTime())) {
        return format(new Date(), 'yyyy-MM-dd')
      }
      return format(date, 'yyyy-MM-dd')
    } catch {
      return format(new Date(), 'yyyy-MM-dd')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range with Presets */}
      {showDateFilter && (
        <div className="flex items-center gap-2">
          {/* Preset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'datePreset' ? null : 'datePreset')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>{DATE_PRESETS.find(p => p.value === datePreset)?.label || 'Last 30 Days'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {openDropdown === 'datePreset' && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-zinc-950 border border-zinc-800 shadow-xl z-50">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      applyDatePreset(preset.value)
                      setOpenDropdown(null)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-900 transition-colors ${
                      datePreset === preset.value ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Date Inputs */}
          {(showCustomDates || datePreset === 'custom') && (
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <input
                type="date"
                value={formatDateValue(filters.dateRange.start)}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none w-[120px]"
              />
              <span className="text-zinc-600">to</span>
              <input
                type="date"
                value={formatDateValue(filters.dateRange.end)}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none w-[120px]"
              />
            </div>
          )}
        </div>
      )}

      {/* Location Filter */}
      {showLocationFilter && locations.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
              filters.locationIds.length > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
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
            <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-950 border border-zinc-800 shadow-xl z-50">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase">Locations</span>
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
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
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
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
              filters.paymentMethods.length > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
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
            <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-950 border border-zinc-800 shadow-xl z-50">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase">Payment Methods</span>
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
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
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
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
              filters.orderTypes.length > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
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
            <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-950 border border-zinc-800 shadow-xl z-50">
              <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase">Order Types</span>
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
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-zinc-300">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Count / Clear All */}
      {activeCount > 0 && (
        <button
          onClick={() => {
            onChange({
              ...filters,
              locationIds: [],
              paymentMethods: [],
              orderTypes: [],
            })
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-white transition-colors"
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

export function useFilters(initialDateRange?: { start: Date; end: Date }) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: initialDateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    locationIds: [],
    paymentMethods: [],
    orderTypes: [],
  })

  return { filters, setFilters }
}
