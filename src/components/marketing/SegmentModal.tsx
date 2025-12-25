'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Users, Mail, Download, RefreshCw, Loader2, DollarSign, ShoppingBag, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { format, formatDistanceToNow } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'

interface CustomerSegment {
  id: string
  name: string
  description: string | null
  customer_count: number
  is_active: boolean
  type: string
  color: string | null
  filter_criteria?: any
  last_refreshed_at: string | null
  created_at: string
}

interface Customer {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  total_spent?: number
  total_orders?: number
  last_order_date?: string | null
  date_registered?: string | null
}

interface Props {
  segment: CustomerSegment
  onClose: () => void
  onEmailSegment: () => void
}

export function SegmentModal({ segment, onClose, onEmailSegment }: Props) {
  const { storeId } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [totalCustomers, setTotalCustomers] = useState(segment.customer_count)
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCustomers()
  }, [segment.id, storeId])

  const fetchCustomers = async () => {
    if (!storeId) return
    setLoading(true)

    try {
      // First try memberships table
      const { data: memberships } = await supabase
        .from('customer_segment_memberships')
        .select('customer_id')
        .eq('segment_id', segment.id)

      if (memberships && memberships.length > 0) {
        const customerIds = memberships.map(m => m.customer_id)
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone, total_spent, total_orders, last_order_date, date_registered')
          .in('id', customerIds)
          .order('total_spent', { ascending: false })

        setCustomers(customerData || [])
        setTotalCustomers(memberships.length)
      } else {
        // Memberships empty - query customers directly based on filter criteria
        const criteria = segment.filter_criteria || {}
        let query = supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone, total_spent, total_orders, last_order_date, date_registered')
          .eq('store_id', storeId)

        // VIP Customers - high spenders
        if (criteria.total_spent?.min) {
          query = query.gte('total_spent', criteria.total_spent.min)
        }

        // At Risk - days since last order
        if (criteria.days_since_last_order) {
          const minDays = criteria.days_since_last_order.min || 0
          const maxDays = criteria.days_since_last_order.max || 365
          const minDate = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString()
          const maxDate = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000).toISOString()
          query = query.gte('last_order_date', minDate).lte('last_order_date', maxDate)
        }

        // New Customers - recent registration/first order
        if (criteria.days_since_first_order?.max) {
          const daysAgo = new Date(Date.now() - criteria.days_since_first_order.max * 24 * 60 * 60 * 1000).toISOString()
          query = query.gte('date_registered', daysAgo)
        }

        // Never Ordered
        if (criteria.order_count?.max === 0 || segment.name.toLowerCase().includes('never ordered')) {
          query = query.or('total_orders.eq.0,total_orders.is.null')
        }

        // Weekly Regulars - ordered recently with high frequency
        if (criteria.order_frequency_days?.max) {
          const daysAgo = new Date(Date.now() - criteria.order_frequency_days.max * 24 * 60 * 60 * 1000).toISOString()
          query = query.gte('last_order_date', daysAgo)
        }

        // Order results
        query = query.order('total_spent', { ascending: false, nullsFirst: false })

        const { data: customerData, error } = await query

        if (error) {
          console.error('Query error:', error)
        }

        setCustomers(customerData || [])
        setTotalCustomers(segment.customer_count)
      }
    } catch (err) {
      console.error('Fetch customers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Trigger segment refresh via API
      await fetch('/api/segments/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: segment.id }),
      })
      await fetchCustomers()
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleExport = () => {
    if (customers.length === 0) return

    const csv = [
      ['Name', 'Email', 'Phone', 'Total Spent', 'Orders', 'Customer Since', 'Last Order'].join(','),
      ...customers.map(c => [
        `"${`${c.first_name || ''} ${c.last_name || ''}`.trim() || '-'}"`,
        c.email || '-',
        c.phone || '-',
        c.total_spent?.toFixed(2) || '0',
        c.total_orders ?? 0,
        c.date_registered ? format(new Date(c.date_registered), 'yyyy-MM-dd') : '-',
        c.last_order_date ? format(new Date(c.last_order_date), 'yyyy-MM-dd') : '-',
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${segment.name.toLowerCase().replace(/\s+/g, '-')}-customers.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  // Virtualizer for customer list
  const rowVirtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />

      <div className="fixed inset-4 md:inset-8 lg:inset-y-12 lg:inset-x-32 bg-zinc-950 border border-zinc-900 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: segment.color || '#71717a' }}
            />
            <div>
              <h2 className="text-sm font-medium text-white">{segment.name}</h2>
              <p className="text-[10px] text-zinc-500">
                {formatNumber(segment.customer_count)} customers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <button
              onClick={onEmailSegment}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium hover:bg-zinc-200"
            >
              <Mail className="w-3.5 h-3.5" />
              Email Segment
            </button>
            <button
              onClick={handleExport}
              disabled={customers.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Segment Stats */}
          <div className="p-4 border-b border-zinc-900 bg-zinc-900/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase">Customers</span>
                </div>
                <div className="text-lg font-semibold text-white">{formatNumber(totalCustomers)}</div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase">Total Value</span>
                </div>
                <div className="text-lg font-semibold text-emerald-400">
                  {customers.length > 0
                    ? formatCurrency(customers.reduce((sum, c) => sum + (c.total_spent || 0), 0))
                    : '-'}
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase">Avg Orders</span>
                </div>
                <div className="text-lg font-semibold text-white">
                  {customers.length > 0
                    ? (customers.reduce((sum, c) => sum + (c.total_orders || 0), 0) / customers.length).toFixed(1)
                    : '-'}
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase">With Email</span>
                </div>
                <div className="text-lg font-semibold text-white">
                  {customers.length > 0
                    ? `${Math.round((customers.filter(c => c.email).length / customers.length) * 100)}%`
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Segment Info */}
          <div className="p-4 border-b border-zinc-900">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Type</span>
                <p className="text-white capitalize mt-0.5">{segment.type || 'Dynamic'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Created</span>
                <p className="text-white mt-0.5">
                  {format(new Date(segment.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Last Refreshed</span>
                <p className="text-white mt-0.5">
                  {segment.last_refreshed_at
                    ? formatDistanceToNow(new Date(segment.last_refreshed_at), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Filter</span>
                <p className="text-white mt-0.5 truncate">
                  {segment.filter_criteria
                    ? Object.keys(segment.filter_criteria).map(k => k.replace(/_/g, ' ')).join(', ')
                    : 'None'}
                </p>
              </div>
            </div>
            {segment.description && (
              <p className="text-xs text-zinc-400 mt-3">{segment.description}</p>
            )}
          </div>

          {/* Customer List */}
          <div className="p-4 flex flex-col flex-1 min-h-0">
            <h3 className="text-xs font-medium text-white mb-3">
              Customers ({formatNumber(customers.length)})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No customers in this segment</p>
                <p className="text-[10px] text-zinc-700 mt-1">Try clicking Refresh to populate</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <div className="col-span-3">Customer</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2 text-right">Spent</div>
                  <div className="col-span-1 text-right">Orders</div>
                  <div className="col-span-2 text-right">Customer Since</div>
                  <div className="col-span-1 text-right">Last Order</div>
                </div>

                {/* Virtualized customer rows */}
                <div ref={parentRef} className="flex-1 overflow-auto min-h-[200px]">
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const customer = customers[virtualRow.index]
                      return (
                        <div
                          key={customer.id}
                          className="grid grid-cols-12 gap-2 px-3 py-2 hover:bg-zinc-900/50 transition-colors absolute w-full"
                          style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <div className="col-span-3 flex items-center">
                            <div className="text-xs text-white truncate">
                              {customer.first_name || customer.last_name
                                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                                : 'Unknown'}
                            </div>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <div className="text-[10px] text-zinc-400 truncate">
                              {customer.email || customer.phone || '-'}
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-xs text-emerald-400">
                              {customer.total_spent ? formatCurrency(customer.total_spent) : '-'}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center justify-end">
                            <span className="text-xs text-zinc-400">
                              {customer.total_orders ?? 0}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-[10px] text-zinc-500">
                              {customer.date_registered
                                ? format(new Date(customer.date_registered), 'MMM d, yyyy')
                                : '-'}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center justify-end">
                            <span className="text-[10px] text-zinc-500">
                              {customer.last_order_date
                                ? formatDistanceToNow(new Date(customer.last_order_date), { addSuffix: true })
                                : '-'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
