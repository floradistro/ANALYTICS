'use client'

import { useState, useEffect } from 'react'
import { Bell, User, Clock, ChevronDown, Calendar, MapPin } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfYear } from 'date-fns'

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

export function Header() {
  const { user, store, storeId } = useAuthStore()
  const { dateRange, setDateRange, locations, isLoadingLocations, fetchLocations, filters, setLocationIds } = useDashboardStore()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [activePreset, setActivePreset] = useState('30days')
  const [showCustom, setShowCustom] = useState(false)

  // Fetch locations on mount
  useEffect(() => {
    if (storeId && locations.length === 0 && !isLoadingLocations) {
      fetchLocations(storeId)
    }
  }, [storeId, locations.length, isLoadingLocations, fetchLocations])

  const applyPreset = (preset: string) => {
    setActivePreset(preset)
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
      case '90days':
        start = startOfDay(subDays(today, 89))
        break
      case 'this_month':
        start = startOfMonth(today)
        break
      case 'this_year':
        start = startOfYear(today)
        break
      case 'custom':
        setShowCustom(true)
        setShowDatePicker(false)
        return
      default:
        start = startOfDay(subDays(today, 29))
    }

    setShowCustom(false)
    setDateRange(start, end)
    setShowDatePicker(false)
  }

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    if (!value) return
    const [y, m, d] = value.split('-').map(Number)
    if (field === 'start') {
      setDateRange(new Date(y, m - 1, d, 0, 0, 0, 0), dateRange.end)
    } else {
      setDateRange(dateRange.start, new Date(y, m - 1, d, 23, 59, 59, 999))
    }
  }

  const formatDateValue = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const toggleLocation = (locationId: string) => {
    const currentIds = filters.locationIds
    if (currentIds.includes(locationId)) {
      setLocationIds(currentIds.filter(id => id !== locationId))
    } else {
      setLocationIds([...currentIds, locationId])
    }
  }

  const clearLocationFilter = () => {
    setLocationIds([])
    setShowLocationPicker(false)
  }

  const getLocationLabel = () => {
    if (filters.locationIds.length === 0) return 'All Locations'
    if (filters.locationIds.length === 1) {
      const loc = locations.find(l => l.id === filters.locationIds[0])
      return loc?.name || 'Location'
    }
    return `${filters.locationIds.length} Locations`
  }

  return (
    <header className="bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between gap-2 lg:gap-4 ml-12 lg:ml-0">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2 lg:gap-3 flex-wrap min-w-0">
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-xs lg:text-sm text-zinc-300 font-light whitespace-nowrap">
                {DATE_PRESETS.find(p => p.value === activePreset)?.label || 'Last 30 Days'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-500 flex-shrink-0" />
            </button>

            {showDatePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                <div className="absolute top-full left-0 mt-2 bg-zinc-950 border border-zinc-800 shadow-2xl z-50 min-w-[160px] lg:min-w-[180px]">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyPreset(preset.value)}
                      className={`w-full text-left px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm transition-colors ${
                        activePreset === preset.value
                          ? 'text-slate-200 bg-slate-700/30'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Show date range display or custom inputs */}
          {showCustom ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={formatDateValue(dateRange.start)}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs lg:text-sm focus:outline-none focus:border-zinc-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                style={{ colorScheme: 'dark' }}
              />
              <span className="text-zinc-500 text-xs">to</span>
              <input
                type="date"
                value={formatDateValue(dateRange.end)}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs lg:text-sm focus:outline-none focus:border-zinc-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                style={{ colorScheme: 'dark' }}
              />
              <button
                onClick={() => setShowCustom(false)}
                className="text-xs text-zinc-500 hover:text-white ml-1"
              >
                Done
              </button>
            </div>
          ) : (
            <span className="text-xs lg:text-sm text-zinc-500 font-light hidden sm:inline whitespace-nowrap">
              {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
            </span>
          )}

          {/* Location Filter */}
          <div className="relative">
            <button
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              className="flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-xs lg:text-sm text-zinc-300 font-light whitespace-nowrap">
                {getLocationLabel()}
              </span>
              <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-500 flex-shrink-0" />
            </button>

            {showLocationPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLocationPicker(false)} />
                <div className="absolute top-full left-0 mt-2 bg-zinc-950 border border-zinc-800 shadow-2xl z-50 min-w-[200px] lg:min-w-[240px] max-h-[400px] overflow-y-auto">
                  {/* Clear All Option */}
                  {filters.locationIds.length > 0 && (
                    <button
                      onClick={clearLocationFilter}
                      className="w-full text-left px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 border-b border-zinc-800 transition-colors"
                    >
                      Clear All
                    </button>
                  )}

                  {/* Location List */}
                  {isLoadingLocations ? (
                    <div className="px-3 lg:px-4 py-3 text-xs text-zinc-500">Loading locations...</div>
                  ) : locations.length === 0 ? (
                    <div className="px-3 lg:px-4 py-3 text-xs text-zinc-500">No locations found</div>
                  ) : (
                    locations.map((location) => {
                      const isSelected = filters.locationIds.includes(location.id)
                      return (
                        <button
                          key={location.id}
                          onClick={() => toggleLocation(location.id)}
                          className={`w-full text-left px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm transition-colors flex items-center gap-2 ${
                            isSelected
                              ? 'text-slate-200 bg-slate-700/30'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          <div className={`w-3 h-3 border rounded-sm flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-slate-400 bg-slate-600' : 'border-zinc-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {location.name}
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
          <button className="relative p-1.5 lg:p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
            <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="absolute top-0.5 right-0.5 lg:top-1 lg:right-1 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-slate-400 rounded-full"></span>
          </button>

          <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-zinc-800">
            <div className="w-7 h-7 lg:w-8 lg:h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 rounded-sm">
              {store?.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.store_name || 'Logo'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
              )}
            </div>
            <div className="hidden md:block min-w-0">
              <p className="text-xs lg:text-sm font-light text-white truncate max-w-[120px] lg:max-w-none">{user?.email}</p>
              <p className="text-[10px] lg:text-xs text-zinc-500 tracking-wider uppercase">Store Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
