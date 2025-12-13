/**
 * Centralized Orders Store
 *
 * SINGLE SOURCE OF TRUTH for all order data across the analytics app.
 *
 * Financial Logic:
 * - A "paid order" = payment_status === 'paid' AND status !== 'cancelled'
 * - This includes orders in transit, shipped, delivered, etc. - we got the money!
 * - Revenue uses total_amount (includes tax)
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'

export interface Order {
  id: string
  order_number: string
  vendor_id: string
  customer_id: string | null
  order_type: 'walk_in' | 'pickup' | 'delivery' | 'shipping'
  status: string
  payment_status: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  affiliate_discount_amount: number
  payment_method: string | null
  pickup_location_id: string | null
  created_at: string
  updated_at?: string
  shipping_cost?: number
  tracking_number?: string | null
  shipping_name?: string | null
  shipping_address?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_zip?: string | null
  metadata?: {
    tip_amount?: number
    channel?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    loyalty_discount_amount?: number
    campaign_discount_amount?: number
    affiliate_discount_amount?: number
    [key: string]: any
  }
}

interface OrderFilters {
  orderTypes: string[]
  locationIds: string[]
  paymentMethods: string[]
}

export interface OrdersState {
  // Raw data
  orders: Order[]
  isLoading: boolean
  lastFetchedAt: Date | null
  error: string | null

  // Filters (synced with dashboard filters)
  filters: OrderFilters

  // Actions
  fetchOrders: (vendorId: string) => Promise<void>
  setFilters: (filters: Partial<OrderFilters>) => void
  clearFilters: () => void

  // Core getters - these apply filters automatically
  getPaidOrders: () => Order[]
  getAllOrders: () => Order[]

  // Financial metrics - from PAID orders only
  getTotalRevenue: () => number
  getNetRevenue: () => number
  getTotalOrders: () => number
  getAverageOrderValue: () => number
  getTotalDiscounts: () => number
  getTotalTax: () => number
  getTipAmount: () => number

  // Breakdown metrics
  getRevenueByOrderType: () => Record<string, number>
  getOrderCountByOrderType: () => Record<string, number>
  getRevenueByDay: () => Array<{ date: string; revenue: number; orders: number }>

  // Recent orders (for dashboard)
  getRecentOrders: (limit?: number) => Order[]
}

/**
 * CRITICAL: This is the canonical definition of a "paid order" for financial reporting.
 * Payment accepted = revenue, regardless of fulfillment/shipping status.
 */
export function isPaidOrder(order: Order): boolean {
  return order.payment_status === 'paid' && order.status !== 'cancelled'
}

