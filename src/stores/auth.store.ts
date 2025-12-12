'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Vendor } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  vendor: Vendor | null
  vendorId: string | null
  isLoading: boolean
  error: string | null

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setVendor: (vendor: Vendor | null) => void
  setVendorId: (vendorId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      vendor: null,
      vendorId: null,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setVendor: (vendor) => set({ vendor }),
      setVendorId: (vendorId) => set({ vendorId }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ error: error.message, isLoading: false })
            return false
          }

          if (data.user && data.session) {
            // Get user's vendor info - use auth_user_id to match Supabase Auth user
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('vendor_id, vendors(id, store_name, logo_url, ecommerce_url, free_shipping_enabled, free_shipping_threshold, default_shipping_cost)')
              .eq('auth_user_id', data.user.id)
              .maybeSingle()

            if (userError) {
              console.error('User lookup error:', userError)
              set({ error: 'Failed to fetch user data', isLoading: false })
              return false
            }

            if (!userData?.vendor_id) {
              set({ error: 'No vendor associated with this account', isLoading: false })
              return false
            }

            // Extract vendor from joined data
            const vendorData = (userData as any).vendors as Vendor | null

            set({
              user: data.user,
              session: data.session,
              vendorId: userData.vendor_id,
              vendor: vendorData,
              isLoading: false,
            })

            return true
          }

          set({ isLoading: false })
          return false
        } catch (err) {
          console.error('Login error:', err)
          set({ error: 'An unexpected error occurred', isLoading: false })
          return false
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({
          user: null,
          session: null,
          vendor: null,
          vendorId: null,
          error: null,
        })
      },

      initialize: async () => {
        set({ isLoading: true })

        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: userData } = await supabase
              .from('users')
              .select('vendor_id, vendors(id, store_name, logo_url, ecommerce_url, free_shipping_enabled, free_shipping_threshold, default_shipping_cost)')
              .eq('auth_user_id', session.user.id)
              .maybeSingle()

            if (userData?.vendor_id) {
              const vendorData = (userData as any).vendors as Vendor | null

              set({
                user: session.user,
                session,
                vendorId: userData.vendor_id,
                vendor: vendorData,
                isLoading: false,
              })
              return
            }
          }

          set({ isLoading: false })
        } catch (err) {
          console.error('Initialize error:', err)
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ vendorId: state.vendorId }),
    }
  )
)
