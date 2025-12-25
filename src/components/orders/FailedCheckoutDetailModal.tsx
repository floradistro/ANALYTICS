'use client'

import { useEffect, useState } from 'react'
import { X, AlertTriangle, User, Mail, Phone, MapPin, CreditCard, Package, Clock, Globe, FileText, AlertCircle, Monitor, Smartphone, Tablet, MousePointer, Eye, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/theme'

interface CartItem {
  productId?: string
  product_id?: string
  productName?: string
  name?: string
  quantity: number
  unitPrice?: number
  price?: number
  lineTotal?: number
  sku?: string
  variant_name?: string
}

interface Address {
  name?: string
  address?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  zip?: string
  postal_code?: string
  country?: string
  phone?: string
}

interface VisitorSession {
  id: string
  session_id: string
  visitor_id: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  city: string | null
  region: string | null
  country: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  referrer: string | null
  channel: string | null
  is_returning: boolean | null
  screen_width: number | null
  screen_height: number | null
  created_at: string | null
}

interface PageView {
  id: string
  page_url: string
  page_title: string | null
  created_at: string
}

interface AnalyticsEvent {
  id: string
  event_name: string
  event_category: string | null
  event_data: any
  timestamp: string
}

interface CustomerHistory {
  total_orders: number
  total_spent: number
  first_order_date: string | null
  last_order_date: string | null
}

interface CheckoutAttemptDetail {
  id: string
  store_id: string
  customer_id: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  shipping_address: Address | null
  billing_address: Address | null
  items: CartItem[]
  subtotal: number
  tax_amount: number | null
  shipping_cost: number | null
  discount_amount: number | null
  total_amount: number
  status: string
  source: string | null
  payment_method: string | null
  payment_processor: string | null
  processor_response_code: string | null
  processor_error_message: string | null
  processor_transaction_id: string | null
  processor_auth_code: string | null
  ip_address: string | null
  user_agent: string | null
  order_id: string | null
  order_number: string | null
  staff_reviewed: boolean | null
  staff_reviewed_at: string | null
  staff_reviewed_by: string | null
  staff_notes: string | null
  created_at: string
  processed_at: string | null
  updated_at: string
  // Analytics session tracking
  session_id: string | null
  visitor_id: string | null
}

interface FailedOrderDetail {
  id: string
  order_number: string
  customer_id: string | null
  shipping_name: string | null
  shipping_address: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_zip: string | null
  shipping_phone: string | null
  total_amount: number
  subtotal: number
  tax_amount: number | null
  discount_amount: number | null
  payment_status: string
  payment_method: string | null
  created_at: string
  customers: { email: string | null; first_name: string | null; last_name: string | null; phone: string | null } | null
  order_items: Array<{
    id: string
    product_name: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

interface FailedCheckoutDetailModalProps {
  isOpen: boolean
  onClose: () => void
  checkoutId: string | null
  recordType: 'checkout_attempt' | 'failed_order'
}

export function FailedCheckoutDetailModal({ isOpen, onClose, checkoutId, recordType }: FailedCheckoutDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [attemptData, setAttemptData] = useState<CheckoutAttemptDetail | null>(null)
  const [orderData, setOrderData] = useState<FailedOrderDetail | null>(null)
  const [visitorSession, setVisitorSession] = useState<VisitorSession | null>(null)
  const [pageViews, setPageViews] = useState<PageView[]>([])
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([])
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null)
  const [otherAttempts, setOtherAttempts] = useState<CheckoutAttemptDetail[]>([])

  useEffect(() => {
    if (!isOpen || !checkoutId) {
      setAttemptData(null)
      setOrderData(null)
      setVisitorSession(null)
      setPageViews([])
      setAnalyticsEvents([])
      setCustomerHistory(null)
      setOtherAttempts([])
      return
    }

    const fetchDetails = async () => {
      setLoading(true)

      if (recordType === 'checkout_attempt') {
        // Fetch checkout attempt
        const { data, error } = await supabase
          .from('checkout_attempts')
          .select('*')
          .eq('id', checkoutId)
          .single()

        if (error) {
          console.error('Failed to fetch checkout attempt:', error)
        } else {
          setAttemptData(data)

          // Fetch visitor session - prefer direct session_id match, fallback to time-window
          if (data.store_id) {
            let sessionData: VisitorSession | null = null

            // Priority 1: Direct session_id match (most accurate)
            if (data.session_id) {
              const { data: directMatch } = await supabase
                .from('website_visitors')
                .select('*')
                .eq('store_id', data.store_id)
                .eq('session_id', data.session_id)
                .maybeSingle()

              sessionData = directMatch
            }

            // Priority 2: Visitor ID match within time window
            if (!sessionData && data.visitor_id) {
              const attemptTime = new Date(data.created_at)
              const windowStart = new Date(attemptTime.getTime() - 60 * 60 * 1000) // 1 hour before

              const { data: visitorMatch } = await supabase
                .from('website_visitors')
                .select('*')
                .eq('store_id', data.store_id)
                .eq('visitor_id', data.visitor_id)
                .gte('created_at', windowStart.toISOString())
                .lte('created_at', data.created_at)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              sessionData = visitorMatch
            }

            // Priority 3: Time-window fallback (for older data without session tracking)
            if (!sessionData && data.ip_address) {
              const attemptTime = new Date(data.created_at)
              const windowStart = new Date(attemptTime.getTime() - 30 * 60 * 1000) // 30 min before

              const { data: timeMatch } = await supabase
                .from('website_visitors')
                .select('*')
                .eq('store_id', data.store_id)
                .gte('created_at', windowStart.toISOString())
                .lte('created_at', data.created_at)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              sessionData = timeMatch
            }

            if (sessionData) {
              setVisitorSession(sessionData)

              // Use visitor_id from checkout_attempt if available, otherwise from session
              const visitorId = data.visitor_id || sessionData.visitor_id
              const sessionId = data.session_id || sessionData.session_id

              // Fetch page views for this visitor/session
              if (visitorId || sessionId) {
                let pvQuery = supabase
                  .from('page_views')
                  .select('id, page_url, page_title, created_at')
                  .eq('store_id', data.store_id)
                  .order('created_at', { ascending: false })
                  .limit(30)

                // Prefer session_id match for more accurate page views
                if (sessionId) {
                  pvQuery = pvQuery.eq('session_id', sessionId)
                } else if (visitorId) {
                  pvQuery = pvQuery.eq('visitor_id', visitorId)
                }

                const { data: pvData } = await pvQuery
                setPageViews(pvData || [])

                // Fetch analytics events
                let eventsQuery = supabase
                  .from('analytics_events')
                  .select('id, event_name, event_category, event_properties, timestamp')
                  .eq('store_id', data.store_id)
                  .order('timestamp', { ascending: false })
                  .limit(30)

                if (sessionId) {
                  eventsQuery = eventsQuery.eq('session_id', sessionId)
                } else if (visitorId) {
                  eventsQuery = eventsQuery.eq('visitor_id', visitorId)
                }

                const { data: eventsData } = await eventsQuery
                // Map event_properties to event_data for compatibility
                setAnalyticsEvents((eventsData || []).map((e: any) => ({
                  ...e,
                  event_data: e.event_properties
                })))
              }
            }
          }

          // Fetch customer history if we have customer_id or email
          if (data.customer_id || data.customer_email) {
            let customerId = data.customer_id

            // If no customer_id but have email, try to find customer
            if (!customerId && data.customer_email) {
              const { data: custData } = await supabase
                .from('customers')
                .select('id')
                .eq('store_id', data.store_id)
                .eq('email', data.customer_email)
                .maybeSingle()

              customerId = custData?.id
            }

            if (customerId) {
              const { data: ordersData } = await supabase
                .from('orders')
                .select('id, total_amount, created_at')
                .eq('customer_id', customerId)
                .eq('payment_status', 'paid')

              if (ordersData && ordersData.length > 0) {
                setCustomerHistory({
                  total_orders: ordersData.length,
                  total_spent: ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                  first_order_date: ordersData.reduce((min, o) => o.created_at < min ? o.created_at : min, ordersData[0].created_at),
                  last_order_date: ordersData.reduce((max, o) => o.created_at > max ? o.created_at : max, ordersData[0].created_at),
                })
              }
            }

            // Fetch other failed attempts from same customer/email
            const { data: otherData } = await supabase
              .from('checkout_attempts')
              .select('*')
              .eq('store_id', data.store_id)
              .neq('id', data.id)
              .or(data.customer_email ? `customer_email.eq.${data.customer_email}` : `customer_id.eq.${data.customer_id}`)
              .in('status', ['declined', 'error'])
              .order('created_at', { ascending: false })
              .limit(5)

            setOtherAttempts(otherData || [])
          }
        }
      } else {
        // Fetch failed order with all details
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_number, customer_id, store_id,
            shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone,
            total_amount, subtotal, tax_amount, discount_amount, shipping_cost,
            payment_status, payment_method, payment_method_title,
            processor_transaction_id, processor_reference_id,
            customer_ip_address, customer_user_agent, customer_note,
            order_type, order_date, created_at,
            customers(id, email, first_name, last_name, phone),
            order_items(id, product_name, product_sku, quantity, unit_price, line_total)
          `)
          .eq('id', checkoutId)
          .single()

        if (error) {
          console.error('Failed to fetch failed order:', error)
        } else {
          setOrderData(data as any)

          // Fetch customer history
          const customer = (data as any).customers
          if (customer?.id) {
            const { data: ordersData } = await supabase
              .from('orders')
              .select('id, total_amount, created_at')
              .eq('customer_id', customer.id)
              .eq('payment_status', 'paid')

            if (ordersData && ordersData.length > 0) {
              setCustomerHistory({
                total_orders: ordersData.length,
                total_spent: ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                first_order_date: ordersData.reduce((min, o) => o.created_at < min ? o.created_at : min, ordersData[0].created_at),
                last_order_date: ordersData.reduce((max, o) => o.created_at > max ? o.created_at : max, ordersData[0].created_at),
              })
            }
          }
        }
      }

      setLoading(false)
    }

    fetchDetails()
  }, [isOpen, checkoutId, recordType])

  if (!isOpen) return null

  const formatAddress = (addr: Address | null) => {
    if (!addr || typeof addr !== 'object') return null
    const parts = [
      typeof addr.name === 'string' ? addr.name : null,
      typeof addr.address === 'string' ? addr.address : (typeof addr.address_1 === 'string' ? addr.address_1 : null),
      typeof addr.address_2 === 'string' ? addr.address_2 : null,
      [addr.city, addr.state, addr.zip || addr.postal_code].filter(v => typeof v === 'string' && v).join(', ') || null,
      typeof addr.country === 'string' ? addr.country : null
    ].filter(Boolean) as string[]
    return parts.length > 0 ? parts : null
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'declined':
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'error':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'pending':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    }
  }

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }

    let browser = 'Unknown'
    let os = 'Unknown'
    let device = 'Desktop'

    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'

    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('iOS')) { os = 'iOS'; device = 'Mobile' }
    else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile' }
    else if (ua.includes('Linux')) os = 'Linux'

    if (ua.includes('Mobile')) device = 'Mobile'
    else if (ua.includes('Tablet')) device = 'Tablet'

    return { browser, os, device }
  }

  // Render checkout attempt detail
  const renderCheckoutAttempt = () => {
    if (!attemptData) return null

    const shippingAddr = formatAddress(attemptData.shipping_address)
    const billingAddr = formatAddress(attemptData.billing_address)
    // items might be a JSON string or array
    let items: CartItem[] = []
    if (Array.isArray(attemptData.items)) {
      items = attemptData.items
    } else if (typeof attemptData.items === 'string') {
      try {
        items = JSON.parse(attemptData.items)
      } catch { items = [] }
    }

    const uaParsed = parseUserAgent(attemptData.user_agent)

    return (
      <>
        {/* Status Banner */}
        <div className="bg-red-950/50 border-b border-red-900/50 px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold uppercase tracking-wide rounded border ${getStatusColor(attemptData.status)}`}>
                {attemptData.status}
              </span>
              {attemptData.processor_error_message && (
                <p className="text-sm text-red-300 mt-1">{attemptData.processor_error_message}</p>
              )}
            </div>
            {attemptData.order_number && (
              <span className="text-sm text-zinc-400">Order #{attemptData.order_number}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Total Amount</div>
              <div className="text-2xl font-semibold text-red-400">{formatCurrency(attemptData.total_amount)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Subtotal</div>
              <div className="text-xl font-medium text-white">{formatCurrency(attemptData.subtotal)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Tax</div>
              <div className="text-xl font-medium text-zinc-300">{formatCurrency(attemptData.tax_amount || 0)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Shipping</div>
              <div className="text-xl font-medium text-zinc-300">{formatCurrency(attemptData.shipping_cost || 0)}</div>
            </div>
          </div>

          {/* Customer History (if available) */}
          {customerHistory && (
            <div className="bg-emerald-950/30 rounded-lg border border-emerald-900/30 p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Returning Customer
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Previous Orders</div>
                  <div className="text-lg font-medium text-white">{customerHistory.total_orders}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Lifetime Value</div>
                  <div className="text-lg font-medium text-emerald-400">{formatCurrency(customerHistory.total_spent)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">First Order</div>
                  <div className="text-sm text-white">{customerHistory.first_order_date ? format(new Date(customerHistory.first_order_date), 'MMM d, yyyy') : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Last Order</div>
                  <div className="text-sm text-white">{customerHistory.last_order_date ? format(new Date(customerHistory.last_order_date), 'MMM d, yyyy') : '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Visitor Session Stats */}
          {(visitorSession || attemptData.user_agent) && (
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-400" />
                  Session & Device Info
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-zinc-700/30">
                <div className="p-3 bg-zinc-900/80">
                  <p className="text-[10px] text-zinc-500 uppercase">Device</p>
                  <p className="text-sm text-white capitalize flex items-center gap-1.5">
                    {getDeviceIcon(visitorSession?.device_type || uaParsed.device)}
                    {visitorSession?.device_type || uaParsed.device}
                  </p>
                </div>
                <div className="p-3 bg-zinc-900/80">
                  <p className="text-[10px] text-zinc-500 uppercase">Browser</p>
                  <p className="text-sm text-white">{visitorSession?.browser || uaParsed.browser}</p>
                </div>
                <div className="p-3 bg-zinc-900/80">
                  <p className="text-[10px] text-zinc-500 uppercase">OS</p>
                  <p className="text-sm text-white">{visitorSession?.os || uaParsed.os}</p>
                </div>
                <div className="p-3 bg-zinc-900/80">
                  <p className="text-[10px] text-zinc-500 uppercase">Location</p>
                  <p className="text-sm text-white">
                    {visitorSession?.city || 'Unknown'}
                    {visitorSession?.region ? `, ${visitorSession.region}` : ''}
                  </p>
                </div>
                <div className="p-3 bg-zinc-900/80">
                  <p className="text-[10px] text-zinc-500 uppercase">Source</p>
                  <p className="text-sm text-white">{visitorSession?.utm_source || visitorSession?.channel || attemptData.source || 'Direct'}</p>
                </div>
                <div className="p-3 bg-zinc-900/80">
                  <p className="text-[10px] text-zinc-500 uppercase">Returning</p>
                  <p className="text-sm text-white">{visitorSession?.is_returning ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* UTM & Referrer */}
              {visitorSession && (visitorSession.utm_campaign || visitorSession.referrer) && (
                <div className="p-4 border-t border-zinc-700/30 grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Screen Resolution */}
              {visitorSession?.screen_width && (
                <div className="px-4 py-2 border-t border-zinc-700/30 text-xs text-zinc-500">
                  Screen: {visitorSession.screen_width} × {visitorSession.screen_height}px
                </div>
              )}
            </div>
          )}

          {/* Activity Timeline */}
          {(pageViews.length > 0 || analyticsEvents.length > 0) && (
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-zinc-400" />
                  Activity Timeline ({pageViews.length + analyticsEvents.length} events)
                </h3>
              </div>
              <div className="max-h-[250px] overflow-y-auto divide-y divide-zinc-800/50">
                {[
                  ...pageViews.map(pv => ({ type: 'page_view' as const, timestamp: pv.created_at, data: pv })),
                  ...analyticsEvents.map(ev => ({ type: 'event' as const, timestamp: ev.timestamp, data: ev }))
                ]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 20)
                  .map((item, idx) => {
                    if (item.type === 'page_view') {
                      const pv = item.data as PageView
                      return (
                        <div key={`pv-${idx}`} className="px-4 py-2 flex items-center gap-3">
                          <Eye className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{pv.page_title || pv.page_url}</p>
                            <p className="text-xs text-zinc-500 truncate">{pv.page_url}</p>
                          </div>
                          <span className="text-xs text-zinc-600 whitespace-nowrap">{format(new Date(pv.created_at), 'h:mm:ss a')}</span>
                        </div>
                      )
                    } else {
                      const ev = item.data as AnalyticsEvent
                      return (
                        <div key={`ev-${idx}`} className="px-4 py-2 flex items-center gap-3">
                          {ev.event_name.includes('cart') ? (
                            <ShoppingCart className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          ) : (
                            <MousePointer className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{ev.event_name.replace(/_/g, ' ')}</p>
                            {ev.event_category && <p className="text-xs text-zinc-500">{ev.event_category}</p>}
                          </div>
                          <span className="text-xs text-zinc-600 whitespace-nowrap">{format(new Date(ev.timestamp), 'h:mm:ss a')}</span>
                        </div>
                      )
                    }
                  })}
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                Customer Information
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {attemptData.customer_name && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Name</div>
                      <div className="text-sm text-white">{attemptData.customer_name}</div>
                    </div>
                  </div>
                )}
                {attemptData.customer_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Email</div>
                      <div className="text-sm text-white">{attemptData.customer_email}</div>
                    </div>
                  </div>
                )}
                {attemptData.customer_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Phone</div>
                      <div className="text-sm text-white">{attemptData.customer_phone}</div>
                    </div>
                  </div>
                )}
                {attemptData.customer_id && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Customer ID</div>
                      <div className="text-xs text-zinc-400 font-mono">{attemptData.customer_id}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {shippingAddr && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Shipping Address</div>
                      {shippingAddr.map((line, i) => (
                        <div key={i} className="text-sm text-white">{line}</div>
                      ))}
                    </div>
                  </div>
                )}
                {billingAddr && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Billing Address</div>
                      {billingAddr.map((line, i) => (
                        <div key={i} className="text-sm text-white">{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart Items */}
          {items.length > 0 && (
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-zinc-400" />
                  Cart Items ({items.length})
                </h3>
              </div>
              <div className="divide-y divide-zinc-700/30">
                {items.map((item, idx) => {
                  const name = String(item.productName || item.name || 'Unknown Product')
                  const qty = Number(item.quantity) || 0
                  const price = Number(item.unitPrice || item.price) || 0
                  const total = Number(item.lineTotal) || (qty * price)
                  return (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white">{name}</div>
                        <div className="text-xs text-zinc-500">
                          Qty: {qty} × {formatCurrency(price)}
                          {item.sku && <span className="ml-2">SKU: {item.sku}</span>}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-white tabular-nums">
                        {formatCurrency(total)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-400" />
                Payment Details
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {attemptData.payment_method && (
                <div>
                  <div className="text-xs text-zinc-500">Payment Method</div>
                  <div className="text-sm text-white capitalize">{attemptData.payment_method.replace('_', ' ')}</div>
                </div>
              )}
              {attemptData.payment_processor && (
                <div>
                  <div className="text-xs text-zinc-500">Processor</div>
                  <div className="text-sm text-white capitalize">{attemptData.payment_processor}</div>
                </div>
              )}
              {attemptData.processor_response_code && (
                <div>
                  <div className="text-xs text-zinc-500">Response Code</div>
                  <div className="text-sm text-amber-400 font-mono">{attemptData.processor_response_code}</div>
                </div>
              )}
              {attemptData.processor_transaction_id && (
                <div className="col-span-2 md:col-span-1">
                  <div className="text-xs text-zinc-500">Transaction ID</div>
                  <div className="text-xs text-zinc-400 font-mono break-all">{attemptData.processor_transaction_id}</div>
                </div>
              )}
              {attemptData.processor_auth_code && (
                <div>
                  <div className="text-xs text-zinc-500">Auth Code</div>
                  <div className="text-sm text-zinc-400 font-mono">{attemptData.processor_auth_code}</div>
                </div>
              )}
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Technical Details
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500">Source</div>
                <div className="text-sm text-white capitalize">{attemptData.source || 'Unknown'}</div>
              </div>
              {attemptData.ip_address && (
                <div>
                  <div className="text-xs text-zinc-500">IP Address</div>
                  <div className="text-sm text-zinc-400 font-mono">{attemptData.ip_address}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-zinc-500">Created</div>
                <div className="text-sm text-white">{format(new Date(attemptData.created_at), 'MMM d, yyyy h:mm:ss a')}</div>
              </div>
              {attemptData.processed_at && (
                <div>
                  <div className="text-xs text-zinc-500">Processed</div>
                  <div className="text-sm text-white">{format(new Date(attemptData.processed_at), 'MMM d, yyyy h:mm:ss a')}</div>
                </div>
              )}
              {attemptData.user_agent && (
                <div className="col-span-2">
                  <div className="text-xs text-zinc-500">User Agent</div>
                  <div className="text-xs text-zinc-500 font-mono break-all">{attemptData.user_agent}</div>
                </div>
              )}
            </div>
          </div>

          {/* Other Failed Attempts */}
          {otherAttempts.length > 0 && (
            <div className="bg-amber-950/30 rounded-lg border border-amber-900/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-900/30 bg-amber-950/50">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Other Failed Attempts from this Customer ({otherAttempts.length})
                </h3>
              </div>
              <div className="divide-y divide-amber-900/30">
                {otherAttempts.map(attempt => (
                  <div key={attempt.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase rounded ${getStatusColor(attempt.status)}`}>
                        {attempt.status}
                      </span>
                      <span className="ml-2 text-sm text-white">{formatCurrency(attempt.total_amount)}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{format(new Date(attempt.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Review */}
          {(attemptData.staff_reviewed || attemptData.staff_notes) && (
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  Staff Review
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {attemptData.staff_reviewed && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Reviewed {attemptData.staff_reviewed_at && `on ${format(new Date(attemptData.staff_reviewed_at), 'MMM d, yyyy')}`}
                  </div>
                )}
                {attemptData.staff_notes && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Notes</div>
                    <div className="text-sm text-white bg-zinc-900/50 rounded p-3">{attemptData.staff_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Record ID */}
          <div className="text-center text-xs text-zinc-600 font-mono">
            ID: {attemptData.id}
          </div>
        </div>
      </>
    )
  }

  // Render failed order detail
  const renderFailedOrder = () => {
    if (!orderData) return null

    // customers might be {} or null from Supabase - normalize it
    const rawCustomer = orderData.customers
    const customer = (rawCustomer && typeof rawCustomer === 'object' && Object.keys(rawCustomer).length > 0)
      ? rawCustomer
      : null
    const items = Array.isArray(orderData.order_items) ? orderData.order_items : []

    return (
      <>
        {/* Status Banner */}
        <div className="bg-red-950/50 border-b border-red-900/50 px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold uppercase tracking-wide rounded border ${getStatusColor(orderData.payment_status)}`}>
                {orderData.payment_status}
              </span>
              <span className="ml-3 text-sm text-zinc-400">Order #{orderData.order_number}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Total Amount</div>
              <div className="text-2xl font-semibold text-red-400">{formatCurrency(orderData.total_amount)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Subtotal</div>
              <div className="text-xl font-medium text-white">{formatCurrency(orderData.subtotal)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Tax</div>
              <div className="text-xl font-medium text-zinc-300">{formatCurrency(orderData.tax_amount || 0)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-xs text-zinc-400 mb-1">Discount</div>
              <div className="text-xl font-medium text-zinc-300">{formatCurrency(orderData.discount_amount || 0)}</div>
            </div>
          </div>

          {/* Customer History (if available) */}
          {customerHistory && (
            <div className="bg-emerald-950/30 rounded-lg border border-emerald-900/30 p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Returning Customer
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Previous Orders</div>
                  <div className="text-lg font-medium text-white">{customerHistory.total_orders}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Lifetime Value</div>
                  <div className="text-lg font-medium text-emerald-400">{formatCurrency(customerHistory.total_spent)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">First Order</div>
                  <div className="text-sm text-white">{customerHistory.first_order_date ? format(new Date(customerHistory.first_order_date), 'MMM d, yyyy') : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Last Order</div>
                  <div className="text-sm text-white">{customerHistory.last_order_date ? format(new Date(customerHistory.last_order_date), 'MMM d, yyyy') : '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                Customer Information
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {orderData.shipping_name && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Name</div>
                      <div className="text-sm text-white">{orderData.shipping_name}</div>
                    </div>
                  </div>
                )}
                {customer?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Email</div>
                      <div className="text-sm text-white">{customer.email}</div>
                    </div>
                  </div>
                )}
                {(customer?.phone || orderData.shipping_phone) && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Phone</div>
                      <div className="text-sm text-white">{customer?.phone || orderData.shipping_phone}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {(orderData.shipping_address || orderData.shipping_city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-zinc-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500">Shipping Address</div>
                      {orderData.shipping_address && typeof orderData.shipping_address === 'string' && (
                        <div className="text-sm text-white">{orderData.shipping_address}</div>
                      )}
                      {(orderData.shipping_city || orderData.shipping_state || orderData.shipping_zip) && (
                        <div className="text-sm text-white">
                          {[orderData.shipping_city, orderData.shipping_state, orderData.shipping_zip].filter(v => typeof v === 'string' && v).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          {items.length > 0 && (
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-zinc-400" />
                  Order Items ({items.length})
                </h3>
              </div>
              <div className="divide-y divide-zinc-700/30">
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white">{item.product_name}</div>
                      <div className="text-xs text-zinc-500">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</div>
                    </div>
                    <div className="text-sm font-medium text-white tabular-nums">
                      {formatCurrency(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-800/50">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-400" />
                Payment Details
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              {orderData.payment_method && (
                <div>
                  <div className="text-xs text-zinc-500">Payment Method</div>
                  <div className="text-sm text-white capitalize">{orderData.payment_method.replace('_', ' ')}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-zinc-500">Created</div>
                <div className="text-sm text-white">{format(new Date(orderData.created_at), 'MMM d, yyyy h:mm:ss a')}</div>
              </div>
            </div>
          </div>

          {/* Record ID */}
          <div className="text-center text-xs text-zinc-600 font-mono">
            Order ID: {orderData.id}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Failed Checkout Details
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                {recordType === 'checkout_attempt' ? 'Checkout Attempt Record' : 'Failed Order Record'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full"></div>
          </div>
        ) : recordType === 'checkout_attempt' ? (
          renderCheckoutAttempt()
        ) : (
          renderFailedOrder()
        )}
      </div>
    </div>
  )
}
