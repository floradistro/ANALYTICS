'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import type { Order } from '@/types/database'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import { FilterBar } from '@/components/filters/FilterBar'
import { EditOrderModal } from '@/components/orders/EditOrderModal'

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

interface OrderWithCustomer extends Order {
  customer?: Customer | null
}

type OrderStatus = 'all' | 'pending' | 'shipped' | 'delivered' | 'cancelled'
type OrderType = 'all' | 'walk_in' | 'pickup' | 'delivery' | 'shipping'

export default function OrdersPage() {
  const { vendorId } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all')
  const [typeFilter, setTypeFilter] = useState<OrderType>('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [updatedOrderIds, setUpdatedOrderIds] = useState<Set<string>>(new Set())
  const pageSize = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchOrders = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)

    const { start, end } = getDateRangeForQuery()

    try {
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (typeFilter !== 'all') {
        query = query.eq('order_type', typeFilter)
      }

      if (filters.paymentMethods.length > 0) {
        query = query.in('payment_method', filters.paymentMethods)
      }

      if (filters.locationIds.length > 0) {
        query = query.in('pickup_location_id', filters.locationIds)
      }

      const searchTerm = debouncedSearch?.trim() || ''
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0)
        const looksLikeOrderNumber = searchTerm.length >= 8 && !searchTerm.includes(' ')

        if (looksLikeOrderNumber) {
          query = query.ilike('order_number', `%${searchTerm}%`)
        } else {
          const { data: allCustomers } = await supabase
            .from('customers')
            .select('id, first_name, last_name, email')
            .eq('vendor_id', vendorId)
            .or(
              searchWords.map(w =>
                `first_name.ilike.%${w}%,last_name.ilike.%${w}%,email.ilike.%${w}%`
              ).join(',')
            )
            .limit(500)

          const matchingCustomers = (allCustomers || []).filter(c => {
            const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
            const email = (c.email || '').toLowerCase()
            const combined = `${fullName} ${email}`
            return searchWords.every(word => combined.includes(word))
          })

          const customerIds = matchingCustomers.map(c => c.id)

          if (customerIds.length > 0) {
            query = query.or(`order_number.ilike.%${searchTerm}%,customer_id.in.(${customerIds.join(',')})`)
          } else {
            query = query.ilike('order_number', `%${searchTerm}%`)
          }
        }
      }

      query = query.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data: ordersData, error, count } = await query

      if (error) throw error

      const customerIds = [...new Set((ordersData || []).map(o => o.customer_id).filter(Boolean))]
      let customersMap: Record<string, Customer> = {}

      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .in('id', customerIds)

        if (customersData) {
          customersMap = Object.fromEntries(customersData.map(c => [c.id, c]))
        }
      }

      const ordersWithCustomers: OrderWithCustomer[] = (ordersData || []).map(order => ({
        ...order,
        customer: order.customer_id ? customersMap[order.customer_id] || null : null
      }))

      setOrders(ordersWithCustomers)
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Failed to fetch orders:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }, [vendorId, page, statusFilter, typeFilter, dateRange, filters, debouncedSearch])

  useEffect(() => {
    if (vendorId) {
      fetchOrders()
    }
  }, [vendorId, page, statusFilter, typeFilter, dateRange, filters, debouncedSearch, fetchOrders])

  // Realtime subscription for instant updates (like POS)
  useEffect(() => {
    if (!vendorId) return

    console.log('[Orders Realtime] Setting up subscription...')

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`
        },
        async (payload) => {
          console.log('[Orders Realtime] Change detected:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            // New order created - fetch customer data and prepend
            const newOrder = payload.new as Order
            let customer: Customer | null = null

            if (newOrder.customer_id) {
              const { data } = await supabase
                .from('customers')
                .select('id, first_name, last_name, email')
                .eq('id', newOrder.customer_id)
                .single()

              customer = data
            }

            setOrders(prev => [{...newOrder, customer}, ...prev])
            setTotalCount(prev => prev + 1)
          }
          else if (payload.eventType === 'UPDATE') {
            // Order updated - fetch fresh customer data and update in place
            const updatedOrder = payload.new as Order
            let customer: Customer | null = null

            if (updatedOrder.customer_id) {
              const { data } = await supabase
                .from('customers')
                .select('id, first_name, last_name, email')
                .eq('id', updatedOrder.customer_id)
                .single()

              customer = data
            }

            setOrders(prev => prev.map(o =>
              o.id === updatedOrder.id
                ? { ...updatedOrder, customer: customer || o.customer }
                : o
            ))

            // Highlight the updated order for 2 seconds
            setUpdatedOrderIds(prev => new Set(prev).add(updatedOrder.id))
            setTimeout(() => {
              setUpdatedOrderIds(prev => {
                const next = new Set(prev)
                next.delete(updatedOrder.id)
                return next
              })
            }, 2000)
          }
          else if (payload.eventType === 'DELETE') {
            // Order deleted - remove from list
            const deletedId = payload.old.id
            setOrders(prev => prev.filter(o => o.id !== deletedId))
            setTotalCount(prev => prev - 1)
          }
        }
      )
      .subscribe((status) => {
        console.log('[Orders Realtime] Subscription status:', status)
      })

    // Cleanup on unmount
    return () => {
      console.log('[Orders Realtime] Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [vendorId])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const exportOrders = () => {
    const csv = [
      ['Order #', 'Customer', 'Type', 'Status', 'Payment', 'Subtotal', 'Tax', 'Total', 'Date'].join(','),
      ...orders.map((o) =>
        [
          o.order_number,
          o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Guest',
          o.order_type,
          o.status,
          o.payment_status,
          o.subtotal,
          o.tax_amount,
          o.total_amount,
          o.created_at ? format(new Date(o.created_at), 'yyyy-MM-dd HH:mm') : '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-400',
      processing: 'bg-blue-500/10 text-blue-400',
      shipped: 'bg-purple-500/10 text-purple-400',
      delivered: 'bg-emerald-500/10 text-emerald-400',
      cancelled: 'bg-zinc-500/10 text-zinc-500',
    }
    return styles[status] || 'bg-zinc-800 text-zinc-400'
  }

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-500/10 text-emerald-400',
      pending: 'bg-amber-500/10 text-amber-400',
      failed: 'bg-red-500/10 text-red-400',
      refunded: 'bg-zinc-500/10 text-zinc-400',
    }
    return styles[status] || 'bg-zinc-800 text-zinc-400'
  }

  const openEdit = (orderId: string) => {
    setEditOrderId(orderId)
    setEditModalOpen(true)
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-medium text-white tracking-tight">Orders</h1>
          <p className="text-zinc-500 text-xs lg:text-sm mt-0.5">
            {totalCount > 0 ? `${totalCount.toLocaleString()} orders` : 'Manage orders'}
          </p>
        </div>
        <button
          onClick={exportOrders}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <FilterBar showPaymentFilter={true} showOrderTypeFilter={false} />

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as OrderType)
              setPage(0)
            }}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-600 text-sm"
          >
            <option value="all">All Types</option>
            <option value="walk_in">Walk In</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
            <option value="shipping">Shipping</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus)
              setPage(0)
            }}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-600 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-950 border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Payment</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 text-sm">
                    No orders found
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {orders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        backgroundColor: updatedOrderIds.has(order.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        transition: {
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                          mass: 0.8,
                          backgroundColor: { duration: 0.3 }
                        }
                      }}
                      exit={{
                        opacity: 0,
                        x: -100,
                        scale: 0.95,
                        transition: {
                          duration: 0.2
                        }
                      }}
                      layout
                      onClick={() => openEdit(order.id)}
                      className="hover:bg-zinc-900/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 hidden sm:table-cell">
                        {order.customer
                          ? `${order.customer.first_name} ${order.customer.last_name}`
                          : <span className="text-zinc-600">Guest</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 capitalize">
                        {(order.order_type || '').replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${getStatusBadge(order.status || 'pending')}`}>
                          {order.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${getPaymentBadge(order.payment_status || 'pending')}`}>
                          {order.payment_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white tabular-nums">
                        {formatCurrency(order.total_amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500 hidden lg:table-cell whitespace-nowrap">
                        {order.created_at ? format(new Date(order.created_at), 'MMM d, h:mm a') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(order.id)
                          }}
                          className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 border border-zinc-800 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <span className="text-xs text-zinc-500 px-2 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 border border-zinc-800 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      <EditOrderModal
        orderId={editOrderId}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditOrderId(null)
        }}
        onSave={fetchOrders}
      />
    </div>
  )
}
