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
  Layers,
  FileText,
  Upload,
  Trash2,
  Plus,
  GripVertical,
  Edit2,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react'
import {
  useProductsStore,
  type Product,
  type Category,
  type PricingTemplate,
  type CreateProductInput,
} from '@/stores/products.store'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

interface CategoryVariantTemplate {
  id: string
  variant_name: string
  variant_slug: string
  description?: string
  conversion_ratio: number
  conversion_unit?: string
  display_order?: number
  icon?: string
  thumbnail_url?: string
  featured_image_url?: string
  pricing_template_id?: string
  is_active?: boolean
  share_parent_inventory?: boolean
  track_separate_inventory?: boolean
}

interface ProductVariantConfig {
  id: string
  variant_template_id: string
  is_enabled: boolean
  custom_price?: number
  custom_conversion_ratio?: number
  display_order?: number
  variant_template?: CategoryVariantTemplate
}

interface PricingTier {
  id: string
  label: string
  quantity: number
  unit: string
  price: number
  sort_order: number
}

interface VendorProductField {
  id: string
  field_id: string
  field_definition: {
    type: 'text' | 'number' | 'select' | 'boolean' | 'date'
    label: string
    options?: string[]
    unit?: string
    required?: boolean
  }
  category_id: string | null
  is_active: boolean
  sort_order: number
}

interface ProductModalProps {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  product: Product | null
  categories: Category[]
  pricingTemplates: PricingTemplate[]
  onClose: () => void
}

