'use client'

import { useState, useEffect } from 'react'
import {
  Package,
  FolderTree,
} from 'lucide-react'
import { ProductsTab } from '@/components/products/ProductsTab'
import { CategoriesTab } from '@/components/products/CategoriesTab'

type ProductsPageTab = 'products' | 'categories'

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<ProductsPageTab>('products')
  const [initialProductId, setInitialProductId] = useState<string | null>(null)

  // Handle deep linking from QR dashboard via sessionStorage
  useEffect(() => {
    const storedProductId = sessionStorage.getItem('openProductId')
    console.log('[Products Deep Link] storedProductId:', storedProductId, 'current initialProductId:', initialProductId)
    if (storedProductId && !initialProductId) {
      console.log('[Products Deep Link] Setting initialProductId:', storedProductId)
      setInitialProductId(storedProductId)
      // Clear immediately to prevent re-opening
      sessionStorage.removeItem('openProductId')
    }
  }, [initialProductId])

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-light text-white tracking-wide">Products</h1>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-sm">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'products'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Products
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'categories'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Categories
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && (
        <ProductsTab
          initialProductId={initialProductId}
          onProductViewed={() => setInitialProductId(null)}
        />
      )}
      {activeTab === 'categories' && <CategoriesTab />}
    </div>
  )
}
