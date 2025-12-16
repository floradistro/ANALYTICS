'use client'

import { useState } from 'react'
import {
  Package,
  PackageOpen,
  ArrowLeftRight,
  ClipboardList,
} from 'lucide-react'
import { PurchaseOrdersTab } from '@/components/inventory/PurchaseOrdersTab'

type InventoryTab = 'purchase-orders' | 'stock' | 'transfers' | 'audits'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('purchase-orders')

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-light text-white tracking-wide">Inventory</h1>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-sm">
            <button
              onClick={() => setActiveTab('purchase-orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'purchase-orders'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <PackageOpen className="w-3.5 h-3.5" />
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'stock'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Stock Levels
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'transfers'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfers
            </button>
            <button
              onClick={() => setActiveTab('audits')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'audits'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Audits
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'purchase-orders' && <PurchaseOrdersTab />}

      {activeTab === 'stock' && (
        <div className="bg-zinc-950 border border-zinc-800 p-12 text-center">
          <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-light text-zinc-400 mb-2">Stock Levels</h3>
          <p className="text-sm text-zinc-600">Coming soon - View and manage inventory across locations</p>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="bg-zinc-950 border border-zinc-800 p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-light text-zinc-400 mb-2">Inventory Transfers</h3>
          <p className="text-sm text-zinc-600">Coming soon - Transfer stock between locations</p>
        </div>
      )}

      {activeTab === 'audits' && (
        <div className="bg-zinc-950 border border-zinc-800 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-light text-zinc-400 mb-2">Inventory Audits</h3>
          <p className="text-sm text-zinc-600">Coming soon - Track and reconcile inventory counts</p>
        </div>
      )}
    </div>
  )
}
