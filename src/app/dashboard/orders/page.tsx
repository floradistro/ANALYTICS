'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import type { Order } from '@/types/database'
import { format } from 'date-fns'
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react'
import { FilterBar } from '@/components/filters/FilterBar'

interface OrderWithCustomer extends Order {
  customers?: {
    first_name: string
    last_name: string
    email: string | null
  } | null
}

type OrderStatus = 'all' | 'pending' | 'shipped' | 'delivered' | 'cancelled'

export default function OrdersPage() {
  const { vendorId } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null)
  const pageSize = 20

  const fetchOrders = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' })
        .eq('vendor_id', vendorId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (filters.paymentMethods.length > 0) {
        query = query.in('payment_method', filters.paymentMethods)
      }

      if (filters.orderTypes.length > 0) {
        query = query.in('order_type', filters.orderTypes)
      }

      if (filters.locationIds.length > 0) {
        query = query.in('pickup_location_id', filters.locationIds)
      }

      // Apply pagination AFTER all filters
      query = query.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Supabase orders error:', error.message, error.code, error.details)
        throw error
      }

      setOrders(data || [])
      setTotalCount(count || 0)
    } catch (error: any) {
      console.error('Failed to fetch orders:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }, [vendorId, page, statusFilter, dateRange, filters])

  useEffect(() => {
    if (vendorId) {
      fetchOrders()
    }
  }, [vendorId, page, statusFilter, dateRange, filters, fetchOrders])

  const filteredOrders = orders.filter((order) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      order.order_number.toLowerCase().includes(searchLower) ||
      order.customers?.first_name?.toLowerCase().includes(searchLower) ||
      order.customers?.last_name?.toLowerCase().includes(searchLower) ||
      order.customers?.email?.toLowerCase().includes(searchLower)
    )
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)

  const exportOrders = () => {
    const csv = [
      ['Order #', 'Type', 'Status', 'Payment', 'Subtotal', 'Tax', 'Total', 'Date', 'Customer'].join(','),
      ...filteredOrders.map((o) =>
        [
          o.order_number,
          o.order_type,
          o.status,
          o.payment_status,
          o.subtotal,
          o.tax_amount,
          o.total_amount,
          format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
          o.customers ? `${o.customers.first_name} ${o.customers.last_name}` : 'Guest',
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
      pending: 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30',
      shipped: 'bg-slate-700/30 text-slate-300 border border-slate-600/30',
      delivered: 'bg-slate-700/40 text-slate-200 border border-slate-600/40',
      cancelled: 'bg-zinc-900/50 text-zinc-500 border border-zinc-800/30',
    }
    return styles[status] || 'bg-zinc-800 text-zinc-400 border border-zinc-700'
  }

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-slate-700/30 text-slate-300 border border-slate-600/30',
      pending: 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30',
      failed: 'bg-zinc-900/50 text-zinc-500 border border-zinc-800/30',
      refunded: 'bg-zinc-800/30 text-zinc-400 border border-zinc-700/30',
    }
    return styles[status] || 'bg-zinc-800 text-zinc-400 border border-zinc-700'
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-light text-white tracking-wide">Orders</h1>
          <p className="text-zinc-500 text-xs lg:text-sm font-light mt-1">Manage and track all orders</p>
        </div>
        <button
          onClick={exportOrders}
          className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors text-xs lg:text-sm font-light self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 lg:space-y-4">
        <FilterBar
          showPaymentFilter={true}
        />

        <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-1.5 lg:py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 text-xs lg:text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus)
              setPage(0)
            }}
            className="px-2.5 lg:px-3 py-1.5 lg:py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-700 text-xs lg:text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Order</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider hidden md:table-cell">Payment</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">Total</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-3 lg:px-6 py-2 lg:py-4 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 lg:px-6 py-6 lg:py-8 text-center text-zinc-500 text-xs lg:text-sm">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 lg:px-6 py-6 lg:py-8 text-center text-zinc-500 text-xs lg:text-sm">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-xs lg:text-sm font-light text-white">
                      {order.order_number}
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-xs lg:text-sm text-zinc-400 font-light hidden sm:table-cell">
                      {order.customers
                        ? `${order.customers.first_name} ${order.customers.last_name}`
                        : 'Guest'}
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-xs lg:text-sm text-zinc-400 capitalize font-light">
                      {order.order_type.replace('_', ' ')}
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4">
                      <span className={`inline-flex px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs font-light ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 hidden md:table-cell">
                      <span className={`inline-flex px-1.5 lg:px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs font-light ${getPaymentBadge(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-xs lg:text-sm font-light text-white">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4 text-xs lg:text-sm text-zinc-500 font-light hidden lg:table-cell whitespace-nowrap">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-3 lg:px-6 py-2.5 lg:py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 lg:p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 lg:px-6 py-3 lg:py-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] lg:text-sm text-zinc-500 font-light">
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1 lg:gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 lg:p-2 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-400" />
              </button>
              <span className="text-xs lg:text-sm text-zinc-500 px-1 lg:px-2">
                {page + 1}/{totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 lg:p-2 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-zinc-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
              <h2 className="text-sm font-light text-white tracking-wide">Order #{selectedOrder.order_number}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Order Type</p>
                  <p className="text-sm font-light text-white capitalize mt-1">{selectedOrder.order_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-light mt-1 ${getStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Payment Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-light mt-1 ${getPaymentBadge(selectedOrder.payment_status)}`}>
                    {selectedOrder.payment_status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Date</p>
                  <p className="text-sm font-light text-white mt-1">{format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>

              <hr className="border-zinc-900" />

              {selectedOrder.customers && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-sm font-light text-white">{selectedOrder.customers.first_name} {selectedOrder.customers.last_name}</p>
                  {selectedOrder.customers.email && (
                    <p className="text-sm text-zinc-500 font-light">{selectedOrder.customers.email}</p>
                  )}
                </div>
              )}

              {selectedOrder.order_type === 'shipping' && selectedOrder.shipping_address_line1 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Shipping Address</p>
                  <p className="text-sm font-light text-white">{selectedOrder.shipping_name}</p>
                  <p className="text-sm text-zinc-500 font-light">
                    {selectedOrder.shipping_address_line1}
                    {selectedOrder.shipping_address_line2 && <>, {selectedOrder.shipping_address_line2}</>}
                  </p>
                  <p className="text-sm text-zinc-500 font-light">
                    {selectedOrder.shipping_city}, {selectedOrder.shipping_state} {selectedOrder.shipping_postal_code}
                  </p>
                  {selectedOrder.tracking_number && (
                    <p className="text-sm text-slate-300 font-light mt-1">Tracking: {selectedOrder.tracking_number}</p>
                  )}
                </div>
              )}

              <hr className="border-zinc-900" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-light">Subtotal</span>
                  <span className="text-white font-light">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-light">Tax</span>
                  <span className="text-white font-light">{formatCurrency(selectedOrder.tax_amount)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-light">Discount</span>
                    <span className="text-slate-400 font-light">-{formatCurrency(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-2 border-t border-zinc-900">
                  <span className="text-white font-light">Total</span>
                  <span className="text-white">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
