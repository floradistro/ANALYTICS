/**
 * Registers Management Store
 * Handles POS register and terminal configuration CRUD operations
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// =============================================================================
// TYPES
// =============================================================================

export interface TerminalConfig {
  id: string
  location_id: string
  merchant_id: string
  authentication_code: string
  v_number: string
  tpn: string | null
  store_number: string
  terminal_number: string
  hc_pos_id: string
  model: string | null
  manufacturer: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Register {
  id: string
  vendor_id: string
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
  dejavoo_config_id: string | null
  created_at: string | null
  updated_at: string | null
  // Joined data
  terminal?: TerminalConfig | null
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

export interface TerminalFormData {
  merchant_id: string
  authentication_code: string
  v_number: string
  tpn: string
  store_number: string
  terminal_number: string
  hc_pos_id: string
  model: string
  manufacturer: string
}

interface RegistersManagementState {
  registers: Register[]
  terminalsByLocation: Record<string, TerminalConfig[]>
  isLoading: boolean
  error: string | null

  loadRegisters: (vendorId: string) => Promise<void>
  createRegister: (vendorId: string, data: RegisterFormData) => Promise<{ success: boolean; error?: string }>
  updateRegister: (registerId: string, data: Partial<RegisterFormData>) => Promise<{ success: boolean; error?: string }>
  deleteRegister: (registerId: string) => Promise<{ success: boolean; error?: string }>
  linkTerminal: (registerId: string, terminalId: string) => Promise<{ success: boolean; error?: string }>
  configureTerminal: (registerId: string, locationId: string, data: TerminalFormData) => Promise<{ success: boolean; error?: string }>
  removeTerminal: (registerId: string, terminalId: string) => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

// =============================================================================
// STORE
// =============================================================================

export const useRegistersManagementStore = create<RegistersManagementState>((set, get) => ({
  registers: [],
  terminalsByLocation: {},
  isLoading: false,
  error: null,

  loadRegisters: async (vendorId: string) => {
    set({ isLoading: true, error: null })

    try {
      // Fetch registers with location info
      const { data: registersData, error: registersError } = await supabase
        .from('pos_registers')
        .select(`
          *,
          locations!pos_registers_location_id_fkey (id, name)
        `)
        .eq('vendor_id', vendorId)
        .order('location_id')
        .order('register_number')

      if (registersError) throw registersError

      console.log('[RegistersStore] Raw registers:', registersData)

      // DEBUG: Fetch ALL terminals to see what exists
      const { data: allTerminals } = await supabase
        .from('dejavoo_terminal_configs')
        .select('id, location_id, merchant_id, terminal_number')
        .limit(20)
      console.log('[RegistersStore] ALL terminals in DB:', allTerminals)

      // Get all location IDs from registers
      const locationIds = [...new Set(registersData?.map(r => r.location_id) || [])]
      console.log('[RegistersStore] Location IDs:', locationIds)

      // Fetch ALL terminal configs for these locations (not just linked ones)
      let terminalsMap: Record<string, TerminalConfig> = {}
      let terminalsByLocation: Record<string, TerminalConfig[]> = {}

      if (locationIds.length > 0) {
        const { data: terminalsData, error: terminalsError } = await supabase
          .from('dejavoo_terminal_configs')
          .select('*')
          .in('location_id', locationIds)

        if (terminalsError) throw terminalsError

        console.log('[RegistersStore] All terminals for locations:', terminalsData)

        // Map by ID for linked lookups
        terminalsMap = (terminalsData || []).reduce((acc, t) => {
          acc[t.id] = t
          return acc
        }, {} as Record<string, TerminalConfig>)

        // Also group by location for available terminals
        terminalsByLocation = (terminalsData || []).reduce((acc, t) => {
          if (!acc[t.location_id]) acc[t.location_id] = []
          acc[t.location_id].push(t)
          return acc
        }, {} as Record<string, TerminalConfig[]>)
      }

      console.log('[RegistersStore] Terminals map:', terminalsMap)
      console.log('[RegistersStore] Terminals by location:', terminalsByLocation)

      // Combine data
      const registers: Register[] = (registersData || []).map(r => ({
        ...r,
        allow_card: r.allow_card ?? true,
        allow_cash: r.allow_cash ?? true,
        allow_refunds: r.allow_refunds ?? true,
        allow_voids: r.allow_voids ?? false,
        location: r.locations,
        terminal: r.dejavoo_config_id ? terminalsMap[r.dejavoo_config_id] : null,
      }))

      set({ registers, terminalsByLocation, isLoading: false })
    } catch (err) {
      console.error('[RegistersStore] Load error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load registers',
        isLoading: false,
      })
    }
  },

  createRegister: async (vendorId: string, data: RegisterFormData) => {
    try {
      const { data: newRegister, error } = await supabase
        .from('pos_registers')
        .insert({
          vendor_id: vendorId,
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
          terminal: null,
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
      const register = get().registers.find(r => r.id === registerId)

      // Delete terminal config if exists
      if (register?.dejavoo_config_id) {
        await supabase
          .from('dejavoo_terminal_configs')
          .delete()
          .eq('id', register.dejavoo_config_id)
      }

      // Delete register
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

  linkTerminal: async (registerId: string, terminalId: string) => {
    try {
      const { error } = await supabase
        .from('pos_registers')
        .update({
          dejavoo_config_id: terminalId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', registerId)

      if (error) throw error

      // Get terminal from state
      const terminal = Object.values(get().terminalsByLocation)
        .flat()
        .find(t => t.id === terminalId)

      // Update local state
      set(state => ({
        registers: state.registers.map(r =>
          r.id === registerId
            ? { ...r, dejavoo_config_id: terminalId, terminal: terminal || null }
            : r
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Link terminal error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to link terminal',
      }
    }
  },

  configureTerminal: async (registerId: string, locationId: string, data: TerminalFormData) => {
    try {
      const register = get().registers.find(r => r.id === registerId)

      // If register already has a terminal, update it
      if (register?.dejavoo_config_id) {
        const { error } = await supabase
          .from('dejavoo_terminal_configs')
          .update({
            merchant_id: data.merchant_id,
            authentication_code: data.authentication_code,
            v_number: data.v_number,
            tpn: data.tpn || null,
            store_number: data.store_number,
            terminal_number: data.terminal_number,
            hc_pos_id: data.hc_pos_id,
            model: data.model || null,
            manufacturer: data.manufacturer || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', register.dejavoo_config_id)

        if (error) throw error

        // Update local state
        set(state => ({
          registers: state.registers.map(r =>
            r.id === registerId
              ? {
                  ...r,
                  terminal: r.terminal ? { ...r.terminal, ...data } : null,
                }
              : r
          ),
        }))
      } else {
        // Create new terminal config
        const { data: newTerminal, error: terminalError } = await supabase
          .from('dejavoo_terminal_configs')
          .insert({
            location_id: locationId,
            merchant_id: data.merchant_id,
            authentication_code: data.authentication_code,
            v_number: data.v_number,
            tpn: data.tpn || null,
            store_number: data.store_number,
            terminal_number: data.terminal_number,
            hc_pos_id: data.hc_pos_id,
            model: data.model || null,
            manufacturer: data.manufacturer || null,
            location_number: data.store_number,
            is_active: true,
          })
          .select()
          .single()

        if (terminalError) throw terminalError

        // Link terminal to register
        const { error: linkError } = await supabase
          .from('pos_registers')
          .update({
            dejavoo_config_id: newTerminal.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', registerId)

        if (linkError) throw linkError

        // Update local state
        set(state => ({
          registers: state.registers.map(r =>
            r.id === registerId
              ? {
                  ...r,
                  dejavoo_config_id: newTerminal.id,
                  terminal: newTerminal,
                }
              : r
          ),
        }))
      }

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Configure terminal error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to configure terminal',
      }
    }
  },

  removeTerminal: async (registerId: string, terminalId: string) => {
    try {
      // Unlink from register first
      const { error: unlinkError } = await supabase
        .from('pos_registers')
        .update({
          dejavoo_config_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', registerId)

      if (unlinkError) throw unlinkError

      // Delete terminal config
      const { error: deleteError } = await supabase
        .from('dejavoo_terminal_configs')
        .delete()
        .eq('id', terminalId)

      if (deleteError) throw deleteError

      // Update local state
      set(state => ({
        registers: state.registers.map(r =>
          r.id === registerId
            ? { ...r, dejavoo_config_id: null, terminal: null }
            : r
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[RegistersStore] Remove terminal error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to remove terminal',
      }
    }
  },

  reset: () => set({ registers: [], terminalsByLocation: {}, isLoading: false, error: null }),
}))
