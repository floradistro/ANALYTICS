/**
 * Inventory Store
 *
 * Manages inventory state for the analytics dashboard:
 * - Stock levels by location/product
 * - Inventory adjustments (damage, shrinkage, count corrections)
 * - Inventory transfers between locations
 * - Real-time Supabase subscriptions
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

export type AdjustmentType =
  | 'count_correction'
  | 'damage'
  | 'shrinkage'
  | 'theft'
  | 'expired'
  | 'received'
  | 'return'
  | 'other'

export type TransferStatus = 'draft' | 'approved' | 'in_transit' | 'completed' | 'cancelled'
export type ItemCondition = 'good' | 'damaged' | 'expired' | 'rejected'

export interface Location {
  id: string
  name: string
  address_line1?: string
  city?: string
  state?: string
  postal_code?: string
  phone?: string
  tax_rate?: number
  is_primary: boolean
  is_active?: boolean
}

export interface InventoryItem {
  id: string
  store_id: string
  location_id: string
  location_name?: string
  product_id: string
  product_name?: string
  product_sku?: string
  product_category?: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  low_stock_threshold: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
  unit_cost?: number
  average_cost?: number
  created_at: string
  updated_at: string
}

export interface InventoryAdjustment {
  id: string
  store_id: string
  product_id: string
  product_name?: string
  product_sku?: string
  location_id: string
  location_name?: string
  adjustment_type: AdjustmentType
  quantity_before: number
  quantity_after: number
  quantity_change: number
  reason: string
  notes?: string
  reference_id?: string
  reference_type?: string
  created_by?: string
  created_by_name?: string
  created_at: string
  audit_date: string
}

export interface InventoryTransfer {
  id: string
  store_id: string
  transfer_number: string
  source_location_id: string
  source_location_name?: string
  destination_location_id: string
  destination_location_name?: string
  status: TransferStatus
  notes?: string
  tracking_number?: string
  shipped_at?: string
  received_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
  created_by_user_id?: string
  created_by_name?: string
  received_by_user_id?: string
  received_by_name?: string
  items_count?: number
  received_items_count?: number
}

export interface TransferItem {
  id: string
  transfer_id: string
  product_id: string
  product_name?: string
  product_sku?: string
  quantity: number
  received_quantity: number
  condition?: ItemCondition
  condition_notes?: string
}

export interface TransferWithItems extends InventoryTransfer {
  items: TransferItem[]
}

export interface CreateAdjustmentInput {
  product_id: string
  location_id: string
  adjustment_type: AdjustmentType
  quantity_change: number
  reason: string
  notes?: string
}

export interface CreateTransferInput {
  source_location_id: string
  destination_location_id: string
  notes?: string
  items: {
    product_id: string
    quantity: number
  }[]
}

export interface InventoryStats {
  total_items: number
  total_quantity: number
  total_value: number
  low_stock_count: number
  out_of_stock_count: number
}

export interface AdjustmentStats {
  total: number
  by_type: Record<AdjustmentType, number>
  total_increase: number
  total_decrease: number
}

interface InventoryState {
  // Data
  inventory: InventoryItem[]
  locations: Location[]
  adjustments: InventoryAdjustment[]
  transfers: InventoryTransfer[]
  selectedTransfer: TransferWithItems | null

  // Stats
  inventoryStats: InventoryStats
  adjustmentStats: AdjustmentStats

  // UI State
  isLoading: boolean
  isLoadingAdjustments: boolean
  isLoadingTransfers: boolean
  isLoadingTransferDetail: boolean
  error: string | null

  // Filters
  locationFilter: string | null
  categoryFilter: string | null
  stockStatusFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

  // Subscriptions
  inventorySubscription: RealtimeChannel | null
  transferSubscription: RealtimeChannel | null

  // Actions - Inventory
  loadInventory: (storeId: string, params?: {
    locationId?: string
    category?: string
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock'
    search?: string
  }) => Promise<void>
  loadLocations: (storeId: string) => Promise<void>

  // Actions - Adjustments
  loadAdjustments: (storeId: string, params?: {
    locationId?: string
    productId?: string
    adjustmentType?: AdjustmentType
    startDate?: string
    endDate?: string
    limit?: number
  }) => Promise<void>
  createAdjustment: (storeId: string, input: CreateAdjustmentInput) => Promise<{ success: boolean; error?: string }>

  // Actions - Transfers
  loadTransfers: (storeId: string, params?: {
    status?: TransferStatus
    locationId?: string
  }) => Promise<void>
  loadTransferDetail: (transferId: string) => Promise<void>
  createTransfer: (storeId: string, input: CreateTransferInput) => Promise<{ success: boolean; transferId?: string; error?: string }>
  updateTransferStatus: (transferId: string, status: TransferStatus, userId?: string) => Promise<{ success: boolean; error?: string }>
  receiveTransferItems: (transferId: string, items: {
    item_id: string
    quantity: number
    condition: ItemCondition
    condition_notes?: string
  }[], userId?: string) => Promise<{ success: boolean; error?: string }>

  // Filters
  setLocationFilter: (locationId: string | null) => void
  setCategoryFilter: (category: string | null) => void
  setStockStatusFilter: (status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void

  // Real-time
  subscribeToInventory: (storeId: string) => void
  subscribeToTransfers: (storeId: string) => void
  unsubscribe: () => void

  // Helpers
  clearSelectedTransfer: () => void
  reset: () => void
}

const initialInventoryStats: InventoryStats = {
  total_items: 0,
  total_quantity: 0,
  total_value: 0,
  low_stock_count: 0,
  out_of_stock_count: 0,
}

const initialAdjustmentStats: AdjustmentStats = {
  total: 0,
  by_type: {} as Record<AdjustmentType, number>,
  total_increase: 0,
  total_decrease: 0,
}

// =============================================================================
// STORE
// =============================================================================

export const useInventoryStore = create<InventoryState>((set, get) => ({
  // Initial state
  inventory: [],
  locations: [],
  adjustments: [],
  transfers: [],
  selectedTransfer: null,
  inventoryStats: initialInventoryStats,
  adjustmentStats: initialAdjustmentStats,
  isLoading: false,
  isLoadingAdjustments: false,
  isLoadingTransfers: false,
  isLoadingTransferDetail: false,
  error: null,
  locationFilter: null,
  categoryFilter: null,
  stockStatusFilter: 'all',
  inventorySubscription: null,
  transferSubscription: null,

  // ==========================================================================
  // INVENTORY ACTIONS
  // ==========================================================================

  loadInventory: async (storeId, params = {}) => {
    set({ isLoading: true, error: null })

    try {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          products (id, name, sku),
          locations (id, name)
        `)
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })

      if (params.locationId) {
        query = query.eq('location_id', params.locationId)
      }

      if (params.stockStatus) {
        query = query.eq('stock_status', params.stockStatus)
      }

      const { data, error } = await query

      if (error) throw error

      // Flatten joined data and filter by category/search if needed
      let items: InventoryItem[] = (data || []).map((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        const location = Array.isArray(item.locations) ? item.locations[0] : item.locations

        return {
          ...item,
          product_name: product?.name || '',
          product_sku: product?.sku || '',
          product_category: '',
          location_name: location?.name || '',
          products: undefined,
          locations: undefined,
        }
      })

      // Client-side filtering for category and search
      if (params.category) {
        items = items.filter(item =>
          item.product_category?.toLowerCase() === params.category?.toLowerCase()
        )
      }

      if (params.search) {
        const searchLower = params.search.toLowerCase()
        items = items.filter(item =>
          item.product_name?.toLowerCase().includes(searchLower) ||
          item.product_sku?.toLowerCase().includes(searchLower)
        )
      }

      // Calculate stats
      const stats: InventoryStats = {
        total_items: items.length,
        total_quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        total_value: items.reduce((sum, item) =>
          sum + (item.quantity || 0) * (item.unit_cost || item.average_cost || 0), 0
        ),
        low_stock_count: items.filter(item => item.stock_status === 'low_stock').length,
        out_of_stock_count: items.filter(item => item.stock_status === 'out_of_stock').length,
      }

      set({ inventory: items, inventoryStats: stats, isLoading: false })
    } catch (err) {
      console.error('[InventoryStore] Load error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load inventory',
        inventory: [],
        inventoryStats: initialInventoryStats,
        isLoading: false,
      })
    }
  },

  loadLocations: async (storeId) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('store_id', storeId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      set({ locations: data || [] })
    } catch (err) {
      console.error('[InventoryStore] Load locations error:', err)
    }
  },

  // ==========================================================================
  // ADJUSTMENT ACTIONS
  // ==========================================================================

  loadAdjustments: async (storeId, params = {}) => {
    set({ isLoadingAdjustments: true, error: null })

    try {
      let query = supabase
        .from('inventory_adjustments')
        .select(`
          *,
          products (id, name, sku),
          locations (id, name)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (params.locationId) {
        query = query.eq('location_id', params.locationId)
      }

      if (params.productId) {
        query = query.eq('product_id', params.productId)
      }

      if (params.adjustmentType) {
        query = query.eq('adjustment_type', params.adjustmentType)
      }

      if (params.startDate) {
        query = query.gte('created_at', params.startDate)
      }

      if (params.endDate) {
        query = query.lte('created_at', params.endDate)
      }

      if (params.limit) {
        query = query.limit(params.limit)
      }

      const { data, error } = await query

      if (error) throw error

      // Flatten and fetch user names
      const adjustments: InventoryAdjustment[] = (data || []).map((adj: any) => {
        const product = Array.isArray(adj.products) ? adj.products[0] : adj.products
        const location = Array.isArray(adj.locations) ? adj.locations[0] : adj.locations

        return {
          ...adj,
          product_name: product?.name || '',
          product_sku: product?.sku || '',
          location_name: location?.name || '',
          products: undefined,
          locations: undefined,
        }
      })

      // Fetch user names for created_by
      const userIds = [...new Set(adjustments.map(a => a.created_by).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, auth_user_id')
          .in('auth_user_id', userIds)

        if (users) {
          const userMap = new Map(users.map(u => [
            u.auth_user_id,
            [u.first_name, u.last_name].filter(Boolean).join(' ') || u.auth_user_id
          ]))
          adjustments.forEach(adj => {
            if (adj.created_by) {
              adj.created_by_name = userMap.get(adj.created_by) || ''
            }
          })
        }
      }

      // Calculate stats
      const stats: AdjustmentStats = adjustments.reduce((acc, adj) => {
        acc.total += 1
        const type = adj.adjustment_type as AdjustmentType
        acc.by_type[type] = (acc.by_type[type] || 0) + 1
        if (adj.quantity_change > 0) {
          acc.total_increase += adj.quantity_change
        } else {
          acc.total_decrease += Math.abs(adj.quantity_change)
        }
        return acc
      }, {
        total: 0,
        by_type: {} as Record<AdjustmentType, number>,
        total_increase: 0,
        total_decrease: 0,
      })

      set({ adjustments, adjustmentStats: stats, isLoadingAdjustments: false })
    } catch (err) {
      console.error('[InventoryStore] Load adjustments error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load adjustments',
        adjustments: [],
        adjustmentStats: initialAdjustmentStats,
        isLoadingAdjustments: false,
      })
    }
  },

  createAdjustment: async (storeId, input) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const idempotencyKey = `adj-${input.product_id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

      const { data, error } = await supabase.rpc('process_inventory_adjustment', {
        p_store_id: storeId,
        p_product_id: input.product_id,
        p_location_id: input.location_id,
        p_adjustment_type: input.adjustment_type,
        p_quantity_change: input.quantity_change,
        p_reason: input.reason,
        p_notes: input.notes || null,
        p_reference_type: null,
        p_reference_id: null,
        p_created_by: user?.id || null,
        p_idempotency_key: idempotencyKey,
      })

      if (error) throw error

      // Reload adjustments to show the new one
      await get().loadAdjustments(storeId, { limit: 50 })

      // Reload inventory to reflect the change
      const { locationFilter } = get()
      await get().loadInventory(storeId, { locationId: locationFilter || undefined })

      return { success: true }
    } catch (err: any) {
      console.error('[InventoryStore] Create adjustment error:', err)
      return {
        success: false,
        error: err?.message || 'Failed to create adjustment',
      }
    }
  },

  // ==========================================================================
  // TRANSFER ACTIONS
  // ==========================================================================

  loadTransfers: async (storeId, params = {}) => {
    set({ isLoadingTransfers: true, error: null })

    try {
      let query = supabase
        .from('inventory_transfers')
        .select(`
          *,
          source:locations!inventory_transfers_source_location_id_fkey (id, name),
          destination:locations!inventory_transfers_destination_location_id_fkey (id, name),
          inventory_transfer_items (id, quantity, received_quantity)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.locationId) {
        query = query.or(`source_location_id.eq.${params.locationId},destination_location_id.eq.${params.locationId}`)
      }

      const { data, error } = await query

      if (error) throw error

      const transfers: InventoryTransfer[] = (data || []).map((t: any) => {
        const source = Array.isArray(t.source) ? t.source[0] : t.source
        const destination = Array.isArray(t.destination) ? t.destination[0] : t.destination
        const items = t.inventory_transfer_items || []

        return {
          ...t,
          source_location_name: source?.name || '',
          destination_location_name: destination?.name || '',
          items_count: items.length,
          received_items_count: items.filter((item: any) =>
            (item.received_quantity || 0) >= (item.quantity || 0)
          ).length,
          source: undefined,
          destination: undefined,
          inventory_transfer_items: undefined,
        }
      })

      set({ transfers, isLoadingTransfers: false })
    } catch (err) {
      console.error('[InventoryStore] Load transfers error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load transfers',
        transfers: [],
        isLoadingTransfers: false,
      })
    }
  },

  loadTransferDetail: async (transferId) => {
    set({ isLoadingTransferDetail: true, error: null })

    try {
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select(`
          *,
          source:locations!inventory_transfers_source_location_id_fkey (id, name),
          destination:locations!inventory_transfers_destination_location_id_fkey (id, name),
          inventory_transfer_items (
            *,
            products (id, name, sku)
          )
        `)
        .eq('id', transferId)
        .single()

      if (error) throw error

      const source = Array.isArray(data.source) ? data.source[0] : data.source
      const destination = Array.isArray(data.destination) ? data.destination[0] : data.destination

      // Fetch user names
      const userIds = [data.created_by_user_id, data.received_by_user_id].filter(Boolean)
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

      const items: TransferItem[] = (data.inventory_transfer_items || []).map((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        return {
          ...item,
          product_name: product?.name || '',
          product_sku: product?.sku || '',
          products: undefined,
        }
      })

      const transfer: TransferWithItems = {
        ...data,
        source_location_name: source?.name || '',
        destination_location_name: destination?.name || '',
        created_by_name: data.created_by_user_id ? userMap[data.created_by_user_id] || '' : '',
        received_by_name: data.received_by_user_id ? userMap[data.received_by_user_id] || '' : '',
        items,
        items_count: items.length,
        received_items_count: items.filter(item =>
          (item.received_quantity || 0) >= (item.quantity || 0)
        ).length,
        source: undefined,
        destination: undefined,
        inventory_transfer_items: undefined,
      }

      set({ selectedTransfer: transfer, isLoadingTransferDetail: false })
    } catch (err) {
      console.error('[InventoryStore] Load transfer detail error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load transfer',
        selectedTransfer: null,
        isLoadingTransferDetail: false,
      })
    }
  },

  createTransfer: async (storeId, input) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Generate transfer number
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 6).toUpperCase()
      const transferNumber = `TRF-${timestamp}-${random}`

      const idempotencyKey = `transfer-${storeId}-${Date.now()}`

      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from('inventory_transfers')
        .insert({
          store_id: storeId,
          transfer_number: transferNumber,
          source_location_id: input.source_location_id,
          destination_location_id: input.destination_location_id,
          status: 'draft',
          notes: input.notes || null,
          created_by_user_id: user?.id || null,
          idempotency_key: idempotencyKey,
        })
        .select()
        .single()

      if (transferError) throw transferError

      // Create transfer items
      const itemsToInsert = input.items.map(item => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity: item.quantity,
        received_quantity: 0,
      }))

      const { error: itemsError } = await supabase
        .from('inventory_transfer_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Reload transfers
      await get().loadTransfers(storeId)

      return { success: true, transferId: transfer.id }
    } catch (err: any) {
      console.error('[InventoryStore] Create transfer error:', err)
      return {
        success: false,
        error: err?.message || 'Failed to create transfer',
      }
    }
  },

  updateTransferStatus: async (transferId, status, userId) => {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (status === 'in_transit') {
        updateData.shipped_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.received_at = new Date().toISOString()
        if (userId) {
          updateData.received_by_user_id = userId
        }
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
        if (userId) {
          updateData.cancelled_by_user_id = userId
        }
      } else if (status === 'approved') {
        if (userId) {
          updateData.approved_by_user_id = userId
        }
      }

      const { error } = await supabase
        .from('inventory_transfers')
        .update(updateData)
        .eq('id', transferId)

      if (error) throw error

      // Reload detail if viewing
      if (get().selectedTransfer?.id === transferId) {
        await get().loadTransferDetail(transferId)
      }

      // Update local state
      set((state) => ({
        transfers: state.transfers.map((t) =>
          t.id === transferId ? { ...t, status } : t
        ),
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[InventoryStore] Update transfer status error:', err)
      return {
        success: false,
        error: err?.message || 'Failed to update transfer status',
      }
    }
  },

  receiveTransferItems: async (transferId, items, userId) => {
    try {
      // Update each item's received quantity
      for (const item of items) {
        const { error } = await supabase
          .from('inventory_transfer_items')
          .update({
            received_quantity: item.quantity,
            condition: item.condition,
            condition_notes: item.condition_notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.item_id)

        if (error) throw error
      }

      // Check if all items are received
      const { data: allItems } = await supabase
        .from('inventory_transfer_items')
        .select('quantity, received_quantity')
        .eq('transfer_id', transferId)

      const allReceived = allItems?.every(item =>
        (item.received_quantity || 0) >= (item.quantity || 0)
      )

      // Update transfer status
      const newStatus = allReceived ? 'completed' : 'in_transit'
      await get().updateTransferStatus(transferId, newStatus, userId)

      // Reload detail
      await get().loadTransferDetail(transferId)

      return { success: true }
    } catch (err: any) {
      console.error('[InventoryStore] Receive transfer items error:', err)
      return {
        success: false,
        error: err?.message || 'Failed to receive items',
      }
    }
  },

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  setLocationFilter: (locationId) => set({ locationFilter: locationId }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStockStatusFilter: (status) => set({ stockStatusFilter: status }),

  // ==========================================================================
  // REAL-TIME
  // ==========================================================================

  subscribeToInventory: (storeId) => {
    const existing = get().inventorySubscription
    if (existing) {
      supabase.removeChannel(existing)
    }

    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          // Reload inventory on any change
          const { locationFilter } = get()
          get().loadInventory(storeId, { locationId: locationFilter || undefined })
        }
      )
      .subscribe()

    set({ inventorySubscription: channel })
  },

  subscribeToTransfers: (storeId) => {
    const existing = get().transferSubscription
    if (existing) {
      supabase.removeChannel(existing)
    }

    const channel = supabase
      .channel('transfer-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transfers',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          get().loadTransfers(storeId)
        }
      )
      .subscribe()

    set({ transferSubscription: channel })
  },

  unsubscribe: () => {
    const { inventorySubscription, transferSubscription } = get()
    if (inventorySubscription) {
      supabase.removeChannel(inventorySubscription)
    }
    if (transferSubscription) {
      supabase.removeChannel(transferSubscription)
    }
    set({ inventorySubscription: null, transferSubscription: null })
  },

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  clearSelectedTransfer: () => set({ selectedTransfer: null }),

  reset: () => {
    get().unsubscribe()
    set({
      inventory: [],
      locations: [],
      adjustments: [],
      transfers: [],
      selectedTransfer: null,
      inventoryStats: initialInventoryStats,
      adjustmentStats: initialAdjustmentStats,
      isLoading: false,
      isLoadingAdjustments: false,
      isLoadingTransfers: false,
      isLoadingTransferDetail: false,
      error: null,
      locationFilter: null,
      categoryFilter: null,
      stockStatusFilter: 'all',
      inventorySubscription: null,
      transferSubscription: null,
    })
  },
}))
