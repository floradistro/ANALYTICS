'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Store type - matches the stores table in the database
interface Store {
  id: string
  store_name: string | null
  logo_url: string | null
  ecommerce_url: string | null
  free_shipping_enabled: boolean | null
  free_shipping_threshold: number | null
  default_shipping_cost: number | null
}

interface AuthState {
  user: User | null
  session: Session | null
  store: Store | null
  storeId: string | null
  userId: string | null // Database user ID (not auth user id)
  isLoading: boolean
  error: string | null

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setStore: (store: Store | null) => void
  setStoreId: (storeId: string | null) => void
  setUserId: (userId: string | null) => void
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
      store: null,
      storeId: null,
      userId: null,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setStore: (store) => set({ store }),
      setStoreId: (storeId) => set({ storeId }),
      setUserId: (userId) => set({ userId }),
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
            // Get user's store info - use auth_user_id to match Supabase Auth user
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, store_id, stores(id, store_name, logo_url, ecommerce_url, free_shipping_enabled, free_shipping_threshold, default_shipping_cost)')
              .eq('auth_user_id', data.user.id)
              .maybeSingle()

            if (userError) {
              console.error('User lookup error:', userError)
              set({ error: 'Failed to fetch user data', isLoading: false })
              return false
            }

            if (!userData?.store_id) {
              set({ error: 'No store associated with this account', isLoading: false })
              return false
            }

            // Extract store from joined data
            const storeData = (userData as any).stores as Store | null

            set({
              user: data.user,
              session: data.session,
              storeId: userData.store_id,
              userId: userData.id,
              store: storeData,
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
          store: null,
          storeId: null,
          userId: null,
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
              .select('id, store_id, stores(id, store_name, logo_url, ecommerce_url, free_shipping_enabled, free_shipping_threshold, default_shipping_cost)')
              .eq('auth_user_id', session.user.id)
              .maybeSingle()

            if (userData?.store_id) {
              const storeData = (userData as any).stores as Store | null

              set({
                user: session.user,
                session,
                storeId: userData.store_id,
                userId: userData.id,
                store: storeData,
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
      partialize: (state) => ({ storeId: state.storeId, userId: state.userId }),
    }
  )
)
