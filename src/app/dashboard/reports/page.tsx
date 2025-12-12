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

interface TaxByLocation {
  locationId: string
  locationName: string
  state: string
  configuredRate: number
  orders: number
  subtotal: number
  taxCollected: number
  effectiveRate: number
}

interface TaxByState {
  state: string
  orders: number
  subtotal: number
  taxCollected: number
}

interface DiscountBreakdown {
  type: string
  amount: number
  orders: number
}

// Format payment method names for display
const formatPaymentMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    'cash': 'Cash',
    'card': 'Credit/Debit Card',
    'credit_card': 'Credit Card',
    'debit_card': 'Debit Card',
    'apple_pay': 'Apple Pay',
    'google_pay': 'Google Pay',
    'split': 'Split Payment',
    'dev_test': 'Test Payment',
    'authorizenet': 'Credit Card',
  }
  return methodMap[method.toLowerCase()] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
  const [taxByLocation, setTaxByLocation] = useState<TaxByLocation[]>([])
  const [taxByState, setTaxByState] = useState<TaxByState[]>([])
  const [discountBreakdown, setDiscountBreakdown] = useState<DiscountBreakdown[]>([])
  const [taxReportMonth, setTaxReportMonth] = useState<string>('all') // 'all' or 'YYYY-MM'

  // Generate list of months for the tax report filter (last 24 months)
  const availableMonths = Array.from({ length: 24 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    }
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
      // Fetch ALL PAID orders with payment method (not checkout_attempts)
      const pageSize = 1000
      let allOrders: { payment_method: string; total_amount: number }[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('payment_method, total_amount')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')
          .gte('created_at', start)
          .lte('created_at', end)
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

      const methodMap = new Map<string, { count: number; amount: number }>()

      allOrders.forEach((order) => {
        const method = order.payment_method || 'Unknown'
        const existing = methodMap.get(method) || { count: 0, amount: 0 }
        methodMap.set(method, {
          count: existing.count + 1,
          amount: existing.amount + (order.total_amount || 0),
        })
      })

      const breakdown = Array.from(methodMap.entries())
        .map(([method, data]) => ({
          method: formatPaymentMethod(method),
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
      // Fetch ALL orders payment status (not checkout_attempts)
      const pageSize = 1000
      let allOrders: { payment_status: string }[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('payment_status')
          .eq('vendor_id', vendorId)
          .neq('status', 'cancelled')
          .gte('created_at', start)
          .lte('created_at', end)
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

      const successful = allOrders.filter((o) => o.payment_status === 'paid').length
      const failed = allOrders.filter((o) => o.payment_status === 'failed').length
      const pending = allOrders.filter((o) => o.payment_status === 'pending').length
      const total = successful + failed + pending
      const successRate = total > 0 ? (successful / total) * 100 : 0

      setPaymentStats({ successful, failed, pending, successRate })
    } catch (error) {
      console.error('Failed to fetch payment stats:', error)
    }
  }, [vendorId, dateRange, filters])

  const fetchTaxByLocation = useCallback(async () => {
    if (!vendorId) return

    try {
      // Fetch locations
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, state, settings')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)

      const locationMap = new Map<string, { name: string; state: string; configuredRate: number }>()
      for (const loc of locations || []) {
        const taxConfig = loc.settings?.tax_config
        const configuredRate = taxConfig?.sales_tax_rate || taxConfig?.default_rate / 100 || 0
        locationMap.set(loc.id, {
          name: loc.name,
          state: loc.state,
          configuredRate: configuredRate * 100,
        })
      }

      // Calculate date range based on selected month
      let startDate: Date | null = null
      let endDate: Date | null = null
      if (taxReportMonth !== 'all') {
        const [year, month] = taxReportMonth.split('-').map(Number)
        startDate = new Date(year, month - 1, 1)
        endDate = endOfMonth(startDate)
      }

      // Fetch all paid orders with location and tax info
      const pageSize = 1000
      let allOrders: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('pickup_location_id, subtotal, tax_amount, order_type, shipping_state')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')

        // Apply date filter if a specific month is selected
        if (startDate && endDate) {
          query = query
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        }

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

      // Aggregate by location
      const byLocation = new Map<string, { orders: number; subtotal: number; tax: number }>()
      const byState = new Map<string, { orders: number; subtotal: number; tax: number }>()

      for (const order of allOrders) {
        const locId = order.pickup_location_id || 'ecommerce'
        const locInfo = locationMap.get(locId)
        const state = locInfo?.state || order.shipping_state || 'Unknown'

        // By location
        const locData = byLocation.get(locId) || { orders: 0, subtotal: 0, tax: 0 }
        locData.orders++
        locData.subtotal += parseFloat(order.subtotal || 0)
        locData.tax += parseFloat(order.tax_amount || 0)
        byLocation.set(locId, locData)

        // By state
        const stateData = byState.get(state) || { orders: 0, subtotal: 0, tax: 0 }
        stateData.orders++
        stateData.subtotal += parseFloat(order.subtotal || 0)
        stateData.tax += parseFloat(order.tax_amount || 0)
        byState.set(state, stateData)
      }

      // Convert to arrays
      const taxByLocationData: TaxByLocation[] = Array.from(byLocation.entries())
        .map(([locId, data]) => {
          const locInfo = locationMap.get(locId)
          return {
            locationId: locId,
            locationName: locInfo?.name || (locId === 'ecommerce' ? 'E-Commerce (Shipping)' : 'Unknown'),
            state: locInfo?.state || 'Various',
            configuredRate: locInfo?.configuredRate || 0,
            orders: data.orders,
            subtotal: data.subtotal,
            taxCollected: data.tax,
            effectiveRate: data.subtotal > 0 ? (data.tax / data.subtotal) * 100 : 0,
          }
        })
        .sort((a, b) => b.taxCollected - a.taxCollected)

      const taxByStateData: TaxByState[] = Array.from(byState.entries())
        .map(([state, data]) => ({
          state,
          orders: data.orders,
          subtotal: data.subtotal,
          taxCollected: data.tax,
        }))
        .sort((a, b) => b.taxCollected - a.taxCollected)

      setTaxByLocation(taxByLocationData)
      setTaxByState(taxByStateData)
    } catch (error) {
      console.error('Failed to fetch tax by location:', error)
    }
  }, [vendorId, taxReportMonth])

  const fetchDiscountBreakdown = useCallback(async () => {
    if (!vendorId) return

    try {
      // Calculate date range based on selected month
      let startDate: Date | null = null
      let endDate: Date | null = null
      if (taxReportMonth !== 'all') {
        const [year, month] = taxReportMonth.split('-').map(Number)
        startDate = new Date(year, month - 1, 1)
        endDate = endOfMonth(startDate)
      }

      const pageSize = 1000
      let allOrders: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('discount_amount, metadata, affiliate_discount_amount')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')

        // Apply date filter if a specific month is selected
        if (startDate && endDate) {
          query = query
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        }

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

      // Aggregate discounts by type
      let fieldDiscount = 0, fieldCount = 0
      let campaignDiscount = 0, campaignCount = 0
      let loyaltyDiscount = 0, loyaltyCount = 0
      let affiliateDiscount = 0, affiliateCount = 0

      for (const order of allOrders) {
        const fd = parseFloat(order.discount_amount || 0)
        const cd = parseFloat(order.metadata?.campaign_discount_amount || 0)
        const ld = parseFloat(order.metadata?.loyalty_discount_amount || 0)
        const ad = parseFloat(order.affiliate_discount_amount || 0)

        if (fd > 0) { fieldDiscount += fd; fieldCount++ }
        if (cd > 0) { campaignDiscount += cd; campaignCount++ }
        if (ld > 0) { loyaltyDiscount += ld; loyaltyCount++ }
        if (ad > 0) { affiliateDiscount += ad; affiliateCount++ }
      }

      const breakdown: DiscountBreakdown[] = [
        { type: 'Campaign/Promo', amount: campaignDiscount, orders: campaignCount },
        { type: 'Loyalty Points', amount: loyaltyDiscount, orders: loyaltyCount },
        { type: 'Affiliate Codes', amount: affiliateDiscount, orders: affiliateCount },
        { type: 'Manual/Other', amount: fieldDiscount, orders: fieldCount },
      ].filter(d => d.amount > 0)

      setDiscountBreakdown(breakdown)
    } catch (error) {
      console.error('Failed to fetch discount breakdown:', error)
    }
  }, [vendorId, taxReportMonth])

  useEffect(() => {
    if (vendorId) {
      fetchMonthlyReports()
      fetchPaymentBreakdown()
      fetchPaymentStats()
      fetchTaxByLocation()
      fetchDiscountBreakdown()
    }
  }, [vendorId, reportPeriod, dateRange, filters, fetchMonthlyReports, fetchPaymentBreakdown, fetchPaymentStats, fetchTaxByLocation, fetchDiscountBreakdown])

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

      {/* Tax Reports Section */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-light text-white tracking-wide">Tax & Discount Reports</h2>
          <p className="text-xs text-zinc-500 mt-1">Filter by month for tax filing</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <select
            value={taxReportMonth}
            onChange={(e) => setTaxReportMonth(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-zinc-700 text-sm min-w-[180px]"
          >
            <option value="all">All Time</option>
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax by Location */}
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Tax by Location</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {taxReportMonth === 'all' ? 'All time' : availableMonths.find(m => m.value === taxReportMonth)?.label}
            </p>
          </div>
          <div className="overflow-x-auto">
            {taxByLocation.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-sm">No tax data available</div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Subtotal</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Tax</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {taxByLocation.map((loc) => (
                    <tr key={loc.locationId} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-light text-white">
                        {loc.locationName}
                        <span className="text-zinc-500 ml-2">({loc.state})</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-zinc-400 text-right font-light">{loc.orders.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-zinc-400 text-right font-light">{formatCurrency(loc.subtotal)}</td>
                      <td className="px-6 py-3 text-sm text-emerald-400 text-right font-light">{formatCurrency(loc.taxCollected)}</td>
                      <td className="px-6 py-3 text-sm text-zinc-400 text-right font-light">{loc.effectiveRate.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                  <tr>
                    <td className="px-6 py-3 text-sm font-light text-white">Total</td>
                    <td className="px-6 py-3 text-sm text-white text-right font-light">
                      {taxByLocation.reduce((sum, l) => sum + l.orders, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-white text-right font-light">
                      {formatCurrency(taxByLocation.reduce((sum, l) => sum + l.subtotal, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm text-emerald-400 text-right font-light">
                      {formatCurrency(taxByLocation.reduce((sum, l) => sum + l.taxCollected, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-400 text-right font-light">-</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Tax by State */}
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Tax by State</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {taxReportMonth === 'all' ? 'All time' : availableMonths.find(m => m.value === taxReportMonth)?.label}
            </p>
          </div>
          <div className="overflow-x-auto">
            {taxByState.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-sm">No tax data available</div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">State</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Taxable Sales</th>
                    <th className="px-6 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Tax Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {taxByState.map((state) => (
                    <tr key={state.state} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-light text-white">{state.state}</td>
                      <td className="px-6 py-3 text-sm text-zinc-400 text-right font-light">{state.orders.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-zinc-400 text-right font-light">{formatCurrency(state.subtotal)}</td>
                      <td className="px-6 py-3 text-sm text-emerald-400 text-right font-light">{formatCurrency(state.taxCollected)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                  <tr>
                    <td className="px-6 py-3 text-sm font-light text-white">Total</td>
                    <td className="px-6 py-3 text-sm text-white text-right font-light">
                      {taxByState.reduce((sum, s) => sum + s.orders, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-white text-right font-light">
                      {formatCurrency(taxByState.reduce((sum, s) => sum + s.subtotal, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm text-emerald-400 text-right font-light">
                      {formatCurrency(taxByState.reduce((sum, s) => sum + s.taxCollected, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Discount Breakdown */}
      {discountBreakdown.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-900 p-6">
          <h3 className="text-sm font-light text-white mb-2 tracking-wide">Discount Breakdown</h3>
          <p className="text-xs text-zinc-500 mb-4">
            {taxReportMonth === 'all' ? 'All time' : availableMonths.find(m => m.value === taxReportMonth)?.label}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {discountBreakdown.map((discount) => {
              const totalDiscounts = discountBreakdown.reduce((sum, d) => sum + d.amount, 0)
              const percentage = totalDiscounts > 0 ? (discount.amount / totalDiscounts) * 100 : 0
              return (
                <div key={discount.type} className="bg-zinc-900/50 border border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-light text-white">{discount.type}</span>
                    <span className="text-xs text-zinc-500">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="text-xl font-light text-orange-400">{formatCurrency(discount.amount)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{discount.orders.toLocaleString()} orders</div>
                  <div className="h-1 bg-zinc-800 mt-3 overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-sm font-light text-white">Total Discounts</span>
            <span className="text-xl font-light text-orange-400">
              {formatCurrency(discountBreakdown.reduce((sum, d) => sum + d.amount, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
