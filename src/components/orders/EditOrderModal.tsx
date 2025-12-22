'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
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
  TrendingUp,
  FileText,
  ExternalLink,
  Ruler,
  Building,
  Search,
} from 'lucide-react'

interface OrderItem {
  id: string
  product_id?: string | null
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
  location_id?: string | null
  pickup_location_id?: string | null
  pickup_location_name?: string | null
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

type Tab = 'overview' | 'customer' | 'items' | 'shipping' | 'billing' | 'payment' | 'status' | 'danger'

// Shipping order statuses
const SHIPPING_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { value: 'processing', label: 'Processing', icon: Package, color: 'text-zinc-400 bg-blue-400/10 border-blue-400/20' },
  { value: 'shipped', label: 'Shipped', icon: Truck, color: 'text-zinc-400 bg-purple-400/10 border-purple-400/20' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-zinc-400 bg-emerald-400/10 border-emerald-400/20' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
]

// POS/Pickup order statuses
const POS_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { value: 'processing', label: 'Preparing', icon: Package, color: 'text-zinc-400 bg-blue-400/10 border-blue-400/20' },
  { value: 'ready', label: 'Ready for Pickup', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { value: 'completed', label: 'Picked Up', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
]

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { value: 'paid', label: 'Paid', color: 'text-zinc-400 bg-emerald-400/10 border-emerald-400/30' },
  { value: 'failed', label: 'Failed', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  { value: 'refunded', label: 'Refunded', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' },
  { value: 'partially_refunded', label: 'Partial', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
]

export function EditOrderModal({ orderId, isOpen, onClose, onSave }: EditOrderModalProps) {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [checkoutAttempt, setCheckoutAttempt] = useState<any>(null)
  const [visitorSession, setVisitorSession] = useState<any>(null)
  const [pageViews, setPageViews] = useState<any[]>([])
  const [visitorEvents, setVisitorEvents] = useState<any[]>([])
  const [orderNotes, setOrderNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [fulfillmentLocation, setFulfillmentLocation] = useState<any>(null)
  const [orderLocations, setOrderLocations] = useState<any[]>([])
  const [emailSends, setEmailSends] = useState<any[]>([])
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [emailContent, setEmailContent] = useState<string | null>(null)
  const [loadingEmail, setLoadingEmail] = useState(false)

  // Staff attribution - map of user IDs to emails
  const [staffEmails, setStaffEmails] = useState<Record<string, string>>({})

  // Helper function to display staff attribution
  const getStaffDisplay = (userId: string | null | undefined) => {
    if (!userId) return null
    const email = staffEmails[userId]
    return email || userId
  }

  // Helper to get correct statuses based on order type
  const getOrderStatuses = () => {
    const orderType = order?.order_type
    return orderType === 'shipping' ? SHIPPING_ORDER_STATUSES : POS_ORDER_STATUSES
  }

  // Helper to get status config
  const getStatusConfig = (status: string) => {
    const statuses = getOrderStatuses()
    return statuses.find(s => s.value === status)
  }

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
  const [shippingCarrier, setShippingCarrier] = useState('')
  const [shippingService, setShippingService] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [packageWeight, setPackageWeight] = useState('')
  const [packageLength, setPackageLength] = useState('')
  const [packageWidth, setPackageWidth] = useState('')
  const [packageHeight, setPackageHeight] = useState('')

  // Billing fields
  const [billingName, setBillingName] = useState('')
  const [billingAddress1, setBillingAddress1] = useState('')
  const [billingAddress2, setBillingAddress2] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')

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

            // Fetch customer's order history
            const { data: custOrders } = await supabase
              .from('orders')
              .select('id, order_number, status, total_amount, created_at')
              .eq('customer_id', customerData.id)
              .neq('id', orderId)
              .order('created_at', { ascending: false })
              .limit(10)

            setCustomerOrders(custOrders || [])
          }
        }

        // Fetch products for adding items
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, sku, price')
          .eq('vendor_id', orderData.vendor_id)
          .order('name')
          .limit(100)

        setProducts(productsData || [])

        // Fetch checkout attempt for this order (if exists)
        const { data: checkoutData } = await supabase
          .from('checkout_attempts')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle()

        setCheckoutAttempt(checkoutData)

        // Fetch order notes
        const { data: notesData } = await supabase
          .from('order_notes')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })

        setOrderNotes(notesData || [])

        // Fetch visitor analytics if we have a visitor_id or session_id
        const visitorId = orderData.visitor_id || checkoutData?.visitor_id
        const sessionId = orderData.session_id || checkoutData?.session_id

        if (visitorId || sessionId) {
          // Fetch visitor session info
          if (sessionId) {
            const { data: sessionData } = await supabase
              .from('website_visitors')
              .select('*')
              .eq('vendor_id', orderData.vendor_id)
              .eq('session_id', sessionId)
              .maybeSingle()

            setVisitorSession(sessionData)
          }

          // Fetch page views for this visitor
          if (visitorId) {
            const { data: pageViewsData } = await supabase
              .from('page_views')
              .select('*')
              .eq('vendor_id', orderData.vendor_id)
              .eq('visitor_id', visitorId)
              .order('created_at', { ascending: false })
              .limit(50)

            setPageViews(pageViewsData || [])
          }

          // Fetch analytics events for this visitor
          if (visitorId) {
            const { data: eventsData } = await supabase
              .from('analytics_events')
              .select('*')
              .eq('vendor_id', orderData.vendor_id)
              .eq('visitor_id', visitorId)
              .order('timestamp', { ascending: false })
              .limit(100)

            setVisitorEvents(eventsData || [])
          }
        }

        setShippingName(orderData.shipping_name || '')
        setShippingAddress1(orderData.shipping_address_line1 || '')
        setShippingAddress2(orderData.shipping_address_line2 || '')
        setShippingCity(orderData.shipping_city || '')
        setShippingState(orderData.shipping_state || '')
        setShippingPostalCode(orderData.shipping_zip || '')
        setTrackingNumber(orderData.tracking_number || '')
        setShippingCarrier(orderData.shipping_carrier || '')
        setShippingService(orderData.shipping_service || '')
        setTrackingUrl(orderData.tracking_url || '')
        setPackageWeight(orderData.package_weight?.toString() || '')
        setPackageLength(orderData.package_length?.toString() || '')
        setPackageWidth(orderData.package_width?.toString() || '')
        setPackageHeight(orderData.package_height?.toString() || '')

        setBillingName(orderData.billing_name || '')
        try {
          const billingAddr = orderData.billing_address && typeof orderData.billing_address === 'string'
            ? JSON.parse(orderData.billing_address)
            : orderData.billing_address
          if (billingAddr) {
            setBillingAddress1(billingAddr.line1 || '')
            setBillingAddress2(billingAddr.line2 || '')
            setBillingCity(billingAddr.city || '')
            setBillingState(billingAddr.state || '')
            setBillingPostalCode(billingAddr.postal_code || '')
          }
        } catch (e) {
          console.error('Failed to parse billing address:', e)
        }

        setPaymentStatus(orderData.payment_status || 'pending')
        setPaymentMethod(orderData.payment_method || '')
        setDiscountAmount(orderData.discount_amount?.toString() || '0')
        setOrderStatus(orderData.status || 'pending')
        setNotes(orderData.staff_notes || '')
        setItemsToRemove(new Set())

        // Fetch staff user info for attribution display
        const staffUserIds = [
          orderData.employee_id,
          orderData.created_by_user_id,
          orderData.prepared_by_user_id,
          orderData.shipped_by_user_id,
          orderData.delivered_by_user_id,
          orderData.updated_by_user_id,
        ].filter(Boolean) as string[]

        if (staffUserIds.length > 0) {
          // Fetch from users table (not auth.users)
          const { data: usersData } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .in('id', staffUserIds)

          if (usersData) {
            const emailMap: Record<string, string> = {}
            usersData.forEach((u) => {
              // Show name if available, otherwise email
              const displayName = u.first_name || u.last_name
                ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                : u.email || u.id
              emailMap[u.id] = displayName
            })
            setStaffEmails(emailMap)
          }
        }

        // Fetch fulfillment location if pickup_location_id exists
        if (orderData.pickup_location_id) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('id, name, address_line1, city, state, zip, phone')
            .eq('id', orderData.pickup_location_id)
            .single()

          setFulfillmentLocation(locationData)
        } else {
          setFulfillmentLocation(null)
        }

