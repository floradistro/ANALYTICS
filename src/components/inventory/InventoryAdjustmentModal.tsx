'use client'

import { useState } from 'react'
import { X, Plus, Minus, Package, AlertTriangle } from 'lucide-react'
import { useInventoryStore, type InventoryItem, type AdjustmentType } from '@/stores/inventory.store'
import { useAuthStore } from '@/stores/auth.store'

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; description: string; isDecrease: boolean }[] = [
  { value: 'count_correction', label: 'Count Correction', description: 'Physical inventory recount', isDecrease: false },
  { value: 'damage', label: 'Damage', description: 'Product damaged', isDecrease: true },
  { value: 'shrinkage', label: 'Shrinkage', description: 'Unaccounted loss', isDecrease: true },
  { value: 'theft', label: 'Theft', description: 'Stolen inventory', isDecrease: true },
  { value: 'expired', label: 'Expired', description: 'Product expired', isDecrease: true },
  { value: 'received', label: 'Received', description: 'New stock received', isDecrease: false },
  { value: 'return', label: 'Return', description: 'Customer return', isDecrease: false },
  { value: 'other', label: 'Other', description: 'Other adjustment', isDecrease: false },
]

interface InventoryAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem
  defaultType?: 'add' | 'remove'
}

export function InventoryAdjustmentModal({
  isOpen,
  onClose,
  item,
  defaultType = 'add',
}: InventoryAdjustmentModalProps) {
  const vendorId = useAuthStore((s) => s.vendorId)
  const createAdjustment = useInventoryStore((s) => s.createAdjustment)

  const [quantity, setQuantity] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(
    defaultType === 'add' ? 'received' : 'damage'
  )
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDecrease = ADJUSTMENT_TYPES.find((t) => t.value === adjustmentType)?.isDecrease ?? false
  const quantityChange = isDecrease ? -Math.abs(Number(quantity) || 0) : Math.abs(Number(quantity) || 0)
  const newQuantity = item.quantity + quantityChange

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId || !quantity || !reason) return

    // Validate
    if (isDecrease && Math.abs(quantityChange) > item.quantity) {
      setError(`Cannot remove more than current quantity (${item.quantity})`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await createAdjustment(vendorId, {
      product_id: item.product_id,
      location_id: item.location_id,
      adjustment_type: adjustmentType,
      quantity_change: quantityChange,
      reason,
      notes: notes || undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'Failed to create adjustment')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${isDecrease ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
              {isDecrease ? (
                <Minus className="w-5 h-5 text-red-400" />
              ) : (
                <Plus className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">
                {isDecrease ? 'Remove Stock' : 'Add Stock'}
              </h2>
              <p className="text-sm text-zinc-500">{item.product_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Stock Info */}
          <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded">
            <Package className="w-10 h-10 text-zinc-600" />
            <div className="flex-1">
              <div className="text-sm text-zinc-500">Current Stock at {item.location_name}</div>
              <div className="text-2xl font-light text-white">{item.quantity} units</div>
            </div>
            {quantity && (
              <div className="text-right">
                <div className="text-sm text-zinc-500">After Adjustment</div>
                <div className={`text-2xl font-light ${newQuantity < 0 ? 'text-red-400' : 'text-white'}`}>
                  {newQuantity} units
                </div>
              </div>
            )}
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ADJUSTMENT_TYPES.filter((t) =>
                defaultType === 'add' ? !t.isDecrease : t.isDecrease || t.value === 'count_correction'
              ).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAdjustmentType(type.value)}
                  className={`px-3 py-2 text-left rounded border transition-colors ${
                    adjustmentType === type.value
                      ? 'bg-zinc-800 border-zinc-700 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-zinc-500">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              max={isDecrease ? item.quantity : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 text-lg"
              required
            />
            {isDecrease && Number(quantity) > item.quantity && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Cannot exceed current quantity
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for adjustment"
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !quantity || !reason || (isDecrease && Number(quantity) > item.quantity)}
              className={`px-6 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDecrease
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSubmitting ? 'Processing...' : isDecrease ? 'Remove Stock' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
