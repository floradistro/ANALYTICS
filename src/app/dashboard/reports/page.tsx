'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useOrdersStore, type Order } from '@/stores/orders.store'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  DollarSign,
  Receipt,
  Percent,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  LayoutGrid,
  FileText,
  Loader2,
} from 'lucide-react'
import { exportFinancialReportPDF } from '@/lib/pdf-export'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { nivoTheme, colors } from '@/lib/theme'
import { FilterBar } from '@/components/filters/FilterBar'
import ReportBuilder from '@/components/reports/ReportBuilder'

type ReportTab = 'builder' | 'financial'

interface MonthlyReport {
  month: string
  revenue: number
  tax: number
  discounts: number
  orders: number
  netRevenue: number
  [key: string]: string | number
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
  grossSubtotal: number
  discounts: number
  netSales: number
  taxCollected: number
  effectiveRate: number
}

interface TaxByState {
  state: string
  orders: number
  grossSubtotal: number
  discounts: number
  netSales: number
  taxCollected: number
}

interface TaxByProcessor {
  processor: string
  orders: number
  grossSubtotal: number
  discounts: number
  netSubtotal: number
  shipping: number
  taxCollected: number
  totalCharged: number
}

interface DiscountBreakdown {
  type: string
  amount: number
  orders: number
}

