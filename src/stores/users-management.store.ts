/**
 * Users Management Store
 * Handles team member CRUD operations
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// =============================================================================
// TYPES
// =============================================================================

export interface TeamUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: 'admin' | 'vendor_owner' | 'vendor_manager' | 'location_manager' | 'pos_staff' | 'inventory_staff' | 'readonly'
  status: 'active' | 'inactive'
  employee_id: string | null
  created_at: string
  updated_at: string
  vendor_id: string
  auth_user_id: string | null
  location_count: number
  locations: { id: string; name: string }[]
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  vendor_owner: 'Owner',
  vendor_manager: 'Manager',
  location_manager: 'Location Manager',
  pos_staff: 'Staff',
  inventory_staff: 'Inventory',
  readonly: 'Read Only',
}

interface UsersManagementState {
  users: TeamUser[]
  isLoading: boolean
  error: string | null

  loadUsers: (vendorId: string) => Promise<void>
  createUser: (vendorId: string, userData: {
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: string
    employee_id?: string
    location_ids?: string[]
  }) => Promise<{ success: boolean; error?: string; message?: string; userId?: string }>
  updateUser: (userId: string, updates: Partial<TeamUser>) => Promise<{ success: boolean; error?: string }>
  updateUserLocations: (userId: string, locationIds: string[]) => Promise<{ success: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>
  toggleUserStatus: (userId: string, status: 'active' | 'inactive') => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

// =============================================================================
// STORE
// =============================================================================

export const useUsersManagementStore = create<UsersManagementState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  loadUsers: async (vendorId: string) => {
    set({ isLoading: true, error: null })

    try {
      // Get all users for this vendor
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get location assignments for each user
      const usersWithLocations: TeamUser[] = await Promise.all(
        (usersData || []).map(async (u) => {
          const { data: locationData } = await supabase
            .from('user_locations')
            .select(`
              location_id,
              locations!inner (id, name)
            `)
            .eq('user_id', u.id)

          const locations = (locationData || []).map((ld: any) => {
            const loc = Array.isArray(ld.locations) ? ld.locations[0] : ld.locations
            return { id: loc.id, name: loc.name }
          })

          return {
            ...u,
            location_count: locations.length,
            locations,
          }
        })
      )

      set({ users: usersWithLocations, isLoading: false })
    } catch (err) {
      console.error('[UsersStore] Load error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load users',
        isLoading: false,
      })
    }
  },

  createUser: async (vendorId: string, userData) => {
    try {
      // Use the API route which handles Supabase Auth + users table
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone || null,
          role: userData.role,
          employee_id: userData.employee_id || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      // Assign locations if provided
      if (userData.location_ids && userData.location_ids.length > 0 && result.user?.id) {
        const { error: locError } = await supabase
          .from('user_locations')
          .insert(
            userData.location_ids.map((locationId) => ({
              user_id: result.user.id,
              location_id: locationId,
            }))
          )

        if (locError) {
          console.error('[UsersStore] Location assignment error:', locError)
          // Don't fail the whole operation, user is created
        }
      }

      // Reload users
      await get().loadUsers(vendorId)

      return { success: true, message: result.message, userId: result.user?.id }
    } catch (err) {
      console.error('[UsersStore] Create error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create user',
      }
    }
  },

  updateUser: async (userId: string, updates) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      set((state) => ({
        users: state.users.map((u) =>
          u.id === userId ? { ...u, ...updates } : u
        ),
      }))

      return { success: true }
    } catch (err) {
      console.error('[UsersStore] Update error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update user',
      }
    }
  },

  deleteUser: async (userId: string) => {
    try {
      // Use the API route which handles both Supabase Auth + users table deletion
      const response = await fetch(`/api/users/invite?userId=${userId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      // Update local state
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
      }))

      return { success: true }
    } catch (err) {
      console.error('[UsersStore] Delete error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete user',
      }
    }
  },

  updateUserLocations: async (userId: string, locationIds: string[]) => {
    try {
      // Delete existing location assignments
      const { error: deleteError } = await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      // Insert new location assignments
      if (locationIds.length > 0) {
        const { error: insertError } = await supabase
          .from('user_locations')
          .insert(
            locationIds.map((locationId) => ({
              user_id: userId,
              location_id: locationId,
            }))
          )

        if (insertError) throw insertError
      }

      // Update local state
      set((state) => ({
        users: state.users.map((u) => {
          if (u.id === userId) {
            // We need to fetch location names - for now just update the IDs
            return {
              ...u,
              location_count: locationIds.length,
              locations: locationIds.map((id) => {
                // Try to find the location name from existing data
                const existingLoc = u.locations.find((l) => l.id === id)
                return existingLoc || { id, name: 'Unknown' }
              }),
            }
          }
          return u
        }),
      }))

      return { success: true }
    } catch (err) {
      console.error('[UsersStore] Update locations error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update user locations',
      }
    }
  },

  toggleUserStatus: async (userId: string, status: 'active' | 'inactive') => {
    return get().updateUser(userId, { status })
  },

  reset: () => set({ users: [], isLoading: false, error: null }),
}))