const defaultFilters: OrderFilters = {
  orderTypes: [],
  locationIds: [],
  paymentMethods: [],
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  isLoading: false,
  lastFetchedAt: null,
  error: null,
  filters: { ...defaultFilters },

  fetchOrders: async (vendorId: string) => {
    if (!vendorId) return

    set({ isLoading: true, error: null })

    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch ALL orders for the date range (paginated)
      const pageSize = 1000
      let allOrders: Order[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            vendor_id,
            customer_id,
            order_type,
            status,
            payment_status,
            subtotal,
            tax_amount,
            discount_amount,
            total_amount,
            affiliate_discount_amount,
            payment_method,
            pickup_location_id,
            created_at,
            updated_at,
            shipping_cost,
            tracking_number,
            shipping_name,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip,
            metadata
          `)
          .eq('vendor_id', vendorId)
          .gte('created_at', start)
          .lte('created_at', end)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allOrders = [...allOrders, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      set({
        orders: allOrders,
        isLoading: false,
        lastFetchedAt: new Date(),
      })
    } catch (error: any) {
      console.error('Failed to fetch orders:', error)
      set({
        error: error.message || 'Failed to fetch orders',
        isLoading: false,
      })
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
  },

  clearFilters: () => {
    set({ filters: { ...defaultFilters } })
  },

  // Apply filters and return paid orders
  getPaidOrders: () => {
    const { orders, filters } = get()

    return orders.filter((order) => {
      // Must be paid
      if (!isPaidOrder(order)) return false

      // Apply order type filter
      if (filters.orderTypes.length > 0 && !filters.orderTypes.includes(order.order_type)) {
        return false
      }

      // Apply location filter
      if (filters.locationIds.length > 0) {
        if (!order.pickup_location_id || !filters.locationIds.includes(order.pickup_location_id)) {
          return false
        }
      }

      // Apply payment method filter
      if (filters.paymentMethods.length > 0) {
        if (!order.payment_method || !filters.paymentMethods.includes(order.payment_method)) {
          return false
        }
      }

      return true
    })
  },

  getAllOrders: () => {
    const { orders, filters } = get()

    return orders.filter((order) => {
      if (filters.orderTypes.length > 0 && !filters.orderTypes.includes(order.order_type)) {
        return false
      }
      if (filters.locationIds.length > 0) {
        if (!order.pickup_location_id || !filters.locationIds.includes(order.pickup_location_id)) {
          return false
        }
      }
      return true
    })
  },

  // ============ FINANCIAL METRICS ============
  // All use getPaidOrders() for consistency

  getTotalRevenue: () => {
    return get().getPaidOrders().reduce((sum, o) => sum + (o.total_amount || 0), 0)
  },

  getNetRevenue: () => {
    return get().getPaidOrders().reduce((sum, o) => sum + (o.subtotal || 0), 0)
  },

  getTotalOrders: () => {
    return get().getPaidOrders().length
  },

  getAverageOrderValue: () => {
    const orders = get().getPaidOrders()
    if (orders.length === 0) return 0
    const total = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    return total / orders.length
  },

  getTotalDiscounts: () => {
    return get().getPaidOrders().reduce((sum, o) => {
      // First try the discount_amount column (new orders)
      // If 0, fall back to metadata (historical orders where discounts were only stored in metadata)
      let totalDiscount = o.discount_amount || 0

      if (totalDiscount === 0 && o.metadata) {
        // Historical orders: discounts stored in metadata, not discount_amount column
        totalDiscount = (o.metadata.loyalty_discount_amount || 0) +
                        (o.metadata.campaign_discount_amount || 0) +
                        (o.metadata.affiliate_discount_amount || 0)
      }

      // Add affiliate_discount_amount (stored separately at order level)
      const affiliateDiscount = o.affiliate_discount_amount || 0

      // Avoid double-counting affiliate if it's already in totalDiscount from metadata
      if (totalDiscount > 0 && o.metadata?.affiliate_discount_amount) {
        return sum + totalDiscount // affiliate already included from metadata
      }

      return sum + totalDiscount + affiliateDiscount
    }, 0)
  },

  getTotalTax: () => {
    return get().getPaidOrders().reduce((sum, o) => sum + (o.tax_amount || 0), 0)
  },

  getTipAmount: () => {
    return get().getPaidOrders().reduce((sum, o) => {
      const tip = o.metadata?.tip_amount || 0
      return sum + tip
    }, 0)
  },

  // ============ BREAKDOWN METRICS ============

  getRevenueByOrderType: () => {
    const orders = get().getPaidOrders()
    const breakdown: Record<string, number> = {}

    orders.forEach((o) => {
      const type = o.order_type || 'unknown'
      breakdown[type] = (breakdown[type] || 0) + (o.total_amount || 0)
    })

    return breakdown
  },

  getOrderCountByOrderType: () => {
    const orders = get().getPaidOrders()
    const breakdown: Record<string, number> = {}

    orders.forEach((o) => {
      const type = o.order_type || 'unknown'
      breakdown[type] = (breakdown[type] || 0) + 1
    })

    return breakdown
  },

  getRevenueByDay: () => {
    const orders = get().getPaidOrders()
    const byDay = new Map<string, { revenue: number; orders: number }>()

    orders.forEach((o) => {
      const date = o.created_at.split('T')[0]
      const existing = byDay.get(date) || { revenue: 0, orders: 0 }
      byDay.set(date, {
        revenue: existing.revenue + (o.total_amount || 0),
        orders: existing.orders + 1,
      })
    })

    return Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
  },

  getRecentOrders: (limit = 10) => {
    return get().getPaidOrders().slice(0, limit)
  },
}))
