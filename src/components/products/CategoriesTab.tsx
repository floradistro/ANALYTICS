'use client'

import { useEffect, useState } from 'react'
import {
  FolderTree,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Settings,
  ImageIcon,
} from 'lucide-react'
import { useProductsStore, type Category } from '@/stores/products.store'
import { useAuthStore } from '@/stores/auth.store'
import { CategoryDetailModal } from './CategoryDetailModal'

export function CategoriesTab() {
  const storeId = useAuthStore((s) => s.storeId)
  const {
    categories,
    pricingTemplates,
    isLoadingCategories,
    loadCategories,
    loadPricingTemplates,
    updateCategory,
    deleteCategory,
  } = useProductsStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    category: Category | null
    mode: 'create' | 'edit'
  }>({ isOpen: false, category: null, mode: 'create' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (storeId) {
      loadCategories(storeId)
      loadPricingTemplates(storeId)
    }
  }, [storeId])

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Organize categories into tree structure
  const rootCategories = filteredCategories.filter((c) => !c.parent_id)
  const getChildCategories = (parentId: string) =>
    filteredCategories.filter((c) => c.parent_id === parentId)

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleToggleActive = async (category: Category) => {
    await updateCategory(category.id, { is_active: !category.is_active })
  }

  const handleDelete = async (categoryId: string) => {
    const result = await deleteCategory(categoryId)
    if (result.success) {
      setDeleteConfirm(null)
    }
  }

  const getCategoryTemplates = (categoryId: string) =>
    pricingTemplates.filter((t) => t.category_id === categoryId)

  const renderCategoryRow = (category: Category, depth = 0) => {
    const children = getChildCategories(category.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const templates = getCategoryTemplates(category.id)

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 px-4 py-3 hover:bg-zinc-900/50 border-b border-zinc-800/50 cursor-pointer ${
            depth > 0 ? 'bg-zinc-900/30' : ''
          }`}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
          onClick={() => setModalState({ isOpen: true, category, mode: 'edit' })}
        >
          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              hasChildren && toggleExpand(category.id)
            }}
            className={`w-5 h-5 flex items-center justify-center ${
              hasChildren ? 'text-zinc-500 hover:text-white' : 'text-transparent'
            }`}
          >
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
          </button>

          {/* Image */}
          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {category.image_url || category.featured_image ? (
              <img
                src={category.image_url || category.featured_image}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-zinc-600" />
            )}
          </div>

          {/* Name & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{category.name}</span>
              {!category.is_active && (
                <span className="px-1.5 py-0.5 text-[10px] bg-zinc-700 text-zinc-400 rounded">
                  Inactive
                </span>
              )}
            </div>
            {category.description && (
              <div className="text-xs text-zinc-500 truncate">{category.description}</div>
            )}
          </div>

          {/* Template Count */}
          <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 rounded text-xs text-zinc-400">
            <DollarSign className="w-3 h-3" />
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </div>

          {/* Product Count */}
          <div className="w-16 text-center text-sm text-zinc-400">
            {category.product_count || 0}
          </div>

          {/* Active Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleActive(category)
            }}
            className="px-2"
          >
            {category.is_active ? (
              <ToggleRight className="w-5 h-5 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-zinc-600" />
            )}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setModalState({ isOpen: true, category, mode: 'edit' })}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Edit Category & Templates"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteConfirm(category.id)}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>{children.map((child) => renderCategoryRow(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Total Categories</div>
          <div className="text-xl font-light text-white">{categories.length}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Active</div>
          <div className="text-xl font-light text-emerald-400">
            {categories.filter((c) => c.is_active).length}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">Pricing Templates</div>
          <div className="text-xl font-light text-blue-400">{pricingTemplates.length}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-1">With Products</div>
          <div className="text-xl font-light text-amber-400">
            {categories.filter((c) => c.product_count > 0).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <button
          onClick={() => setModalState({ isOpen: true, category: null, mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Category List */}
      <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div className="w-5" />
          <div className="w-8" />
          <div className="flex-1">Category</div>
          <div className="w-24 text-center">Templates</div>
          <div className="w-16 text-center">Products</div>
          <div className="w-10 text-center">Active</div>
          <div className="w-20 text-center">Actions</div>
        </div>

        {/* Body */}
        {isLoadingCategories ? (
          <div className="px-4 py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
              Loading categories...
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <FolderTree className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No categories found</p>
            <button
              onClick={() => setModalState({ isOpen: true, category: null, mode: 'create' })}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div>{rootCategories.map((cat) => renderCategoryRow(cat))}</div>
        )}
      </div>

      {/* Category Detail Modal */}
      {modalState.isOpen && (
        <CategoryDetailModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          category={modalState.category}
          categories={categories}
          onClose={() => setModalState({ isOpen: false, category: null, mode: 'create' })}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-white mb-2">Delete Category?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              This will permanently delete this category and its pricing templates. Products in
              this category will be uncategorized.
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