// Normalize state names to standard 2-letter abbreviations
const normalizeState = (state: string | null | undefined): string => {
  if (!state || state.trim() === '') return 'Unknown'

  const cleaned = state.trim().toUpperCase()

  // Map full state names to abbreviations
  const stateMap: Record<string, string> = {
    'NORTH CAROLINA': 'NC',
    'SOUTH CAROLINA': 'SC',
    'TENNESSEE': 'TN',
    'VIRGINIA': 'VA',
    'WEST VIRGINIA': 'WV',
    'GEORGIA': 'GA',
    'FLORIDA': 'FL',
    'ALABAMA': 'AL',
    'CALIFORNIA': 'CA',
    'NEW YORK': 'NY',
    'TEXAS': 'TX',
    // Add more as needed
  }

  return stateMap[cleaned] || cleaned
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
  const { vendorId, vendor } = useAuthStore()
  const { dateRange, filters } = useDashboardStore()
  const [exportingPDF, setExportingPDF] = useState(false)

  // Use centralized orders store - SINGLE SOURCE OF TRUTH
  // Get the raw orders array (changes when data is fetched) to trigger re-renders
  const orders = useOrdersStore((state) => state.orders)
  const fetchOrders = useOrdersStore((state) => state.fetchOrders)
  const ordersLoading = useOrdersStore((state) => state.isLoading)

  const [taxByLocation, setTaxByLocation] = useState<TaxByLocation[]>([])
  const [taxByState, setTaxByState] = useState<TaxByState[]>([])
  const [taxByProcessor, setTaxByProcessor] = useState<TaxByProcessor[]>([])
  const [activeTab, setActiveTab] = useState<ReportTab>('builder')
  const [locationsLoading, setLocationsLoading] = useState(false)

  // ========== COMPUTED VALUES FROM ORDERS STORE ==========
  // All financial data is computed from paid orders - single source of truth

  // Filter to paid orders with dashboard filters applied
  const paidOrders = useMemo(() => {
    return orders.filter((order) => {
      // Must be paid and not cancelled
      if (order.payment_status !== 'paid' || order.status === 'cancelled') return false

      // Apply order type filter
      if (filters.orderTypes.length > 0 && !filters.orderTypes.includes(order.order_type)) {
        return false
      }

      // Apply location filter
      if (filters.locationIds.length > 0) {
        if (!order.pickup_location_id || !filters.locationIds.includes(order.pickup_location_id)) {
          return false
        }
      }

      return true
    })
  }, [orders, filters.orderTypes, filters.locationIds])

  // Helper to calculate order discounts (avoiding double-counting)
  const getOrderDiscount = useCallback((order: Order): number => {
    const discountAmount = parseFloat(String(order.discount_amount || 0))
    if (discountAmount > 0) return discountAmount
    // Historical orders: use metadata
    return (
      parseFloat(String(order.metadata?.campaign_discount_amount || 0)) +
      parseFloat(String(order.metadata?.loyalty_discount_amount || 0)) +
      parseFloat(String(order.affiliate_discount_amount || 0))
    )
  }, [])

  // Monthly reports computed from store data
  const monthlyReports = useMemo((): MonthlyReport[] => {
    if (paidOrders.length === 0) return []

    // Group orders by month
    const byMonth = new Map<string, Order[]>()
    paidOrders.forEach((order) => {
      const date = new Date(order.created_at)
      const monthKey = format(date, 'MMM yyyy')
      const existing = byMonth.get(monthKey) || []
      byMonth.set(monthKey, [...existing, order])
    })

    // Convert to array and calculate metrics
    return Array.from(byMonth.entries())
      .map(([month, orders]) => {
        const grossSubtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
        const tax = orders.reduce((sum, o) => sum + (o.tax_amount || 0), 0)
        const discounts = orders.reduce((sum, o) => sum + getOrderDiscount(o), 0)
        return {
          month,
          revenue: grossSubtotal, // Gross (pre-discount)
          tax,
          discounts,
          orders: orders.length,
          netRevenue: grossSubtotal - discounts, // Net (post-discount)
        }
      })
      .sort((a, b) => {
        // Sort by date (parse month string back to date)
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })
  }, [paidOrders, getOrderDiscount])

  // Totals computed from monthly reports
  const totals = useMemo(() => {
    const grossRevenue = monthlyReports.reduce((sum, r) => sum + r.revenue, 0)
    const taxCollected = monthlyReports.reduce((sum, r) => sum + r.tax, 0)
    const discountsGiven = monthlyReports.reduce((sum, r) => sum + r.discounts, 0)
    const totalOrders = monthlyReports.reduce((sum, r) => sum + r.orders, 0)
    return {
      grossRevenue,
      taxCollected,
      discountsGiven,
      netRevenue: grossRevenue - discountsGiven,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? grossRevenue / totalOrders : 0,
    }
  }, [monthlyReports])

  // Payment breakdown computed from store data
  const paymentBreakdown = useMemo((): PaymentBreakdown[] => {
    const methodMap = new Map<string, { count: number; amount: number }>()

    paidOrders.forEach((order) => {
      const method = order.payment_method || 'Unknown'
      const existing = methodMap.get(method) || { count: 0, amount: 0 }
      methodMap.set(method, {
        count: existing.count + 1,
        amount: existing.amount + (order.total_amount || 0),
      })
    })

    return Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method: formatPaymentMethod(method),
        ...data,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [paidOrders])

  // Payment stats from all orders in store (including non-paid)
  const paymentStats = useMemo((): PaymentStats | null => {
    // Use raw orders array (excludes cancelled from store fetch)
    if (orders.length === 0) return null

    const successful = orders.filter((o) => o.payment_status === 'paid').length
    const failed = orders.filter((o) => o.payment_status === 'failed').length
    const pending = orders.filter((o) => o.payment_status === 'pending').length
    const total = successful + failed + pending
    const successRate = total > 0 ? (successful / total) * 100 : 0

    return { successful, failed, pending, successRate }
  }, [orders])

  // Discount breakdown computed from store data
  const discountBreakdown = useMemo((): DiscountBreakdown[] => {
    let fieldDiscount = 0, fieldCount = 0
    let campaignDiscount = 0, campaignCount = 0
    let loyaltyDiscount = 0, loyaltyCount = 0
    let affiliateDiscount = 0, affiliateCount = 0

    paidOrders.forEach((order) => {
      const fd = parseFloat(String(order.discount_amount || 0))
      const cd = parseFloat(String(order.metadata?.campaign_discount_amount || 0))
      const ld = parseFloat(String(order.metadata?.loyalty_discount_amount || 0))
      const ad = parseFloat(String(order.affiliate_discount_amount || 0))

      if (fd > 0) { fieldDiscount += fd; fieldCount++ }
      if (cd > 0) { campaignDiscount += cd; campaignCount++ }
      if (ld > 0) { loyaltyDiscount += ld; loyaltyCount++ }
      if (ad > 0) { affiliateDiscount += ad; affiliateCount++ }
    })

    return [
      { type: 'Campaign/Promo', amount: campaignDiscount, orders: campaignCount },
      { type: 'Loyalty Points', amount: loyaltyDiscount, orders: loyaltyCount },
      { type: 'Affiliate Codes', amount: affiliateDiscount, orders: affiliateCount },
      { type: 'Manual/Other', amount: fieldDiscount, orders: fieldCount },
    ].filter(d => d.amount > 0)
  }, [paidOrders])

  // Loading state
  const loading = ordersLoading || locationsLoading

  // Fetch location metadata (only thing we still need from DB)
  const [locationMap, setLocationMap] = useState<Map<string, { name: string; state: string; configuredRate: number }>>(new Map())

  const fetchLocations = useCallback(async () => {
    if (!vendorId) return
    setLocationsLoading(true)

    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, state, settings')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)

      const newMap = new Map<string, { name: string; state: string; configuredRate: number }>()
      for (const loc of locations || []) {
        const taxConfig = loc.settings?.tax_config
        const configuredRate = taxConfig?.sales_tax_rate || taxConfig?.default_rate / 100 || 0
        newMap.set(loc.id, {
          name: loc.name,
          state: loc.state,
          configuredRate: configuredRate * 100,
        })
      }
      setLocationMap(newMap)
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    } finally {
      setLocationsLoading(false)
    }
  }, [vendorId])

  // Tax by location/state/processor - computed from store data + location metadata
  const taxReports = useMemo(() => {
    if (paidOrders.length === 0 || locationMap.size === 0) {
      return { byLocation: [], byState: [], byProcessor: [] }
    }

    const byLocation = new Map<string, { orders: number; grossSubtotal: number; discounts: number; tax: number; isEcommerce: boolean; state: string }>()
    const byState = new Map<string, { orders: number; grossSubtotal: number; discounts: number; tax: number }>()
    const byProcessor = new Map<string, { orders: number; grossSubtotal: number; discounts: number; shipping: number; tax: number; total: number }>()

    for (const order of paidOrders) {
      const isEcommerce = !order.pickup_location_id
      const locInfo = order.pickup_location_id ? locationMap.get(order.pickup_location_id) : null
      const rawState = locInfo?.state || order.shipping_state
      const state = normalizeState(rawState)

      // Determine processor
      const paymentMethod = order.payment_method || ''
      let processor: string
      if (paymentMethod === 'authorizenet') {
        processor = 'AuthorizeNet (Online)'
      } else if (paymentMethod === 'cash') {
        processor = 'Cash (In-Store)'
      } else {
        processor = 'Dejavoo (In-Store Card)'
      }

      const orderDiscounts = getOrderDiscount(order)
      const grossSubtotal = order.subtotal || 0

      // By processor
      const procData = byProcessor.get(processor) || { orders: 0, grossSubtotal: 0, discounts: 0, shipping: 0, tax: 0, total: 0 }
      procData.orders++
      procData.grossSubtotal += grossSubtotal
      procData.discounts += orderDiscounts
      procData.shipping += order.shipping_cost || 0
      procData.tax += order.tax_amount || 0
      procData.total += order.total_amount || 0
      byProcessor.set(processor, procData)

      // By location
      const locKey = isEcommerce ? `ecommerce_${state}` : order.pickup_location_id || 'unknown'
      const locData = byLocation.get(locKey) || { orders: 0, grossSubtotal: 0, discounts: 0, tax: 0, isEcommerce, state }
      locData.orders++
      locData.grossSubtotal += grossSubtotal
      locData.discounts += orderDiscounts
      locData.tax += order.tax_amount || 0
      byLocation.set(locKey, locData)

      // By state
      const stateData = byState.get(state) || { orders: 0, grossSubtotal: 0, discounts: 0, tax: 0 }
      stateData.orders++
      stateData.grossSubtotal += grossSubtotal
      stateData.discounts += orderDiscounts
      stateData.tax += order.tax_amount || 0
      byState.set(state, stateData)
    }

    // Convert to arrays
    const taxByLocationData: TaxByLocation[] = Array.from(byLocation.entries())
      .map(([locId, data]) => {
        const locInfo = locationMap.get(locId)
        const isEcommerce = data.isEcommerce
        const netSales = data.grossSubtotal - data.discounts
        return {
          locationId: locId,
          locationName: isEcommerce ? `E-Commerce → ${data.state}` : (locInfo?.name || 'Unknown'),
          state: data.state,
          configuredRate: locInfo?.configuredRate || 0,
          orders: data.orders,
          grossSubtotal: data.grossSubtotal,
          discounts: data.discounts,
          netSales,
          taxCollected: data.tax,
          effectiveRate: netSales > 0 ? (data.tax / netSales) * 100 : 0,
        }
      })
      .sort((a, b) => {
        const aIsEcom = a.locationId.startsWith('ecommerce_')
        const bIsEcom = b.locationId.startsWith('ecommerce_')
        if (aIsEcom !== bIsEcom) return aIsEcom ? 1 : -1
        return b.taxCollected - a.taxCollected
      })

    const taxByStateData: TaxByState[] = Array.from(byState.entries())
      .map(([state, data]) => ({
        state,
        orders: data.orders,
        grossSubtotal: data.grossSubtotal,
        discounts: data.discounts,
        netSales: data.grossSubtotal - data.discounts,
        taxCollected: data.tax,
      }))
      .sort((a, b) => b.taxCollected - a.taxCollected)

    const taxByProcessorData: TaxByProcessor[] = Array.from(byProcessor.entries())
      .map(([processor, data]) => ({
        processor,
        orders: data.orders,
        grossSubtotal: data.grossSubtotal,
        discounts: data.discounts,
        netSubtotal: data.grossSubtotal - data.discounts,
        shipping: data.shipping,
        taxCollected: data.tax,
        totalCharged: data.total,
      }))
      .sort((a, b) => b.totalCharged - a.totalCharged)

    return { byLocation: taxByLocationData, byState: taxByStateData, byProcessor: taxByProcessorData }
  }, [paidOrders, locationMap, getOrderDiscount])

  // Fetch orders from store and locations on mount/date change
  useEffect(() => {
    if (vendorId) {
      fetchOrders(vendorId)
      fetchLocations()
    }
  }, [vendorId, dateRange, fetchOrders, fetchLocations])

  // Update state from computed tax reports
  useEffect(() => {
    setTaxByLocation(taxReports.byLocation)
    setTaxByState(taxReports.byState)
    setTaxByProcessor(taxReports.byProcessor)
  }, [taxReports])

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

  const exportPDF = async () => {
    if (!vendor || monthlyReports.length === 0) return

    setExportingPDF(true)
    try {
      // Get date range from the dashboard store
      const { start, end } = dateRange

      await exportFinancialReportPDF(
        {
          storeName: vendor.store_name || 'Store',
          logoUrl: vendor.logo_url,
        },
        { start, end },
        monthlyReports,
        totals
      )
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setExportingPDF(false)
    }
  }

  // Calculate month-over-month growth
  const lastMonth = monthlyReports[monthlyReports.length - 1]
  const prevMonth = monthlyReports[monthlyReports.length - 2]
  const revenueGrowth = prevMonth?.revenue
    ? ((lastMonth?.revenue || 0) - prevMonth.revenue) / prevMonth.revenue * 100
    : 0

  return (
    <div className="space-y-4">
      {/* Page Header - All inline */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-light text-white tracking-wide">Reports</h1>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-sm">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'builder'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Builder
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-light transition-colors rounded-sm ${
                activeTab === 'financial'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Financial
            </button>
          </div>
        </div>

        {activeTab === 'financial' && (
          <div className="flex items-center gap-2">
            <FilterBar showPaymentFilter={false} showOrderTypeFilter={false} />
            <button
              onClick={exportPDF}
              disabled={exportingPDF || monthlyReports.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 transition-colors text-xs font-medium disabled:opacity-50"
            >
              {exportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              PDF
            </button>
            <button
              onClick={exportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors text-xs font-light"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        )}
      </div>

      {/* Report Builder Tab */}
      {activeTab === 'builder' && <ReportBuilder />}

      {/* Financial Reports Tab */}
      {activeTab === 'financial' && (
        <>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
              <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
            </div>
            {revenueGrowth !== 0 && (
              <div className={`flex items-center gap-0.5 text-[10px] lg:text-xs ${revenueGrowth >= 0 ? 'text-slate-300' : 'text-zinc-500'}`}>
                {revenueGrowth >= 0 ? <TrendingUp className="w-2.5 h-2.5 lg:w-3 lg:h-3" /> : <TrendingDown className="w-2.5 h-2.5 lg:w-3 lg:h-3" />}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Gross Revenue</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totals.grossRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <Receipt className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Tax Collected</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totals.taxCollected)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <Percent className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Discounts</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totals.discountsGiven)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Net Revenue</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totals.netRevenue)}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <CreditCard className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Orders</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">{totals.totalOrders.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/50 p-3 lg:p-5 rounded-sm">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
            <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
          </div>
          <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-2 lg:mt-3">Avg Order</p>
          <p className="text-base lg:text-xl font-light text-white mt-0.5 lg:mt-1">{formatCurrency(totals.avgOrderValue)}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
        <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">Monthly Revenue</h3>
        <div className="h-[200px] lg:h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Loading...</div>
          ) : (
            <ResponsiveBar
              data={monthlyReports}
              keys={['revenue', 'netRevenue']}
              indexBy="month"
              theme={nivoTheme}
              margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
              padding={0.35}
              groupMode="grouped"
              colors={['url(#revenueGradient)', 'url(#netRevenueGradient)']}
              borderRadius={5}
              enableGridX={false}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 12,
                tickRotation: 0,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 12,
                format: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
                tickValues: 5,
              }}
              enableLabel={false}
              defs={[
                {
                  id: 'revenueGradient',
                  type: 'linearGradient',
                  colors: [
                    { offset: 0, color: '#cbd5e1', opacity: 0.95 },
                    { offset: 100, color: '#94a3b8', opacity: 0.75 },
                  ],
                },
                {
                  id: 'netRevenueGradient',
                  type: 'linearGradient',
                  colors: [
                    { offset: 0, color: '#64748b', opacity: 0.9 },
                    { offset: 100, color: '#475569', opacity: 0.7 },
                  ],
                },
              ]}
              fill={[
                { match: { id: 'revenue' }, id: 'revenueGradient' },
                { match: { id: 'netRevenue' }, id: 'netRevenueGradient' },
              ]}
              tooltip={({ id, value, indexValue }) => (
                <div
                  style={{
                    background: 'rgba(24, 24, 27, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${colors.chart.tooltip.border}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div className="text-xs text-zinc-400 mb-1.5">{indexValue}</div>
                  <div className="text-base font-medium text-white">
                    {formatCurrency(value as number)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {id === 'revenue' ? 'Gross Revenue' : 'Net Revenue'}
                  </div>
                </div>
              )}
              animate={true}
              motionConfig="gentle"
            />
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Tax & Discounts Trend */}
        <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
          <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">Tax & Discounts Trend</h3>
          <div className="h-[180px] lg:h-[250px]">
            <ResponsiveLine
              data={[
                {
                  id: 'Tax',
                  data: monthlyReports.map((r) => ({ x: r.month, y: r.tax })),
                },
                {
                  id: 'Discounts',
                  data: monthlyReports.map((r) => ({ x: r.month, y: r.discounts })),
                },
              ]}
              theme={nivoTheme}
              margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              curve="catmullRom"
              colors={['#94a3b8', '#64748b']}
              lineWidth={2.5}
              enablePoints={true}
              pointSize={8}
              pointColor="#18181b"
              pointBorderWidth={2.5}
              pointBorderColor={{ from: 'serieColor' }}
              enableArea={true}
              areaOpacity={0.08}
              enableGridX={false}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 12,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 12,
                format: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
                tickValues: 5,
              }}
              useMesh={true}
              tooltip={({ point }) => (
                <div
                  style={{
                    background: 'rgba(24, 24, 27, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${colors.chart.tooltip.border}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: point.color }}
                    />
                    <span className="text-sm text-zinc-300">{String(point.id).split('.')[0]}</span>
                  </div>
                  <div className="text-base font-medium text-white">
                    {formatCurrency(point.data.y as number)}
                  </div>
                </div>
              )}
              legends={[
                {
                  anchor: 'top-right',
                  direction: 'row',
                  translateY: -20,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 10,
                  symbolShape: 'circle',
                },
              ]}
              animate={true}
              motionConfig="gentle"
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
          <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">Payment Methods</h3>
          {paymentBreakdown.length === 0 ? (
            <div className="h-[180px] lg:h-[250px] flex items-center justify-center text-zinc-600 text-xs lg:text-sm">
              No payment data available
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              {paymentBreakdown.map((item, index) => {
                const maxAmount = paymentBreakdown[0]?.amount || 1
                const percentage = (item.amount / maxAmount) * 100
                return (
                  <div key={item.method}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs lg:text-sm font-light text-white truncate">{item.method}</span>
                      <div className="text-[10px] lg:text-sm text-zinc-500 font-light whitespace-nowrap">
                        {item.count} · {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden rounded-full">
                      <div
                        className="h-full bg-slate-400"
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
        <div className="bg-zinc-950 border border-zinc-800/50 p-4 lg:p-6 rounded-sm">
          <h3 className="text-xs lg:text-sm font-light text-zinc-200 mb-4 lg:mb-6 tracking-wide uppercase">Payment Success Rate</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <div className="text-center">
              <div className="text-xl lg:text-3xl font-light text-slate-200">{paymentStats.successful}</div>
              <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-1 lg:mt-2">Successful</p>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-3xl font-light text-zinc-500">{paymentStats.failed}</div>
              <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-1 lg:mt-2">Failed</p>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-3xl font-light text-zinc-400">{paymentStats.pending}</div>
              <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-1 lg:mt-2">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-3xl font-light text-white">{paymentStats.successRate.toFixed(1)}%</div>
              <p className="text-[10px] lg:text-xs text-zinc-500 uppercase tracking-wider mt-1 lg:mt-2">Success Rate</p>
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
                  <td className="px-6 py-4 text-sm text-zinc-500 text-right font-light">-{formatCurrency(report.discounts)}</td>
                  <td className="px-6 py-4 text-sm font-light text-slate-300 text-right">{formatCurrency(report.netRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
              <tr>
                <td className="px-6 py-4 text-sm font-light text-white">Total</td>
                <td className="px-6 py-4 text-sm text-white text-right font-light">{totals.totalOrders.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-white text-right font-light">{formatCurrency(totals.grossRevenue)}</td>
                <td className="px-6 py-4 text-sm text-white text-right font-light">{formatCurrency(totals.taxCollected)}</td>
                <td className="px-6 py-4 text-sm text-zinc-500 text-right font-light">-{formatCurrency(totals.discountsGiven)}</td>
                <td className="px-6 py-4 text-sm text-slate-300 text-right font-light">{formatCurrency(totals.netRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tax Reports Section */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h2 className="text-sm font-light text-white tracking-wide">Tax & Discount Reports</h2>
        <p className="text-xs text-zinc-500 mt-1">Filtered by selected date range</p>
      </div>

      {/* Tax by Processor - for reconciling with payment systems */}
      {taxByProcessor.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Tax by Payment Processor</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Reconcile with your payment systems
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Processor</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Discounts</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Net Sales</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Shipping</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Tax</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Total Charged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {taxByProcessor.map((proc) => (
                  <tr key={proc.processor} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-light text-white">{proc.processor}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{proc.orders.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{formatCurrency(proc.grossSubtotal)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 text-right font-light">-{formatCurrency(proc.discounts)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right font-light">{formatCurrency(proc.netSubtotal)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{formatCurrency(proc.shipping)}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">{formatCurrency(proc.taxCollected)}</td>
                    <td className="px-4 py-3 text-sm text-white text-right font-light">{formatCurrency(proc.totalCharged)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                <tr>
                  <td className="px-4 py-3 text-sm font-light text-white">Total</td>
                  <td className="px-4 py-3 text-sm text-white text-right font-light">
                    {taxByProcessor.reduce((sum, p) => sum + p.orders, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-light">
                    {formatCurrency(taxByProcessor.reduce((sum, p) => sum + p.grossSubtotal, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500 text-right font-light">
                    -{formatCurrency(taxByProcessor.reduce((sum, p) => sum + p.discounts, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-light">
                    {formatCurrency(taxByProcessor.reduce((sum, p) => sum + p.netSubtotal, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-light">
                    {formatCurrency(taxByProcessor.reduce((sum, p) => sum + p.shipping, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">
                    {formatCurrency(taxByProcessor.reduce((sum, p) => sum + p.taxCollected, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-light">
                    {formatCurrency(taxByProcessor.reduce((sum, p) => sum + p.totalCharged, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax by Location */}
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-900">
            <h3 className="text-sm font-light text-white tracking-wide">Tax by Location</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Selected date range
            </p>
          </div>
          <div className="overflow-x-auto">
            {taxByLocation.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-sm">No tax data available</div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Net Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {taxByLocation.map((loc) => (
                    <tr key={loc.locationId} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-light text-white">
                        {loc.locationName}
                        <span className="text-zinc-500 ml-2">({loc.state})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{loc.orders.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{formatCurrency(loc.netSales)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">{formatCurrency(loc.taxCollected)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{loc.effectiveRate.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                  <tr>
                    <td className="px-4 py-3 text-sm font-light text-white">Total</td>
                    <td className="px-4 py-3 text-sm text-white text-right font-light">
                      {taxByLocation.reduce((sum, l) => sum + l.orders, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-light">
                      {formatCurrency(taxByLocation.reduce((sum, l) => sum + l.netSales, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">
                      {formatCurrency(taxByLocation.reduce((sum, l) => sum + l.taxCollected, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">-</td>
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
              Selected date range
            </p>
          </div>
          <div className="overflow-x-auto">
            {taxByState.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500 text-sm">No tax data available</div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">State</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Net Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">Tax Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {taxByState.map((state) => (
                    <tr key={state.state} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-light text-white">{state.state}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{state.orders.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400 text-right font-light">{formatCurrency(state.netSales)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">{formatCurrency(state.taxCollected)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                  <tr>
                    <td className="px-4 py-3 text-sm font-light text-white">Total</td>
                    <td className="px-4 py-3 text-sm text-white text-right font-light">
                      {taxByState.reduce((sum, s) => sum + s.orders, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-light">
                      {formatCurrency(taxByState.reduce((sum, s) => sum + s.netSales, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 text-right font-light">
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
            Selected date range
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
                  <div className="text-xl font-light text-zinc-500">{formatCurrency(discount.amount)}</div>
                  <div className="text-xs text-zinc-500 mt-1">{discount.orders.toLocaleString()} orders</div>
                  <div className="h-1 bg-zinc-800 mt-3 overflow-hidden">
                    <div
                      className="h-full bg-slate-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-sm font-light text-white">Total Discounts</span>
            <span className="text-xl font-light text-zinc-500">
              {formatCurrency(discountBreakdown.reduce((sum, d) => sum + d.amount, 0))}
            </span>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
