/**
 * Suppliers Management Store
 * Handles supplier CRUD operations
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// =============================================================================
// TYPES
// =============================================================================

export interface Supplier {
  id: string
  store_id: string
  external_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SuppliersManagementState {
  suppliers: Supplier[]
  isLoading: boolean
  error: string | null

  loadSuppliers: (storeId: string) => Promise<void>
  createSupplier: (storeId: string, supplierData: {
    external_name: string
    contact_name?: string
    contact_email?: string
    contact_phone?: string
    address?: string
    notes?: string
  }) => Promise<{ success: boolean; error?: string }>
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<{ success: boolean; error?: string }>
  deleteSupplier: (supplierId: string) => Promise<{ success: boolean; error?: string }>
  toggleSupplierStatus: (supplierId: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

// =============================================================================
// STORE
// =============================================================================

export const useSuppliersManagementStore = create<SuppliersManagementState>((set, get) => ({
  suppliers: [],
  isLoading: false,
  error: null,

  loadSuppliers: async (storeId: string) => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('store_id', storeId)
        .order('external_name')

      if (error) throw error

      set({ suppliers: data || [], isLoading: false })
    } catch (err) {
      console.error('[SuppliersStore] Load error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load suppliers',
        suppliers: [],
        isLoading: false,
      })
    }
  },

  createSupplier: async (storeId: string, supplierData) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          store_id: storeId,
          external_name: supplierData.external_name,
          contact_name: supplierData.contact_name || null,
          contact_email: supplierData.contact_email || null,
          contact_phone: supplierData.contact_phone || null,
          address: supplierData.address || null,
          notes: supplierData.notes || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      set((state) => ({
        suppliers: [...state.suppliers, data].sort((a, b) =>
          a.external_name.localeCompare(b.external_name)
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[SuppliersStore] Create error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create supplier',
      }
    }
  },

  updateSupplier: async (supplierId: string, updates) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', supplierId)

      if (error) throw error

      // Update local state
      set((state) => ({
        suppliers: state.suppliers.map((s) =>
          s.id === supplierId ? { ...s, ...updates } : s
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[SuppliersStore] Update error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update supplier',
      }
    }
  },

  deleteSupplier: async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)

      if (error) throw error

      // Update local state
      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== supplierId),
      }))

      return { success: true }
    } catch (err) {
      console.error('[SuppliersStore] Delete error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete supplier',
      }
    }
  },

  toggleSupplierStatus: async (supplierId: string, isActive: boolean) => {
    return get().updateSupplier(supplierId, { is_active: isActive })
  },

  reset: () => set({ suppliers: [], isLoading: false, error: null }),
}))
