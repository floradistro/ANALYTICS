'use client'

import { useEffect, useState } from 'react'
import { usePurchaseOrdersStore, type ItemCondition } from '@/stores/purchase-orders.store'
import { useAuthStore } from '@/stores/auth.store'
import { format } from 'date-fns'
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  XCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PODetailModalProps {
  poId: string | null
  isOpen: boolean
  onClose: () => void
}

export function PODetailModal({ poId, isOpen, onClose }: PODetailModalProps) {
  const { userId } = useAuthStore()
  const {
    selectedPO,
    isLoadingDetail,
    loadPurchaseOrderDetail,
    clearSelectedPO,
    updatePOStatus,
    receiveItems,
  } = usePurchaseOrdersStore()

  const [receiving, setReceiving] = useState(false)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})
  const [receiveConditions, setReceiveConditions] = useState<Record<string, ItemCondition>>({})
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (poId && isOpen) {
      loadPurchaseOrderDetail(poId)
    }
    return () => {
      clearSelectedPO()
      setReceiving(false)
      setReceiveQuantities({})
      setReceiveConditions({})
      setExpandedItems(new Set())
      setError(null)
    }
  }, [poId, isOpen])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-zinc-500/10 text-zinc-400',
      pending: 'bg-amber-500/10 text-amber-400',
      ordered: 'bg-blue-500/10 text-blue-400',
      approved: 'bg-blue-500/10 text-blue-400',
      receiving: 'bg-purple-500/10 text-purple-400',
      partially_received: 'bg-purple-500/10 text-purple-400',
      received: 'bg-emerald-500/10 text-emerald-400',
      cancelled: 'bg-red-500/10 text-red-400',
    }
    return styles[status] || 'bg-zinc-800 text-zinc-400'
  }

  const getConditionBadge = (condition: string | null) => {
    if (!condition) return 'bg-zinc-800 text-zinc-400'
    const styles: Record<string, string> = {
      good: 'bg-emerald-500/10 text-emerald-400',
      damaged: 'bg-amber-500/10 text-amber-400',
      expired: 'bg-red-500/10 text-red-400',
      rejected: 'bg-red-500/10 text-red-400',
    }
    return styles[condition] || 'bg-zinc-800 text-zinc-400'
  }

  const canReceive = selectedPO && ['pending', 'ordered', 'approved', 'receiving', 'partially_received'].includes(selectedPO.status)
  const canSubmit = selectedPO?.status === 'draft'
  const canCancel = selectedPO && ['draft', 'pending', 'ordered', 'approved'].includes(selectedPO.status)

  const handleSubmitPO = async () => {
    if (!selectedPO) return
    setSaving(true)
    setError(null)
    const result = await updatePOStatus(selectedPO.id, 'pending', userId)
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Failed to submit PO')
    }
  }

  const handleCancelPO = async () => {
    if (!selectedPO) return
    if (!confirm('Are you sure you want to cancel this purchase order?')) return
    setSaving(true)
    setError(null)
    const result = await updatePOStatus(selectedPO.id, 'cancelled', userId)
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Failed to cancel PO')
    }
  }

  const startReceiving = () => {
    if (!selectedPO) return

    // Initialize quantities to remaining amounts
    const quantities: Record<string, number> = {}
    const conditions: Record<string, ItemCondition> = {}

    selectedPO.items.forEach((item) => {
      const remaining = item.quantity - (item.received_quantity || 0)
      if (remaining > 0) {
        quantities[item.id] = remaining
        conditions[item.id] = 'good'
      }
    })

    setReceiveQuantities(quantities)
    setReceiveConditions(conditions)
    setReceiving(true)
  }

  // Receive all remaining items in one click
  const handleReceiveAll = async () => {
    if (!selectedPO || !selectedPO.location_id) {
      setError('No location set for this PO')
      return
    }

    // Build items with all remaining quantities as "good"
    const itemsToReceive = selectedPO.items
      .filter((item) => {
        const remaining = item.quantity - (item.received_quantity || 0)
        return remaining > 0
      })
      .map((item) => ({
        item_id: item.id,
        quantity: item.quantity - (item.received_quantity || 0),
        condition: 'good' as ItemCondition,
      }))

    if (itemsToReceive.length === 0) {
      setError('All items already received')
      return
    }

    setSaving(true)
    setError(null)

    const result = await receiveItems(selectedPO.id, itemsToReceive, selectedPO.location_id, userId)

    setSaving(false)

    if (!result.success) {
      setError(result.error || 'Failed to receive items')
    }
  }

  const handleReceive = async () => {
    if (!selectedPO || !selectedPO.location_id) {
      setError('No location set for this PO')
      return
    }

    const itemsToReceive = Object.entries(receiveQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({
        item_id: itemId,
        quantity,
        condition: receiveConditions[itemId] || 'good',
      }))

    if (itemsToReceive.length === 0) {
      setError('No items to receive')
      return
    }

    setSaving(true)
    setError(null)

    const result = await receiveItems(selectedPO.id, itemsToReceive, selectedPO.location_id, userId)

    setSaving(false)

    if (result.success) {
      setReceiving(false)
      setReceiveQuantities({})
      setReceiveConditions({})
    } else {
      setError(result.error || 'Failed to receive items')
    }
  }

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

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
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-3xl lg:max-h-[85vh] bg-zinc-950 border border-zinc-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-medium text-white">
                  {selectedPO?.po_number || 'Purchase Order'}
                </h2>
                {selectedPO && (
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {selectedPO.supplier_name || 'No supplier'} &bull; {selectedPO.location_name || 'No location'}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-zinc-500">Loading...</div>
                </div>
              ) : selectedPO ? (
                <div className="space-y-6">
                  {/* Status & Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Status</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadge(selectedPO.status)}`}>
                        {selectedPO.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Total</p>
                      <p className="text-white font-medium tabular-nums">{formatCurrency(selectedPO.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Expected</p>
                      <p className="text-zinc-400">
                        {selectedPO.expected_delivery_date
                          ? format(new Date(selectedPO.expected_delivery_date), 'MMM d, yyyy')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Received</p>
                      <p className="text-zinc-400">
                        {selectedPO.received_date
                          ? format(new Date(selectedPO.received_date), 'MMM d, yyyy')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Staff Attribution */}
                  {(selectedPO.created_by_name || selectedPO.received_by_name) && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                      {selectedPO.created_by_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">Created by:</span>
                          <span className="text-zinc-300">{selectedPO.created_by_name}</span>
                        </div>
                      )}
                      {selectedPO.received_by_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">Received by:</span>
                          <span className="text-zinc-300">{selectedPO.received_by_name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-white">
                        Items ({selectedPO.items.length})
                      </h3>
                      <div className="flex items-center gap-2">
                        {canSubmit && (
                          <button
                            onClick={handleSubmitPO}
                            disabled={saving}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            Submit PO
                          </button>
                        )}
                        {canReceive && !receiving && (
                          <>
                            <button
                              onClick={handleReceiveAll}
                              disabled={saving}
                              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {saving ? 'Receiving...' : 'Receive All'}
                            </button>
                            <button
                              onClick={startReceiving}
                              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition-colors"
                            >
                              <Truck className="w-4 h-4" />
                              Partial
                            </button>
                          </>
                        )}
                        {canCancel && (
                          <button
                            onClick={handleCancelPO}
                            disabled={saving}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-red-600/80 disabled:opacity-50 text-zinc-400 hover:text-white text-sm transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border border-zinc-800 divide-y divide-zinc-800">
                      {selectedPO.items.map((item) => {
                        const remaining = item.quantity - (item.received_quantity || 0)
                        const isExpanded = expandedItems.has(item.id)
                        const isFullyReceived = remaining <= 0

                        return (
                          <div key={item.id} className="bg-zinc-900/30">
                            {/* Item Row */}
                            <div
                              className="flex items-center px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                              onClick={() => toggleItemExpanded(item.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{item.product_name || 'Unknown Product'}</p>
                                {item.product_sku && (
                                  <p className="text-xs text-zinc-500 font-mono">{item.product_sku}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <p className="text-sm text-zinc-400 tabular-nums">
                                    {item.received_quantity || 0} / {item.quantity}
                                  </p>
                                  <p className="text-xs text-zinc-600">received</p>
                                </div>

                                <div className="text-right w-20">
                                  <p className="text-sm text-white tabular-nums">
                                    {formatCurrency(item.subtotal)}
                                  </p>
                                </div>

                                {isFullyReceived ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-zinc-500" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Expanded Receive Section */}
                            <AnimatePresence>
                              {isExpanded && receiving && !isFullyReceived && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800/50 space-y-3">
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1">
                                        <label className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1 block">
                                          Quantity to Receive (max {remaining})
                                        </label>
                                        <input
                                          type="number"
                                          min={0}
                                          max={remaining}
                                          value={receiveQuantities[item.id] || 0}
                                          onChange={(e) => {
                                            const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), remaining)
                                            setReceiveQuantities((prev) => ({ ...prev, [item.id]: val }))
                                          }}
                                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-zinc-500 text-sm tabular-nums"
                                        />
                                      </div>

                                      <div className="flex-1">
                                        <label className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1 block">
                                          Condition
                                        </label>
                                        <select
                                          value={receiveConditions[item.id] || 'good'}
                                          onChange={(e) => {
                                            setReceiveConditions((prev) => ({
                                              ...prev,
                                              [item.id]: e.target.value as ItemCondition,
                                            }))
                                          }}
                                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-zinc-500 text-sm"
                                        >
                                          <option value="good">Good</option>
                                          <option value="damaged">Damaged</option>
                                          <option value="expired">Expired</option>
                                          <option value="rejected">Rejected</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {/* Show condition if already received */}
                              {isExpanded && item.condition && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800/50">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${getConditionBadge(item.condition)}`}>
                                      {item.condition}
                                    </span>
                                    {item.quality_notes && (
                                      <p className="text-xs text-zinc-500 mt-2">{item.quality_notes}</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedPO.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-white mb-2">Notes</h3>
                      <p className="text-sm text-zinc-400 bg-zinc-900/50 border border-zinc-800 p-3">
                        {selectedPO.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-zinc-500">Purchase order not found</div>
                </div>
              )}
            </div>

            {/* Footer */}
            {receiving && (
              <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <button
                  onClick={() => {
                    setReceiving(false)
                    setReceiveQuantities({})
                    setReceiveConditions({})
                    setError(null)
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceive}
                  disabled={saving || Object.values(receiveQuantities).every((q) => q === 0)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Receipt
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
