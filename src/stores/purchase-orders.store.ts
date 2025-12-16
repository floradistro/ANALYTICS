/**
 * Purchase Orders Store
 *
 * Manages purchase orders state for the analytics dashboard
 * - Fetches POs with supplier/location data
 * - Real-time Supabase subscriptions
 * - Stats tracking (by status + total value)
 * - Receiving workflow support
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

export type PurchaseOrderType = 'inbound' | 'outbound'
export type PurchaseOrderStatus =
  | 'draft'
  | 'pending'
  | 'ordered'
  | 'approved'
  | 'receiving'
  | 'partially_received'
  | 'received'
  | 'cancelled'

export type ItemCondition = 'good' | 'damaged' | 'expired' | 'rejected'

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string
  po_type: PurchaseOrderType
  status: PurchaseOrderStatus
  supplier_id: string | null
  supplier_name?: string
  wholesale_customer_id: string | null
  customer_name?: string
  location_id: string | null
  location_name?: string
  expected_delivery_date: string | null
  received_date: string | null
  notes: string | null
  subtotal: number
  tax_amount: number
  shipping_cost: number
  discount: number
  total_amount: number
  payment_status: string | null
  payment_terms: string | null
  created_at: string
  updated_at: string
  // Staff attribution
  created_by_user_id: string | null
  created_by_name?: string
  approved_by_user_id: string | null
  approved_by_name?: string
  received_by_user_id: string | null
  received_by_name?: string
  // Computed
  items_count?: number
  received_items_count?: number
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  product_name?: string
  product_sku?: string
  quantity: number
  received_quantity: number
  quantity_remaining: number
  unit_price: number
  subtotal: number
  receive_status: string
  condition: ItemCondition | null
  quality_notes: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[]
}

export interface POStats {
  total: number
  draft: number
  pending: number
  ordered: number
  receiving: number
  received: number
  totalValue: number
}

interface PurchaseOrdersState {
  // Data
  purchaseOrders: PurchaseOrder[]
  selectedPO: PurchaseOrderWithItems | null
  stats: POStats

  // UI State
  isLoading: boolean
  isLoadingDetail: boolean
  error: string | null
  statusFilter: PurchaseOrderStatus | 'all'

  // Subscription
  subscription: RealtimeChannel | null

  // Actions
  loadPurchaseOrders: (vendorId: string, params?: {
    status?: PurchaseOrderStatus
    supplierId?: string
    locationId?: string
  }) => Promise<void>
  loadPurchaseOrderDetail: (poId: string) => Promise<void>
  setStatusFilter: (status: PurchaseOrderStatus | 'all') => void

  // Mutations
  updatePOStatus: (poId: string, status: PurchaseOrderStatus, userId?: string | null) => Promise<{ success: boolean; error?: string }>
  receiveItems: (poId: string, items: {
    item_id: string
    quantity: number
    condition: ItemCondition
    quality_notes?: string
  }[], locationId: string, userId?: string | null) => Promise<{ success: boolean; error?: string }>
  deletePO: (poId: string) => Promise<{ success: boolean; error?: string }>

  // Real-time
  subscribe: (vendorId: string) => void
  unsubscribe: () => void

  // Helpers
  clearSelectedPO: () => void
  reset: () => void
}

const initialStats: POStats = {
  total: 0,
  draft: 0,
  pending: 0,
  ordered: 0,
  receiving: 0,
  received: 0,
  totalValue: 0,
}

// =============================================================================
// STORE
// =============================================================================

export const usePurchaseOrdersStore = create<PurchaseOrdersState>((set, get) => ({
  purchaseOrders: [],
  selectedPO: null,
  stats: initialStats,
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  statusFilter: 'all',
  subscription: null,

  loadPurchaseOrders: async (vendorId, params = {}) => {
    set({ isLoading: true, error: null })

    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (id, external_name),
          locations (id, name),
          purchase_order_items (id, quantity, received_quantity)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.supplierId) {
        query = query.eq('supplier_id', params.supplierId)
      }

      if (params.locationId) {
        query = query.eq('location_id', params.locationId)
      }

      const { data, error } = await query

      if (error) throw error

      // Flatten joined data
      const pos: PurchaseOrder[] = (data || []).map((po: any) => {
        const supplier = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers
        const location = Array.isArray(po.locations) ? po.locations[0] : po.locations
        const items = po.purchase_order_items || []

        return {
          ...po,
          supplier_name: supplier?.external_name || '',
          location_name: location?.name || '',
          items_count: items.length,
          received_items_count: items.filter((item: any) =>
            (item.received_quantity || 0) >= (item.quantity || 0)
          ).length,
          suppliers: undefined,
          locations: undefined,
          purchase_order_items: undefined,
        }
      })

      // Calculate stats
      const stats: POStats = {
        total: pos.length,
        draft: pos.filter(po => po.status === 'draft').length,
        pending: pos.filter(po => po.status === 'pending').length,
        ordered: pos.filter(po => po.status === 'ordered').length,
        receiving: pos.filter(po =>
          po.status === 'receiving' || po.status === 'partially_received'
        ).length,
        received: pos.filter(po => po.status === 'received').length,
        totalValue: pos.reduce((sum, po) => sum + (po.total_amount || 0), 0),
      }

      set({ purchaseOrders: pos, stats, isLoading: false })
    } catch (err) {
      console.error('[PurchaseOrdersStore] Load error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load purchase orders',
        purchaseOrders: [],
        stats: initialStats,
        isLoading: false,
      })
    }
  },

  loadPurchaseOrderDetail: async (poId) => {
    set({ isLoadingDetail: true, error: null })

    try {
      // First fetch the PO with basic joins
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (id, external_name),
          locations (id, name),
          purchase_order_items (
            *,
            products (id, name, sku)
          )
        `)
        .eq('id', poId)
        .single()

      if (error) throw error

      const supplier = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers
      const location = Array.isArray(po.locations) ? po.locations[0] : po.locations

      // Fetch user names separately if IDs exist
      const userIds = [po.created_by_user_id, po.received_by_user_id].filter(Boolean)
      let userMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)

        if (users) {
          userMap = Object.fromEntries(users.map(u => [
            u.id,
            [u.first_name, u.last_name].filter(Boolean).join(' ') || ''
          ]))
        }
      }

      const items: PurchaseOrderItem[] = (po.purchase_order_items || []).map((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        return {
          ...item,
          product_name: product?.name || '',
          product_sku: product?.sku || '',
          products: undefined,
        }
      })

      const poWithItems: PurchaseOrderWithItems = {
        ...po,
        supplier_name: supplier?.external_name || '',
        location_name: location?.name || '',
        created_by_name: po.created_by_user_id ? userMap[po.created_by_user_id] || '' : '',
        approved_by_name: '', // No approved_by_user_id column in this table
        received_by_name: po.received_by_user_id ? userMap[po.received_by_user_id] || '' : '',
        items,
        items_count: items.length,
        received_items_count: items.filter(item =>
          (item.received_quantity || 0) >= (item.quantity || 0)
        ).length,
        suppliers: undefined,
        locations: undefined,
        purchase_order_items: undefined,
      }

      set({ selectedPO: poWithItems, isLoadingDetail: false })
    } catch (err) {
      console.error('[PurchaseOrdersStore] Load detail error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load purchase order',
        selectedPO: null,
        isLoadingDetail: false,
      })
    }
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status })
  },

  updatePOStatus: async (poId, status, userId) => {
    try {
      // Build update object
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      }

      // Track received date and who received
      if (status === 'received') {
        updateData.received_date = new Date().toISOString().split('T')[0]
        if (userId) {
          updateData.received_by_user_id = userId
        }
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', poId)

      if (error) throw error

      // Reload to get updated staff names
      await get().loadPurchaseOrderDetail(poId)

      // Update list state
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === poId ? { ...po, status } : po
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[PurchaseOrdersStore] Update status error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update status',
      }
    }
  },

  receiveItems: async (poId, items, locationId, userId) => {
    try {
      // Call the stored procedure for atomic receive
      const { data, error } = await supabase.rpc('receive_po_items', {
        p_po_id: poId,
        p_location_id: locationId,
        p_items: items,
        p_received_by_user_id: userId || null,
      })

      if (error) throw error

      // Reload the PO detail to get updated quantities and staff attribution
      await get().loadPurchaseOrderDetail(poId)

      return { success: true }
    } catch (err) {
      console.error('[PurchaseOrdersStore] Receive items error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to receive items',
      }
    }
  },

  deletePO: async (poId) => {
    try {
      const { error } = await supabase.rpc('delete_purchase_order_atomic', {
        p_po_id: poId,
      })

      if (error) throw error

      // Update local state
      set((state) => ({
        purchaseOrders: state.purchaseOrders.filter((po) => po.id !== poId),
        selectedPO: state.selectedPO?.id === poId ? null : state.selectedPO,
      }))

      return { success: true }
    } catch (err) {
      console.error('[PurchaseOrdersStore] Delete error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete purchase order',
      }
    }
  },

  subscribe: (vendorId) => {
    get().unsubscribe()

    const channel = supabase
      .channel('purchase-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        async (payload) => {
          console.log('[PO Realtime] Change:', payload.eventType)

          if (payload.eventType === 'INSERT') {
            // Fetch full PO with relations
            const { data } = await supabase
              .from('purchase_orders')
              .select(`
                *,
                suppliers (id, external_name),
                locations (id, name),
                purchase_order_items (id, quantity, received_quantity)
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              const supplier = Array.isArray(data.suppliers) ? data.suppliers[0] : data.suppliers
              const location = Array.isArray(data.locations) ? data.locations[0] : data.locations
              const items = data.purchase_order_items || []

              const newPO: PurchaseOrder = {
                ...data,
                supplier_name: supplier?.external_name || '',
                location_name: location?.name || '',
                items_count: items.length,
                received_items_count: items.filter((item: any) =>
                  (item.received_quantity || 0) >= (item.quantity || 0)
                ).length,
                suppliers: undefined,
                locations: undefined,
                purchase_order_items: undefined,
              }

              set((state) => ({
                purchaseOrders: [newPO, ...state.purchaseOrders],
              }))
            }
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              purchaseOrders: state.purchaseOrders.map((po) =>
                po.id === payload.new.id ? { ...po, ...payload.new } : po
              ),
            }))
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              purchaseOrders: state.purchaseOrders.filter((po) => po.id !== payload.old.id),
            }))
          }
        }
      )
      .subscribe()

    set({ subscription: channel })
  },

  unsubscribe: () => {
    const { subscription } = get()
    if (subscription) {
      supabase.removeChannel(subscription)
      set({ subscription: null })
    }
  },

  clearSelectedPO: () => {
    set({ selectedPO: null })
  },

  reset: () => {
    get().unsubscribe()
    set({
      purchaseOrders: [],
      selectedPO: null,
      stats: initialStats,
      isLoading: false,
      isLoadingDetail: false,
      error: null,
      statusFilter: 'all',
      subscription: null,
    })
  },
}))
