'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  DollarSign,
  Receipt,
  Percent,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { FilterBar, useFilters } from '@/components/filters/FilterBar'

interface MonthlyReport {
  month: string
  revenue: number
  tax: number
  discounts: number
  orders: number
  netRevenue: number
}

interface PaymentBreakdown {
  method: string
  count: number
  amount: number
}

interface PaymentStats {
  successful: number
  failed: number
  pending: number
  successRate: number
}

export default function FinancialReportsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const { filters, setFilters } = useFilters()
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState<6 | 12>(6)
  const [totals, setTotals] = useState({
    grossRevenue: 0,
    taxCollected: 0,
    discountsGiven: 0,
    netRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  })

  const fetchMonthlyReports = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      const reports: MonthlyReport[] = []
      const pageSize = 1000

      for (let i = reportPeriod - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i)
        const start = startOfMonth(date)
        const end = endOfMonth(date)

        // Fetch ALL PAID orders for this month with pagination (exclude failed/pending/cancelled)
        let allOrders: { subtotal: number; tax_amount: number; discount_amount: number; total_amount: number; metadata: any; affiliate_discount_amount: number }[] = []
        let page = 0
        let hasMore = true

        while (hasMore) {
          let query = supabase
            .from('orders')
            .select('subtotal, tax_amount, discount_amount, total_amount, metadata, affiliate_discount_amount')
            .eq('vendor_id', vendorId)
            .eq('payment_status', 'paid')  // Only count paid orders
            .neq('status', 'cancelled')     // Exclude cancelled orders
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())

          // Apply filters BEFORE pagination
          if (filters.orderTypes.length > 0) {
            query = query.in('order_type', filters.orderTypes)
          }
          if (filters.locationIds.length > 0) {
            query = query.in('pickup_location_id', filters.locationIds)
          }

          // Apply pagination AFTER all filters
          query = query.range(page * pageSize, (page + 1) * pageSize - 1)

          const { data, error } = await query
          if (error) throw error

          if (data && data.length > 0) {
            allOrders = [...allOrders, ...data]
            hasMore = data.length === pageSize
          } else {
            hasMore = false
          }
          page++
        }

        const revenue = allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const tax = allOrders.reduce((sum, o) => sum + (o.tax_amount || 0), 0)
        // Include ALL discount sources: discount_amount + campaign + loyalty + affiliate
        const discounts = allOrders.reduce((sum, o) => {
          const fieldDiscount = o.discount_amount || 0
          const campaignDiscount = o.metadata?.campaign_discount_amount || 0
          const loyaltyDiscount = o.metadata?.loyalty_discount_amount || 0
          const affiliateDiscount = o.affiliate_discount_amount || 0
          return sum + fieldDiscount + campaignDiscount + loyaltyDiscount + affiliateDiscount
        }, 0)
        // Net Revenue = Total - Tax (what you actually earned after tax remittance)
        const netRevenue = revenue - tax

        reports.push({
          month: format(date, 'MMM yyyy'),
          revenue,
          tax,
          discounts,
          orders: allOrders.length,
          netRevenue,
        })
      }

      setMonthlyReports(reports)

      // Calculate totals
      const grossRevenue = reports.reduce((sum, r) => sum + r.revenue, 0)
      const taxCollected = reports.reduce((sum, r) => sum + r.tax, 0)
      const discountsGiven = reports.reduce((sum, r) => sum + r.discounts, 0)
      const totalOrders = reports.reduce((sum, r) => sum + r.orders, 0)

      setTotals({
        grossRevenue,
        taxCollected,
        discountsGiven,
        netRevenue: grossRevenue - taxCollected,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? grossRevenue / totalOrders : 0,
      })
    } catch (error) {
      console.error('Failed to fetch monthly reports:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId, reportPeriod, filters])

  const fetchPaymentBreakdown = useCallback(async () => {
    if (!vendorId) return

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch ALL checkout attempts with pagination
      const pageSize = 1000
      let allAttempts: { payment_method: string; subtotal: number; status: string }[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('checkout_attempts')
          .select('payment_method, subtotal, status')
          .eq('vendor_id', vendorId)
          .in('status', ['approved', 'completed'])
          .gte('created_at', start)
          .lte('created_at', end)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allAttempts = [...allAttempts, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      const methodMap = new Map<string, { count: number; amount: number }>()

      allAttempts.forEach((attempt) => {
        const method = attempt.payment_method || 'Unknown'
        const existing = methodMap.get(method) || { count: 0, amount: 0 }
        methodMap.set(method, {
          count: existing.count + 1,
          amount: existing.amount + (attempt.subtotal || 0),
        })
      })

      const breakdown = Array.from(methodMap.entries())
        .map(([method, data]) => ({
          method: method.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          ...data,
        }))
        .sort((a, b) => b.amount - a.amount)

      setPaymentBreakdown(breakdown)
    } catch (error) {
      console.error('Failed to fetch payment breakdown:', error)
    }
  }, [vendorId, dateRange, filters])

  const fetchPaymentStats = useCallback(async () => {
    if (!vendorId) return

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      // Fetch ALL checkout attempts with pagination
      const pageSize = 1000
      let allAttempts: { status: string }[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('checkout_attempts')
          .select('status')
          .eq('vendor_id', vendorId)
          .gte('created_at', start)
          .lte('created_at', end)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allAttempts = [...allAttempts, ...data]
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
        page++
      }

      const successful = allAttempts.filter((a) => a.status === 'approved' || a.status === 'completed').length
      const failed = allAttempts.filter((a) => a.status === 'failed' || a.status === 'declined').length
      const pending = allAttempts.filter((a) => a.status === 'pending').length
      const total = successful + failed + pending
      const successRate = total > 0 ? (successful / total) * 100 : 0

      setPaymentStats({ successful, failed, pending, successRate })
    } catch (error) {
      console.error('Failed to fetch payment stats:', error)
    }
  }, [vendorId, dateRange, filters])

  useEffect(() => {
    if (vendorId) {
      fetchMonthlyReports()
      fetchPaymentBreakdown()
      fetchPaymentStats()
    }
  }, [vendorId, reportPeriod, dateRange, filters, fetchMonthlyReports, fetchPaymentBreakdown, fetchPaymentStats])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)

  const exportReport = () => {
    const csv = [
      ['Month', 'Gross Revenue', 'Tax Collected', 'Discounts', 'Net Revenue', 'Orders'].join(','),
      ...monthlyReports.map((r) =>
        [r.month, r.revenue, r.tax, r.discounts, r.netRevenue, r.orders].join(',')
      ),
      '',
      ['Totals', totals.grossRevenue, totals.taxCollected, totals.discountsGiven, totals.netRevenue, totals.totalOrders].join(','),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  // Calculate month-over-month growth
  const lastMonth = monthlyReports[monthlyReports.length - 1]
  const prevMonth = monthlyReports[monthlyReports.length - 2]
  const revenueGrowth = prevMonth?.revenue
    ? ((lastMonth?.revenue || 0) - prevMonth.revenue) / prevMonth.revenue * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-light text-white tracking-wide">Financial Reports</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">Revenue, tax, and payment analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(Number(e.target.value) as 6 | 12)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-zinc-700 text-sm"
            >
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          </div>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-light"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        showDateFilter={false}
        showPaymentFilter={false}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            {revenueGrowth !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-3">Gross Revenue</p>
          <p className="text-xl font-light text-white mt-1">{formatCurrency(totals.grossRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-3">Tax Collected</p>
          <p className="text-xl font-light text-white mt-1">{formatCurrency(totals.taxCollected)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Percent className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-3">Discounts Given</p>
          <p className="text-xl font-light text-white mt-1">{formatCurrency(totals.discountsGiven)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-3">Net Revenue</p>
          <p className="text-xl font-light text-white mt-1">{formatCurrency(totals.netRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-3">Total Orders</p>
          <p className="text-xl font-light text-white mt-1">{totals.totalOrders.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-3">Avg Order Value</p>
          <p className="text-xl font-light text-white mt-1">{formatCurrency(totals.avgOrderValue)}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-950 border border-zinc-900 p-6">
        <h3 className="text-sm font-light text-white mb-6 tracking-wide">Monthly Revenue</h3>
        <div className="h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReports}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#71717a" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '0px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 0, 0, 0]} name="Gross Revenue" />
                <Bar dataKey="netRevenue" fill="#0071e3" radius={[0, 0, 0, 0]} name="Net Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax & Discounts Trend */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <h3 className="text-sm font-light text-white mb-6 tracking-wide">Tax & Discounts Trend</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyReports}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#71717a" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value)]}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '0px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="tax" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Tax Collected" />
                <Line type="monotone" dataKey="discounts" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Discounts" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <h3 className="text-sm font-light text-white mb-6 tracking-wide">Payment Methods</h3>
          {paymentBreakdown.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-zinc-500 text-sm">
              No payment data available
            </div>
          ) : (
            <div className="space-y-4">
              {paymentBreakdown.map((item, index) => {
                const maxAmount = paymentBreakdown[0]?.amount || 1
                const percentage = (item.amount / maxAmount) * 100
                return (
                  <div key={item.method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-light text-white">{item.method}</span>
                      <div className="text-sm text-zinc-500 font-light">
                        {item.count} transactions · {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Success Rate */}
      {paymentStats && (
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <h3 className="text-sm font-light text-white mb-6 tracking-wide">Payment Success Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-light text-emerald-400">{paymentStats.successful}</div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">Successful</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-red-400">{paymentStats.failed}</div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">Failed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-yellow-400">{paymentStats.pending}</div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-white">{paymentStats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">Success Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-900">
          <h3 className="text-sm font-light text-white tracking-wide">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-4 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-4 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Gross Revenue</th>
                <th className="px-6 py-4 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Tax</th>
                <th className="px-6 py-4 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Discounts</th>
                <th className="px-6 py-4 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {monthlyReports.map((report) => (
                <tr key={report.month} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-light text-white">{report.month}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400 text-right font-light">{report.orders.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-white text-right font-light">{formatCurrency(report.revenue)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400 text-right font-light">{formatCurrency(report.tax)}</td>
                  <td className="px-6 py-4 text-sm text-orange-400 text-right font-light">-{formatCurrency(report.discounts)}</td>
                  <td className="px-6 py-4 text-sm font-light text-emerald-400 text-right">{formatCurrency(report.netRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
              <tr>
                <td className="px-6 py-4 text-sm font-light text-white">Total</td>
                <td className="px-6 py-4 text-sm text-white text-right font-light">{totals.totalOrders.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-white text-right font-light">{formatCurrency(totals.grossRevenue)}</td>
                <td className="px-6 py-4 text-sm text-white text-right font-light">{formatCurrency(totals.taxCollected)}</td>
                <td className="px-6 py-4 text-sm text-orange-400 text-right font-light">-{formatCurrency(totals.discountsGiven)}</td>
                <td className="px-6 py-4 text-sm text-emerald-400 text-right font-light">{formatCurrency(totals.netRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
