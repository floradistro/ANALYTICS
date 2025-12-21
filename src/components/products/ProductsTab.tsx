'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Package,
  Search,
  Plus,
  ChevronDown,
  Edit2,
  Trash2,
  Eye,
  Star,
  MoreVertical,
} from 'lucide-react'
import { useProductsStore, type Product } from '@/stores/products.store'
import { useAuthStore } from '@/stores/auth.store'
import { ProductModal } from './ProductModal'
import { format } from 'date-fns'

export function ProductsTab() {
  const vendorId = useAuthStore((s) => s.vendorId)
  const {
    products,
    categories,
    pricingTemplates,
    productCount,
    isLoading,
    categoryFilter,
    statusFilter,
    loadProducts,
    loadCategories,
    loadPricingTemplates,
    deleteProduct,
    setCategoryFilter,
    setStatusFilter,
    subscribe,
    unsubscribe,
  } = useProductsStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit' | 'view'
    product: Product | null
  }>({ isOpen: false, mode: 'create', product: null })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (vendorId) {
      loadCategories(vendorId)
      loadPricingTemplates(vendorId)
      loadProducts(vendorId)
      subscribe(vendorId)
    }
    return () => unsubscribe()
  }, [vendorId])

  // Reload when filters change
  useEffect(() => {
    if (vendorId) {
      loadProducts(vendorId, {
        categoryId: categoryFilter || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      })
    }
  }, [vendorId, categoryFilter, statusFilter, searchQuery])

  const handleDelete = async (productId: string) => {
    if (!vendorId) return
    const result = await deleteProduct(productId)
    if (result.success) {
      setDeleteConfirm(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
            Published
          </span>
        )
      case 'draft':
        return (
          <span className="px-2 py-0.5 text-xs bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded">
            Draft
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Total Products</div>
          <div className="text-xl font-light text-white">{productCount}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Categories</div>
          <div className="text-xl font-light text-white">{categories.length}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Published</div>
          <div className="text-xl font-light text-emerald-400">
            {products.filter(p => p.status === 'published').length}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Drafts</div>
          <div className="text-xl font-light text-zinc-400">
            {products.filter(p => p.status === 'draft').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            {categoryFilter
              ? categories.find((c) => c.id === categoryFilter)?.name || 'All Categories'
              : 'All Categories'}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-20 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setCategoryFilter(null)
                  setShowCategoryDropdown(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${
                  !categoryFilter ? 'text-white bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategoryFilter(cat.id)
                    setShowCategoryDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2 ${
                    categoryFilter === cat.id ? 'text-white bg-zinc-800' : 'text-zinc-400'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded">
          {(['all', 'published', 'draft'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                statusFilter === status
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Add Product */}
        <button
          onClick={() => setModalState({ isOpen: true, mode: 'create', product: null })}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Pricing Template
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                      Loading products...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No products found</p>
                    <button
                      onClick={() => setModalState({ isOpen: true, mode: 'create', product: null })}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Add your first product
                    </button>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.featured_image ? (
                          <img
                            src={product.featured_image}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover bg-zinc-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center">
                            <Package className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {product.name}
                            {product.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          </div>
                          {product.sku && <div className="text-xs text-zinc-500">{product.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{product.category_name || '-'}</td>
                    <td className="px-4 py-3 text-zinc-400">{product.pricing_template_name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {product.price ? (
                        <span className="text-white font-mono">${product.price.toFixed(2)}</span>
                      ) : product.regular_price ? (
                        <span className="text-white font-mono">${product.regular_price.toFixed(2)}</span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(product.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModalState({ isOpen: true, mode: 'edit', product })}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {modalState.isOpen && (
        <ProductModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          product={modalState.product}
          categories={categories}
          pricingTemplates={pricingTemplates}
          onClose={() => setModalState({ isOpen: false, mode: 'create', product: null })}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-white mb-2">Delete Product?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              This will permanently delete this product and all associated data. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
