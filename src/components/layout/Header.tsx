'use client'

import { useState } from 'react'
import { Bell, User, Clock, ChevronDown, Calendar } from 'lucide-react'
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
  const { user, vendor } = useAuthStore()
  const { dateRange, setDateRange } = useDashboardStore()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [activePreset, setActivePreset] = useState('30days')
  const [showCustom, setShowCustom] = useState(false)

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
    const newDate = new Date(value + 'T00:00:00')
    if (isNaN(newDate.getTime())) return

    if (field === 'start') {
      setDateRange(startOfDay(newDate), dateRange.end)
    } else {
      setDateRange(dateRange.start, endOfDay(newDate))
    }
  }

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
    <header className="bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Date Range Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
            >
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-300 font-light">
                {DATE_PRESETS.find(p => p.value === activePreset)?.label || 'Last 30 Days'}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </button>

            {showDatePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                <div className="absolute top-full left-0 mt-2 bg-zinc-950 border border-zinc-800 shadow-2xl z-50 min-w-[180px]">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyPreset(preset.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        activePreset === preset.value
                          ? 'text-emerald-400 bg-emerald-500/10'
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
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <input
                type="date"
                value={formatDateValue(dateRange.start)}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none w-[120px]"
              />
              <span className="text-zinc-600">to</span>
              <input
                type="date"
                value={formatDateValue(dateRange.end)}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none w-[120px]"
              />
            </div>
          ) : (
            <span className="text-sm text-zinc-500 font-light">
              {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
            <div className="w-8 h-8 bg-red-900 border border-red-800 flex items-center justify-center overflow-hidden">
              {vendor?.logo_url ? (
                <img
                  src={vendor.logo_url}
                  alt={vendor.store_name || 'Logo'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-light text-white">{user?.email}</p>
              <p className="text-xs text-zinc-500 tracking-wider uppercase">Vendor Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
