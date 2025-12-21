/**
 * Products Store
 *
 * Manages products, categories, and pricing templates for the analytics dashboard
 */

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =============================================================================
// TYPES
// =============================================================================

export interface Category {
  id: string
  vendor_id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  parent_name?: string
  icon?: string
  image_url?: string
  featured_image?: string
  is_active: boolean
  featured: boolean
  display_order: number
  product_count: number
  created_at: string
  updated_at: string
}

export interface PriceTier {
  id: string
  label: string
  quantity: number
  unit: string
  default_price: number
  sort_order: number
}

export interface PricingTemplate {
  id: string
  vendor_id: string
  name: string
  slug: string
  description?: string
  category_id?: string
  category_name?: string
  quality_tier?: 'exotic' | 'top-shelf' | 'mid-shelf' | 'value'
  default_tiers: PriceTier[]
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  vendor_id: string
  name: string
  slug: string
  sku?: string
  description?: string
  short_description?: string
  featured_image?: string
  primary_category_id?: string
  category_name?: string
  pricing_template_id?: string
  pricing_template_name?: string
  regular_price?: number
  sale_price?: number
  cost_price?: number
  price?: number
  on_sale?: boolean
  status: 'published' | 'draft' | 'pending'
  type: 'simple' | 'variable'
  stock_quantity?: number
  stock_status: 'instock' | 'outofstock' | 'onbackorder'
  manage_stock: boolean
  low_stock_amount?: number
  featured: boolean
  is_active: boolean
  custom_fields?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateCategoryInput {
  name: string
  description?: string
  parent_id?: string
  image_url?: string
  is_active?: boolean
  display_order?: number
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  parent_id?: string
  image_url?: string
  is_active?: boolean
  featured?: boolean
  display_order?: number
}

export interface CreatePricingTemplateInput {
  name: string
  description?: string
  category_id?: string
  quality_tier?: 'exotic' | 'top-shelf' | 'mid-shelf' | 'value'
  default_tiers: PriceTier[]
}

export interface UpdatePricingTemplateInput {
  name?: string
  description?: string
  category_id?: string
  quality_tier?: 'exotic' | 'top-shelf' | 'mid-shelf' | 'value'
  default_tiers?: PriceTier[]
  is_active?: boolean
  display_order?: number
}

export interface CreateProductInput {
  name: string
  sku?: string
  description?: string
  primary_category_id?: string
  pricing_template_id?: string
  regular_price?: number
  sale_price?: number
  cost_price?: number
  status?: 'published' | 'draft'
  featured?: boolean
  manage_stock?: boolean
  stock_quantity?: number
  low_stock_amount?: number
  custom_fields?: Record<string, any>
}

export interface UpdateProductInput {
  name?: string
  sku?: string
  description?: string
  primary_category_id?: string
  pricing_template_id?: string
  regular_price?: number
  sale_price?: number
  cost_price?: number
  status?: 'published' | 'draft'
  featured?: boolean
  is_active?: boolean
  manage_stock?: boolean
  stock_quantity?: number
  low_stock_amount?: number
  custom_fields?: Record<string, any>
}

interface ProductsState {
  // Data
  products: Product[]
  categories: Category[]
  pricingTemplates: PricingTemplate[]
  selectedProduct: Product | null

  // Stats
  productCount: number
  categoryCount: number
  templateCount: number

  // UI State
  isLoading: boolean
  isLoadingCategories: boolean
  isLoadingTemplates: boolean
  error: string | null

  // Filters
  categoryFilter: string | null
  statusFilter: 'all' | 'published' | 'draft'
  searchQuery: string

  // Subscriptions
  subscription: RealtimeChannel | null

  // Product Actions
  loadProducts: (vendorId: string, params?: {
    categoryId?: string
    status?: 'published' | 'draft'
    search?: string
    limit?: number
  }) => Promise<void>
  loadProductDetail: (productId: string) => Promise<void>
  createProduct: (vendorId: string, input: CreateProductInput) => Promise<{ success: boolean; productId?: string; error?: string }>
  updateProduct: (productId: string, input: UpdateProductInput) => Promise<{ success: boolean; error?: string }>
  deleteProduct: (productId: string) => Promise<{ success: boolean; error?: string }>

  // Category Actions
  loadCategories: (vendorId: string) => Promise<void>
  createCategory: (vendorId: string, input: CreateCategoryInput) => Promise<{ success: boolean; categoryId?: string; error?: string }>
  updateCategory: (categoryId: string, input: UpdateCategoryInput) => Promise<{ success: boolean; error?: string }>
  deleteCategory: (categoryId: string) => Promise<{ success: boolean; error?: string }>

