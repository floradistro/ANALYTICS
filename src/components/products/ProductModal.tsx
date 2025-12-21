'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Package,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Star,
  Image as ImageIcon,
} from 'lucide-react'
import {
  useProductsStore,
  type Product,
  type Category,
  type PricingTemplate,
  type CreateProductInput,
} from '@/stores/products.store'
import { useAuthStore } from '@/stores/auth.store'

interface ProductModalProps {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  product: Product | null
  categories: Category[]
  pricingTemplates: PricingTemplate[]
  onClose: () => void
}

export function ProductModal({
  isOpen,
  mode,
  product,
  categories,
  pricingTemplates,
  onClose,
}: ProductModalProps) {
  const vendorId = useAuthStore((s) => s.vendorId)
  const { createProduct, updateProduct, loadProducts } = useProductsStore()

  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    sku: '',
    description: '',
    primary_category_id: undefined,
    pricing_template_id: undefined,
    regular_price: undefined,
    sale_price: undefined,
    cost_price: undefined,
    status: 'draft',
    featured: false,
    manage_stock: true,
    stock_quantity: undefined,
    low_stock_amount: undefined,
    custom_fields: {},
  })

  // Get templates filtered by selected category
  const availableTemplates = formData.primary_category_id
    ? pricingTemplates.filter(
        (t) => t.category_id === formData.primary_category_id || !t.category_id
      )
    : pricingTemplates

  // Get selected template
  const selectedTemplate = pricingTemplates.find((t) => t.id === formData.pricing_template_id)

  useEffect(() => {
    if (product && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        primary_category_id: product.primary_category_id,
        pricing_template_id: product.pricing_template_id,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        cost_price: product.cost_price,
        status: product.status === 'pending' ? 'draft' : product.status,
        featured: product.featured,
        manage_stock: product.manage_stock,
        stock_quantity: product.stock_quantity,
        low_stock_amount: product.low_stock_amount,
        custom_fields: product.custom_fields || {},
      })
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        primary_category_id: undefined,
        pricing_template_id: undefined,
        regular_price: undefined,
        sale_price: undefined,
        cost_price: undefined,
        status: 'draft',
        featured: false,
        manage_stock: true,
        stock_quantity: undefined,
        low_stock_amount: undefined,
        custom_fields: {},
      })
    }
  }, [product, mode])

  const handleSave = async () => {
    if (!vendorId || !formData.name.trim()) return

    setIsSaving(true)
    try {
      if (mode === 'edit' && product) {
        await updateProduct(product.id, formData)
      } else {
        await createProduct(vendorId, formData)
      }
      await loadProducts(vendorId)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategoryChange = (categoryId: string | undefined) => {
    setFormData({
      ...formData,
      primary_category_id: categoryId,
      // Reset pricing template if it doesn't belong to new category
      pricing_template_id:
        formData.pricing_template_id &&
        !pricingTemplates.find(
          (t) =>
            t.id === formData.pricing_template_id &&
            (t.category_id === categoryId || !t.category_id)
        )
          ? undefined
          : formData.pricing_template_id,
    })
  }

  const isReadOnly = mode === 'view'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-zinc-400" />
            {mode === 'create' ? 'New Product' : mode === 'edit' ? 'Edit Product' : 'View Product'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Basic Info
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                placeholder="Enter product name"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                placeholder="Optional SKU"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isReadOnly}
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 resize-none disabled:opacity-50"
                placeholder="Product description"
              />
            </div>
          </div>

          {/* Category & Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Category & Pricing
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Category</label>
                <select
                  value={formData.primary_category_id || ''}
                  onChange={(e) => handleCategoryChange(e.target.value || undefined)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing Template */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Pricing Template</label>
                <select
                  value={formData.pricing_template_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, pricing_template_id: e.target.value || undefined })
                  }
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                >
                  <option value="">No template (manual pricing)</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.quality_tier ? ` (${template.quality_tier})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Show template tiers if selected */}
            {selectedTemplate && selectedTemplate.default_tiers?.length > 0 && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
                <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Template Tiers (default prices)
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.default_tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400"
                    >
                      <span className="text-white">{tier.label}</span>
                      {tier.default_price > 0 && (
                        <span className="ml-1 text-emerald-400">${tier.default_price}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Pricing (when no template) */}
            {!formData.pricing_template_id && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Regular Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={formData.regular_price ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          regular_price: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      disabled={isReadOnly}
                      className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Sale Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={formData.sale_price ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sale_price: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      disabled={isReadOnly}
                      className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={formData.cost_price ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost_price: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      disabled={isReadOnly}
                      className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Inventory
            </h3>

            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
              <label className="text-sm text-zinc-300">Manage Stock</label>
              <button
                onClick={() =>
                  !isReadOnly && setFormData({ ...formData, manage_stock: !formData.manage_stock })
                }
                disabled={isReadOnly}
              >
                {formData.manage_stock ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-zinc-600" />
                )}
              </button>
            </div>

            {formData.manage_stock && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock_quantity ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Low Stock Alert</label>
                  <input
                    type="number"
                    value={formData.low_stock_amount ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        low_stock_amount: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                    placeholder="Alert when below..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status & Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Status & Settings
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'published' | 'draft' })
                  }
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Featured */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                <label className="text-sm text-zinc-300 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Featured Product
                </label>
                <button
                  onClick={() =>
                    !isReadOnly && setFormData({ ...formData, featured: !formData.featured })
                  }
                  disabled={isReadOnly}
                >
                  {formData.featured ? (
                    <ToggleRight className="w-6 h-6 text-amber-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-zinc-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-white text-black rounded hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Product'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
