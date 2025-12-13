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

  // Actions
  setDateRange: (start: Date, end: Date) => void
  setFilters: (filters: FilterState) => void
  resetFilters: () => void
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

  setDateRange: (start, end) => set((state) => ({
    dateRange: { start, end },
    filters: { ...state.filters, dateRange: { start, end } },
  })),

  setFilters: (filters) => set({
    filters,
    dateRange: filters.dateRange,
  }),

  resetFilters: () => set({ filters: { ...defaultFilters } }),
}))