  // Pricing Template Actions
  loadPricingTemplates: (vendorId: string, categoryId?: string) => Promise<void>
  createPricingTemplate: (vendorId: string, input: CreatePricingTemplateInput) => Promise<{ success: boolean; templateId?: string; error?: string }>
  updatePricingTemplate: (templateId: string, input: UpdatePricingTemplateInput) => Promise<{ success: boolean; error?: string }>
  deletePricingTemplate: (templateId: string) => Promise<{ success: boolean; error?: string }>

  // Filters
  setCategoryFilter: (categoryId: string | null) => void
  setStatusFilter: (status: 'all' | 'published' | 'draft') => void
  setSearchQuery: (query: string) => void

  // Helpers
  clearSelectedProduct: () => void
  subscribe: (vendorId: string) => void
  unsubscribe: () => void
  reset: () => void
}

// =============================================================================
// STORE
// =============================================================================

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  pricingTemplates: [],
  selectedProduct: null,
  productCount: 0,
  categoryCount: 0,
  templateCount: 0,
  isLoading: false,
  isLoadingCategories: false,
  isLoadingTemplates: false,
  error: null,
  categoryFilter: null,
  statusFilter: 'all',
  searchQuery: '',
  subscription: null,

  // ==========================================================================
  // PRODUCT ACTIONS
  // ==========================================================================

