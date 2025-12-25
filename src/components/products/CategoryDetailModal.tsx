'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  Trash2,
  DollarSign,
  Settings,
  FolderTree,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
  Upload,
  Loader2,
} from 'lucide-react'
import {
  useProductsStore,
  type Category,
  type PricingTemplate,
  type PriceTier,
  type CreateCategoryInput,
} from '@/stores/products.store'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

const QUALITY_TIERS = [
  { value: 'exotic', label: 'Exotic', color: 'purple' },
  { value: 'top-shelf', label: 'Top Shelf', color: 'emerald' },
  { value: 'mid-shelf', label: 'Mid Shelf', color: 'blue' },
  { value: 'value', label: 'Value', color: 'zinc' },
] as const

// Field types for product custom fields (stored in vendor_product_fields table)
interface ProductField {
  id: string
  store_id: string
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

const DEFAULT_TIERS: PriceTier[] = [
  { id: '1g', label: '1g', quantity: 1, unit: 'g', default_price: 0, sort_order: 0 },
  { id: '3.5g', label: '3.5g', quantity: 3.5, unit: 'g', default_price: 0, sort_order: 1 },
  { id: '7g', label: '7g', quantity: 7, unit: 'g', default_price: 0, sort_order: 2 },
  { id: '14g', label: '14g', quantity: 14, unit: 'g', default_price: 0, sort_order: 3 },
  { id: '28g', label: '28g', quantity: 28, unit: 'g', default_price: 0, sort_order: 4 },
]

interface CategoryDetailModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  category: Category | null
  categories: Category[]
  onClose: () => void
}

type TabType = 'general' | 'pricing' | 'fields'

