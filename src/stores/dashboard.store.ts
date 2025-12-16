'use client'

/**
 * Dashboard UI State Store
 *
 * This store manages ONLY UI state that needs to be shared across dashboard pages:
 * - Date range selection
 * - Filter selections (order types, locations, payment methods)
 *
 * For actual ORDER DATA, use useOrdersStore - it's the single source of truth.
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Location } from '@/types/database'

export interface FilterState {
  dateRange: { start: Date; end: Date }
  locationIds: string[]
  paymentMethods: string[]
  orderTypes: string[]
}

interface DashboardState {
  // UI State
  dateRange: { start: Date; end: Date }
  filters: FilterState

  // Location data
  locations: Location[]
  isLoadingLocations: boolean

  // Actions
  setDateRange: (start: Date, end: Date) => void
  setFilters: (filters: FilterState) => void
  setLocationIds: (locationIds: string[]) => void
  resetFilters: () => void
  fetchLocations: (vendorId: string) => Promise<void>
}

const defaultFilters: FilterState = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  locationIds: [],
  paymentMethods: [],
  orderTypes: [],
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  filters: { ...defaultFilters },
  locations: [],
  isLoadingLocations: false,

  setDateRange: (start, end) => set((state) => ({
    dateRange: { start, end },
    filters: { ...state.filters, dateRange: { start, end } },
  })),

  setFilters: (filters) => set({
    filters,
    dateRange: filters.dateRange,
  }),

  setLocationIds: (locationIds) => set((state) => ({
    filters: { ...state.filters, locationIds },
  })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  fetchLocations: async (vendorId: string) => {
    set({ isLoadingLocations: true })
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('name')

      if (error) throw error

      set({ locations: data || [], isLoadingLocations: false })
    } catch (error) {
      console.error('Error fetching locations:', error)
      set({ locations: [], isLoadingLocations: false })
    }
  },
}))