  loadProducts: async (vendorId, params = {}) => {
    set({ isLoading: true, error: null })

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories:primary_category_id (id, name),
          pricing_tier_templates:pricing_template_id (id, name)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })

      if (params.categoryId) {
        query = query.eq('primary_category_id', params.categoryId)
      }

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.limit) {
        query = query.limit(params.limit)
      }

      const { data, error } = await query

      if (error) throw error

      const products: Product[] = (data || []).map((p: any) => {
        const category = Array.isArray(p.categories) ? p.categories[0] : p.categories
        const template = Array.isArray(p.pricing_tier_templates) ? p.pricing_tier_templates[0] : p.pricing_tier_templates

        return {
          ...p,
          category_name: category?.name || '',
          pricing_template_name: template?.name || '',
          categories: undefined,
          pricing_tier_templates: undefined,
        }
      })

      // Client-side search filter
      let filtered = products
      if (params.search) {
        const search = params.search.toLowerCase()
        filtered = products.filter(p =>
          p.name.toLowerCase().includes(search) ||
          p.sku?.toLowerCase().includes(search)
        )
      }

      set({ products: filtered, productCount: filtered.length, isLoading: false })
    } catch (err) {
      console.error('[ProductsStore] Load products error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load products',
        products: [],
        isLoading: false,
      })
    }
  },

  loadProductDetail: async (productId) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:primary_category_id (id, name),
          pricing_tier_templates:pricing_template_id (id, name, default_tiers)
        `)
        .eq('id', productId)
        .single()

      if (error) throw error

      const category = Array.isArray(data.categories) ? data.categories[0] : data.categories
      const template = Array.isArray(data.pricing_tier_templates) ? data.pricing_tier_templates[0] : data.pricing_tier_templates

      const product: Product = {
        ...data,
        category_name: category?.name || '',
        pricing_template_name: template?.name || '',
        categories: undefined,
        pricing_tier_templates: undefined,
      }

      set({ selectedProduct: product })
    } catch (err) {
      console.error('[ProductsStore] Load product detail error:', err)
    }
  },

  createProduct: async (vendorId, input) => {
    try {
      // Generate slug from name
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      const { data, error } = await supabase
        .from('products')
        .insert({
          vendor_id: vendorId,
          name: input.name,
          slug,
          sku: input.sku,
          description: input.description,
          primary_category_id: input.primary_category_id,
          pricing_template_id: input.pricing_template_id,
          regular_price: input.regular_price,
          sale_price: input.sale_price,
          cost_price: input.cost_price,
          status: input.status || 'draft',
          featured: input.featured || false,
          manage_stock: input.manage_stock ?? true,
          stock_quantity: input.stock_quantity,
          low_stock_amount: input.low_stock_amount,
          custom_fields: input.custom_fields || {},
        })
        .select()
        .single()

      if (error) throw error

      // Reload products
      await get().loadProducts(vendorId)

      return { success: true, productId: data.id }
    } catch (err: any) {
      console.error('[ProductsStore] Create product error:', err)
      return { success: false, error: err?.message || 'Failed to create product' }
    }
  },

  updateProduct: async (productId, input) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)

      if (error) throw error

      // Update local state
      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId ? { ...p, ...input } : p
        ),
        selectedProduct: state.selectedProduct?.id === productId
          ? { ...state.selectedProduct, ...input }
          : state.selectedProduct,
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[ProductsStore] Update product error:', err)
      return { success: false, error: err?.message || 'Failed to update product' }
    }
  },

  deleteProduct: async (productId) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      set((state) => ({
        products: state.products.filter((p) => p.id !== productId),
        selectedProduct: state.selectedProduct?.id === productId ? null : state.selectedProduct,
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[ProductsStore] Delete product error:', err)
      return { success: false, error: err?.message || 'Failed to delete product' }
    }
  },

  // ==========================================================================
  // CATEGORY ACTIONS
  // ==========================================================================

  loadCategories: async (vendorId) => {
    set({ isLoadingCategories: true })

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      // Map parent names
      const categoryMap = new Map((data || []).map(c => [c.id, c.name]))
      const categories: Category[] = (data || []).map(c => ({
        ...c,
        parent_name: c.parent_id ? categoryMap.get(c.parent_id) : undefined,
      }))

      set({ categories, categoryCount: categories.length, isLoadingCategories: false })
    } catch (err) {
      console.error('[ProductsStore] Load categories error:', err)
      set({ isLoadingCategories: false })
    }
  },

  createCategory: async (vendorId, input) => {
    try {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      const { data, error } = await supabase
        .from('categories')
        .insert({
          vendor_id: vendorId,
          name: input.name,
          slug,
          description: input.description,
          parent_id: input.parent_id,
          image_url: input.image_url,
          is_active: input.is_active ?? true,
          display_order: input.display_order || 0,
        })
        .select()
        .single()

      if (error) throw error

      await get().loadCategories(vendorId)

      return { success: true, categoryId: data.id }
    } catch (err: any) {
      console.error('[ProductsStore] Create category error:', err)
      return { success: false, error: err?.message || 'Failed to create category' }
    }
  },

  updateCategory: async (categoryId, input) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId)

      if (error) throw error

      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === categoryId ? { ...c, ...input } : c
        ),
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[ProductsStore] Update category error:', err)
      return { success: false, error: err?.message || 'Failed to update category' }
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      set((state) => ({
        categories: state.categories.filter((c) => c.id !== categoryId),
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[ProductsStore] Delete category error:', err)
      return { success: false, error: err?.message || 'Failed to delete category' }
    }
  },

  // ==========================================================================
  // PRICING TEMPLATE ACTIONS
  // ==========================================================================

  loadPricingTemplates: async (vendorId, categoryId) => {
    set({ isLoadingTemplates: true })

    try {
      let query = supabase
        .from('pricing_tier_templates')
        .select(`
          *,
          categories:category_id (id, name)
        `)
        .eq('vendor_id', vendorId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query

      if (error) throw error

      const templates: PricingTemplate[] = (data || []).map((t: any) => {
        const category = Array.isArray(t.categories) ? t.categories[0] : t.categories
        return {
          ...t,
          category_name: category?.name || '',
          categories: undefined,
        }
      })

      set({ pricingTemplates: templates, templateCount: templates.length, isLoadingTemplates: false })
    } catch (err) {
      console.error('[ProductsStore] Load pricing templates error:', err)
      set({ isLoadingTemplates: false })
    }
  },

  createPricingTemplate: async (vendorId, input) => {
    try {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      const { data, error } = await supabase
        .from('pricing_tier_templates')
        .insert({
          vendor_id: vendorId,
          name: input.name,
          slug,
          description: input.description,
          category_id: input.category_id,
          quality_tier: input.quality_tier,
          default_tiers: input.default_tiers,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      await get().loadPricingTemplates(vendorId)

      return { success: true, templateId: data.id }
    } catch (err: any) {
      console.error('[ProductsStore] Create pricing template error:', err)
      return { success: false, error: err?.message || 'Failed to create pricing template' }
    }
  },

  updatePricingTemplate: async (templateId, input) => {
    try {
      const { error } = await supabase
        .from('pricing_tier_templates')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)

      if (error) throw error

      set((state) => ({
        pricingTemplates: state.pricingTemplates.map((t) =>
          t.id === templateId ? { ...t, ...input } : t
        ),
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[ProductsStore] Update pricing template error:', err)
      return { success: false, error: err?.message || 'Failed to update pricing template' }
    }
  },

  deletePricingTemplate: async (templateId) => {
    try {
      const { error } = await supabase
        .from('pricing_tier_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      set((state) => ({
        pricingTemplates: state.pricingTemplates.filter((t) => t.id !== templateId),
      }))

      return { success: true }
    } catch (err: any) {
      console.error('[ProductsStore] Delete pricing template error:', err)
      return { success: false, error: err?.message || 'Failed to delete pricing template' }
    }
  },

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  clearSelectedProduct: () => set({ selectedProduct: null }),

  subscribe: (vendorId) => {
    get().unsubscribe()

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          get().loadProducts(vendorId)
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

  reset: () => {
    get().unsubscribe()
    set({
      products: [],
      categories: [],
      pricingTemplates: [],
      selectedProduct: null,
      productCount: 0,
      categoryCount: 0,
      templateCount: 0,
      isLoading: false,
      isLoadingCategories: false,
      isLoadingTemplates: false,
      error: null,
      categoryFilter: null,
      statusFilter: 'all',
      searchQuery: '',
      subscription: null,
    })
  },
}))
