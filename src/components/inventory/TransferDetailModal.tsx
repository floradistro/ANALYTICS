'use client'

import { useEffect, useState } from 'react'
import {
  X,
  ArrowRight,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  MapPin,
  User,
} from 'lucide-react'
import { useInventoryStore, type TransferStatus, type ItemCondition } from '@/stores/inventory.store'
import { useAuthStore } from '@/stores/auth.store'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'zinc', icon: Clock },
  approved: { label: 'Approved', color: 'blue', icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'amber', icon: Truck },
  completed: { label: 'Completed', color: 'emerald', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle },
}

interface TransferDetailModalProps {
  isOpen: boolean
  transferId: string
  onClose: () => void
}

export function TransferDetailModal({ isOpen, transferId, onClose }: TransferDetailModalProps) {
  const vendorId = useAuthStore((s) => s.vendorId)
  const {
    selectedTransfer,
    isLoadingTransferDetail,
    loadTransferDetail,
    updateTransferStatus,
    receiveTransferItems,
    clearSelectedTransfer,
    loadTransfers,
  } = useInventoryStore()

  const [isUpdating, setIsUpdating] = useState(false)
  const [showReceiveMode, setShowReceiveMode] = useState(false)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})
  const [receiveConditions, setReceiveConditions] = useState<Record<string, ItemCondition>>({})

  useEffect(() => {
    if (isOpen && transferId) {
      loadTransferDetail(transferId)
    }
    return () => clearSelectedTransfer()
  }, [isOpen, transferId])

  // Initialize receive quantities when transfer loads
  useEffect(() => {
    if (selectedTransfer?.items) {
      const quantities: Record<string, number> = {}
      const conditions: Record<string, ItemCondition> = {}
      selectedTransfer.items.forEach((item) => {
        const remaining = item.quantity - (item.received_quantity || 0)
        quantities[item.id] = remaining
        conditions[item.id] = 'good'
      })
      setReceiveQuantities(quantities)
      setReceiveConditions(conditions)
    }
  }, [selectedTransfer])

  const handleStatusUpdate = async (newStatus: TransferStatus) => {
    if (!vendorId) return
    setIsUpdating(true)

    const { data: { user } } = await supabase.auth.getUser()
    const result = await updateTransferStatus(transferId, newStatus, user?.id)

    if (result.success) {
      await loadTransfers(vendorId)
    }
    setIsUpdating(false)
  }

  const handleReceiveItems = async () => {
    if (!vendorId || !selectedTransfer) return
    setIsUpdating(true)

    const { data: { user } } = await supabase.auth.getUser()

    const itemsToReceive = selectedTransfer.items
      .filter((item) => {
        const qty = receiveQuantities[item.id] || 0
        return qty > 0
      })
      .map((item) => ({
        item_id: item.id,
        quantity: receiveQuantities[item.id] || 0,
        condition: receiveConditions[item.id] || 'good',
      }))

    const result = await receiveTransferItems(transferId, itemsToReceive, user?.id)

    if (result.success) {
      await loadTransfers(vendorId)
      setShowReceiveMode(false)
    }
    setIsUpdating(false)
  }

  const getStatusBadge = (status: TransferStatus) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded border
          bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/20`}
      >
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  const canApprove = selectedTransfer?.status === 'draft'
  const canShip = selectedTransfer?.status === 'approved'
  const canReceive = selectedTransfer?.status === 'in_transit'
  const canCancel = ['draft', 'approved'].includes(selectedTransfer?.status || '')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-medium text-white">
              {selectedTransfer?.transfer_number || 'Transfer Details'}
            </h2>
            <p className="text-sm text-zinc-500">
              {selectedTransfer?.created_at &&
                format(new Date(selectedTransfer.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingTransferDetail ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-2 text-sm text-zinc-500">Loading transfer details...</p>
            </div>
          ) : selectedTransfer ? (
            <>
              {/* Status and Locations */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {getStatusBadge(selectedTransfer.status)}

                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <MapPin className="w-4 h-4" />
                    {selectedTransfer.source_location_name}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <MapPin className="w-4 h-4" />
                    {selectedTransfer.destination_location_name}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedTransfer.notes && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400">
                  {selectedTransfer.notes}
                </div>
              )}

              {/* Staff Attribution */}
              {(selectedTransfer.created_by_name || selectedTransfer.received_by_name) && (
                <div className="flex items-center gap-6 text-sm text-zinc-500">
                  {selectedTransfer.created_by_name && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Created by {selectedTransfer.created_by_name}
                    </div>
                  )}
                  {selectedTransfer.received_by_name && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Received by {selectedTransfer.received_by_name}
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Transfer Items</h3>
                <div className="space-y-2">
                  {selectedTransfer.items.map((item) => {
                    const remaining = item.quantity - (item.received_quantity || 0)
                    const isFullyReceived = remaining <= 0

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 bg-zinc-950 border border-zinc-800 rounded"
                      >
                        <Package className="w-5 h-5 text-zinc-600" />
                        <div className="flex-1">
                          <div className="text-sm text-white">{item.product_name}</div>
                          <div className="text-xs text-zinc-500">{item.product_sku}</div>
                        </div>
                        <div className="text-right">
                          {showReceiveMode && !isFullyReceived ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={receiveConditions[item.id] || 'good'}
                                onChange={(e) =>
                                  setReceiveConditions({
                                    ...receiveConditions,
                                    [item.id]: e.target.value as ItemCondition,
                                  })
                                }
                                className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white"
                              >
                                <option value="good">Good</option>
                                <option value="damaged">Damaged</option>
                                <option value="expired">Expired</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                max={remaining}
                                value={receiveQuantities[item.id] || 0}
                                onChange={(e) =>
                                  setReceiveQuantities({
                                    ...receiveQuantities,
                                    [item.id]: Math.min(
                                      parseInt(e.target.value) || 0,
                                      remaining
                                    ),
                                  })
                                }
                                className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-white text-center text-sm"
                              />
                              <span className="text-xs text-zinc-500">/ {remaining}</span>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <span className="text-white">{item.received_quantity || 0}</span>
                              <span className="text-zinc-500"> / {item.quantity}</span>
                              {isFullyReceived && (
                                <CheckCircle className="inline w-4 h-4 text-emerald-400 ml-2" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 text-sm">
                <h3 className="font-medium text-zinc-400 mb-3">Timeline</h3>
                <div className="flex items-center gap-3 text-zinc-500">
                  <Clock className="w-4 h-4" />
                  Created {format(new Date(selectedTransfer.created_at), 'MMM d, yyyy h:mm a')}
                </div>
                {selectedTransfer.shipped_at && (
                  <div className="flex items-center gap-3 text-zinc-500">
                    <Truck className="w-4 h-4" />
                    Shipped {format(new Date(selectedTransfer.shipped_at), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
                {selectedTransfer.received_at && (
                  <div className="flex items-center gap-3 text-zinc-500">
                    <CheckCircle className="w-4 h-4" />
                    Received {format(new Date(selectedTransfer.received_at), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
                {selectedTransfer.cancelled_at && (
                  <div className="flex items-center gap-3 text-red-400">
                    <XCircle className="w-4 h-4" />
                    Cancelled {format(new Date(selectedTransfer.cancelled_at), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-zinc-500">Transfer not found</div>
          )}
        </div>

        {/* Actions */}
        {selectedTransfer && selectedTransfer.status !== 'cancelled' && selectedTransfer.status !== 'completed' && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-800">
            <div>
              {canCancel && (
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Cancel Transfer
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {canApprove && (
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                >
                  {isUpdating ? 'Approving...' : 'Approve'}
                </button>
              )}

              {canShip && (
                <button
                  onClick={() => handleStatusUpdate('in_transit')}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded disabled:opacity-50"
                >
                  {isUpdating ? 'Processing...' : 'Mark as Shipped'}
                </button>
              )}

              {canReceive && !showReceiveMode && (
                <button
                  onClick={() => setShowReceiveMode(true)}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                >
                  Receive Items
                </button>
              )}

              {canReceive && showReceiveMode && (
                <>
                  <button
                    onClick={() => setShowReceiveMode(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReceiveItems}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50"
                  >
                    {isUpdating ? 'Processing...' : 'Confirm Receipt'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
