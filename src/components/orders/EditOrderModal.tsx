'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  X,
  Save,
  Trash2,
  Plus,
  Minus,
  User,
  Package,
  MapPin,
  CreditCard,
  AlertTriangle,
  Check,
  Loader2,
  DollarSign,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Copy,
  Mail,
  Phone,
} from 'lucide-react'

interface OrderItem {
  id: string
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
}

interface EditOrderModalProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

type Tab = 'customer' | 'items' | 'shipping' | 'payment' | 'status' | 'danger'

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { value: 'processing', label: 'Processing', icon: Package, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { value: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
]

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { value: 'paid', label: 'Paid', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  { value: 'failed', label: 'Failed', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { value: 'refunded', label: 'Refunded', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' },
  { value: 'partially_refunded', label: 'Partial', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
]

export function EditOrderModal({ orderId, isOpen, onClose, onSave }: EditOrderModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('customer')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)

  // Customer fields
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Shipping fields
  const [shippingName, setShippingName] = useState('')
  const [shippingAddress1, setShippingAddress1] = useState('')
  const [shippingAddress2, setShippingAddress2] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingState, setShippingState] = useState('')
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  // Payment fields
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  // Status fields
  const [orderStatus, setOrderStatus] = useState('pending')
  const [notes, setNotes] = useState('')

  // Item modifications
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({})
  const [itemsToRemove, setItemsToRemove] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen || !orderId) return

    async function loadOrder() {
      setLoading(true)
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError
        setOrder(orderData)

        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true })

        setItems(itemsData || [])

        const quantities: Record<string, number> = {}
        const prices: Record<string, number> = {}
        ;(itemsData || []).forEach((item: OrderItem) => {
          quantities[item.id] = item.quantity
          prices[item.id] = item.unit_price
        })
        setItemQuantities(quantities)
        setItemPrices(prices)

        if (orderData.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', orderData.customer_id)
            .single()

          if (customerData) {
            setCustomer(customerData)
            setCustomerName(`${customerData.first_name || ''} ${customerData.last_name || ''}`.trim())
            setCustomerEmail(customerData.email || '')
            setCustomerPhone(customerData.phone || '')
          }
        }

        setShippingName(orderData.shipping_name || '')
        setShippingAddress1(orderData.shipping_address_line1 || '')
        setShippingAddress2(orderData.shipping_address_line2 || '')
        setShippingCity(orderData.shipping_city || '')
        setShippingState(orderData.shipping_state || '')
        setShippingPostalCode(orderData.shipping_postal_code || '')
        setTrackingNumber(orderData.tracking_number || '')
        setPaymentStatus(orderData.payment_status || 'pending')
        setPaymentMethod(orderData.payment_method || '')
        setDiscountAmount(orderData.discount_amount?.toString() || '0')
        setOrderStatus(orderData.status || 'pending')
        setNotes(orderData.notes || '')
        setItemsToRemove(new Set())
        setHasChanges(false)
        setActiveTab('customer')
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [isOpen, orderId])

  const calculateTotals = useCallback(() => {
    let newSubtotal = 0

    items.forEach((item) => {
      if (itemsToRemove.has(item.id)) return
      const qty = itemQuantities[item.id] ?? item.quantity
      const price = itemPrices[item.id] ?? item.unit_price
      newSubtotal += price * qty
    })

    const discount = parseFloat(discountAmount) || 0
    const taxRate = order?.subtotal > 0 ? (order.tax_amount || 0) / order.subtotal : 0
    const newTax = newSubtotal * taxRate
    const newTotal = newSubtotal - discount + newTax

    return { subtotal: newSubtotal, tax: newTax, discount, total: Math.max(0, newTotal) }
  }, [items, itemQuantities, itemPrices, itemsToRemove, discountAmount, order])

  const totals = calculateTotals()

  useEffect(() => {
    setHasChanges(true)
  }, [customerName, customerEmail, customerPhone, shippingName, shippingAddress1, shippingAddress2, shippingCity, shippingState, shippingPostalCode, trackingNumber, paymentStatus, discountAmount, orderStatus, notes, itemQuantities, itemPrices, itemsToRemove])

  const handleQuantityChange = (itemId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 1
      const newQty = Math.max(0, current + delta)
      if (newQty === 0) {
        setItemsToRemove((prev) => new Set([...prev, itemId]))
      } else {
        setItemsToRemove((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
      return { ...prev, [itemId]: newQty }
    })
  }

  const handlePriceChange = (itemId: string, value: string) => {
    const price = parseFloat(value) || 0
    setItemPrices((prev) => ({ ...prev, [itemId]: price }))
  }

  const handleRemoveItem = (itemId: string) => {
    setItemsToRemove((prev) => new Set([...prev, itemId]))
    setItemQuantities((prev) => ({ ...prev, [itemId]: 0 }))
  }

  const handleRestoreItem = (itemId: string) => {
    const original = items.find((i) => i.id === itemId)
    setItemsToRemove((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
    setItemQuantities((prev) => ({ ...prev, [itemId]: original?.quantity || 1 }))
  }

  const handleSave = async () => {
    if (!orderId || !order) return

    setSaving(true)
    try {
      const orderUpdate: any = {
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod || null,
        discount_amount: totals.discount,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        total_amount: totals.total,
        notes: notes.trim() || null,
        shipping_name: shippingName.trim() || null,
        shipping_address_line1: shippingAddress1.trim() || null,
        shipping_address_line2: shippingAddress2.trim() || null,
        shipping_city: shippingCity.trim() || null,
        shipping_state: shippingState.trim() || null,
        shipping_postal_code: shippingPostalCode.trim() || null,
        tracking_number: trackingNumber.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdate)
        .eq('id', orderId)

      if (orderError) throw orderError

      if (customer?.id) {
        const nameParts = customerName.trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        await supabase
          .from('customers')
          .update({
            first_name: firstName,
            last_name: lastName,
            email: customerEmail.trim() || null,
            phone: customerPhone.trim() || null,
          })
          .eq('id', customer.id)
      }

      for (const item of items) {
        if (itemsToRemove.has(item.id)) {
          await supabase.from('order_items').delete().eq('id', item.id)
        } else {
          const newQty = itemQuantities[item.id] ?? item.quantity
          const newPrice = itemPrices[item.id] ?? item.unit_price
          if (newQty !== item.quantity || newPrice !== item.unit_price) {
            const newSubtotal = newQty * newPrice
            await supabase
              .from('order_items')
              .update({ quantity: newQty, unit_price: newPrice, subtotal: newSubtotal })
              .eq('id', item.id)
          }
        }
      }

      onSave()
      onClose()
    } catch (err) {
      console.error('Failed to save order:', err)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!orderId) return
    if (!confirm(`Delete order ${order?.order_number}?\n\nThis cannot be undone.`)) return

    setSaving(true)
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
      onSave()
      onClose()
    } catch (err) {
      console.error('Failed to delete order:', err)
      alert('Failed to delete order')
    } finally {
      setSaving(false)
    }
  }

  const handleRefund = async () => {
    const amount = parseFloat(refundAmount)
    if (!amount || amount <= 0) return alert('Enter a valid refund amount')
    if (amount > (order?.total_amount || 0)) return alert('Refund cannot exceed order total')

    const isFullRefund = amount >= (order?.total_amount || 0)
    setPaymentStatus(isFullRefund ? 'refunded' : 'partially_refunded')
    setNotes((prev) => {
      const refundNote = `[REFUND] $${amount.toFixed(2)}${refundReason ? `: ${refundReason}` : ''} - ${format(new Date(), 'MMM d, yyyy h:mm a')}`
      return prev ? `${prev}\n\n${refundNote}` : refundNote
    })
    setRefundAmount('')
    setRefundReason('')
  }

  if (!isOpen) return null

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'shipping', label: 'Shipping', icon: MapPin },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'status', label: 'Status', icon: Clock },
    { id: 'danger', label: 'Delete', icon: AlertTriangle },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />

      <div className="fixed inset-0 lg:inset-6 bg-zinc-950 border border-zinc-800 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-medium text-white tracking-tight">
                {order?.order_number || 'Loading...'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {order?.created_at && format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            {hasChanges && !loading && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 uppercase tracking-wider font-medium">
                Unsaved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const isDanger = tab.id === 'danger'
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  isActive
                    ? isDanger
                      ? 'text-red-400 border-red-400'
                      : 'text-white border-white'
                    : isDanger
                    ? 'text-red-400/50 border-transparent hover:text-red-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Customer Tab */}
              {activeTab === 'customer' && (
                <div className="max-w-2xl space-y-5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="(555) 555-5555"
                          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Staff Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Internal notes..."
                      rows={4}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm resize-none"
                    />
                  </div>

                  {customer && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">ID</span>
                      <code className="text-xs text-zinc-400 font-mono">{customer.id}</code>
                      <button onClick={() => navigator.clipboard.writeText(customer.id)} className="p-1 text-zinc-600 hover:text-white">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500">Modify quantities or remove items. Totals update automatically.</p>

                  <div className="space-y-1">
                    {items.map((item) => {
                      const isRemoved = itemsToRemove.has(item.id)
                      const qty = itemQuantities[item.id] ?? item.quantity
                      const price = itemPrices[item.id] ?? item.unit_price
                      const lineTotal = qty * price

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 p-4 border ${
                            isRemoved ? 'bg-red-950/20 border-red-900/30' : 'bg-zinc-900/30 border-zinc-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isRemoved ? 'line-through text-zinc-600' : 'text-white'}`}>
                              {item.product_name}
                            </p>
                            {item.product_sku && <p className="text-[11px] text-zinc-600 mt-0.5">SKU: {item.product_sku}</p>}
                          </div>

                          {isRemoved ? (
                            <button onClick={() => handleRestoreItem(item.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700">
                              <RotateCcw className="w-3 h-3" />
                              Restore
                            </button>
                          ) : (
                            <>
                              <div className="w-24">
                                <div className="relative">
                                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                    className="w-full pl-6 pr-2 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm text-right focus:outline-none focus:border-zinc-600 tabular-nums"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center bg-zinc-800 border border-zinc-700">
                                <button onClick={() => handleQuantityChange(item.id, -1)} className="p-2 text-zinc-400 hover:text-white">
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center text-white text-sm font-medium tabular-nums">{qty}</span>
                                <button onClick={() => handleQuantityChange(item.id, 1)} className="p-2 text-zinc-400 hover:text-white">
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="w-20 text-right">
                                <p className="text-sm text-white font-medium tabular-nums">${lineTotal.toFixed(2)}</p>
                              </div>

                              <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-zinc-600 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="text-white tabular-nums">${totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Discount</span>
                        <span className="text-emerald-400 tabular-nums">-${totals.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Tax</span>
                      <span className="text-white tabular-nums">${totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-medium pt-2 border-t border-zinc-800">
                      <span className="text-white">Total</span>
                      <span className="text-white tabular-nums">${totals.total.toFixed(2)}</span>
                    </div>
                    {order && totals.total !== order.total_amount && (
                      <p className="text-[11px] text-amber-400 text-right pt-1">
                        {totals.total > order.total_amount ? '+' : ''}${(totals.total - order.total_amount).toFixed(2)} from original
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping Tab */}
              {activeTab === 'shipping' && (
                <div className="max-w-2xl space-y-5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Recipient</label>
                    <input
                      type="text"
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="Recipient name"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Address</label>
                    <input
                      type="text"
                      value={shippingAddress1}
                      onChange={(e) => setShippingAddress1(e.target.value)}
                      placeholder="Street address"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={shippingAddress2}
                      onChange={(e) => setShippingAddress2(e.target.value)}
                      placeholder="Apt, suite, etc."
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-3">
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">City</label>
                      <input
                        type="text"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">State</label>
                      <input
                        type="text"
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value.toUpperCase())}
                        maxLength={2}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm uppercase"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">ZIP</label>
                      <input
                        type="text"
                        value={shippingPostalCode}
                        onChange={(e) => setShippingPostalCode(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === 'payment' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Payment Status</label>
                    <div className="grid grid-cols-5 gap-2">
                      {PAYMENT_STATUSES.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => setPaymentStatus(status.value)}
                          className={`px-3 py-2.5 border text-xs font-medium transition-colors ${
                            paymentStatus === status.value ? status.color : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="card">Card</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Discount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="number"
                        step="0.01"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 space-y-3">
                    <h3 className="text-xs font-medium text-white flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Process Refund
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                        <input
                          type="number"
                          step="0.01"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleRefund}
                      disabled={!refundAmount}
                      className="w-full px-4 py-2 bg-orange-600 text-white text-sm font-medium hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Apply Refund
                    </button>
                  </div>
                </div>
              )}

              {/* Status Tab */}
              {activeTab === 'status' && (
                <div className="max-w-2xl space-y-5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Order Status</label>
                    <div className="space-y-1">
                      {ORDER_STATUSES.map((status) => {
                        const Icon = status.icon
                        const isActive = orderStatus === status.value
                        return (
                          <button
                            key={status.value}
                            onClick={() => setOrderStatus(status.value)}
                            className={`w-full flex items-center gap-4 p-4 border transition-colors ${
                              isActive ? 'border-white/20 bg-white/5' : 'border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className={`p-2 ${status.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                              {status.label}
                            </span>
                            {isActive && <Check className="w-4 h-4 text-white ml-auto" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {order && (
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 space-y-2">
                      <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Timeline</h3>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Created</span>
                        <span className="text-zinc-300">{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {order.updated_at && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Updated</span>
                          <span className="text-zinc-300">{format(new Date(order.updated_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Danger Tab */}
              {activeTab === 'danger' && (
                <div className="max-w-2xl space-y-5">
                  <div className="p-6 bg-red-950/30 border border-red-900/30">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-red-500/20">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-red-400">Delete Order</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          Permanently delete this order and all related data. This cannot be undone.
                        </p>
                        <button
                          onClick={handleDelete}
                          disabled={saving}
                          className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Order
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Order ID</span>
                    <code className="text-xs text-zinc-400 font-mono">{orderId}</code>
                    <button onClick={() => navigator.clipboard.writeText(orderId || '')} className="p-1 text-zinc-600 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
