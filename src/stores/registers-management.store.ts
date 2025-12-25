/**
 * Registers Management Store
 * Handles POS register and payment processor configuration
 *
 * NOTE: Terminal configs are stored in `payment_processors` table (not dejavoo_terminal_configs)
 * Registers link to processors via `payment_processor_id`
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// =============================================================================
// TYPES
// =============================================================================

export type ProcessorType = 'dejavoo' | 'stripe' | 'square' | 'clover' | 'authorizenet'

export interface PaymentProcessor {
  id: string
  store_id: string
  location_id: string | null
  processor_type: ProcessorType
  processor_name: string
  is_active: boolean
  is_default: boolean
  environment: 'sandbox' | 'production' | 'live'
  // Dejavoo fields
  dejavoo_authkey: string | null
  dejavoo_tpn: string | null
  dejavoo_merchant_id: string | null
  dejavoo_v_number: string | null
  dejavoo_register_id: string | null
  dejavoo_store_number: string | null
  // Authorize.Net fields
  authorizenet_api_login_id: string | null
  authorizenet_transaction_key: string | null
  is_ecommerce_processor: boolean
  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface Register {
  id: string
  store_id: string
  location_id: string
  register_name: string
  register_number: string
  status: string | null
  allow_card: boolean
  allow_cash: boolean
  allow_refunds: boolean
  allow_voids: boolean
  device_name: string | null
  device_type: string | null
  notes: string | null
  payment_processor_id: string | null
  created_at: string | null
  updated_at: string | null
  // Joined data
  processor?: PaymentProcessor | null
  location?: { id: string; name: string } | null
}

export interface RegisterFormData {
  register_name: string
  register_number: string
  location_id: string
  allow_card: boolean
  allow_cash: boolean
  allow_refunds: boolean
  allow_voids: boolean
  notes: string
}

export interface ProcessorFormData {
  processor_name: string
  processor_type: ProcessorType
  environment: 'sandbox' | 'production' | 'live'
  // Dejavoo fields
  dejavoo_merchant_id: string
  dejavoo_authkey: string
  dejavoo_v_number: string
  dejavoo_tpn: string
  dejavoo_store_number: string
  dejavoo_register_id: string
}

interface RegistersManagementState {
  registers: Register[]
  processorsByLocation: Record<string, PaymentProcessor[]>
  isLoading: boolean
  error: string | null

  loadRegisters: (storeId: string) => Promise<void>
  createRegister: (storeId: string, data: RegisterFormData) => Promise<{ success: boolean; error?: string }>
  updateRegister: (registerId: string, data: Partial<RegisterFormData>) => Promise<{ success: boolean; error?: string }>
  deleteRegister: (registerId: string) => Promise<{ success: boolean; error?: string }>
  linkProcessor: (registerId: string, processorId: string) => Promise<{ success: boolean; error?: string }>
  unlinkProcessor: (registerId: string) => Promise<{ success: boolean; error?: string }>
  createProcessor: (storeId: string, locationId: string, data: ProcessorFormData) => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

// =============================================================================
// STORE
// =============================================================================

export const useRegistersManagementStore = create<RegistersManagementState>((set, get) => ({
  registers: [],
  processorsByLocation: {},
  isLoading: false,
  error: null,

  loadRegisters: async (storeId: string) => {
    set({ isLoading: true, error: null })

    try {
      // Fetch registers with location info
      const { data: registersData, error: registersError } = await supabase
        .from('pos_registers')
        .select(`
          *,
          locations!pos_registers_location_id_fkey (id, name)
        `)
        .eq('store_id', storeId)
        .order('location_id')
        .order('register_number')

      if (registersError) throw registersError

      // Get all location IDs from registers
      const locationIds = [...new Set(registersData?.map(r => r.location_id) || [])]

      // Fetch ALL payment processors for these locations (Dejavoo only for terminals)
      let processorsMap: Record<string, PaymentProcessor> = {}
      let processorsByLocation: Record<string, PaymentProcessor[]> = {}

      if (locationIds.length > 0) {
        const { data: processorsData, error: processorsError } = await supabase
          .from('payment_processors')
          .select('*')
          .eq('store_id', storeId)
          .in('location_id', locationIds)
          .eq('processor_type', 'dejavoo')

        if (processorsError) throw processorsError

        // Map by ID for linked lookups
        processorsMap = (processorsData || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, PaymentProcessor>)

        // Also group by location for available processors
        processorsByLocation = (processorsData || []).reduce((acc, p) => {
          const locId = p.location_id
          if (locId) {
            if (!acc[locId]) acc[locId] = []
            acc[locId].push(p)
          }
          return acc
        }, {} as Record<string, PaymentProcessor[]>)
      }

      // Combine data
      const registers: Register[] = (registersData || []).map(r => ({
        ...r,
        allow_card: r.allow_card ?? true,
        allow_cash: r.allow_cash ?? true,
        allow_refunds: r.allow_refunds ?? true,
        allow_voids: r.allow_voids ?? false,
        location: r.locations,
        processor: r.payment_processor_id ? processorsMap[r.payment_processor_id] || null : null,
      }))

      set({ registers, processorsByLocation, isLoading: false })
    } catch (err) {
      console.error('[RegistersStore] Load error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load registers',
        isLoading: false,
      })
    }
  },

  createRegister: async (storeId: string, data: RegisterFormData) => {
    try {
      const { data: newRegister, error } = await supabase
        .from('pos_registers')
        .insert({
          store_id: storeId,
          location_id: data.location_id,
          register_name: data.register_name,
          register_number: data.register_number,
          allow_card: data.allow_card,
          allow_cash: data.allow_cash,
          allow_refunds: data.allow_refunds,
          allow_voids: data.allow_voids,
          notes: data.notes || null,
          status: 'active',
        })
        .select(`
          *,
          locations!pos_registers_location_id_fkey (id, name)
        `)
        .single()

      if (error) throw error

      // Add to local state
      set(state => ({
        registers: [...state.registers, {
          ...newRegister,
          allow_card: newRegister.allow_card ?? true,
          allow_cash: newRegister.allow_cash ?? true,
          allow_refunds: newRegister.allow_refunds ?? true,
          allow_voids: newRegister.allow_voids ?? false,
          location: newRegister.locations,
          processor: null,
        }].sort((a, b) => {
          if (a.location_id !== b.location_id) return a.location_id.localeCompare(b.location_id)
          return a.register_number.localeCompare(b.register_number)
        }),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Create error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create register',
      }
    }
  },

  updateRegister: async (registerId: string, data: Partial<RegisterFormData>) => {
    try {
      const { error } = await supabase
        .from('pos_registers')
        .update({
          ...data,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', registerId)

      if (error) throw error

      // Update local state
      set(state => ({
        registers: state.registers.map(r =>
          r.id === registerId ? { ...r, ...data } : r
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Update error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update register',
      }
    }
  },

  deleteRegister: async (registerId: string) => {
    try {
      const { error } = await supabase
        .from('pos_registers')
        .delete()
        .eq('id', registerId)

      if (error) throw error

      // Update local state
      set(state => ({
        registers: state.registers.filter(r => r.id !== registerId),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Delete error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete register',
      }
    }
  },

  linkProcessor: async (registerId: string, processorId: string) => {
    try {
      const { error } = await supabase
        .from('pos_registers')
        .update({
          payment_processor_id: processorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', registerId)

      if (error) throw error

      // Get processor from state
      const processor = Object.values(get().processorsByLocation)
        .flat()
        .find(p => p.id === processorId)

      // Update local state
      set(state => ({
        registers: state.registers.map(r =>
          r.id === registerId
            ? { ...r, payment_processor_id: processorId, processor: processor || null }
            : r
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Link processor error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to link processor',
      }
    }
  },

  unlinkProcessor: async (registerId: string) => {
    try {
      const { error } = await supabase
        .from('pos_registers')
        .update({
          payment_processor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', registerId)

      if (error) throw error

      // Update local state
      set(state => ({
        registers: state.registers.map(r =>
          r.id === registerId
            ? { ...r, payment_processor_id: null, processor: null }
            : r
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Unlink processor error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to unlink processor',
      }
    }
  },

  createProcessor: async (storeId: string, locationId: string, data: ProcessorFormData) => {
    try {
      const { data: newProcessor, error } = await supabase
        .from('payment_processors')
        .insert({
          store_id: storeId,
          location_id: locationId,
          processor_type: data.processor_type,
          processor_name: data.processor_name,
          environment: data.environment,
          dejavoo_merchant_id: data.dejavoo_merchant_id,
          dejavoo_authkey: data.dejavoo_authkey,
          dejavoo_v_number: data.dejavoo_v_number,
          dejavoo_tpn: data.dejavoo_tpn || null,
          dejavoo_store_number: data.dejavoo_store_number,
          dejavoo_register_id: data.dejavoo_register_id,
          is_active: true,
          is_default: false,
        })
        .select()
        .single()

      if (error) throw error

      // Add to processorsByLocation
      set(state => {
        const updated = { ...state.processorsByLocation }
        if (!updated[locationId]) updated[locationId] = []
        updated[locationId].push(newProcessor)
        return { processorsByLocation: updated }
      })

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Create processor error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create processor',
      }
    }
  },

  reset: () => set({ registers: [], processorsByLocation: {}, isLoading: false, error: null }),
}))