type TabId = 'overview' | 'pricing' | 'images' | 'variations' | 'fields'

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

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Full product data from database
  const [fullProduct, setFullProduct] = useState<any>(null)
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [categoryFields, setCategoryFields] = useState<VendorProductField[]>([])
  const [categoryVariants, setCategoryVariants] = useState<CategoryVariantTemplate[]>([])
  const [productVariantConfigs, setProductVariantConfigs] = useState<ProductVariantConfig[]>([])

  // Image upload
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageGallery, setImageGallery] = useState<string[]>([])

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

  // Load full product details when editing/viewing
  useEffect(() => {
    if (product && (mode === 'edit' || mode === 'view')) {
      loadFullProductDetails(product.id)
    } else {
      resetForm()
    }
  }, [product, mode])

  // Load category fields when category changes
  useEffect(() => {
    if (formData.primary_category_id && vendorId) {
      loadCategoryFields(formData.primary_category_id)
    } else {
      setCategoryFields([])
    }
  }, [formData.primary_category_id, vendorId])

  const loadFullProductDetails = async (productId: string) => {
    setIsLoadingDetails(true)
    try {
      // Load product with all data
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          categories:primary_category_id (id, name),
          pricing_tier_templates:pricing_template_id (id, name, default_tiers, quality_tier)
        `)
        .eq('id', productId)
        .single()

      if (productError) throw productError

      setFullProduct(productData)

      // Set form data
      setFormData({
        name: productData.name,
        sku: productData.sku || '',
        description: productData.description || '',
        primary_category_id: productData.primary_category_id,
        pricing_template_id: productData.pricing_template_id,
        regular_price: productData.regular_price,
        sale_price: productData.sale_price,
        cost_price: productData.cost_price,
        status: productData.status === 'pending' ? 'draft' : productData.status,
        featured: productData.featured,
        manage_stock: productData.manage_stock,
        stock_quantity: productData.stock_quantity,
        low_stock_amount: productData.low_stock_amount,
        custom_fields: productData.custom_fields || {},
      })

      // Set image gallery
      setImageGallery(productData.image_gallery || [])

      // Set pricing tiers from pricing_data
      if (productData.pricing_data?.tiers) {
        setPricingTiers(productData.pricing_data.tiers)
      } else if (productData.pricing_tier_templates?.default_tiers) {
        // Use template defaults if no product-specific pricing
        setPricingTiers(productData.pricing_tier_templates.default_tiers.map((t: any) => ({
          ...t,
          price: t.default_price || 0,
        })))
      } else {
        setPricingTiers([])
      }

      // Load category variant templates if product has a category
      if (productData.primary_category_id) {
        const { data: categoryVariantsData } = await supabase
          .from('category_variant_templates')
          .select('*')
          .eq('category_id', productData.primary_category_id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        setCategoryVariants(categoryVariantsData || [])

        // Load product variant configs (which variants are enabled for this product)
        const { data: variantConfigsData } = await supabase
          .from('product_variant_configs')
          .select(`
            *,
            variant_template:variant_template_id (
              id, variant_name, variant_slug, conversion_ratio, conversion_unit,
              icon, thumbnail_url, pricing_template_id, is_active
            )
          `)
          .eq('product_id', productId)
          .order('display_order', { ascending: true })

        setProductVariantConfigs(variantConfigsData || [])
      } else {
        setCategoryVariants([])
        setProductVariantConfigs([])
      }

    } catch (err) {
      console.error('Error loading product details:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const loadCategoryFields = async (categoryId: string) => {
    if (!vendorId) return
    try {
      const { data } = await supabase
        .from('vendor_product_fields')
        .select('*')
        .eq('vendor_id', vendorId)
        .or(`category_id.eq.${categoryId},category_id.is.null`)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      setCategoryFields(data || [])
    } catch (err) {
      console.error('Error loading category fields:', err)
    }
  }

  const resetForm = () => {
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
    setFullProduct(null)
    setPricingTiers([])
    setImageGallery([])
    setCategoryVariants([])
    setProductVariantConfigs([])
    setActiveTab('overview')
  }

  const handleSave = async () => {
    if (!vendorId || !formData.name.trim()) return

    setIsSaving(true)
    try {
      // Build update payload
      const updatePayload: any = {
        ...formData,
        pricing_data: pricingTiers.length > 0 ? { tiers: pricingTiers } : null,
        image_gallery: imageGallery.length > 0 ? imageGallery : null,
      }

      if (mode === 'edit' && product) {
        const { error } = await supabase
          .from('products')
          .update({
            ...updatePayload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)

        if (error) throw error
      } else {
        await createProduct(vendorId, formData)
      }
      await loadProducts(vendorId)
      onClose()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategoryChange = (categoryId: string | undefined) => {
    setFormData({
      ...formData,
      primary_category_id: categoryId,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !vendorId) return

    setIsUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${vendorId}/products/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      setImageGallery([...imageGallery, publicUrl])
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImageGallery(imageGallery.filter((_, i) => i !== index))
  }

  const handleSetFeaturedImage = async (url: string) => {
    if (!product || mode === 'view') return
    try {
      await supabase
        .from('products')
        .update({ featured_image: url })
        .eq('id', product.id)

      setFullProduct({ ...fullProduct, featured_image: url })
    } catch (err) {
      console.error('Error setting featured image:', err)
    }
  }

  const handleUpdatePricingTier = (index: number, field: keyof PricingTier, value: any) => {
    setPricingTiers(tiers =>
      tiers.map((tier, i) => i === index ? { ...tier, [field]: value } : tier)
    )
  }

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData({
      ...formData,
      custom_fields: {
        ...formData.custom_fields,
        [fieldId]: value,
      },
    })
  }

  const isReadOnly = mode === 'view'

  if (!isOpen) return null

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'variations', label: 'Variations', icon: Layers },
    { id: 'fields', label: 'Custom Fields', icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center overflow-hidden">
              {fullProduct?.featured_image ? (
                <img src={fullProduct.featured_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">
                {mode === 'create' ? 'New Product' : formData.name || 'Product Details'}
              </h2>
              {product?.sku && (
                <div className="text-xs text-zinc-500">SKU: {product.sku}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'variations' && categoryVariants.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-zinc-700 rounded">
                    {categoryVariants.length}
                  </span>
                )}
                {tab.id === 'images' && imageGallery.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-zinc-700 rounded">
                    {imageGallery.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      Basic Info
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
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
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-500 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={isReadOnly}
                        rows={4}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 resize-none disabled:opacity-50"
                        placeholder="Product description"
                      />
                    </div>
                  </div>

                  {/* Category & Template */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      Category & Template
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
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
                          <option value="">No template</option>
                          {availableTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                              {template.quality_tier ? ` (${template.quality_tier})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
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

                  {/* Status */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      Status & Visibility
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
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

                  {/* Product Stats (view mode) */}
                  {mode !== 'create' && fullProduct && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Statistics
                      </h3>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-zinc-800/50 p-3 rounded">
                          <div className="text-xs text-zinc-500">Views</div>
                          <div className="text-lg text-white">{fullProduct.view_count || 0}</div>
                        </div>
                        <div className="bg-zinc-800/50 p-3 rounded">
                          <div className="text-xs text-zinc-500">Sales</div>
                          <div className="text-lg text-white">{fullProduct.sales_count || 0}</div>
                        </div>
                        <div className="bg-zinc-800/50 p-3 rounded">
                          <div className="text-xs text-zinc-500">Rating</div>
                          <div className="text-lg text-white flex items-center gap-1">
                            {fullProduct.average_rating?.toFixed(1) || '-'}
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </div>
                        </div>
                        <div className="bg-zinc-800/50 p-3 rounded">
                          <div className="text-xs text-zinc-500">Reviews</div>
                          <div className="text-lg text-white">{fullProduct.rating_count || 0}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-6">
                  {/* Base Pricing */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      Base Pricing
                    </h3>
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

                    {/* Margin calculation */}
                    {formData.regular_price && formData.cost_price && (
                      <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded text-sm">
                        <div>
                          <span className="text-zinc-500">Margin: </span>
                          <span className="text-emerald-400">
                            ${(formData.regular_price - formData.cost_price).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Margin %: </span>
                          <span className="text-emerald-400">
                            {(((formData.regular_price - formData.cost_price) / formData.regular_price) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing Tiers */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Pricing Tiers
                      </h3>
                      {selectedTemplate && (
                        <span className="text-xs text-zinc-500">
                          Template: {selectedTemplate.name}
                        </span>
                      )}
                    </div>

                    {pricingTiers.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 bg-zinc-800/30 rounded border border-zinc-800 border-dashed">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No pricing tiers configured</p>
                        {selectedTemplate?.default_tiers && (
                          <button
                            onClick={() => {
                              setPricingTiers(selectedTemplate.default_tiers.map(t => ({
                                ...t,
                                price: t.default_price || 0,
                              })))
                            }}
                            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                          >
                            Load from template
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pricingTiers.map((tier, index) => (
                          <div
                            key={tier.id}
                            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded border border-zinc-700"
                          >
                            <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                            <div className="flex-1">
                              <input
                                type="text"
                                value={tier.label}
                                onChange={(e) => handleUpdatePricingTier(index, 'label', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full px-2 py-1 bg-transparent text-white text-sm focus:outline-none disabled:opacity-50"
                                placeholder="Tier name"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={tier.quantity}
                                onChange={(e) => handleUpdatePricingTier(index, 'quantity', parseInt(e.target.value) || 0)}
                                disabled={isReadOnly}
                                className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-sm text-white text-center focus:outline-none disabled:opacity-50"
                              />
                              <span className="text-xs text-zinc-500">{tier.unit || 'units'}</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                              <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => handleUpdatePricingTier(index, 'price', parseFloat(e.target.value) || 0)}
                                disabled={isReadOnly}
                                className="w-24 pl-6 pr-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none disabled:opacity-50"
                                step="0.01"
                              />
                            </div>
                            {!isReadOnly && (
                              <button
                                onClick={() => setPricingTiers(tiers => tiers.filter((_, i) => i !== index))}
                                className="p-1 text-zinc-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          setPricingTiers([
                            ...pricingTiers,
                            {
                              id: `tier-${Date.now()}`,
                              label: '',
                              quantity: 1,
                              unit: 'g',
                              price: 0,
                              sort_order: pricingTiers.length,
                            },
                          ])
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Tier
                      </button>
                    )}
                  </div>

                  {/* Wholesale Pricing */}
                  {fullProduct && (fullProduct.is_wholesale || fullProduct.wholesale_price) && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Wholesale
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-2">Wholesale Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                            <input
                              type="number"
                              value={fullProduct.wholesale_price ?? ''}
                              disabled={isReadOnly}
                              className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                              placeholder="0.00"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-2">Min Wholesale Qty</label>
                          <input
                            type="number"
                            value={fullProduct.minimum_wholesale_quantity ?? ''}
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                            placeholder="10"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Images Tab */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  {/* Featured Image */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                      Featured Image
                    </h3>
                    <div className="flex items-start gap-4">
                      <div className="w-40 h-40 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                        {fullProduct?.featured_image ? (
                          <img
                            src={fullProduct.featured_image}
                            alt="Featured"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-zinc-600" />
                        )}
                      </div>
                      <div className="text-sm text-zinc-500">
                        <p>The main product image shown in listings.</p>
                        <p className="mt-1">Click any gallery image to set as featured.</p>
                      </div>
                    </div>
                  </div>

                  {/* Image Gallery */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Image Gallery
                      </h3>
                      {!isReadOnly && (
                        <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded cursor-pointer transition-colors">
                          {isUploadingImage ? (
                            <>
                              <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Image
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isUploadingImage}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {imageGallery.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500 bg-zinc-800/30 rounded border border-zinc-800 border-dashed">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No images in gallery</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                        {imageGallery.map((url, index) => (
                          <div
                            key={index}
                            className="relative group aspect-square rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden"
                          >
                            <img
                              src={url}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSetFeaturedImage(url)}
                                className="p-1.5 bg-zinc-800 text-white rounded hover:bg-zinc-700"
                                title="Set as featured"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              {!isReadOnly && (
                                <button
                                  onClick={() => handleRemoveImage(index)}
                                  className="p-1.5 bg-red-600 text-white rounded hover:bg-red-500"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {fullProduct?.featured_image === url && (
                              <div className="absolute top-1 right-1 p-1 bg-amber-500 rounded">
                                <Star className="w-3 h-3 text-white fill-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Variations Tab */}
              {activeTab === 'variations' && (
                <div className="space-y-6">
                  {/* Category Variant Templates */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Available Variants
                      </h3>
                      {fullProduct?.categories?.name && (
                        <span className="text-xs text-zinc-500">
                          From category: {fullProduct.categories.name}
                        </span>
                      )}
                    </div>

                    {categoryVariants.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 bg-zinc-800/30 rounded border border-zinc-800 border-dashed">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No variant options defined for this category</p>
                        {!formData.primary_category_id && (
                          <p className="text-xs mt-1">Select a category to see available variants</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categoryVariants.map((variant) => {
                          const config = productVariantConfigs.find(c => c.variant_template_id === variant.id)
                          const isEnabled = config?.is_enabled !== false

                          return (
                            <div
                              key={variant.id}
                              className={`relative p-4 rounded border transition-colors ${
                                isEnabled
                                  ? 'bg-zinc-800/50 border-zinc-700'
                                  : 'bg-zinc-900/30 border-zinc-800 opacity-60'
                              }`}
                            >
                              {/* Variant Icon/Image */}
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {variant.thumbnail_url || variant.icon ? (
                                    <img
                                      src={variant.thumbnail_url || variant.icon}
                                      alt={variant.variant_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-zinc-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-white font-medium truncate">
                                    {variant.variant_name}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {variant.conversion_ratio}{variant.conversion_unit || 'g'}
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
                                }`}>
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                {variant.track_separate_inventory && (
                                  <span className="text-xs text-zinc-500">Separate inv.</span>
                                )}
                              </div>

                              {/* Custom price if set */}
                              {config?.custom_price && (
                                <div className="mt-2 text-xs text-zinc-400">
                                  Custom: ${config.custom_price.toFixed(2)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Product Variant Configurations */}
                  {productVariantConfigs.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Product Variant Settings
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                              <th className="pb-2 pr-4">Variant</th>
                              <th className="pb-2 pr-4">Ratio</th>
                              <th className="pb-2 pr-4">Custom Price</th>
                              <th className="pb-2 pr-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            {productVariantConfigs.map((config) => (
                              <tr key={config.id}>
                                <td className="py-2 pr-4 text-white">
                                  {config.variant_template?.variant_name || config.variant_template_id}
                                </td>
                                <td className="py-2 pr-4 text-zinc-400">
                                  {config.custom_conversion_ratio || config.variant_template?.conversion_ratio || '-'}
                                  {config.variant_template?.conversion_unit || 'g'}
                                </td>
                                <td className="py-2 pr-4 text-zinc-400 font-mono">
                                  {config.custom_price ? `$${config.custom_price.toFixed(2)}` : '-'}
                                </td>
                                <td className="py-2 pr-4">
                                  {config.is_enabled !== false ? (
                                    <span className="text-emerald-400 text-xs">Active</span>
                                  ) : (
                                    <span className="text-zinc-500 text-xs">Inactive</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* No variants at all */}
                  {categoryVariants.length === 0 && productVariantConfigs.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                      <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No variants configured</p>
                      <p className="text-xs mt-1">
                        {formData.primary_category_id
                          ? 'This category has no variant templates defined'
                          : 'Select a category to see available variant options'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Fields Tab */}
              {activeTab === 'fields' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                    Custom Fields
                  </h3>

                  {categoryFields.length === 0 && Object.keys(formData.custom_fields || {}).length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-800/30 rounded border border-zinc-800 border-dashed">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No custom fields configured</p>
                      {!formData.primary_category_id && (
                        <p className="text-xs mt-1">Select a category to see available fields</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Category Fields */}
                      {categoryFields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <label className="flex items-center gap-2 text-xs text-zinc-500">
                            {field.field_definition.label}
                            {field.field_definition.required && (
                              <span className="text-red-400">*</span>
                            )}
                            {field.field_definition.unit && (
                              <span className="text-zinc-600">({field.field_definition.unit})</span>
                            )}
                          </label>

                          {field.field_definition.type === 'text' && (
                            <input
                              type="text"
                              value={formData.custom_fields?.[field.field_id] || ''}
                              onChange={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                            />
                          )}

                          {field.field_definition.type === 'number' && (
                            <input
                              type="number"
                              value={formData.custom_fields?.[field.field_id] || ''}
                              onChange={(e) => handleCustomFieldChange(field.field_id, e.target.value ? parseFloat(e.target.value) : '')}
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                              step="any"
                            />
                          )}

                          {field.field_definition.type === 'select' && (
                            <select
                              value={formData.custom_fields?.[field.field_id] || ''}
                              onChange={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                            >
                              <option value="">Select...</option>
                              {field.field_definition.options?.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {field.field_definition.type === 'boolean' && (
                            <button
                              onClick={() => !isReadOnly && handleCustomFieldChange(field.field_id, !formData.custom_fields?.[field.field_id])}
                              disabled={isReadOnly}
                              className="flex items-center gap-2"
                            >
                              {formData.custom_fields?.[field.field_id] ? (
                                <ToggleRight className="w-6 h-6 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-zinc-600" />
                              )}
                              <span className="text-sm text-zinc-400">
                                {formData.custom_fields?.[field.field_id] ? 'Yes' : 'No'}
                              </span>
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Existing custom fields not from category */}
                      {Object.entries(formData.custom_fields || {})
                        .filter(([key]) => !categoryFields.find(f => f.field_id === key))
                        .map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <label className="text-xs text-zinc-500">{key}</label>
                            <input
                              type="text"
                              value={String(value)}
                              onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                            />
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Raw custom_fields view for debugging */}
                  {mode !== 'create' && fullProduct?.custom_fields && Object.keys(fullProduct.custom_fields).length > 0 && (
                    <div className="mt-8 pt-6 border-t border-zinc-800">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                        Raw Field Data
                      </h4>
                      <pre className="p-3 bg-zinc-800/50 rounded text-xs text-zinc-400 overflow-x-auto">
                        {JSON.stringify(fullProduct.custom_fields, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            {mode !== 'create' && fullProduct && (
              <>
                Created: {new Date(fullProduct.created_at).toLocaleDateString()}
                {fullProduct.updated_at && (
                  <> · Updated: {new Date(fullProduct.updated_at).toLocaleDateString()}</>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
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
    </div>
  )
}