        // Fetch order_locations (multi-location fulfillment routing)
        const { data: orderLocationsData } = await supabase
          .from('order_locations')
          .select(`
            *,
            location:locations(id, name, address_line1, city, state, zip, phone, type)
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: true })

        setOrderLocations(orderLocationsData || [])

        // Fetch emails for this order from Resend API (search by order number in subject)
        try {
          const params = new URLSearchParams()
          if (orderData.order_number) params.set('order_number', orderData.order_number)

          const resendResponse = await fetch(`/api/emails?${params.toString()}`)
          if (resendResponse.ok) {
            const resendData = await resendResponse.json()
            console.log('Emails API response:', resendData)
            if (resendData.emails && resendData.emails.length > 0) {
              // Transform Resend API response to match our format
              const transformedEmails = resendData.emails.map((email: any) => ({
                id: email.id,
                email_type: email.tags?.find((t: any) => t.name === 'category')?.value ||
                            (email.subject?.toLowerCase().includes('confirm') ? 'order_confirmation' :
                             email.subject?.toLowerCase().includes('receipt') ? 'receipt' :
                             email.subject?.toLowerCase().includes('shipped') ? 'order_shipped' : 'email'),
                subject: email.subject,
                to_email: Array.isArray(email.to) ? email.to[0] : email.to,
                status: email.last_event || 'sent',
                sent_at: email.created_at,
                created_at: email.created_at,
                delivered_at: email.last_event === 'delivered' ? email.created_at : null,
                opened_at: email.last_event === 'opened' ? email.created_at : null,
                clicked_at: email.last_event === 'clicked' ? email.created_at : null,
                resend_email_id: email.id,
              }))
              setEmailSends(transformedEmails)
            } else {
              setEmailSends([])
            }
          } else {
            setEmailSends([])
          }
        } catch (e) {
          console.error('Failed to fetch emails:', e)
          setEmailSends([])
        }

        setHasChanges(false)
        setActiveTab('overview')
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
  }, [customerName, customerEmail, customerPhone, shippingName, shippingAddress1, shippingAddress2, shippingCity, shippingState, shippingPostalCode, trackingNumber, shippingCarrier, shippingService, trackingUrl, packageWeight, packageLength, packageWidth, packageHeight, billingName, billingAddress1, billingAddress2, billingCity, billingState, billingPostalCode, paymentStatus, paymentMethod, discountAmount, orderStatus, notes, itemQuantities, itemPrices, itemsToRemove])

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
      const billingAddress = {
        name: billingName.trim() || null,
        line1: billingAddress1.trim() || null,
        line2: billingAddress2.trim() || null,
        city: billingCity.trim() || null,
        state: billingState.trim() || null,
        postal_code: billingPostalCode.trim() || null,
      }

      const orderUpdate: any = {
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod || null,
        discount_amount: totals.discount,
        subtotal: totals.subtotal,
        tax_amount: totals.tax,
        total_amount: totals.total,
        staff_notes: notes.trim() || null,
        shipping_name: shippingName.trim() || null,
        shipping_address_line1: shippingAddress1.trim() || null,
        shipping_address_line2: shippingAddress2.trim() || null,
        shipping_city: shippingCity.trim() || null,
        shipping_state: shippingState.trim() || null,
        shipping_zip: shippingPostalCode.trim() || null,
        tracking_number: trackingNumber.trim() || null,
        shipping_carrier: shippingCarrier.trim() || null,
        shipping_service: shippingService.trim() || null,
        tracking_url: trackingUrl.trim() || null,
        package_weight: packageWeight ? parseFloat(packageWeight) : null,
        package_length: packageLength ? parseFloat(packageLength) : null,
        package_width: packageWidth ? parseFloat(packageWidth) : null,
        package_height: packageHeight ? parseFloat(packageHeight) : null,
        billing_address: billingAddress.line1 ? JSON.stringify(billingAddress) : null,
        updated_at: new Date().toISOString(),
        // Track who made this update - triggers will use this to set staff attribution
        updated_by_user_id: user?.id || null,
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
          // Only delete if it's not a temporary item
          if (!item.id.startsWith('temp-')) {
            await supabase.from('order_items').delete().eq('id', item.id)
          }
        } else {
          const newQty = itemQuantities[item.id] ?? item.quantity
          const newPrice = itemPrices[item.id] ?? item.unit_price
          const newSubtotal = newQty * newPrice

          if (item.id.startsWith('temp-')) {
            // Insert new item
            await supabase
              .from('order_items')
              .insert({
                order_id: orderId,
                product_id: item.product_id,
                product_name: item.product_name,
                product_sku: item.product_sku,
                quantity: newQty,
                unit_price: newPrice,
                subtotal: newSubtotal,
              })
          } else if (newQty !== item.quantity || newPrice !== item.unit_price) {
            // Update existing item
            await supabase
              .from('order_items')
              .update({ quantity: newQty, unit_price: newPrice, subtotal: newSubtotal })
              .eq('id', item.id)
          }
        }
      }

      onSave()
      onClose()
    } catch (err: any) {
      console.error('Failed to save order:', err)
      const errorMessage = err?.message || err?.toString() || 'Unknown error'
      alert(`Failed to save changes: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const handleViewEmail = async (email: any) => {
    setSelectedEmail(email)
    setEmailContent(null)
    setLoadingEmail(true)

    try {
      // If we have a resend_email_id, fetch the full content
      const emailId = email.resend_email_id || email.id
      console.log('Fetching email content for:', emailId, email)
      if (emailId) {
        const response = await fetch(`/api/emails/${emailId}`)
        const data = await response.json()
        console.log('Email API response:', data)
        if (data.email) {
          setEmailContent(data.email.html || data.email.text || null)
        } else if (data.error) {
          console.error('Email fetch error:', data.details || data.error)
        }
      }
    } catch (e) {
      console.error('Failed to fetch email content:', e)
    } finally {
      setLoadingEmail(false)
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

  const handleAddNote = async () => {
    if (!newNote.trim() || !orderId) return

    setAddingNote(true)
    try {
      const { data, error } = await supabase
        .from('order_notes')
        .insert({
          order_id: orderId,
          note: newNote.trim(),
          note_type: 'internal',
          is_customer_visible: false,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      setOrderNotes(prev => [data, ...prev])
      setNewNote('')
    } catch (err) {
      console.error('Failed to add note:', err)
      alert('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  // Helper to get event icon and color
  const getEventStyle = (eventName: string) => {
    const styles: Record<string, { color: string; label: string }> = {
      'page_view': { color: 'text-zinc-400', label: 'Viewed Page' },
      'view_product': { color: 'text-blue-400', label: 'Viewed Product' },
      'add_to_cart': { color: 'text-emerald-400', label: 'Added to Cart' },
      'remove_from_cart': { color: 'text-amber-400', label: 'Removed from Cart' },
      'begin_checkout': { color: 'text-purple-400', label: 'Started Checkout' },
      'checkout_started': { color: 'text-purple-400', label: 'Checkout Started' },
      'checkout_submission_attempt': { color: 'text-orange-400', label: 'Submitted Checkout' },
      'checkout_success': { color: 'text-emerald-400', label: 'Checkout Success' },
      'checkout_validation_error': { color: 'text-red-400', label: 'Validation Error' },
      'checkout_api_error': { color: 'text-red-400', label: 'Checkout Error' },
      'purchase': { color: 'text-emerald-400', label: 'Purchase' },
      'search': { color: 'text-cyan-400', label: 'Search' },
      'scroll_depth': { color: 'text-zinc-500', label: 'Scrolled' },
      'time_on_page': { color: 'text-zinc-500', label: 'Time on Page' },
    }
    return styles[eventName] || { color: 'text-zinc-400', label: eventName }
  }

  if (!isOpen) return null

  // Determine if this is a shipping order (vs pickup/in-store)
  const isShippingOrder = order?.order_type === 'shipping'

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'items', label: 'Items', icon: Package },
    // Only show shipping/billing for shipping orders
    ...(isShippingOrder ? [
      { id: 'shipping' as Tab, label: 'Shipping', icon: MapPin },
      { id: 'billing' as Tab, label: 'Billing', icon: Building },
    ] : []),
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'status', label: 'Status', icon: Clock },
    { id: 'danger', label: 'Delete', icon: AlertTriangle },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />

      <div className="fixed inset-4 md:inset-8 lg:inset-12 bg-zinc-950 border border-zinc-800 z-50 flex flex-col overflow-hidden shadow-2xl rounded-lg">
        {/* Header - sticky at top */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
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

        {/* Tabs - sticky below header */}
        <div className="flex-shrink-0 flex border-b border-zinc-800 bg-zinc-950/50 overflow-x-auto">
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

        {/* Content - scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Subtotal</p>
                      <p className="text-xl font-bold text-white tabular-nums">${order?.subtotal?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Tax</p>
                      <p className="text-xl font-bold text-white tabular-nums">${order?.tax_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                    {order?.discount_amount > 0 && (
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Discount</p>
                        <p className="text-xl font-bold text-white tabular-nums">-${order?.discount_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                    )}
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Total</p>
                      <p className="text-xl font-bold text-white tabular-nums">${order?.total_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                    {order?.cost_of_goods != null && (
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Profit</p>
                        <p className="text-xl font-bold text-white tabular-nums">${order?.gross_profit?.toFixed(2) || '0.00'}</p>
                        {order?.margin_percentage != null && (
                          <p className="text-xs text-zinc-400 mt-1 font-semibold">{order.margin_percentage.toFixed(1)}% margin</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Two Column Layout */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Order Details */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                          <FileText className="w-4 h-4" />
                          Order Details
                        </h3>
                        <div className="p-5 bg-zinc-900/50 border border-zinc-800 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Order Number</span>
                            <code className="text-white font-mono font-semibold">{order?.order_number}</code>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Type</span>
                            <span className="text-white capitalize font-medium">{(order?.order_type || '').replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-zinc-400">Status</span>
                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getStatusConfig(order?.status)?.color || ''}`}>
                              {getStatusConfig(order?.status)?.label || order?.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-zinc-400">Payment</span>
                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${PAYMENT_STATUSES.find(s => s.value === order?.payment_status)?.color || ''}`}>
                              {order?.payment_status}
                            </span>
                          </div>
                          {order?.payment_method && (
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-400">Payment Method</span>
                              <span className="text-white capitalize font-medium">{order.payment_method.replace('_', ' ')}</span>
                            </div>
                          )}
                          {order?.card_last_four && (
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-400">Card</span>
                              <span className="text-white font-mono">•••• {order.card_last_four}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fulfillment Summary - Quick overview, click Items tab for full details */}
                      {orderLocations.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                            <MapPin className="w-4 h-4" />
                            Fulfillment ({orderLocations.length} location{orderLocations.length !== 1 ? 's' : ''})
                          </h3>
                          <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                            <div className="space-y-3">
                              {orderLocations.map((ol) => {
                                // Use location's own status - don't inherit from order level
                                // Each location tracks its own fulfillment independently
                                const locationStatus = ol.fulfillment_status || 'pending'
                                const locationTracking = ol.tracking_number
                                const locationTrackingUrl = ol.tracking_url

                                return (
                                  <div key={ol.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        locationStatus === 'fulfilled' || locationStatus === 'shipped' || locationStatus === 'delivered' || locationStatus === 'completed' ? 'bg-emerald-400' :
                                        locationStatus === 'unfulfilled' || locationStatus === 'pending' ? 'bg-amber-400' :
                                        locationStatus === 'processing' ? 'bg-blue-400' :
                                        'bg-zinc-400'
                                      }`} />
                                      <span className="text-white text-sm font-medium">{ol.location?.name || 'Unknown'}</span>
                                      {ol.item_count && (
                                        <span className="text-xs text-zinc-500">({ol.item_count} item{ol.item_count !== 1 ? 's' : ''})</span>
                                      )}
                                      {locationTracking && (
                                        <span className="text-xs text-zinc-500 font-mono">
                                          {locationTrackingUrl ? (
                                            <a href={locationTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                              {locationTracking}
                                            </a>
                                          ) : locationTracking}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 font-bold uppercase tracking-wide ${
                                      locationStatus === 'fulfilled' || locationStatus === 'shipped' || locationStatus === 'delivered' || locationStatus === 'completed' ? 'text-emerald-400 bg-emerald-400/10' :
                                      locationStatus === 'unfulfilled' || locationStatus === 'pending' ? 'text-amber-400 bg-amber-400/10' :
                                      locationStatus === 'processing' ? 'text-blue-400 bg-blue-400/10' :
                                      'text-zinc-400 bg-zinc-400/10'
                                    }`}>
                                      {locationStatus}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            <p className="text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800">
                              View Items tab for full fulfillment details and tracking
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Simple Fulfillment Info (fallback if no order_locations) */}
                      {orderLocations.length === 0 && (fulfillmentLocation || order?.prepared_at || order?.prepared_by_user_id || order?.delivered_by_user_id) && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                            <Package className="w-4 h-4" />
                            Fulfillment
                          </h3>
                          <div className="p-5 bg-zinc-900/50 border border-zinc-800 space-y-3">
                            {fulfillmentLocation && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-400">Routed To</span>
                                  <span className="text-white font-semibold">{fulfillmentLocation.name}</span>
                                </div>
                                {(fulfillmentLocation.address_line1 || fulfillmentLocation.city) && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Address</span>
                                    <span className="text-white text-right">
                                      {fulfillmentLocation.address_line1 && <span>{fulfillmentLocation.address_line1}<br /></span>}
                                      {fulfillmentLocation.city}, {fulfillmentLocation.state} {fulfillmentLocation.zip}
                                    </span>
                                  </div>
                                )}
                                {fulfillmentLocation.phone && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Phone</span>
                                    <span className="text-white">{fulfillmentLocation.phone}</span>
                                  </div>
                                )}
                                {(order?.prepared_at || order?.ready_at || order?.picked_up_at || order?.completed_at) && (
                                  <div className="border-t border-zinc-800 pt-3 mt-3" />
                                )}
                              </>
                            )}
                            {order?.prepared_at && (
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Prepared At</span>
                                <span className="text-white font-medium">{format(new Date(order.prepared_at), 'MMM d, h:mm a')}</span>
                              </div>
                            )}
                            {order?.ready_at && (
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Ready At</span>
                                <span className="text-white font-medium">{format(new Date(order.ready_at), 'MMM d, h:mm a')}</span>
                              </div>
                            )}
                            {order?.picked_up_at && (
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Picked Up</span>
                                <span className="text-white font-medium">{format(new Date(order.picked_up_at), 'MMM d, h:mm a')}</span>
                              </div>
                            )}
                            {order?.completed_at && (
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Completed</span>
                                <span className="text-white font-medium">{format(new Date(order.completed_at), 'MMM d, h:mm a')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shipping/Tracking */}
                      {(order?.tracking_number || order?.shipping_carrier) && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                            <Truck className="w-4 h-4" />
                            Shipping & Tracking
                          </h3>
                          <div className="p-5 bg-zinc-900/50 border border-zinc-800 space-y-3">
                            {order.shipping_carrier && (
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Carrier</span>
                                <span className="text-white font-medium uppercase">{order.shipping_carrier}</span>
                              </div>
                            )}
                            {order.shipping_service && (
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Service</span>
                                <span className="text-white font-medium">{order.shipping_service}</span>
                              </div>
                            )}
                            {order.tracking_number && (
                              <div className="flex justify-between text-sm items-center">
                                <span className="text-zinc-400">Tracking</span>
                                <code className="text-white font-mono text-xs bg-zinc-800/50 px-2 py-1">{order.tracking_number}</code>
                              </div>
                            )}
                            {order.tracking_url && (
                              <div className="pt-2 border-t border-zinc-800/50">
                                <a
                                  href={order.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Track Shipment
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Customer */}
                      {customer && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                            <User className="w-4 h-4" />
                            Customer
                          </h3>
                          <div className="p-5 bg-zinc-900/50 border border-zinc-800 space-y-4">
                            <div>
                              <p className="text-base text-white font-semibold">{customerName || 'Guest'}</p>
                              {customerEmail && (
                                <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3" />
                                  {customerEmail}
                                </p>
                              )}
                              {customerPhone && (
                                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                                  <Phone className="w-3 h-3" />
                                  {customerPhone}
                                </p>
                              )}
                            </div>
                            {customerOrders.length > 0 && (
                              <div className="pt-3 border-t border-zinc-800">
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Previous Orders</p>
                                <div className="space-y-1.5">
                                  {customerOrders.slice(0, 3).map((co: any) => (
                                    <div key={co.id} className="flex justify-between text-xs">
                                      <span className="text-zinc-400 font-mono">{co.order_number}</span>
                                      <span className="text-white font-semibold tabular-nums">${co.total_amount?.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-2 font-medium">{customerOrders.length} lifetime orders</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Checkout Analytics - Full Width - Only for e-commerce orders */}
                  {(checkoutAttempt || order?.visitor_id) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                        <TrendingUp className="w-4 h-4" />
                        Checkout Analytics
                      </h3>
                      <div className="bg-zinc-900/30 border border-zinc-800 overflow-hidden">
                        {/* Summary Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-zinc-800">
                          <div className="p-4 bg-zinc-900/80">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              checkoutAttempt?.status === 'completed' ? 'text-emerald-400 bg-emerald-400/10' :
                              checkoutAttempt?.status === 'error' ? 'text-red-400 bg-red-400/10' :
                              checkoutAttempt?.status === 'declined' ? 'text-amber-400 bg-amber-400/10' :
                              checkoutAttempt?.status === 'held_for_review' ? 'text-orange-400 bg-orange-400/10' :
                              'text-zinc-400 bg-zinc-400/10'
                            }`}>
                              {checkoutAttempt?.status || 'N/A'}
                            </span>
                          </div>
                          <div className="p-4 bg-zinc-900/80">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Payment Method</p>
                            <p className="text-sm text-white capitalize font-medium">{checkoutAttempt?.payment_method?.replace('_', ' ') || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/80">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Processor</p>
                            <p className="text-sm text-white capitalize font-medium">{checkoutAttempt?.payment_processor || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/80">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Source</p>
                            <p className="text-sm text-white capitalize font-medium">{checkoutAttempt?.source || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/80">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Processing Time</p>
                            <p className="text-sm text-white font-medium">
                              {checkoutAttempt?.created_at && checkoutAttempt?.processed_at
                                ? `${((new Date(checkoutAttempt.processed_at).getTime() - new Date(checkoutAttempt.created_at).getTime()) / 1000).toFixed(1)}s`
                                : checkoutAttempt?.created_at ? 'Pending' : 'N/A'}
                            </p>
                          </div>
                          <div className="p-4 bg-zinc-900/80">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total</p>
                            <p className="text-sm text-white font-bold tabular-nums">${checkoutAttempt?.total_amount?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>

                        {/* Amount Breakdown */}
                        {checkoutAttempt && (
                          <div className="grid grid-cols-4 gap-px bg-zinc-800 border-t border-zinc-800">
                            <div className="p-3 bg-zinc-900/60">
                              <p className="text-[10px] text-zinc-500 uppercase">Subtotal</p>
                              <p className="text-sm text-white tabular-nums">${checkoutAttempt.subtotal?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/60">
                              <p className="text-[10px] text-zinc-500 uppercase">Tax</p>
                              <p className="text-sm text-white tabular-nums">${checkoutAttempt.tax_amount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/60">
                              <p className="text-[10px] text-zinc-500 uppercase">Shipping</p>
                              <p className="text-sm text-white tabular-nums">${checkoutAttempt.shipping_cost?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/60">
                              <p className="text-[10px] text-zinc-500 uppercase">Discount</p>
                              <p className="text-sm text-emerald-400 tabular-nums">-${checkoutAttempt.discount_amount?.toFixed(2) || '0.00'}</p>
                            </div>
                          </div>
                        )}

                        {/* Details Section */}
                        <div className="p-5 space-y-4">
                          {/* Error Message - Full Width - Show First if exists */}
                          {checkoutAttempt?.processor_error_message && (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Payment Error</p>
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                                <p className="text-sm text-red-400 font-mono">{checkoutAttempt.processor_error_message}</p>
                              </div>
                            </div>
                          )}

                          {/* Customer & Device Info */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Customer from Checkout */}
                            {checkoutAttempt && (checkoutAttempt.customer_email || checkoutAttempt.customer_name || checkoutAttempt.customer_phone) && (
                              <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Checkout Customer</p>
                                <div className="space-y-1.5">
                                  {checkoutAttempt.customer_name && (
                                    <p className="text-sm text-white">{checkoutAttempt.customer_name}</p>
                                  )}
                                  {checkoutAttempt.customer_email && (
                                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                      <Mail className="w-3 h-3" />
                                      {checkoutAttempt.customer_email}
                                    </p>
                                  )}
                                  {checkoutAttempt.customer_phone && (
                                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                      <Phone className="w-3 h-3" />
                                      {checkoutAttempt.customer_phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Session Tracking */}
                            <div>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Session Tracking</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-500 w-16">Visitor</span>
                                  <code className="text-[11px] text-white font-mono bg-zinc-800/50 px-1.5 py-0.5 truncate max-w-[180px]">{order?.visitor_id || checkoutAttempt?.visitor_id || 'Not tracked'}</code>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-500 w-16">Session</span>
                                  <code className="text-[11px] text-white font-mono bg-zinc-800/50 px-1.5 py-0.5 truncate max-w-[180px]">{order?.session_id || checkoutAttempt?.session_id || 'Not tracked'}</code>
                                </div>
                              </div>
                            </div>

                            {/* Device/IP Info */}
                            {checkoutAttempt && (checkoutAttempt.ip_address || checkoutAttempt.user_agent) && (
                              <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Device Info</p>
                                <div className="space-y-1.5">
                                  {checkoutAttempt.ip_address && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-zinc-500 w-16">IP</span>
                                      <code className="text-[11px] text-white font-mono bg-zinc-800/50 px-1.5 py-0.5">{checkoutAttempt.ip_address}</code>
                                    </div>
                                  )}
                                  {checkoutAttempt.user_agent && (
                                    <div>
                                      <span className="text-xs text-zinc-500">Browser/Device</span>
                                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{checkoutAttempt.user_agent}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Transaction Details */}
                          {checkoutAttempt && (checkoutAttempt.processor_transaction_id || checkoutAttempt.processor_auth_code || checkoutAttempt.processor_response_code) && (
                            <div className="pt-4 border-t border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Transaction Details</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {checkoutAttempt.processor_transaction_id && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">Trans ID:</span>
                                    <code className="text-xs text-white font-mono bg-zinc-800/50 px-2 py-1">{checkoutAttempt.processor_transaction_id}</code>
                                  </div>
                                )}
                                {checkoutAttempt.processor_auth_code && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">Auth Code:</span>
                                    <code className="text-xs text-white font-mono bg-zinc-800/50 px-2 py-1">{checkoutAttempt.processor_auth_code}</code>
                                  </div>
                                )}
                                {checkoutAttempt.processor_response_code && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">Response:</span>
                                    <code className="text-xs text-white font-mono bg-zinc-800/50 px-2 py-1">{checkoutAttempt.processor_response_code}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="pt-4 border-t border-zinc-800">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Timeline</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <span className="text-xs text-zinc-500">Created</span>
                                <p className="text-sm text-white">{checkoutAttempt?.created_at ? format(new Date(checkoutAttempt.created_at), 'MMM d, h:mm:ss a') : 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-zinc-500">Processed</span>
                                <p className="text-sm text-white">{checkoutAttempt?.processed_at ? format(new Date(checkoutAttempt.processed_at), 'MMM d, h:mm:ss a') : 'Pending'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-zinc-500">Updated</span>
                                <p className="text-sm text-white">{checkoutAttempt?.updated_at ? format(new Date(checkoutAttempt.updated_at), 'MMM d, h:mm:ss a') : 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-zinc-500">Order #</span>
                                <p className="text-sm text-white font-mono">{checkoutAttempt?.order_number || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Addresses - Side by Side */}
                          {checkoutAttempt && (
                            (checkoutAttempt.shipping_address && Object.keys(checkoutAttempt.shipping_address).length > 0) ||
                            (checkoutAttempt.billing_address && Object.keys(checkoutAttempt.billing_address).length > 0)
                          ) && (
                            <div className="pt-4 border-t border-zinc-800">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Shipping Address */}
                                {checkoutAttempt.shipping_address && Object.keys(checkoutAttempt.shipping_address).length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Shipping Address</p>
                                    <div className="p-3 bg-zinc-800/30 rounded space-y-1">
                                      <p className="text-sm text-white">{checkoutAttempt.shipping_address.name || '-'}</p>
                                      <p className="text-sm text-zinc-400">{checkoutAttempt.shipping_address.address || '-'}</p>
                                      {checkoutAttempt.shipping_address.address2 && (
                                        <p className="text-sm text-zinc-400">{checkoutAttempt.shipping_address.address2}</p>
                                      )}
                                      <p className="text-sm text-zinc-400">
                                        {checkoutAttempt.shipping_address.city || '-'}, {checkoutAttempt.shipping_address.state || '-'} {checkoutAttempt.shipping_address.zip || '-'}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Billing Address */}
                                {checkoutAttempt.billing_address && Object.keys(checkoutAttempt.billing_address).length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Billing Address</p>
                                    <div className="p-3 bg-zinc-800/30 rounded space-y-1">
                                      <p className="text-sm text-white">{checkoutAttempt.billing_address.name || '-'}</p>
                                      <p className="text-sm text-zinc-400">{checkoutAttempt.billing_address.address || '-'}</p>
                                      {checkoutAttempt.billing_address.address2 && (
                                        <p className="text-sm text-zinc-400">{checkoutAttempt.billing_address.address2}</p>
                                      )}
                                      <p className="text-sm text-zinc-400">
                                        {checkoutAttempt.billing_address.city || '-'}, {checkoutAttempt.billing_address.state || '-'} {checkoutAttempt.billing_address.zip || '-'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Cart Items from Checkout */}
                          {checkoutAttempt?.items && checkoutAttempt.items.length > 0 && (
                            <div className="pt-4 border-t border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Checkout Cart ({checkoutAttempt.items.length} items)</p>
                              <div className="bg-zinc-800/30 rounded overflow-hidden">
                                <div className="divide-y divide-zinc-800/50">
                                  {checkoutAttempt.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm p-3">
                                      <div className="flex-1">
                                        <span className="text-white">{item.productName || item.product_name || 'Unknown Item'}</span>
                                        {item.sku && <span className="text-xs text-zinc-500 ml-2">SKU: {item.sku}</span>}
                                      </div>
                                      <div className="text-right">
                                        <span className="text-zinc-400 tabular-nums">{item.quantity} × ${(item.unitPrice || item.unit_price || 0).toFixed(2)}</span>
                                        <span className="text-white font-medium ml-4 tabular-nums">${((item.quantity || 1) * (item.unitPrice || item.unit_price || 0)).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Staff Review Section */}
                          {checkoutAttempt && (checkoutAttempt.staff_reviewed || checkoutAttempt.staff_notes) && (
                            <div className="pt-4 border-t border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Staff Review</p>
                              <div className="p-3 bg-zinc-800/30 rounded space-y-2">
                                <div className="flex items-center gap-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    checkoutAttempt.staff_reviewed ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'
                                  }`}>
                                    {checkoutAttempt.staff_reviewed ? '✓ Reviewed' : 'Pending Review'}
                                  </span>
                                  {checkoutAttempt.staff_reviewed_at && (
                                    <span className="text-xs text-zinc-500">
                                      {format(new Date(checkoutAttempt.staff_reviewed_at), 'MMM d, h:mm a')}
                                    </span>
                                  )}
                                </div>
                                {checkoutAttempt.staff_notes && (
                                  <p className="text-sm text-zinc-400">{checkoutAttempt.staff_notes}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visitor Journey - Full Width */}
                  {(visitorSession || visitorEvents.length > 0 || pageViews.length > 0) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                        <User className="w-4 h-4" />
                        Visitor Journey
                      </h3>
                      <div className="bg-zinc-900/30 border border-zinc-800 overflow-hidden">
                        {/* Visitor Session Summary */}
                        {visitorSession && (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-zinc-800">
                            <div className="p-3 bg-zinc-900/80">
                              <p className="text-[10px] text-zinc-500 uppercase">Device</p>
                              <p className="text-sm text-white capitalize">{visitorSession.device_type || 'Unknown'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/80">
                              <p className="text-[10px] text-zinc-500 uppercase">Browser</p>
                              <p className="text-sm text-white">{visitorSession.browser || 'Unknown'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/80">
                              <p className="text-[10px] text-zinc-500 uppercase">OS</p>
                              <p className="text-sm text-white">{visitorSession.os || 'Unknown'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/80">
                              <p className="text-[10px] text-zinc-500 uppercase">Location</p>
                              <p className="text-sm text-white">{visitorSession.city || 'Unknown'}{visitorSession.region ? `, ${visitorSession.region}` : ''}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/80">
                              <p className="text-[10px] text-zinc-500 uppercase">Source</p>
                              <p className="text-sm text-white">{visitorSession.utm_source || visitorSession.channel || 'Direct'}</p>
                            </div>
                            <div className="p-3 bg-zinc-900/80">
                              <p className="text-[10px] text-zinc-500 uppercase">Returning</p>
                              <p className="text-sm text-white">{visitorSession.is_returning ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        )}

                        {/* UTM & Referrer */}
                        {visitorSession && (visitorSession.utm_campaign || visitorSession.referrer) && (
                          <div className="p-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visitorSession.utm_campaign && (
                              <div>
                                <p className="text-[10px] text-zinc-500 uppercase mb-1">Campaign</p>
                                <p className="text-sm text-white">{visitorSession.utm_campaign}</p>
                                {visitorSession.utm_medium && <p className="text-xs text-zinc-500">Medium: {visitorSession.utm_medium}</p>}
                                {visitorSession.utm_content && <p className="text-xs text-zinc-500">Content: {visitorSession.utm_content}</p>}
                              </div>
                            )}
                            {visitorSession.referrer && (
                              <div>
                                <p className="text-[10px] text-zinc-500 uppercase mb-1">Referrer</p>
                                <p className="text-sm text-white truncate">{visitorSession.referrer}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Activity Timeline */}
                        <div className="p-4 border-t border-zinc-800">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Activity Timeline</p>
                          <div className="space-y-1 max-h-[400px] overflow-y-auto">
                            {/* Combine and sort page views and events */}
                            {[
                              ...pageViews.map(pv => ({
                                type: 'page_view' as const,
                                timestamp: pv.created_at,
                                data: pv
                              })),
                              ...visitorEvents.map(ev => ({
                                type: 'event' as const,
                                timestamp: ev.timestamp,
                                data: ev
                              }))
                            ]
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .slice(0, 50)
                              .map((item, idx) => {
                                if (item.type === 'page_view') {
                                  const pv = item.data
                                  // Extract page name from URL
                                  const url = new URL(pv.page_url || 'https://example.com')
                                  const pageName = url.pathname === '/' ? 'Home' : url.pathname.split('/').filter(Boolean).join(' / ')
                                  return (
                                    <div key={`pv-${idx}`} className="flex items-center gap-3 py-2 border-b border-zinc-800/30 last:border-0">
                                      <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm text-zinc-400">Viewed</span>
                                        <span className="text-sm text-white ml-1 font-medium">{pageName}</span>
                                        {pv.time_on_page && <span className="text-xs text-zinc-500 ml-2">({pv.time_on_page}s)</span>}
                                      </div>
                                      <span className="text-xs text-zinc-600 whitespace-nowrap">{format(new Date(pv.created_at), 'h:mm:ss a')}</span>
                                    </div>
                                  )
                                } else {
                                  const ev = item.data
                                  const style = getEventStyle(ev.event_name)
                                  const props = ev.event_properties || {}
                                  return (
                                    <div key={`ev-${idx}`} className="flex items-center gap-3 py-2 border-b border-zinc-800/30 last:border-0">
                                      <div className={`w-2 h-2 rounded-full ${style.color.replace('text-', 'bg-')}`}></div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm font-medium ${style.color}`}>{style.label}</span>
                                        {props.productName && <span className="text-sm text-white ml-1">{props.productName}</span>}
                                        {props.query && <span className="text-sm text-white ml-1">"{props.query}"</span>}
                                        {ev.revenue && <span className="text-sm text-emerald-400 ml-2">${ev.revenue}</span>}
                                        {props.quantity && <span className="text-xs text-zinc-500 ml-2">qty: {props.quantity}</span>}
                                      </div>
                                      <span className="text-xs text-zinc-600 whitespace-nowrap">{format(new Date(ev.timestamp), 'h:mm:ss a')}</span>
                                    </div>
                                  )
                                }
                              })}
                            {pageViews.length === 0 && visitorEvents.length === 0 && (
                              <p className="text-sm text-zinc-500 py-4 text-center">No activity data available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Notes */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <FileText className="w-4 h-4" />
                      Internal Notes ({orderNotes.length})
                    </h3>
                    <div className="bg-zinc-900/30 border border-zinc-800 overflow-hidden">
                      {/* Add Note Input */}
                      <div className="p-4 border-b border-zinc-800">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            placeholder="Add a note..."
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                          />
                          <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || addingNote}
                            className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {addingNote ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>

                      {/* Notes List */}
                      <div className="divide-y divide-zinc-800/50 max-h-[300px] overflow-y-auto">
                        {orderNotes.length === 0 ? (
                          <div className="p-4 text-center text-sm text-zinc-500">No notes yet</div>
                        ) : (
                          orderNotes.map((note) => (
                            <div key={note.id} className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-sm text-white flex-1">{note.note}</p>
                                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                  note.note_type === 'system' ? 'text-blue-400 bg-blue-400/10' :
                                  note.note_type === 'customer' ? 'text-amber-400 bg-amber-400/10' :
                                  'text-zinc-400 bg-zinc-400/10'
                                }`}>
                                  {note.note_type}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 mt-2">
                                {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items Summary - Links to Items Tab */}
                  <button
                    onClick={() => setActiveTab('items')}
                    className="w-full p-4 bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                        <div>
                          <p className="text-sm font-semibold text-white uppercase tracking-wide">
                            {items.length} Item{items.length !== 1 ? 's' : ''} · {orderLocations.length} Fulfillment Location{orderLocations.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            View items grouped by location with tracking info →
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white tabular-nums">${items.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Subtotal</p>
                      </div>
                    </div>
                  </button>

                  {/* Quick Status Summary */}
                  <div className="p-5 bg-zinc-900/30 border border-zinc-800">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Order Status</p>
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getStatusConfig(order?.status)?.color || ''}`}>
                          {getStatusConfig(order?.status)?.label || order?.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Payment</p>
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${PAYMENT_STATUSES.find(s => s.value === order?.payment_status)?.color || ''}`}>
                          {order?.payment_status}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Type</p>
                        <p className="text-sm text-white font-semibold capitalize">{(order?.order_type || '').replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Created</p>
                        <p className="text-sm text-white font-semibold">{order?.created_at && format(new Date(order.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Staff Attribution */}
                  {(order?.employee_id || order?.created_by_user_id || order?.prepared_by_user_id || order?.shipped_by_user_id || order?.delivered_by_user_id) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                        <User className="w-4 h-4" />
                        Staff Attribution
                      </h3>
                      <div className="p-5 bg-zinc-900/50 border border-zinc-800 space-y-3">
                        {order.employee_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Assigned Employee</span>
                            <code className="text-white font-mono text-xs bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.employee_id)}</code>
                          </div>
                        )}
                        {order.created_by_user_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Created By</span>
                            <code className="text-white font-mono text-xs bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.created_by_user_id)}</code>
                          </div>
                        )}
                        {order.prepared_by_user_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Prepared By</span>
                            <code className="text-white font-mono text-xs bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.prepared_by_user_id)}</code>
                          </div>
                        )}
                        {isShippingOrder && order.shipped_by_user_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Shipped By</span>
                            <code className="text-white font-mono text-xs bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.shipped_by_user_id)}</code>
                          </div>
                        )}
                        {isShippingOrder && order.delivered_by_user_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Delivered By</span>
                            <code className="text-white font-mono text-xs bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.delivered_by_user_id)}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Emails Sent */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <Mail className="w-4 h-4" />
                      Emails Sent ({emailSends.length})
                    </h3>
                    <div className="bg-zinc-900/30 border border-zinc-800 overflow-hidden">
                      {emailSends.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-500">No emails sent for this order</div>
                      ) : (
                        <div className="divide-y divide-zinc-800/50">
                          {emailSends.map((email) => (
                            <div
                              key={email.id}
                              className="p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                              onClick={() => handleViewEmail(email)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                      email.email_type === 'receipt' ? 'text-emerald-400 bg-emerald-400/10' :
                                      email.email_type === 'order_confirmation' ? 'text-blue-400 bg-blue-400/10' :
                                      email.email_type === 'order_shipped' ? 'text-purple-400 bg-purple-400/10' :
                                      email.email_type === 'order_ready' ? 'text-amber-400 bg-amber-400/10' :
                                      'text-zinc-400 bg-zinc-400/10'
                                    }`}>
                                      {email.email_type?.replace(/_/g, ' ') || 'Email'}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                      email.status === 'delivered' ? 'text-emerald-400 bg-emerald-400/10' :
                                      email.status === 'sent' ? 'text-blue-400 bg-blue-400/10' :
                                      email.status === 'opened' ? 'text-purple-400 bg-purple-400/10' :
                                      email.status === 'clicked' ? 'text-cyan-400 bg-cyan-400/10' :
                                      email.status === 'bounced' ? 'text-red-400 bg-red-400/10' :
                                      email.status === 'failed' ? 'text-red-400 bg-red-400/10' :
                                      'text-zinc-400 bg-zinc-400/10'
                                    }`}>
                                      {email.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-white font-medium truncate">{email.subject}</p>
                                  <p className="text-xs text-zinc-500 mt-1">To: {email.to_email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right text-xs text-zinc-500 whitespace-nowrap">
                                    {email.sent_at ? format(new Date(email.sent_at), 'MMM d, h:mm a') :
                                     email.created_at ? format(new Date(email.created_at), 'MMM d, h:mm a') : '-'}
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-zinc-600" />
                                </div>
                              </div>
                              {/* Email engagement timeline */}
                              <div className="flex items-center gap-4 mt-3 text-xs">
                                {email.delivered_at && (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Delivered {format(new Date(email.delivered_at), 'h:mm a')}
                                  </span>
                                )}
                                {email.opened_at && (
                                  <span className="text-purple-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    Opened {format(new Date(email.opened_at), 'h:mm a')}
                                  </span>
                                )}
                                {email.clicked_at && (
                                  <span className="text-cyan-400 flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Clicked {format(new Date(email.clicked_at), 'h:mm a')}
                                  </span>
                                )}
                                {email.bounced_at && (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Bounced
                                  </span>
                                )}
                                {email.error_message && (
                                  <span className="text-red-400 text-xs truncate max-w-[200px]" title={email.error_message}>
                                    {email.error_message}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Tab */}
              {activeTab === 'customer' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Customer Information Card */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                      <User className="w-4 h-4" />
                      Customer Information
                    </h3>
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Customer name"
                          className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                            <input
                              type="email"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              placeholder="email@example.com"
                              className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                            <input
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="(555) 555-5555"
                              className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {customer && (
                        <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Customer ID</span>
                          <code className="text-xs text-white font-mono bg-zinc-900/50 px-2 py-1">{customer.id}</code>
                          <button onClick={() => navigator.clipboard.writeText(customer.id)} className="p-1.5 text-emerald-600 hover:text-zinc-400 transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Order History */}
                  {customerOrders.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                        <Package className="w-4 h-4" />
                        Order History ({customerOrders.length} Orders)
                      </h3>
                      <div className="bg-zinc-900/30 border border-zinc-800 overflow-hidden">
                        <div className="divide-y divide-zinc-800/50">
                          {customerOrders.map((co: any) => (
                            <div key={co.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors">
                              <div>
                                <code className="text-sm text-white font-mono font-semibold">{co.order_number}</code>
                                <p className="text-xs text-zinc-500 mt-1">{format(new Date(co.created_at), 'MMM d, yyyy')}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-base text-white font-bold tabular-nums">${co.total_amount?.toFixed(2)}</p>
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide mt-1 ${getStatusConfig(co.status)?.color || ''}`}>
                                  {getStatusConfig(co.status)?.label || co.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Staff Notes */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                      <FileText className="w-4 h-4" />
                      Internal Staff Notes
                    </h3>
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add internal notes about this order..."
                        rows={6}
                        className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="max-w-5xl mx-auto space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[11px] font-black text-white uppercase tracking-wider">Order Items & Fulfillment</h3>
                      <p className="text-xs text-zinc-500 mt-1">Items grouped by fulfillment location with tracking information.</p>
                    </div>
                    <button
                      onClick={() => setShowAddProduct(!showAddProduct)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-white text-sm font-bold uppercase tracking-wide hover:bg-zinc-700 transition-all border border-zinc-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>

                  {showAddProduct && (
                    <div className="p-5 bg-zinc-900/50 border border-zinc-800 space-y-4">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Search & Add Products</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products by name or SKU..."
                          className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {products
                          .filter(p =>
                            !productSearch ||
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            p.sku?.toLowerCase().includes(productSearch.toLowerCase())
                          )
                          .slice(0, 10)
                          .map((product: any) => (
                            <button
                              key={product.id}
                              onClick={async () => {
                                // Add product to order
                                const newItem: any = {
                                  id: `temp-${Date.now()}`,
                                  order_id: orderId,
                                  product_id: product.id,
                                  product_name: product.name,
                                  product_sku: product.sku,
                                  quantity: 1,
                                  unit_price: product.price || 0,
                                  subtotal: product.price || 0,
                                }
                                setItems([...items, newItem])
                                setItemQuantities({ ...itemQuantities, [newItem.id]: 1 })
                                setItemPrices({ ...itemPrices, [newItem.id]: product.price || 0 })
                                setProductSearch('')
                                setShowAddProduct(false)
                                setHasChanges(true)
                              }}
                              className="w-full flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-800 text-left transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium">{product.name}</p>
                                {product.sku && <p className="text-xs text-zinc-500 mt-0.5 font-mono">SKU: {product.sku}</p>}
                              </div>
                              <span className="text-sm text-white font-bold ml-4 tabular-nums">${product.price?.toFixed(2) || '0.00'}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Group items by fulfillment location */}
                  {(() => {
                    // Strategy: Use order_locations as the source of truth for fulfillment groups
                    // Items are matched to locations via location_id or pickup_location_id
                    // Each location has independent status/tracking - no inheritance from order level

                    type LocationGroup = {
                      locId: string
                      location: any
                      orderLoc: any
                      items: typeof items
                    }

                    const locationGroups: LocationGroup[] = []
                    const assignedItemIds = new Set<string>()

                    // First, create groups from order_locations (source of truth for fulfillment status/tracking)
                    orderLocations.forEach(orderLoc => {
                      const locId = orderLoc.location_id
                      // Find items that belong to this location (check both location_id and pickup_location_id)
                      const locItems = items.filter(item =>
                        item.location_id === locId || item.pickup_location_id === locId
                      )
                      locItems.forEach(item => assignedItemIds.add(item.id))

                      locationGroups.push({
                        locId,
                        location: orderLoc.location,
                        orderLoc,
                        items: locItems
                      })
                    })

                    // Find unassigned items (items not matched to any order_location)
                    const unassignedItems = items.filter(item => !assignedItemIds.has(item.id))

                    // If there are unassigned items but we have order_locations,
                    // add them to the first location group (or create unassigned group if no order_locations)
                    if (unassignedItems.length > 0) {
                      if (orderLocations.length > 0) {
                        // Add unassigned items to first location group
                        locationGroups[0].items = [...locationGroups[0].items, ...unassignedItems]
                      } else {
                        // No order_locations exist, create an unassigned group with order-level tracking
                        locationGroups.push({
                          locId: 'unassigned',
                          location: null,
                          orderLoc: {
                            fulfillment_status: order?.status || 'pending',
                            tracking_number: order?.tracking_number,
                            shipping_carrier: order?.shipping_carrier,
                            tracking_url: order?.tracking_url,
                            shipped_at: null
                          },
                          items: unassignedItems
                        })
                      }
                    }

                    // If no order_locations exist but we have items, show them with order-level tracking
                    if (locationGroups.length === 0 && items.length > 0) {
                      locationGroups.push({
                        locId: 'unassigned',
                        location: null,
                        orderLoc: {
                          fulfillment_status: order?.status || 'pending',
                          tracking_number: order?.tracking_number,
                          shipping_carrier: order?.shipping_carrier,
                          tracking_url: order?.tracking_url,
                          shipped_at: null
                        },
                        items: items
                      })
                    }

                    return (
                      <div className="space-y-4">
                        {locationGroups.map(({ locId, location, orderLoc, items: locItems }) => {
                          // Use location's own status/tracking - each location is independent
                          const locationStatus = orderLoc?.fulfillment_status || 'pending'
                          const locationTracking = orderLoc?.tracking_number
                          const locationCarrier = orderLoc?.shipping_carrier
                          const locationTrackingUrl = orderLoc?.tracking_url
                          const locationShippedAt = orderLoc?.shipped_at

                          return (
                          <div key={locId} className="border border-zinc-800 overflow-hidden">
                            {/* Location Header with Tracking */}
                            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 ${locationStatus === 'shipped' || locationStatus === 'fulfilled' || locationStatus === 'delivered' || locationStatus === 'completed' ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                                    <MapPin className={`w-4 h-4 ${locationStatus === 'shipped' || locationStatus === 'fulfilled' || locationStatus === 'delivered' || locationStatus === 'completed' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                                  </div>
                                  <div>
                                    <p className="text-white font-semibold">
                                      {location?.name || 'Unassigned Location'}
                                    </p>
                                    {location?.address_line1 && (
                                      <p className="text-xs text-zinc-500 mt-0.5">
                                        {location.address_line1}, {location.city}, {location.state}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[10px] px-3 py-1.5 font-bold uppercase tracking-wide ${
                                  locationStatus === 'fulfilled' || locationStatus === 'shipped' || locationStatus === 'delivered' || locationStatus === 'completed' ? 'text-emerald-400 bg-emerald-400/10' :
                                  locationStatus === 'unfulfilled' || locationStatus === 'pending' ? 'text-amber-400 bg-amber-400/10' :
                                  locationStatus === 'processing' ? 'text-blue-400 bg-blue-400/10' :
                                  'text-zinc-400 bg-zinc-400/10'
                                }`}>
                                  {locationStatus}
                                </span>
                              </div>

                              {/* Tracking Info Row */}
                              {(locationTracking || locationCarrier || locationShippedAt) && (
                                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-zinc-800/50 text-xs">
                                  {locationCarrier && (
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-3.5 h-3.5 text-zinc-500" />
                                      <span className="text-zinc-400">Carrier:</span>
                                      <span className="text-white uppercase font-medium">{locationCarrier}</span>
                                    </div>
                                  )}
                                  {locationTracking && (
                                    <div className="flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-zinc-500" />
                                      <span className="text-zinc-400">Tracking:</span>
                                      {locationTrackingUrl ? (
                                        <a href={locationTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono flex items-center gap-1">
                                          {locationTracking}
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      ) : (
                                        <span className="text-white font-mono">{locationTracking}</span>
                                      )}
                                    </div>
                                  )}
                                  {locationShippedAt && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                      <span className="text-zinc-400">Shipped:</span>
                                      <span className="text-white">{format(new Date(locationShippedAt), 'MMM d, h:mm a')}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Items in this location */}
                            <div className="divide-y divide-zinc-800/50">
                              {locItems.map((item) => {
                                const isRemoved = itemsToRemove.has(item.id)
                                const qty = itemQuantities[item.id] ?? item.quantity
                                const price = itemPrices[item.id] ?? item.unit_price
                                const lineTotal = qty * price

                                return (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-4 p-4 ${
                                      isRemoved ? 'bg-red-950/20' : 'bg-zinc-950/50 hover:bg-zinc-900/30'
                                    } transition-all`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${isRemoved ? 'line-through text-zinc-600' : 'text-white'}`}>
                                        {item.product_name}
                                      </p>
                                      {item.product_sku && <p className="text-[11px] text-zinc-600 mt-0.5 font-mono">SKU: {item.product_sku}</p>}
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

                            {/* Location Subtotal */}
                            <div className="bg-zinc-900/50 px-4 py-3 border-t border-zinc-800 flex justify-between items-center">
                              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                                {locItems.length} item{locItems.length !== 1 ? 's' : ''} from this location
                              </span>
                              <span className="text-sm text-white font-semibold tabular-nums">
                                ${locItems.reduce((sum, item) => {
                                  const qty = itemQuantities[item.id] ?? item.quantity
                                  const price = itemPrices[item.id] ?? item.unit_price
                                  return sum + (qty * price)
                                }, 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Order Totals</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Subtotal</span>
                      <span className="text-white font-semibold tabular-nums">${totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-400">Discount</span>
                        <span className="text-orange-400 font-semibold tabular-nums">-${totals.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Tax</span>
                      <span className="text-white font-semibold tabular-nums">${totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t border-zinc-800">
                      <span className="text-zinc-400">Total</span>
                      <span className="text-zinc-400 tabular-nums">${totals.total.toFixed(2)}</span>
                    </div>
                    {order && totals.total !== order.total_amount && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                        <p className="text-xs text-amber-400 font-bold">
                          {totals.total > order.total_amount ? '+' : ''}${(totals.total - order.total_amount).toFixed(2)} from original
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping Tab */}
              {activeTab === 'shipping' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Current Shipping Info Display */}
                  {shippingAddress1 && (
                    <div className="p-6 bg-zinc-950 border border-zinc-900">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Current Shipping Information</h3>
                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Shipping To</p>
                              <p className="text-sm text-white font-medium">{shippingName || 'No recipient'}</p>
                              <p className="text-sm text-zinc-400 mt-1">{shippingAddress1}</p>
                              {shippingAddress2 && <p className="text-sm text-zinc-400">{shippingAddress2}</p>}
                              <p className="text-sm text-zinc-400">{shippingCity}, {shippingState} {shippingPostalCode}</p>
                            </div>
                          </div>
                        </div>
                        {(shippingCarrier || trackingNumber) && (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Truck className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Shipment Details</p>
                                {shippingCarrier && (
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-zinc-400">Carrier:</span>
                                    <span className="text-white font-medium uppercase">{shippingCarrier}</span>
                                  </div>
                                )}
                                {shippingService && (
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-zinc-400">Service:</span>
                                    <span className="text-white">{shippingService}</span>
                                  </div>
                                )}
                                {trackingNumber && (
                                  <div className="mt-2">
                                    <span className="text-xs text-zinc-500">Tracking:</span>
                                    <code className="block text-xs text-white font-mono bg-zinc-900 px-2 py-1 mt-1">{trackingNumber}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit Shipping Address */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <MapPin className="w-4 h-4" />
                      Shipping Address
                    </h3>

                    <div className="grid gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Recipient Name</label>
                        <input
                          type="text"
                          value={shippingName}
                          onChange={(e) => setShippingName(e.target.value)}
                          placeholder="Recipient name"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Street Address</label>
                        <input
                          type="text"
                          value={shippingAddress1}
                          onChange={(e) => setShippingAddress1(e.target.value)}
                          placeholder="Street address"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Apt / Suite (Optional)</label>
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
                            placeholder="City"
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">State</label>
                          <input
                            type="text"
                            value={shippingState}
                            onChange={(e) => setShippingState(e.target.value.toUpperCase())}
                            placeholder="ST"
                            maxLength={2}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm uppercase text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">ZIP Code</label>
                          <input
                            type="text"
                            value={shippingPostalCode}
                            onChange={(e) => setShippingPostalCode(e.target.value)}
                            placeholder="ZIP"
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Details */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <Truck className="w-4 h-4" />
                      Shipping & Tracking Details
                    </h3>

                    <div className="grid lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Shipping Carrier</label>
                        <select
                          value={shippingCarrier}
                          onChange={(e) => setShippingCarrier(e.target.value)}
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm"
                        >
                          <option value="">Select carrier...</option>
                          <option value="usps">USPS</option>
                          <option value="ups">UPS</option>
                          <option value="fedex">FedEx</option>
                          <option value="dhl">DHL</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Service Level</label>
                        <input
                          type="text"
                          value={shippingService}
                          onChange={(e) => setShippingService(e.target.value)}
                          placeholder="e.g., Priority Mail, Ground"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
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

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Tracking URL</label>
                      <div className="relative">
                        <input
                          type="url"
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                          placeholder="https://tools.usps.com/go/TrackConfirmAction?tLabels=..."
                          className="w-full pl-4 pr-10 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                        {trackingUrl && (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Package Dimensions */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <Ruler className="w-4 h-4" />
                      Package Dimensions
                    </h3>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Weight (lb)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={packageWeight}
                          onChange={(e) => setPackageWeight(e.target.value)}
                          placeholder="0.0"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Length (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={packageLength}
                          onChange={(e) => setPackageLength(e.target.value)}
                          placeholder="0.0"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Width (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={packageWidth}
                          onChange={(e) => setPackageWidth(e.target.value)}
                          placeholder="0.0"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Height (in)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={packageHeight}
                          onChange={(e) => setPackageHeight(e.target.value)}
                          placeholder="0.0"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Current Billing Info Display */}
                  {billingAddress1 && (
                    <div className="p-6 bg-zinc-950 border border-zinc-900">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Current Billing Information</h3>
                      <div className="flex items-start gap-3">
                        <Building className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Billing Address</p>
                          <p className="text-sm text-white font-medium">{billingName || 'No name'}</p>
                          <p className="text-sm text-zinc-400 mt-1">{billingAddress1}</p>
                          {billingAddress2 && <p className="text-sm text-zinc-400">{billingAddress2}</p>}
                          <p className="text-sm text-zinc-400">{billingCity}, {billingState} {billingPostalCode}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Billing Address */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                        <Building className="w-4 h-4" />
                        Billing Address
                      </h3>
                      {shippingAddress1 && (
                        <button
                          onClick={() => {
                            setBillingName(shippingName)
                            setBillingAddress1(shippingAddress1)
                            setBillingAddress2(shippingAddress2)
                            setBillingCity(shippingCity)
                            setBillingState(shippingState)
                            setBillingPostalCode(shippingPostalCode)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copy from Shipping
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Billing Name</label>
                        <input
                          type="text"
                          value={billingName}
                          onChange={(e) => setBillingName(e.target.value)}
                          placeholder="Name on billing account"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Street Address</label>
                        <input
                          type="text"
                          value={billingAddress1}
                          onChange={(e) => setBillingAddress1(e.target.value)}
                          placeholder="Street address"
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Apt / Suite (Optional)</label>
                        <input
                          type="text"
                          value={billingAddress2}
                          onChange={(e) => setBillingAddress2(e.target.value)}
                          placeholder="Apt, suite, etc."
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-3">
                          <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">City</label>
                          <input
                            type="text"
                            value={billingCity}
                            onChange={(e) => setBillingCity(e.target.value)}
                            placeholder="City"
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">State</label>
                          <input
                            type="text"
                            value={billingState}
                            onChange={(e) => setBillingState(e.target.value.toUpperCase())}
                            placeholder="ST"
                            maxLength={2}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm uppercase text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">ZIP Code</label>
                          <input
                            type="text"
                            value={billingPostalCode}
                            onChange={(e) => setBillingPostalCode(e.target.value)}
                            placeholder="ZIP"
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Info */}
                  {order && (
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                        <CreditCard className="w-4 h-4" />
                        Payment Method on File
                      </h3>
                      <div className="grid lg:grid-cols-2 gap-4">
                        {order.payment_method && (
                          <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Method</span>
                            <span className="text-sm text-white font-medium capitalize">{order.payment_method.replace('_', ' ')}</span>
                          </div>
                        )}
                        {order.card_brand && (
                          <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Card Brand</span>
                            <span className="text-sm text-white font-medium uppercase">{order.card_brand}</span>
                          </div>
                        )}
                        {order.card_last_four && (
                          <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Card Number</span>
                            <span className="text-sm text-white font-mono">•••• •••• •••• {order.card_last_four}</span>
                          </div>
                        )}
                        {order.card_exp_month && order.card_exp_year && (
                          <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Expires</span>
                            <span className="text-sm text-white font-mono">{String(order.card_exp_month).padStart(2, '0')}/{order.card_exp_year}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === 'payment' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Current Payment Info */}
                  {order && (
                    <div className="p-6 bg-zinc-950 border border-zinc-900">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Current Payment Information</h3>
                      <div className="grid lg:grid-cols-3 gap-6">
                        <div className="space-y-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Payment Status</p>
                          <span className={`inline-flex px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${PAYMENT_STATUSES.find(s => s.value === order.payment_status)?.color || 'bg-zinc-800/50 text-zinc-400'}`}>
                            {order.payment_status || 'Unknown'}
                          </span>
                        </div>
                        {order.payment_method && (
                          <div className="space-y-3">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Payment Method</p>
                            <p className="text-sm text-white font-medium capitalize">{order.payment_method.replace('_', ' ')}</p>
                            {order.card_last_four && (
                              <p className="text-xs text-zinc-400 font-mono">•••• {order.card_last_four}</p>
                            )}
                          </div>
                        )}
                        <div className="space-y-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Order Total</p>
                          <p className="text-xl text-white font-bold tabular-nums">${order.total_amount?.toFixed(2) || '0.00'}</p>
                          {order.discount_amount > 0 && (
                            <p className="text-xs text-zinc-500">Discount: ${order.discount_amount.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <CreditCard className="w-4 h-4" />
                      Update Payment Status
                    </h3>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Select Status</label>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                      {PAYMENT_STATUSES.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => setPaymentStatus(status.value)}
                          className={`px-3 py-3 border text-xs font-bold uppercase tracking-wide transition-colors ${
                            paymentStatus === status.value ? status.color : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <DollarSign className="w-4 h-4" />
                      Payment Details
                    </h3>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-600 text-sm"
                      >
                        <option value="">Select payment method...</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="paypal">PayPal</option>
                        <option value="venmo">Venmo</option>
                        <option value="check">Check</option>
                      </select>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Order Subtotal</label>
                        <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm font-medium">
                          ${order?.subtotal?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Tax Amount</label>
                        <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm font-medium">
                          ${order?.tax_amount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Discount Amount</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input
                          type="number"
                          step="0.01"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Refund Section */}
                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
                      <RotateCcw className="w-4 h-4" />
                      Process Refund
                    </h3>
                    <p className="text-xs text-zinc-500">Issue a full or partial refund for this order</p>

                    <div className="grid lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Refund Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                          <input
                            type="number"
                            step="0.01"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                          />
                        </div>
                        {order && refundAmount && (
                          <p className="text-xs text-zinc-500 mt-2">
                            {((parseFloat(refundAmount) / order.total_amount) * 100).toFixed(0)}% of order total
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Refund Reason (Optional)</label>
                        <input
                          type="text"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="Customer request, damaged item, etc."
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleRefund}
                      disabled={!refundAmount}
                      className="w-full px-4 py-3 bg-orange-600 text-white text-sm font-bold uppercase tracking-wide hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-orange-700"
                    >
                      Apply Refund {refundAmount && `($${parseFloat(refundAmount).toFixed(2)})`}
                    </button>
                  </div>

                  {/* Transaction IDs */}
                  {(order?.transaction_id || order?.square_payment_id) && (
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800 space-y-4">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Transaction IDs</h3>
                      <div className="space-y-3">
                        {order.transaction_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Transaction ID</p>
                            <code className="text-xs text-white font-mono bg-zinc-950 px-3 py-2 block border border-zinc-800">{order.transaction_id}</code>
                          </div>
                        )}
                        {order.square_payment_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Square Payment ID</p>
                            <code className="text-xs text-white font-mono bg-zinc-950 px-3 py-2 block border border-zinc-800">{order.square_payment_id}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Tab */}
              {activeTab === 'status' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {/* Order Status Selector */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                      <Package className="w-4 h-4" />
                      Change Order Status
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      {getOrderStatuses().map((status) => {
                        const Icon = status.icon
                        const isActive = orderStatus === status.value
                        return (
                          <button
                            key={status.value}
                            onClick={() => setOrderStatus(status.value)}
                            className={`flex flex-col items-center gap-3 p-4 border transition-all ${
                              isActive ? `${status.color} border-white/20` : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
                            }`}
                          >
                            <div className={`p-3-full ${isActive ? status.color : 'bg-zinc-800/50'}`}>
                              <Icon className={`w-5 h-5 ${isActive ? '' : 'text-zinc-500'}`} />
                            </div>
                            <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                              {status.label}
                            </span>
                            {isActive && <Check className="w-4 h-4 text-white" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Staff Attribution Summary */}
                  {(order?.employee_id || order?.created_by_user_id || order?.prepared_by_user_id || order?.shipped_by_user_id || order?.delivered_by_user_id) && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                        <User className="w-4 h-4" />
                        Staff Attribution
                      </h3>
                      <div className="p-5 bg-zinc-900/50 border border-zinc-800 grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {order.employee_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Assigned Employee</p>
                            <code className="text-sm text-white font-mono bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.employee_id)}</code>
                          </div>
                        )}
                        {order.created_by_user_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Created By</p>
                            <code className="text-sm text-white font-mono bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.created_by_user_id)}</code>
                          </div>
                        )}
                        {order.prepared_by_user_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Prepared By</p>
                            <code className="text-sm text-white font-mono bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.prepared_by_user_id)}</code>
                          </div>
                        )}
                        {isShippingOrder && order.shipped_by_user_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Shipped By</p>
                            <code className="text-sm text-white font-mono bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.shipped_by_user_id)}</code>
                          </div>
                        )}
                        {isShippingOrder && order.delivered_by_user_id && (
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Delivered By</p>
                            <code className="text-sm text-white font-mono bg-zinc-800/50 px-2 py-1">{getStaffDisplay(order.delivered_by_user_id)}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detailed Staff & Timeline Tracking */}
                  <div className="p-6 bg-zinc-950 border border-zinc-900 space-y-4">
                    <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                      <User className="w-4 h-4" />
                      Detailed Order Tracking - Staff & Timestamps
                    </h3>
                    <div className="space-y-2">
                      {/* Each action as a line */}
                      {order?.created_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-amber-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Order Created</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {order.created_by_user_id && (
                              <span className="text-xs text-zinc-500">By: <span className="text-white font-mono">{getStaffDisplay(order.created_by_user_id)}</span></span>
                            )}
                            <span className="text-sm text-white font-medium">{format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.paid_date && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Payment Received</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {order.payment_method && (
                              <span className="text-xs text-zinc-500">Via: <span className="text-white capitalize">{order.payment_method}</span></span>
                            )}
                            <span className="text-sm text-white font-medium">{format(new Date(order.paid_date), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.prepared_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Order Prepared</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {order.prepared_by_user_id && (
                              <span className="text-xs text-zinc-500">By: <span className="text-white font-mono">{getStaffDisplay(order.prepared_by_user_id)}</span></span>
                            )}
                            <span className="text-sm text-white font-medium">{format(new Date(order.prepared_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.ready_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Ready for Pickup/Delivery</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-white font-medium">{format(new Date(order.ready_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.picked_up_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-indigo-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Picked Up by Customer</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-white font-medium">{format(new Date(order.picked_up_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {/* Shipping-specific timeline events */}
                      {isShippingOrder && order?.shipped_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-cyan-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Order Shipped</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {order.shipped_by_user_id && (
                              <span className="text-xs text-zinc-500">By: <span className="text-white font-mono">{getStaffDisplay(order.shipped_by_user_id)}</span></span>
                            )}
                            {order.tracking_number && (
                              <span className="text-xs text-zinc-500">Tracking: <code className="text-white font-mono text-xs">{order.tracking_number}</code></span>
                            )}
                            <span className="text-sm text-white font-medium">{format(new Date(order.shipped_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {isShippingOrder && order?.delivered_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Order Delivered</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {order.delivered_by_user_id && (
                              <span className="text-xs text-zinc-500">By: <span className="text-white font-mono">{getStaffDisplay(order.delivered_by_user_id)}</span></span>
                            )}
                            <span className="text-sm text-white font-medium">{format(new Date(order.delivered_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.completed_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Order Completed</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-white font-medium">{format(new Date(order.completed_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.notified_at && (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500"></div>
                            <span className="text-sm text-zinc-400 font-medium">Customer Notified</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {order.notification_method && (
                              <span className="text-xs text-zinc-500">Via: <span className="text-white capitalize">{order.notification_method}</span></span>
                            )}
                            <span className="text-sm text-white font-medium">{format(new Date(order.notified_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.cancelled_date && (
                        <div className="flex items-center justify-between py-2 border-b border-red-900/30">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500"></div>
                            <span className="text-sm text-red-400 font-medium">Order Cancelled</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-red-400 font-medium">{format(new Date(order.cancelled_date), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}

                      {order?.updated_at && (
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-zinc-600"></div>
                            <span className="text-sm text-zinc-500 font-medium">Last Modified</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-zinc-400 font-medium">{format(new Date(order.updated_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complete Fulfillment Timeline */}
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                      <Clock className="w-4 h-4" />
                      Complete Order Timeline & Tracking
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {order?.created_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Order Created</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{format(new Date(order.created_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.paid_date && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Payment Received</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.paid_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400/70 mt-0.5">{format(new Date(order.paid_date), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.prepared_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Order Prepared</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.prepared_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400/70 mt-0.5">{format(new Date(order.prepared_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.ready_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Ready for Pickup/Delivery</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.ready_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400/70 mt-0.5">{format(new Date(order.ready_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.picked_up_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Picked Up</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.picked_up_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400/70 mt-0.5">{format(new Date(order.picked_up_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {isShippingOrder && order?.delivered_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Order Delivered</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.delivered_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400/70 mt-0.5">{format(new Date(order.delivered_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.completed_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2">Completed</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.completed_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400/70 mt-0.5">{format(new Date(order.completed_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.cancelled_date && (
                        <div className="p-4 bg-red-900/20 border border-red-800/30">
                          <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-2">Order Cancelled</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.cancelled_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-red-400/70 mt-0.5">{format(new Date(order.cancelled_date), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.notified_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Customer Notified</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.notified_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{format(new Date(order.notified_at), 'h:mm a')}</p>
                        </div>
                      )}
                      {order?.updated_at && (
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Last Updated</p>
                          <p className="text-sm text-white font-semibold">{format(new Date(order.updated_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{format(new Date(order.updated_at), 'h:mm a')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Timeline */}
                  {(order?.created_at || order?.paid_date || order?.delivered_at) && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                        <TrendingUp className="w-4 h-4" />
                        Visual Order Journey
                      </h3>
                      <div className="p-6 bg-zinc-900/30 border border-zinc-800">
                        <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-800">
                          {order.created_at && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
                                <div className="w-2 h-2-full bg-amber-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Order Created</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.created_at), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                          {order.paid_date && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                                <DollarSign className="w-3 h-3 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Payment Received</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.paid_date), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                          {order.prepared_at && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                                <Package className="w-3 h-3 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Order Prepared</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.prepared_at), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                          {order.ready_at && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-purple-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Ready for Pickup/Delivery</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.ready_at), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                          {order.picked_up_at && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center">
                                <User className="w-3 h-3 text-indigo-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Picked Up by Customer</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.picked_up_at), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                          {isShippingOrder && order.delivered_at && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Order Delivered Successfully</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.delivered_at), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                          {order.cancelled_date && (
                            <div className="relative">
                              <div className="absolute left-[-21px] top-2 w-5 h-5-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                                <XCircle className="w-3 h-3 text-red-500" />
                              </div>
                              <div>
                                <p className="text-sm text-white font-bold">Order Cancelled</p>
                                <p className="text-xs text-zinc-400 mt-1">{format(new Date(order.cancelled_date), 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* Email Preview Modal */}
      {selectedEmail && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-[60]"
            onClick={() => setSelectedEmail(null)}
          />
          <div className="fixed inset-8 md:inset-16 lg:inset-24 bg-zinc-950 border border-zinc-800 z-[60] flex flex-col overflow-hidden shadow-2xl">
            {/* Email Preview Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-white truncate">
                  {selectedEmail.subject}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span>To: {selectedEmail.to_email}</span>
                  {selectedEmail.sent_at && (
                    <span>Sent: {format(new Date(selectedEmail.sent_at), 'MMM d, yyyy h:mm a')}</span>
                  )}
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    selectedEmail.status === 'delivered' ? 'text-emerald-400 bg-emerald-400/10' :
                    selectedEmail.status === 'opened' ? 'text-purple-400 bg-purple-400/10' :
                    'text-zinc-400 bg-zinc-400/10'
                  }`}>
                    {selectedEmail.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-auto bg-white">
              {loadingEmail ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : emailContent ? (
                <iframe
                  srcDoc={emailContent}
                  className="w-full h-full border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900">
                  <Mail className="w-12 h-12 mb-4 text-zinc-600" />
                  <p className="text-sm">Email content not available</p>
                  <p className="text-xs text-zinc-600 mt-1">The email HTML content could not be retrieved from Resend</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
