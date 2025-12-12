'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'
import { format } from 'date-fns'
import {
  Search,
  Users,
  UserPlus,
  Award,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'

interface CustomerWithStats extends Customer {
  order_count?: number
  total_spent?: number
}

export default function CustomersPage() {
  const { vendorId } = useAuthStore()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    newThisMonth: 0,
    avgLifetimeValue: 0,
    topTier: 0,
  })
  const pageSize = 20

  useEffect(() => {
    if (vendorId) {
      fetchCustomers()
      fetchCustomerStats()
    }
  }, [vendorId, page])

  const fetchCustomers = async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error

      const customersData = data as Customer[] | null
      const customerIds = customersData?.map((c) => c.id) || []

      if (customerIds.length > 0) {
        // Fetch ALL order stats with pagination
        const orderPageSize = 1000
        let allOrderStats: { customer_id: string | null; total_amount: number }[] = []
        let orderPage = 0
        let hasMoreOrders = true

        while (hasMoreOrders) {
          const { data: orderStats, error: orderError } = await supabase
            .from('orders')
            .select('customer_id, total_amount')
            .in('customer_id', customerIds)
            .eq('payment_status', 'paid')
            .range(orderPage * orderPageSize, (orderPage + 1) * orderPageSize - 1)

          if (orderError) throw orderError

          if (orderStats && orderStats.length > 0) {
            allOrderStats = [...allOrderStats, ...orderStats]
            hasMoreOrders = orderStats.length === orderPageSize
          } else {
            hasMoreOrders = false
          }
          orderPage++
        }

        const statsMap = new Map<string, { count: number; total: number }>()
        allOrderStats.forEach((order) => {
          if (order.customer_id) {
            const existing = statsMap.get(order.customer_id) || { count: 0, total: 0 }
            statsMap.set(order.customer_id, {
              count: existing.count + 1,
              total: existing.total + (order.total_amount || 0),
            })
          }
        })

        const customersWithStats = customersData?.map((customer) => ({
          ...customer,
          order_count: statsMap.get(customer.id)?.count || 0,
          total_spent: statsMap.get(customer.id)?.total || 0,
        }))

        setCustomers(customersWithStats || [])
      } else {
        setCustomers([])
      }

      setTotalCount(count || 0)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerStats = async () => {
    if (!vendorId) return

    try {
      const { count: total } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: newThisMonth } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .gte('created_at', startOfMonth.toISOString())

      const { count: topTier } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .in('loyalty_tier', ['gold', 'platinum', 'diamond'])

      // Fetch all orders with pagination for accurate LTV calculation
      const pageSize = 1000
      let allOrders: { customer_id: string | null; total_amount: number }[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('customer_id, total_amount')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')  // Only count paid orders for LTV
          .neq('status', 'cancelled')     // Exclude cancelled
          .not('customer_id', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allOrders = [...allOrders, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      const customerTotals = new Map<string, number>()
      allOrders.forEach((order) => {
        if (order.customer_id) {
          const existing = customerTotals.get(order.customer_id) || 0
          customerTotals.set(order.customer_id, existing + (order.total_amount || 0))
        }
      })

      const totals = Array.from(customerTotals.values())
      const avgLifetimeValue = totals.length > 0
        ? totals.reduce((a, b) => a + b, 0) / totals.length
        : 0

      setStats({
        total: total || 0,
        newThisMonth: newThisMonth || 0,
        avgLifetimeValue,
        topTier: topTier || 0,
      })
    } catch (error) {
      console.error('Failed to fetch customer stats:', error)
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      customer.first_name.toLowerCase().includes(searchLower) ||
      customer.last_name.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(search)
    )
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      bronze: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      silver: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      gold: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      platinum: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      diamond: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    }
    return styles[tier] || 'bg-zinc-800 text-zinc-400 border border-zinc-700'
  }

  const exportCustomers = async () => {
    if (!vendorId) return

    try {
      // Fetch ALL customers with pagination
      const exportPageSize = 1000
      let allCustomers: Customer[] = []
      let exportPage = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .range(exportPage * exportPageSize, (exportPage + 1) * exportPageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allCustomers = [...allCustomers, ...data]
          hasMore = data.length === exportPageSize
        } else {
          hasMore = false
        }
        exportPage++
      }

      // Fetch ALL order stats for these customers
      const customerIds = allCustomers.map(c => c.id)
      let allOrderStats: { customer_id: string | null; total_amount: number }[] = []

      // Batch customer IDs to avoid query limits
      const batchSize = 100
      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batchIds = customerIds.slice(i, i + batchSize)
        let orderPage = 0
        let hasMoreOrders = true

        while (hasMoreOrders) {
          const { data: orderStats } = await supabase
            .from('orders')
            .select('customer_id, total_amount')
            .in('customer_id', batchIds)
            .eq('payment_status', 'paid')
            .range(orderPage * 1000, (orderPage + 1) * 1000 - 1)

          if (orderStats && orderStats.length > 0) {
            allOrderStats = [...allOrderStats, ...orderStats]
            hasMoreOrders = orderStats.length === 1000
          } else {
            hasMoreOrders = false
          }
          orderPage++
        }
      }

      // Build stats map
      const statsMap = new Map<string, { count: number; total: number }>()
      allOrderStats.forEach((order) => {
        if (order.customer_id) {
          const existing = statsMap.get(order.customer_id) || { count: 0, total: 0 }
          statsMap.set(order.customer_id, {
            count: existing.count + 1,
            total: existing.total + (order.total_amount || 0),
          })
        }
      })

      // Generate CSV
      const csv = [
        ['Name', 'Email', 'Phone', 'Loyalty Tier', 'Points', 'Orders', 'Total Spent', 'Joined'].join(','),
        ...allCustomers.map((c) =>
          [
            `"${c.first_name} ${c.last_name}"`,
            c.email || '',
            c.phone || '',
            c.loyalty_tier,
            c.loyalty_points,
            statsMap.get(c.id)?.count || 0,
            statsMap.get(c.id)?.total || 0,
            format(new Date(c.created_at), 'yyyy-MM-dd'),
          ].join(',')
        ),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
    } catch (error) {
      console.error('Failed to export customers:', error)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light text-white tracking-wide">Customers</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">Manage your customer base and loyalty program</p>
        </div>
        <button
          onClick={exportCustomers}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-light"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Total Customers</p>
          <p className="text-2xl font-light text-white mt-1">{stats.total.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">New This Month</p>
          <p className="text-2xl font-light text-white mt-1">{stats.newThisMonth.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Avg Lifetime Value</p>
          <p className="text-2xl font-light text-white mt-1">{formatCurrency(stats.avgLifetimeValue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-4">Premium Members</p>
          <p className="text-2xl font-light text-white mt-1">{stats.topTier.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 text-sm"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Loyalty</th>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Points</th>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500 text-sm">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500 text-sm">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <span className="text-sm font-light text-emerald-500">
                            {customer.first_name[0]}{customer.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-light text-white">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.vendor_customer_number && (
                            <p className="text-xs text-zinc-600">#{customer.vendor_customer_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-300 font-light">{customer.email || '-'}</p>
                      <p className="text-sm text-zinc-500 font-light">{customer.phone || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-light capitalize ${getTierBadge(customer.loyalty_tier)}`}>
                        {customer.loyalty_tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300 font-light">
                      {customer.loyalty_points.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300 font-light">
                      {customer.order_count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-light text-white">
                      {formatCurrency(customer.total_spent || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 font-light">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-900 flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-light">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} customers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <span className="text-sm text-zinc-500 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-2 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
