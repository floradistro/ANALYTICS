'use client'

import { useState } from 'react'
import {
  Package,
  PackageOpen,
  ArrowLeftRight,
  ClipboardList,
} from 'lucide-react'
import { PurchaseOrdersTab } from '@/components/inventory/PurchaseOrdersTab'
import { StockLevelsTab } from '@/components/inventory/StockLevelsTab'
import { TransfersTab } from '@/components/inventory/TransfersTab'
import { AuditsTab } from '@/components/inventory/AuditsTab'

type InventoryTab = 'purchase-orders' | 'stock' | 'transfers' | 'audits'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock')

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-light text-white tracking-wide">Inventory</h1>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-sm">
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
      {activeTab === 'stock' && <StockLevelsTab />}
      {activeTab === 'purchase-orders' && <PurchaseOrdersTab />}
      {activeTab === 'transfers' && <TransfersTab />}
      {activeTab === 'audits' && <AuditsTab />}
    </div>
  )
}