export function CategoryDetailModal({
  isOpen,
  mode,
  category,
  categories,
  onClose,
}: CategoryDetailModalProps) {
  const storeId = useAuthStore((s) => s.storeId)
  const {
    pricingTemplates,
    loadCategories,
    loadPricingTemplates,
    createCategory,
    updateCategory,
    createPricingTemplate,
    updatePricingTemplate,
    deletePricingTemplate,
  } = useProductsStore()

  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [isSaving, setIsSaving] = useState(false)

  // Category form state
  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    name: '',
    description: '',
    parent_id: undefined,
    image_url: '',
    is_active: true,
    display_order: 0,
  })

  // Pricing templates for this category
  const [categoryTemplates, setCategoryTemplates] = useState<PricingTemplate[]>([])
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string | null
    name: string
    description: string
    quality_tier: 'exotic' | 'top-shelf' | 'mid-shelf' | 'value' | undefined
    tiers: PriceTier[]
  } | null>(null)

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Category custom fields
  const [categoryFields, setCategoryFields] = useState<ProductField[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [newField, setNewField] = useState<{
    label: string
    type: 'text' | 'number' | 'select' | 'boolean' | 'date'
    options: string
    required: boolean
  }>({ label: '', type: 'text', options: '', required: false })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !storeId) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${storeId}/categories/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      setCategoryForm({ ...categoryForm, image_url: publicUrl })
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Load category fields
  const loadCategoryFields = async () => {
    if (!storeId || !category) return
    setIsLoadingFields(true)
    try {
      const { data, error } = await supabase
        .from('vendor_product_fields')
        .select('*')
        .eq('store_id', storeId)
        .eq('category_id', category.id)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setCategoryFields(data || [])
    } catch (err) {
      console.error('Load fields error:', err)
    } finally {
      setIsLoadingFields(false)
    }
  }

  // Initialize form with category data
  useEffect(() => {
    if (category && mode === 'edit') {
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id,
        image_url: category.image_url || category.featured_image || '',
        is_active: category.is_active,
        display_order: category.display_order,
      })
      // Load templates for this category
      const templates = pricingTemplates.filter((t) => t.category_id === category.id)
      setCategoryTemplates(templates)
      // Load fields for this category
      loadCategoryFields()
    } else {
      setCategoryForm({
        name: '',
        description: '',
        parent_id: undefined,
        image_url: '',
        is_active: true,
        display_order: categories.length,
      })
      setCategoryTemplates([])
      setCategoryFields([])
    }
  }, [category, mode, pricingTemplates, categories])

  const handleSaveCategory = async () => {
    if (!storeId || !categoryForm.name.trim()) return

    setIsSaving(true)
    try {
      if (mode === 'edit' && category) {
        await updateCategory(category.id, categoryForm)
      } else {
        await createCategory(storeId, categoryForm)
      }
      await loadCategories(storeId)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddField = async () => {
    if (!storeId || !category || !newField.label.trim()) return
    setIsSaving(true)
    try {
      const fieldId = newField.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')

      const fieldDefinition: any = {
        type: newField.type,
        label: newField.label,
        required: newField.required,
      }

      if (newField.type === 'select' && newField.options) {
        fieldDefinition.options = newField.options.split(',').map((o) => o.trim()).filter(Boolean)
      }

      const { error } = await supabase.from('vendor_product_fields').insert({
        store_id: storeId,
        category_id: category.id,
        field_id: fieldId,
        field_definition: fieldDefinition,
        sort_order: categoryFields.length,
        is_active: true,
      })

      if (error) throw error
      await loadCategoryFields()
      setNewField({ label: '', type: 'text', options: '', required: false })
    } catch (err) {
      console.error('Add field error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!storeId) return
    try {
      const { error } = await supabase
        .from('vendor_product_fields')
        .delete()
        .eq('id', fieldId)

      if (error) throw error
      await loadCategoryFields()
    } catch (err) {
      console.error('Delete field error:', err)
    }
  }

  const handleToggleFieldActive = async (field: ProductField) => {
    try {
      const { error } = await supabase
        .from('vendor_product_fields')
        .update({ is_active: !field.is_active })
        .eq('id', field.id)

      if (error) throw error
      await loadCategoryFields()
    } catch (err) {
      console.error('Toggle field error:', err)
    }
  }

  const handleAddTemplate = () => {
    setEditingTemplate({
      id: null,
      name: '',
      description: '',
      quality_tier: undefined,
      tiers: [...DEFAULT_TIERS],
    })
    setExpandedTemplate('new')
  }

  const handleEditTemplate = (template: PricingTemplate) => {
    setEditingTemplate({
      id: template.id,
      name: template.name,
      description: template.description || '',
      quality_tier: template.quality_tier,
      tiers: template.default_tiers || [...DEFAULT_TIERS],
    })
    setExpandedTemplate(template.id)
  }

  const handleSaveTemplate = async () => {
    if (!storeId || !editingTemplate || !editingTemplate.name.trim()) return
    if (!category && mode === 'create') return // Need to save category first

    setIsSaving(true)
    try {
      if (editingTemplate.id) {
        // Update existing template
        await updatePricingTemplate(editingTemplate.id, {
          name: editingTemplate.name,
          description: editingTemplate.description,
          quality_tier: editingTemplate.quality_tier,
          default_tiers: editingTemplate.tiers,
        })
      } else if (category) {
        // Create new template
        await createPricingTemplate(storeId, {
          name: editingTemplate.name,
          description: editingTemplate.description,
          category_id: category.id,
          quality_tier: editingTemplate.quality_tier,
          default_tiers: editingTemplate.tiers,
        })
      }
      await loadPricingTemplates(storeId)
      setEditingTemplate(null)
      setExpandedTemplate(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!storeId) return
    await deletePricingTemplate(templateId)
    await loadPricingTemplates(storeId)
  }

  const handleTierChange = (index: number, field: keyof PriceTier, value: any) => {
    if (!editingTemplate) return
    const newTiers = [...editingTemplate.tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setEditingTemplate({ ...editingTemplate, tiers: newTiers })
  }

  const handleAddTier = () => {
    if (!editingTemplate) return
    const newTier: PriceTier = {
      id: `tier-${Date.now()}`,
      label: '',
      quantity: 1,
      unit: 'g',
      default_price: 0,
      sort_order: editingTemplate.tiers.length,
    }
    setEditingTemplate({
      ...editingTemplate,
      tiers: [...editingTemplate.tiers, newTier],
    })
  }

  const handleRemoveTier = (index: number) => {
    if (!editingTemplate) return
    const newTiers = editingTemplate.tiers.filter((_, i) => i !== index)
    setEditingTemplate({ ...editingTemplate, tiers: newTiers })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-zinc-400" />
            {mode === 'edit' ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              activeTab === 'general'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            disabled={mode === 'create' && !category}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              activeTab === 'pricing'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Pricing Templates
            </span>
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            disabled={mode === 'create' && !category}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              activeTab === 'fields'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Field Config
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Image */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Category Image</label>
                <div className="flex items-start gap-4">
                  <div
                    className="w-20 h-20 rounded bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-zinc-700 cursor-pointer hover:border-zinc-600 relative group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                    ) : categoryForm.image_url ? (
                      <>
                        <img
                          src={categoryForm.image_url}
                          alt="Category"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5 text-zinc-500" />
                        <span className="text-[10px] text-zinc-600">Upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={categoryForm.image_url || ''}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, image_url: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                      placeholder="Image URL"
                    />
                    <p className="text-xs text-zinc-600 mt-1">
                      Click image to upload or enter URL directly
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                  placeholder="Category name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600 resize-none"
                  placeholder="Optional description"
                />
              </div>

              {/* Parent Category */}
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Parent Category</label>
                <select
                  value={categoryForm.parent_id || ''}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      parent_id: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="">No parent (root category)</option>
                  {categories
                    .filter((c) => c.id !== category?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Display Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                    min={0}
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <label className="text-sm text-zinc-400">Active</label>
                  <button
                    onClick={() =>
                      setCategoryForm({ ...categoryForm, is_active: !categoryForm.is_active })
                    }
                  >
                    {categoryForm.is_active ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Templates Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              {mode === 'create' ? (
                <div className="text-center py-8 text-zinc-500">
                  Save the category first to add pricing templates
                </div>
              ) : (
                <>
                  {/* Templates List */}
                  <div className="space-y-2">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-zinc-800/50 border border-zinc-700 rounded"
                      >
                        {/* Template Header */}
                        <div
                          className="flex items-center justify-between px-4 py-3 cursor-pointer"
                          onClick={() =>
                            expandedTemplate === template.id
                              ? setExpandedTemplate(null)
                              : handleEditTemplate(template)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-4 h-4 text-zinc-500" />
                            <div>
                              <div className="text-white font-medium">{template.name}</div>
                              {template.quality_tier && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded bg-${
                                    QUALITY_TIERS.find((q) => q.value === template.quality_tier)
                                      ?.color || 'zinc'
                                  }-500/20 text-${
                                    QUALITY_TIERS.find((q) => q.value === template.quality_tier)
                                      ?.color || 'zinc'
                                  }-400`}
                                >
                                  {QUALITY_TIERS.find((q) => q.value === template.quality_tier)
                                    ?.label || template.quality_tier}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              {template.default_tiers?.length || 0} tiers
                            </span>
                            {expandedTemplate === template.id ? (
                              <ChevronUp className="w-4 h-4 text-zinc-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Template Editor */}
                        {expandedTemplate === template.id && editingTemplate && (
                          <div className="border-t border-zinc-700 p-4 space-y-4">
                            {/* Template Name & Quality */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-zinc-500 mb-1">Name</label>
                                <input
                                  type="text"
                                  value={editingTemplate.name}
                                  onChange={(e) =>
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      name: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                  Quality Tier
                                </label>
                                <select
                                  value={editingTemplate.quality_tier || ''}
                                  onChange={(e) =>
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      quality_tier: e.target.value as any || undefined,
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                                >
                                  <option value="">No quality tier</option>
                                  {QUALITY_TIERS.map((tier) => (
                                    <option key={tier.value} value={tier.value}>
                                      {tier.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Tiers Table */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-zinc-500">Pricing Tiers</label>
                                <button
                                  onClick={handleAddTier}
                                  className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                  + Add Tier
                                </button>
                              </div>
                              <div className="bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-zinc-700">
                                      <th className="text-left px-3 py-2 text-xs text-zinc-500">
                                        Label
                                      </th>
                                      <th className="text-left px-3 py-2 text-xs text-zinc-500">
                                        Qty
                                      </th>
                                      <th className="text-left px-3 py-2 text-xs text-zinc-500">
                                        Unit
                                      </th>
                                      <th className="text-right px-3 py-2 text-xs text-zinc-500">
                                        Price
                                      </th>
                                      <th className="w-8"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {editingTemplate.tiers.map((tier, index) => (
                                      <tr key={tier.id} className="border-b border-zinc-800">
                                        <td className="px-2 py-1">
                                          <input
                                            type="text"
                                            value={tier.label}
                                            onChange={(e) =>
                                              handleTierChange(index, 'label', e.target.value)
                                            }
                                            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                            placeholder="1g"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <input
                                            type="number"
                                            value={tier.quantity}
                                            onChange={(e) =>
                                              handleTierChange(
                                                index,
                                                'quantity',
                                                parseFloat(e.target.value) || 0
                                              )
                                            }
                                            className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                            step="0.1"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <select
                                            value={tier.unit}
                                            onChange={(e) =>
                                              handleTierChange(index, 'unit', e.target.value)
                                            }
                                            className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                          >
                                            <option value="g">g</option>
                                            <option value="oz">oz</option>
                                            <option value="ea">ea</option>
                                            <option value="pk">pk</option>
                                          </select>
                                        </td>
                                        <td className="px-2 py-1">
                                          <input
                                            type="number"
                                            value={tier.default_price}
                                            onChange={(e) =>
                                              handleTierChange(
                                                index,
                                                'default_price',
                                                parseFloat(e.target.value) || 0
                                              )
                                            }
                                            className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white text-right"
                                            step="0.01"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <button
                                            onClick={() => handleRemoveTier(index)}
                                            className="p-1 text-zinc-500 hover:text-red-400"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2">
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Delete Template
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingTemplate(null)
                                    setExpandedTemplate(null)
                                  }}
                                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveTemplate}
                                  disabled={isSaving}
                                  className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded hover:bg-zinc-200 disabled:opacity-50"
                                >
                                  {isSaving ? 'Saving...' : 'Save Template'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* New Template Form */}
                    {expandedTemplate === 'new' && editingTemplate && (
                      <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">
                              Template Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={editingTemplate.name}
                              onChange={(e) =>
                                setEditingTemplate({ ...editingTemplate, name: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                              placeholder="e.g., Flower Pricing"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">Quality Tier</label>
                            <select
                              value={editingTemplate.quality_tier || ''}
                              onChange={(e) =>
                                setEditingTemplate({
                                  ...editingTemplate,
                                  quality_tier: e.target.value as any || undefined,
                                })
                              }
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                            >
                              <option value="">No quality tier</option>
                              {QUALITY_TIERS.map((tier) => (
                                <option key={tier.value} value={tier.value}>
                                  {tier.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Tiers */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-zinc-500">Pricing Tiers</label>
                            <button
                              onClick={handleAddTier}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              + Add Tier
                            </button>
                          </div>
                          <div className="bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-zinc-700">
                                  <th className="text-left px-3 py-2 text-xs text-zinc-500">
                                    Label
                                  </th>
                                  <th className="text-left px-3 py-2 text-xs text-zinc-500">Qty</th>
                                  <th className="text-left px-3 py-2 text-xs text-zinc-500">
                                    Unit
                                  </th>
                                  <th className="text-right px-3 py-2 text-xs text-zinc-500">
                                    Default Price
                                  </th>
                                  <th className="w-8"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {editingTemplate.tiers.map((tier, index) => (
                                  <tr key={tier.id} className="border-b border-zinc-800">
                                    <td className="px-2 py-1">
                                      <input
                                        type="text"
                                        value={tier.label}
                                        onChange={(e) =>
                                          handleTierChange(index, 'label', e.target.value)
                                        }
                                        className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                        placeholder="1g"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="number"
                                        value={tier.quantity}
                                        onChange={(e) =>
                                          handleTierChange(
                                            index,
                                            'quantity',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                        step="0.1"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <select
                                        value={tier.unit}
                                        onChange={(e) =>
                                          handleTierChange(index, 'unit', e.target.value)
                                        }
                                        className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                      >
                                        <option value="g">g</option>
                                        <option value="oz">oz</option>
                                        <option value="ea">ea</option>
                                        <option value="pk">pk</option>
                                      </select>
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="number"
                                        value={tier.default_price}
                                        onChange={(e) =>
                                          handleTierChange(
                                            index,
                                            'default_price',
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white text-right"
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <button
                                        onClick={() => handleRemoveTier(index)}
                                        className="p-1 text-zinc-500 hover:text-red-400"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => {
                              setEditingTemplate(null)
                              setExpandedTemplate(null)
                            }}
                            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveTemplate}
                            disabled={isSaving || !editingTemplate.name.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded hover:bg-zinc-200 disabled:opacity-50"
                          >
                            {isSaving ? 'Creating...' : 'Create Template'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add Template Button */}
                  {expandedTemplate !== 'new' && (
                    <button
                      onClick={handleAddTemplate}
                      className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-zinc-700 rounded text-sm text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Pricing Template
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Field Config Tab */}
          {activeTab === 'fields' && (
            <div className="space-y-4">
              {mode === 'create' ? (
                <div className="text-center py-8 text-zinc-500">
                  Save the category first to configure fields
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-4">
                    Custom fields for products in this category. These fields will appear when creating or editing products.
                  </p>

                  {/* Existing Fields */}
                  {isLoadingFields ? (
                    <div className="flex items-center justify-center py-8 text-zinc-500">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading fields...
                    </div>
                  ) : categoryFields.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 bg-zinc-800/30 rounded border border-zinc-800">
                      No custom fields configured for this category
                    </div>
                  ) : (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-700">
                            <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Field</th>
                            <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Type</th>
                            <th className="text-center px-4 py-2 text-xs text-zinc-500 font-medium">Required</th>
                            <th className="text-center px-4 py-2 text-xs text-zinc-500 font-medium">Active</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/50">
                          {categoryFields.map((field) => (
                            <tr key={field.id} className="hover:bg-zinc-800/50">
                              <td className="px-4 py-2">
                                <div className="text-white">{field.field_definition.label}</div>
                                {field.field_definition.options && (
                                  <div className="text-xs text-zinc-500">
                                    {field.field_definition.options.join(', ')}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-zinc-400 capitalize">
                                {field.field_definition.type}
                                {field.field_definition.unit && (
                                  <span className="text-zinc-500 ml-1">({field.field_definition.unit})</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {field.field_definition.required ? (
                                  <span className="text-amber-400">Yes</span>
                                ) : (
                                  <span className="text-zinc-600">No</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button onClick={() => handleToggleFieldActive(field)}>
                                  {field.is_active ? (
                                    <ToggleRight className="w-5 h-5 text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5 text-zinc-600" />
                                  )}
                                </button>
                              </td>
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => handleDeleteField(field.id)}
                                  className="p-1 text-zinc-500 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add New Field */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4 space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300">Add New Field</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Label</label>
                        <input
                          type="text"
                          value={newField.label}
                          onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                          placeholder="Field name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Type</label>
                        <select
                          value={newField.type}
                          onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="select">Select (Dropdown)</option>
                          <option value="boolean">Yes/No</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                    </div>
                    {newField.type === 'select' && (
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Options (comma-separated)</label>
                        <input
                          type="text"
                          value={newField.options}
                          onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-zinc-600"
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newField.required}
                          onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800"
                        />
                        <span className="text-sm text-zinc-400">Required field</span>
                      </label>
                      <button
                        onClick={handleAddField}
                        disabled={isSaving || !newField.label.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-black rounded hover:bg-zinc-200 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Field
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSaveCategory}
            disabled={isSaving || !categoryForm.name.trim()}
            className="px-4 py-2 text-sm font-medium bg-white text-black rounded hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Category' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
