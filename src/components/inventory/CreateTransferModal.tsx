'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ArrowRight, Plus, Trash2, Search, Package } from 'lucide-react'
import { useInventoryStore } from '@/stores/inventory.store'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

interface TransferItem {
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  available_quantity: number
}

interface CreateTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTransferModal({ isOpen, onClose }: CreateTransferModalProps) {
  const vendorId = useAuthStore((s) => s.vendorId)
  const { locations, loadLocations, createTransfer, loadTransfers } = useInventoryStore()

  const [sourceLocationId, setSourceLocationId] = useState('')
  const [destinationLocationId, setDestinationLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<TransferItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Product search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    if (vendorId && locations.length === 0) {
      loadLocations(vendorId)
    }
  }, [vendorId, locations.length])

  // Search products when query changes
  useEffect(() => {
    if (!searchQuery || !sourceLocationId || !vendorId) {
      setSearchResults([])
      return
    }

    const search = async () => {
      setIsSearching(true)
      try {
        const { data } = await supabase
          .from('inventory')
          .select(`
            id,
            product_id,
            quantity,
            products (id, name, sku)
          `)
          .eq('vendor_id', vendorId)
          .eq('location_id', sourceLocationId)
          .gt('quantity', 0)
          .limit(10)

        if (data) {
          // Filter by search query
          const filtered = data.filter((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            const name = product?.name?.toLowerCase() || ''
            const sku = product?.sku?.toLowerCase() || ''
            const query = searchQuery.toLowerCase()
            return name.includes(query) || sku.includes(query)
          })

          setSearchResults(
            filtered.map((item: any) => {
              const product = Array.isArray(item.products) ? item.products[0] : item.products
              return {
                product_id: item.product_id,
                product_name: product?.name || '',
                product_sku: product?.sku || '',
                available_quantity: item.quantity,
              }
            })
          )
        }
      } catch (err) {
        console.error('Search error:', err)
      }
      setIsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, sourceLocationId, vendorId])

  const availableDestinations = useMemo(() => {
    return locations.filter((loc) => loc.id !== sourceLocationId)
  }, [locations, sourceLocationId])

  const addItem = (product: any) => {
    // Check if already added
    if (items.some((i) => i.product_id === product.product_id)) {
      return
    }

    setItems([
      ...items,
      {
        product_id: product.product_id,
        product_name: product.product_name,
        product_sku: product.product_sku,
        quantity: 1,
        available_quantity: product.available_quantity,
      },
    ])
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.product_id !== productId))
  }

  const updateItemQuantity = (productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(quantity, item.available_quantity) }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId || !sourceLocationId || !destinationLocationId || items.length === 0) return

    setIsSubmitting(true)
    setError(null)

    const result = await createTransfer(vendorId, {
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      notes: notes || undefined,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    })

    setIsSubmitting(false)

    if (result.success) {
      await loadTransfers(vendorId)
      onClose()
    } else {
      setError(result.error || 'Failed to create transfer')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white">New Inventory Transfer</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Locations */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">From Location</label>
              <select
                value={sourceLocationId}
                onChange={(e) => {
                  setSourceLocationId(e.target.value)
                  setItems([]) // Clear items when source changes
                }}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-700"
                required
              >
                <option value="">Select source...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-5 h-5 text-zinc-600 mb-2" />

            <div>
              <label className="block text-sm text-zinc-400 mb-2">To Location</label>
              <select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:border-zinc-700"
                required
                disabled={!sourceLocationId}
              >
                <option value="">Select destination...</option>
                {availableDestinations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transfer notes..."
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-zinc-400">Transfer Items</label>
              {sourceLocationId && (
                <button
                  type="button"
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Product
                </button>
              )}
            </div>

            {/* Product Search */}
            {showSearch && sourceLocationId && (
              <div className="mb-4 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products at source location..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                    autoFocus
                  />
                </div>
                {(searchResults.length > 0 || isSearching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-10 max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
                    ) : (
                      searchResults.map((product) => (
                        <button
                          key={product.product_id}
                          type="button"
                          onClick={() => addItem(product)}
                          disabled={items.some((i) => i.product_id === product.product_id)}
                          className="w-full px-4 py-2 text-left hover:bg-zinc-800 flex items-center justify-between disabled:opacity-50"
                        >
                          <div>
                            <div className="text-sm text-white">{product.product_name}</div>
                            <div className="text-xs text-zinc-500">{product.product_sku}</div>
                          </div>
                          <span className="text-xs text-zinc-400">
                            {product.available_quantity} available
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div className="p-8 bg-zinc-950 border border-zinc-800 rounded text-center">
                <Package className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">
                  {sourceLocationId
                    ? 'No items added yet. Click "Add Product" to start.'
                    : 'Select a source location first'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-4 p-3 bg-zinc-950 border border-zinc-800 rounded"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-white">{item.product_name}</div>
                      <div className="text-xs text-zinc-500">{item.product_sku}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        of {item.available_quantity}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={item.available_quantity}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(item.product_id, parseInt(e.target.value) || 1)
                        }
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-white text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.product_id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !sourceLocationId ||
              !destinationLocationId ||
              items.length === 0
            }
            className="px-6 py-2 text-sm font-medium bg-white text-black rounded hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}
