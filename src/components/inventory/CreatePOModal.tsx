'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useSuppliersManagementStore } from '@/stores/suppliers-management.store'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react'

interface CreatePOModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  cost_price: number | null
  category_name: string | null
}

interface Location {
  id: string
  name: string
}

interface POItem {
  product_id: string
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
}

export function CreatePOModal({ isOpen, onClose, onCreated }: CreatePOModalProps) {
  const { storeId, userId } = useAuthStore()
  const { suppliers, loadSuppliers } = useSuppliersManagementStore()

  // Form state
  const [supplierId, setSupplierId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [expectedDate, setExpectedDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<POItem[]>([])

  // Data
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

  // UI State
  const [productSearch, setProductSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [defaultQuantity, setDefaultQuantity] = useState<number>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  // Refs for focus management
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load data on open
  useEffect(() => {
    if (isOpen && storeId) {
      loadData()
    }
  }, [isOpen, storeId])

  // Smart filter products by search and category
  useEffect(() => {
    setHighlightedIndex(0)

    let filtered = products

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category_name === categoryFilter)
    }

    // Filter by search (name, SKU, or category)
    if (productSearch) {
      const searchTerms = productSearch.toLowerCase().split(/\s+/).filter(Boolean)
      filtered = filtered.filter((p) => {
        const searchableText = `${p.name} ${p.sku || ''} ${p.category_name || ''}`.toLowerCase()
        return searchTerms.every((term) => searchableText.includes(term))
      })
    }

    // Exclude already added products
    const addedIds = new Set(items.map((i) => i.product_id))
    filtered = filtered.filter((p) => !addedIds.has(p.id))

    // Sort by relevance: exact name match first, then starts with, then contains
    if (productSearch) {
      const search = productSearch.toLowerCase()
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()

        // Exact match
        if (aName === search && bName !== search) return -1
        if (bName === search && aName !== search) return 1

        // Starts with
        if (aName.startsWith(search) && !bName.startsWith(search)) return -1
        if (bName.startsWith(search) && !aName.startsWith(search)) return 1

        // Alphabetical
        return aName.localeCompare(bName)
      })
    }

    setFilteredProducts(filtered.slice(0, 50))
  }, [productSearch, categoryFilter, products, items])

  const loadData = async () => {
    if (!storeId) return
    setLoadingData(true)

    try {
      // Load suppliers
      await loadSuppliers(storeId)

      // Load locations
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name')

      setLocations(locData || [])

      // Load categories
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('store_id', storeId)
        .order('name')

      setCategories(catData || [])

      // Load products with category join
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          cost_price,
          categories:primary_category_id (name)
        `)
        .eq('store_id', storeId)
        .eq('status', 'published')
        .order('name')
        .limit(1000)

      if (prodError) {
        console.error('Failed to load products:', prodError)
      }

      // Flatten category data
      const productsWithCategory = (prodData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        cost_price: p.cost_price,
        category_name: p.categories?.name || null,
      }))

      setProducts(productsWithCategory)
      setFilteredProducts(productsWithCategory.slice(0, 50))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const resetForm = () => {
    setSupplierId('')
    setLocationId('')
    setExpectedDate('')
    setNotes('')
    setItems([])
    setProductSearch('')
    setCategoryFilter('all')
    setHighlightedIndex(0)
    setDefaultQuantity(1)
    setError(null)
  }

  // Keyboard navigation for product search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showProductDropdown || filteredProducts.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredProducts.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredProducts[highlightedIndex]) {
          addProduct(filteredProducts[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowProductDropdown(false)
        break
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addProduct = (product: Product) => {
    // Check if already added
    if (items.some((item) => item.product_id === product.id)) {
      setProductSearch('')
      // Keep dropdown open, refocus search
      setTimeout(() => searchInputRef.current?.focus(), 10)
      return
    }

    setItems([
      ...items,
      {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: defaultQuantity,
        unit_price: product.cost_price || 0,
      },
    ])

    // Clear search and refocus for continuous flow
    setProductSearch('')
    setHighlightedIndex(0)
    // Keep dropdown open so user can keep adding
    setTimeout(() => searchInputRef.current?.focus(), 10)
  }

  // Apply default quantity to all items
  const applyDefaultQuantityToAll = () => {
    if (items.length === 0) return
    setItems(items.map((item) => ({ ...item, quantity: defaultQuantity })))
  }

  const updateItem = (index: number, field: 'quantity' | 'unit_price', value: number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const handleSubmit = async () => {
    setError(null)

    // Validation
    if (!supplierId) {
      setError('Please select a supplier')
      return
    }
    if (!locationId) {
      setError('Please select a destination location')
      return
    }
    if (items.length === 0) {
      setError('Please add at least one item')
      return
    }

    setSaving(true)

    try {
      // Format items for the atomic function
      const itemsJson = JSON.stringify(items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })))

      // Generate idempotency key for safe retries
      const idempotencyKey = `po-${storeId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

      // Call atomic database function to create PO + items in single transaction
      const { data: result, error: rpcError } = await supabase.rpc('create_purchase_order_atomic', {
        p_vendor_id: storeId,
        p_po_type: 'inbound',
        p_items: itemsJson,
        p_supplier_id: supplierId || null,
        p_location_id: locationId || null,
        p_expected_delivery_date: expectedDate || null,
        p_notes: notes || null,
        p_tax_amount: 0,
        p_shipping_cost: 0,
        p_idempotency_key: idempotencyKey,
        p_created_by_user_id: userId || null,
      })

      if (rpcError) throw rpcError

      if (!result || result.length === 0) {
        throw new Error('No result returned from PO creation')
      }

      // Success
      onCreated()
      handleClose()
    } catch (err: any) {
      // Handle Supabase errors which have a message property but aren't Error instances
      const errorMessage = err?.message || err?.error_description ||
        (typeof err === 'object' ? JSON.stringify(err) : String(err)) ||
        'Failed to create purchase order'
      console.error('Failed to create PO:', errorMessage, err)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-2xl lg:max-h-[85vh] bg-zinc-950 border border-zinc-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-medium text-white">New Purchase Order</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Create an inbound PO from a supplier</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {/* Supplier & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                        Supplier *
                      </label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-zinc-500 text-sm"
                      >
                        <option value="">Select supplier...</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.external_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                        Destination Location *
                      </label>
                      <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-zinc-500 text-sm"
                      >
                        <option value="">Select location...</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Expected Date & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-zinc-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Add Products */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
                      Add Products
                    </label>

                    {/* Search and Category Filter Row */}
                    <div className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value)
                            setShowProductDropdown(true)
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                          onKeyDown={handleSearchKeyDown}
                          placeholder="Search by name, SKU, or category..."
                          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
                        />
                      </div>

                      <select
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value)
                          setShowProductDropdown(true)
                        }}
                        className="px-3 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-zinc-500 text-sm min-w-[140px]"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Default Quantity - Apply to All */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Default qty:</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={defaultQuantity}
                        onChange={(e) => setDefaultQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 text-white text-sm text-center tabular-nums"
                      />
                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={applyDefaultQuantityToAll}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors"
                        >
                          Apply to all ({items.length})
                        </button>
                      )}
                    </div>

                    {/* Product dropdown */}
                    {showProductDropdown && (
                      <div className="relative">
                        <div className="absolute top-0 left-0 right-0 bg-zinc-900 border border-zinc-700 max-h-64 overflow-y-auto z-10 shadow-xl">
                          {products.length === 0 ? (
                            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                              Loading products...
                            </div>
                          ) : filteredProducts.length === 0 ? (
                            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                              {items.length > 0 && products.length === items.length
                                ? 'All products have been added'
                                : 'No products found matching your search'}
                            </div>
                          ) : (
                            <>
                              <div className="px-3 py-1.5 bg-zinc-800/50 border-b border-zinc-700 text-[10px] uppercase tracking-wide text-zinc-500 flex items-center justify-between">
                                <span>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
                                <span className="text-zinc-600">↑↓ navigate · Enter to add</span>
                              </div>
                              {filteredProducts.map((product, index) => (
                                <button
                                  key={product.id}
                                  onClick={() => addProduct(product)}
                                  className={`w-full px-3 py-2.5 text-left transition-colors flex items-center justify-between gap-3 ${
                                    index === highlightedIndex
                                      ? 'bg-zinc-700'
                                      : 'hover:bg-zinc-800'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm text-white truncate">{product.name}</p>
                                      {product.category_name && (
                                        <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-zinc-800 text-zinc-400 whitespace-nowrap">
                                          {product.category_name}
                                        </span>
                                      )}
                                    </div>
                                    {product.sku && (
                                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{product.sku}</p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    {product.cost_price !== null ? (
                                      <span className="text-sm text-zinc-300 tabular-nums">
                                        {formatCurrency(product.cost_price)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-zinc-600">No cost</span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  {items.length > 0 && (
                    <div className="border border-zinc-800">
                      <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
                        <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                          <div className="col-span-5">Product</div>
                          <div className="col-span-2 text-right">Qty</div>
                          <div className="col-span-2 text-right">Unit Price</div>
                          <div className="col-span-2 text-right">Subtotal</div>
                          <div className="col-span-1"></div>
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-800/50">
                        {items.map((item, index) => (
                          <div key={item.product_id} className="px-4 py-3">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5">
                                <p className="text-sm text-white truncate">{item.product_name}</p>
                                {item.product_sku && (
                                  <p className="text-xs text-zinc-500 font-mono">{item.product_sku}</p>
                                )}
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 text-white text-sm text-right tabular-nums"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 text-white text-sm text-right tabular-nums"
                                />
                              </div>
                              <div className="col-span-2 text-right text-sm text-zinc-300 tabular-nums">
                                {formatCurrency(item.quantity * item.unit_price)}
                              </div>
                              <div className="col-span-1 text-right">
                                <button
                                  onClick={() => removeItem(index)}
                                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">{items.length} items</span>
                          <div className="text-right">
                            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total</p>
                            <p className="text-lg font-light text-white tabular-nums">
                              {formatCurrency(calculateSubtotal())}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {items.length === 0 && (
                    <div className="border border-zinc-800 border-dashed p-8 text-center">
                      <Plus className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">Search and add products above</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || items.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create PO
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
