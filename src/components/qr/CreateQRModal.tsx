'use client'

import { useState } from 'react'
import { X, Package, ShoppingCart, Megaphone, QrCode, Loader2 } from 'lucide-react'

type QRCodeType = 'product' | 'order' | 'marketing'

interface CreateQRModalProps {
  vendorId: string
  onClose: () => void
  onCreated: () => void
}

const TYPE_CONFIG = {
  product: {
    icon: Package,
    label: 'Product',
    description: 'Link to a product for lab results, details, and purchasing',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-500'
  },
  order: {
    icon: ShoppingCart,
    label: 'Order',
    description: 'Track order status and shipping information',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    activeBorder: 'border-green-500'
  },
  marketing: {
    icon: Megaphone,
    label: 'Marketing',
    description: 'Custom campaigns, promotions, and event tracking',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    activeBorder: 'border-purple-500'
  }
}

export function CreateQRModal({ vendorId, onClose, onCreated }: CreateQRModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<QRCodeType>('product')
  const [name, setName] = useState('')
  const [productId, setProductId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const body: any = {
        vendor_id: vendorId,
        type,
        name: name.trim()
      }

      if (type === 'product' && productId) {
        body.product_id = productId
      }
      if (type === 'order' && orderId) {
        body.order_id = orderId
      }
      if (campaignName) {
        body.campaign_name = campaignName
      }

      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create QR code')
      }

      onCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create QR code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const config = TYPE_CONFIG[type]

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white">Create QR Code</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <>
              <p className="text-zinc-400 text-sm mb-6">Select the type of QR code you want to create</p>

              <div className="space-y-3">
                {(['product', 'order', 'marketing'] as QRCodeType[]).map(t => {
                  const c = TYPE_CONFIG[t]
                  const isSelected = type === t
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`w-full flex items-start gap-4 p-4 border transition-all ${
                        isSelected
                          ? `${c.bg} ${c.activeBorder}`
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-10 h-10 ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                        <c.icon className={`w-5 h-5 ${c.color}`} />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${isSelected ? c.color : 'text-white'}`}>{c.label}</p>
                        <p className="text-sm text-zinc-500 mt-0.5">{c.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
                <div className={`w-10 h-10 ${config.bg} border ${config.border} flex items-center justify-center`}>
                  <config.icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className={`font-medium ${config.color}`}>{config.label} QR Code</p>
                  <p className="text-sm text-zinc-500">{config.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === 'product' ? 'e.g., Blue Dream 3.5g' : type === 'order' ? 'e.g., Order #1234' : 'e.g., Summer Sale 2024'}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                </div>

                {/* Type-specific fields */}
                {type === 'product' && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Product ID (optional)</label>
                    <input
                      type="text"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      placeholder="Enter product UUID or leave blank"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                    />
                    <p className="text-xs text-zinc-600 mt-1">Link to a specific product for automatic details</p>
                  </div>
                )}

                {type === 'order' && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Order ID (optional)</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Enter order UUID or leave blank"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                    />
                    <p className="text-xs text-zinc-600 mt-1">Link to a specific order for tracking</p>
                  </div>
                )}

                {/* Campaign Name */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Campaign Name (optional)</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Q4 Label Campaign"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                  <p className="text-xs text-zinc-600 mt-1">Group QR codes by campaign for analytics</p>
                </div>

                {error && (
                  <div className="px-4 py-3 bg-red-950/50 border border-red-900 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting || !name.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      Create QR Code
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
