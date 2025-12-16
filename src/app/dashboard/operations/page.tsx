'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { format, isToday, startOfDay, subDays } from 'date-fns'
import {
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  Download,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  User,
  Package,
  MapPin,
} from 'lucide-react'

type OperationsTab = 'overview' | 'audits' | 'cash' | 'compliance'

interface DailyAuditSummary {
  vendor_id: string
  location_id: string
  audit_date: string
  adjustment_count: number
  total_shrinkage: number
  total_additions: number
  net_change: number
  reasons: string[]
  first_adjustment: string
  last_adjustment: string
  location?: {
    name: string
  }
  completion_rate?: number
  products_audited?: number
  total_products?: number
}

interface InventoryAdjustment {
  id: string
  product_id: string
  location_id: string
  quantity_before: number
  quantity_after: number
  quantity_change: number
  reason: string
  notes: string
  created_by: string
  created_at: string
}

interface SafeBalance {
  location_id: string
  vendor_id: string
  current_balance: number
  total_drops: number
  total_dropped: number
  total_deposits: number
  total_deposited: number
  last_transaction_at: string
  location?: {
    name: string
  }
}

interface SafeTransaction {
  id: string
  location_id: string
  transaction_type: string
  amount: number
  performed_by: string
  created_at: string
  notes: string
  location?: {
    name: string
  }
}

export default function OperationsPage() {
  const { vendorId } = useAuthStore()
  const [activeTab, setActiveTab] = useState<OperationsTab>('overview')
  const [loading, setLoading] = useState(true)

  // Data states
  const [audits, setAudits] = useState<DailyAuditSummary[]>([])
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([])
  const [safeBalances, setSafeBalances] = useState<SafeBalance[]>([])
  const [safeTransactions, setSafeTransactions] = useState<SafeTransaction[]>([])
  const [totalLocations, setTotalLocations] = useState(0)

  // Modal states
  const [selectedAudit, setSelectedAudit] = useState<DailyAuditSummary | null>(null)
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null)
  const [selectedSafe, setSelectedSafe] = useState<SafeBalance | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<SafeTransaction | null>(null)
  const [auditDetails, setAuditDetails] = useState<InventoryAdjustment[]>([])
  const [safeTransactionDetails, setSafeTransactionDetails] = useState<SafeTransaction[]>([])

  useEffect(() => {
    if (vendorId) {
      fetchOperationsData()
    }
  }, [vendorId])

  const fetchOperationsData = async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      // Fetch last 7 days of audits
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

      const [auditsRes, adjustmentsRes, safesRes, transactionsRes, locationsRes] = await Promise.all([
        // Daily audit summaries with location join
        supabase
          .from('daily_audit_summary')
          .select('*, location:locations!location_id(name)')
          .eq('vendor_id', vendorId)
          .gte('audit_date', sevenDaysAgo)
          .order('audit_date', { ascending: false }),

        // Individual inventory adjustments (last 100)
        supabase
          .from('inventory_adjustments')
          .select('id, product_id, location_id, quantity_before, quantity_after, quantity_change, reason, notes, created_by, created_at')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(100),

        // Safe balances
        supabase
          .from('pos_safe_balances')
          .select('*, location:locations!location_id(name)')
          .eq('vendor_id', vendorId),

        // Safe transactions (last 7 days)
        supabase
          .from('pos_safe_transactions')
          .select('*, location:locations!location_id(name)')
          .eq('vendor_id', vendorId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100),

        // Total locations - just get them all and count in JS
        supabase
          .from('locations')
          .select('id')
          .eq('vendor_id', vendorId)
      ])

      console.log('Operations data fetched:', {
        audits: auditsRes.data?.length || 0,
        adjustments: adjustmentsRes.data?.length || 0,
        safes: safesRes.data?.length || 0,
        transactions: transactionsRes.data?.length || 0,
        locations: locationsRes.data?.length || 0,
        errors: {
          audits: auditsRes.error,
          adjustments: adjustmentsRes.error,
          safes: safesRes.error,
          transactions: transactionsRes.error,
          locations: locationsRes.error
        },
        sampleAudit: auditsRes.data?.[0],
        auditDates: auditsRes.data?.map(a => a.audit_date)
      })

      const auditsData = auditsRes.data || []

      // Calculate completion rates for each audit
      const auditsWithCompletion = await Promise.all(
        auditsData.map(async (audit) => {
          try {
            // Get total products in inventory for this location
            const { data: inventoryData } = await supabase
              .from('inventory')
              .select('product_id')
              .eq('vendor_id', vendorId)
              .eq('location_id', audit.location_id)

            const totalProducts = inventoryData?.length || 0

            // Get unique products audited on this date
            const startOfDay = `${audit.audit_date}T00:00:00`
            const endOfDay = `${audit.audit_date}T23:59:59`

            const { data: adjustmentsData } = await supabase
              .from('inventory_adjustments')
              .select('product_id')
              .eq('vendor_id', vendorId)
              .eq('location_id', audit.location_id)
              .gte('created_at', startOfDay)
              .lte('created_at', endOfDay)

            const uniqueProductsAudited = new Set(adjustmentsData?.map(a => a.product_id) || []).size
            const completionRate = totalProducts > 0 ? (uniqueProductsAudited / totalProducts) * 100 : 0

            return {
              ...audit,
              completion_rate: completionRate,
              products_audited: uniqueProductsAudited,
              total_products: totalProducts
            }
          } catch (err) {
            console.error('Error calculating completion rate:', err)
            return audit
          }
        })
      )

      setAudits(auditsWithCompletion)
      setInventoryAdjustments(adjustmentsRes.data || [])
      setSafeBalances(safesRes.data || [])
      setSafeTransactions(transactionsRes.data || [])
      setTotalLocations(locationsRes.data?.length || 0)
    } catch (error) {
      console.error('Failed to fetch operations data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditDetails = async (audit: DailyAuditSummary) => {
    if (!vendorId) return

    setSelectedAudit(audit)

    // Parse the audit date string properly to avoid timezone issues
    const auditDateStr = audit.audit_date
    const startOfDay = `${auditDateStr}T00:00:00`
    const endOfDay = `${auditDateStr}T23:59:59`

    try {
      // Fetch adjustments and users in parallel for better performance
      const [adjustmentsResult, usersResult] = await Promise.all([
        supabase
          .from('inventory_adjustments')
          .select('*, product:products!product_id(name, sku)')
          .eq('vendor_id', vendorId)
          .eq('location_id', audit.location_id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: false }),

        // Pre-fetch all vendor users to avoid sequential lookups
        supabase
          .from('users')
          .select('id, auth_user_id, first_name, last_name, email')
          .eq('vendor_id', vendorId)
      ])

      const { data, error } = adjustmentsResult
      const { data: allUsers } = usersResult

      if (error || !data) {
        console.error('Error fetching audit details:', error)
        setAuditDetails([])
        return
      }

      // Map user data to adjustments
      const enrichedData = data.map(adj => {
        // Try to find user by id or auth_user_id
        const user = allUsers?.find(u => u.id === adj.created_by || u.auth_user_id === adj.created_by)
        const userName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || null
          : null

        return {
          ...adj,
          user_name: userName
        }
      })

      setAuditDetails(enrichedData)
    } catch (err) {
      console.error('Failed to fetch audit details:', err)
      setAuditDetails([])
    }
  }

  const fetchSafeTransactionHistory = async (safe: SafeBalance) => {
    if (!vendorId) return

    const { data } = await supabase
      .from('pos_safe_transactions')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('location_id', safe.location_id)
      .order('created_at', { ascending: false })
      .limit(50)

    setSafeTransactionDetails(data || [])
    setSelectedSafe(safe)
  }

  // Metrics calculations
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayAudits = audits.filter(a => a.audit_date === today)
  console.log('Today audits filtered:', { total: audits.length, today: todayAudits.length, totalLocations, todayDate: today })

  // Calculate average product completion rate (not location completion)
  const todayAuditsWithCompletion = todayAudits.filter(a => a.completion_rate !== undefined)
  const auditCompletionRate = todayAuditsWithCompletion.length > 0
    ? todayAuditsWithCompletion.reduce((sum, a) => sum + (a.completion_rate || 0), 0) / todayAuditsWithCompletion.length
    : 0

  const safesReconciled = safeBalances.filter(s =>
    s.last_transaction_at && isToday(new Date(s.last_transaction_at))
  ).length
  const safeReconciliationRate = totalLocations > 0 ? (safesReconciled / totalLocations) * 100 : 0

  const lowBalanceLocations = safeBalances.filter(s => Number(s.current_balance) < 500)
  const totalSafeBalance = safeBalances.reduce((sum, s) => sum + Number(s.current_balance || 0), 0)

  const totalShrinkage = audits
    .filter(a => a.audit_date === today)
    .reduce((sum, a) => sum + Number(a.total_shrinkage || 0), 0)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Building2 },
    { id: 'audits' as const, label: 'Daily Audits', icon: ClipboardCheck },
    { id: 'cash' as const, label: 'Cash Management', icon: DollarSign },
    { id: 'compliance' as const, label: 'Compliance', icon: AlertTriangle },
  ]

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500">Loading operations data...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations</h1>
          <p className="text-sm text-zinc-500 mt-1">Store health & compliance monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 text-xs border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-4 h-4" />
            {format(new Date(), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-400'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 bg-zinc-950 border border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-zinc-900 border border-zinc-800">
                    <ClipboardCheck className={`w-5 h-5 ${
                      auditCompletionRate >= 100 ? 'text-emerald-400' :
                      auditCompletionRate >= 75 ? 'text-yellow-400' :
                      'text-zinc-400'
                    }`} />
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold tabular-nums ${
                      auditCompletionRate >= 100 ? 'text-emerald-400' :
                      auditCompletionRate >= 75 ? 'text-yellow-400' :
                      'text-white'
                    }`}>
                      {Math.round(auditCompletionRate)}%
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {todayAudits.reduce((sum, a) => sum + (a.products_audited || 0), 0)}/
                      {todayAudits.reduce((sum, a) => sum + (a.total_products || 0), 0)} products
                    </div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">Audit Completion</div>
                <div className="text-xs text-zinc-600 mt-1">Today ({todayAudits.length}/{totalLocations} locations)</div>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-zinc-900 border border-zinc-800">
                    <DollarSign className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {Math.round(safeReconciliationRate)}%
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {safesReconciled}/{totalLocations}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">Cash Reconciled</div>
                <div className="text-xs text-zinc-600 mt-1">Today</div>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-zinc-900 border border-zinc-800">
                    <Building2 className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {formatCurrency(totalSafeBalance)}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {safeBalances.length} locations
                    </div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">Total in Safes</div>
                <div className="text-xs text-zinc-600 mt-1">Current</div>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-zinc-900 border border-zinc-800">
                    <TrendingDown className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {formatCurrency(Math.abs(totalShrinkage))}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {todayAudits.reduce((sum, a) => sum + (a.adjustment_count || 0), 0)} adjustments
                    </div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">Total Shrinkage</div>
                <div className="text-xs text-zinc-600 mt-1">Today</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Audits */}
              <div className="bg-zinc-950 border border-zinc-800">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Recent Audits</h2>
                </div>
                <div className="divide-y divide-zinc-900 max-h-[400px] overflow-y-auto">
                  {todayAudits.length === 0 ? (
                    <div className="px-6 py-12 text-center text-zinc-600 text-sm">
                      No audits completed today
                    </div>
                  ) : (
                    todayAudits.slice(0, 10).map((audit) => {
                      const netChange = Number(audit.net_change || 0)

                      return (
                        <button
                          key={`${audit.location_id}-${audit.audit_date}`}
                          onClick={() => fetchAuditDetails(audit)}
                          className="w-full px-6 py-4 hover:bg-zinc-900/50 transition-colors text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">
                                  {audit.location?.name || 'Unknown Location'}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-zinc-500">
                                <span>{audit.adjustment_count} adjustments</span>
                                {audit.completion_rate !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span className={`font-medium ${
                                      audit.completion_rate >= 100 ? 'text-emerald-400' :
                                      audit.completion_rate >= 75 ? 'text-yellow-400' :
                                      'text-white'
                                    }`}>
                                      {audit.completion_rate.toFixed(0)}% complete
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{format(new Date(audit.last_adjustment), 'h:mm a')}</span>
                              </div>
                            </div>
                            <div className={`text-sm font-mono tabular-nums ${
                              netChange < 0 ? 'text-white' : 'text-zinc-500'
                            }`}>
                              {formatCurrency(Math.abs(netChange))}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Safe Status */}
              <div className="bg-zinc-950 border border-zinc-800">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Safe Balances</h2>
                </div>
                <div className="divide-y divide-zinc-900 max-h-[400px] overflow-y-auto">
                  {safeBalances.length === 0 ? (
                    <div className="px-6 py-12 text-center text-zinc-600 text-sm">
                      No safe data available
                    </div>
                  ) : (
                    safeBalances.slice(0, 10).map((safe) => {
                      const isLow = Number(safe.current_balance || 0) < 500

                      return (
                        <button
                          key={safe.location_id}
                          onClick={() => fetchSafeTransactionHistory(safe)}
                          className="w-full px-6 py-4 hover:bg-zinc-900/50 transition-colors text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">
                                  {safe.location?.name || 'Unknown Location'}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                {isLow && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                                    LOW
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {safe.total_drops} drops • {safe.total_deposits} deposits
                              </div>
                            </div>
                            <div className="text-sm font-mono tabular-nums text-white">
                              {formatCurrency(Number(safe.current_balance || 0))}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audits' && (
          <div className="space-y-6">
            {/* Header with Summary */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Daily Audits by Location</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {audits.length} audit sessions across {new Set(audits.map(a => a.location_id)).size} locations
                </p>
              </div>
              <div className="text-xs text-zinc-500">
                Last 7 days
              </div>
            </div>

            {/* Audit Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Total Adjustments</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {audits.reduce((sum, a) => sum + (a.adjustment_count || 0), 0)}
                </div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Total Shrinkage</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(Math.abs(audits.reduce((sum, a) => sum + Number(a.total_shrinkage || 0), 0)))}
                </div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Total Additions</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(audits.reduce((sum, a) => sum + Number(a.total_additions || 0), 0))}
                </div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Net Change</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(audits.reduce((sum, a) => sum + Number(a.net_change || 0), 0))}
                </div>
              </div>
            </div>

            {/* Audits Grouped by Day */}
            <div className="space-y-4">
              {audits.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 px-6 py-12 text-center text-zinc-600 text-sm">
                  No audits found
                </div>
              ) : (
                // Group audits by date
                Object.entries(
                  audits.reduce((acc, audit) => {
                    if (!acc[audit.audit_date]) acc[audit.audit_date] = []
                    acc[audit.audit_date].push(audit)
                    return acc
                  }, {} as Record<string, DailyAuditSummary[]>)
                )
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, dayAudits]) => {
                  const dayTotal = dayAudits.reduce((sum, a) => sum + Number(a.net_change || 0), 0)
                  const dayAdjustments = dayAudits.reduce((sum, a) => sum + (a.adjustment_count || 0), 0)

                  // Calculate average completion rate for the day
                  const auditsWithCompletion = dayAudits.filter(a => a.completion_rate !== undefined)
                  const avgCompletionRate = auditsWithCompletion.length > 0
                    ? auditsWithCompletion.reduce((sum, a) => sum + (a.completion_rate || 0), 0) / auditsWithCompletion.length
                    : 0

                  return (
                    <div key={date} className="bg-zinc-950 border border-zinc-800">
                      {/* Day Header */}
                      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Calendar className="w-4 h-4 text-zinc-600" />
                            <h3 className="text-sm font-semibold text-white">
                              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                            </h3>
                            <span className="text-xs text-zinc-600">
                              {dayAudits.length} location{dayAudits.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            {auditsWithCompletion.length > 0 && (
                              <span className={`font-medium ${
                                avgCompletionRate >= 100 ? 'text-emerald-400' :
                                avgCompletionRate >= 75 ? 'text-yellow-400' :
                                'text-white'
                              }`}>
                                {avgCompletionRate.toFixed(0)}% avg complete
                              </span>
                            )}
                            <span className="text-zinc-500">{dayAdjustments} adjustments</span>
                            <span className={`font-mono font-semibold ${dayTotal < 0 ? 'text-white' : 'text-zinc-500'}`}>
                              {dayTotal < 0 ? '-' : '+'}{formatCurrency(Math.abs(dayTotal))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Locations for this day */}
                      <div className="divide-y divide-zinc-900">
                        {dayAudits.map((audit) => {
                          const netChange = Number(audit.net_change || 0)
                          const shrinkage = Math.abs(Number(audit.total_shrinkage || 0))

                          return (
                            <button
                              key={`${audit.location_id}-${audit.audit_date}`}
                              onClick={() => fetchAuditDetails(audit)}
                              className="w-full px-6 py-4 hover:bg-zinc-900/30 transition-colors text-left group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Building2 className="w-4 h-4 text-zinc-600" />
                                    <span className="text-sm font-medium text-white">
                                      {audit.location?.name || 'Unknown Location'}
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                  </div>
                                  <div className="flex items-center gap-6 text-xs text-zinc-500 ml-7">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(audit.first_adjustment), 'h:mm a')} - {format(new Date(audit.last_adjustment), 'h:mm a')}
                                    </div>
                                    <span>{audit.adjustment_count} adjustments</span>
                                    {audit.completion_rate !== undefined && (
                                      <div className={`flex items-center gap-1.5 font-medium ${
                                        audit.completion_rate >= 100 ? 'text-emerald-400' :
                                        audit.completion_rate >= 75 ? 'text-yellow-400' :
                                        'text-white'
                                      }`}>
                                        <CheckCircle2 className="w-3 h-3" />
                                        {audit.completion_rate.toFixed(0)}% complete
                                        <span className="text-zinc-600">
                                          ({audit.products_audited}/{audit.total_products})
                                        </span>
                                      </div>
                                    )}
                                    {shrinkage > 0 && (
                                      <span className="text-white">
                                        {formatCurrency(shrinkage)} shrinkage
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-mono font-semibold ${
                                    netChange < 0 ? 'text-white' : 'text-zinc-500'
                                  }`}>
                                    {netChange < 0 ? '-' : '+'}{formatCurrency(Math.abs(netChange))}
                                  </div>
                                  <div className="text-xs text-zinc-600 mt-0.5">
                                    net change
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'cash' && (
          <div className="space-y-6">
            {/* Cash Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Total in Safes</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(totalSafeBalance)}
                </div>
                <div className="text-xs text-zinc-600 mt-1">{safeBalances.length} locations</div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Total Drops (7d)</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(safeBalances.reduce((sum, s) => sum + Number(s.total_dropped || 0), 0))}
                </div>
                <div className="text-xs text-zinc-600 mt-1">
                  {safeBalances.reduce((sum, s) => sum + (s.total_drops || 0), 0)} transactions
                </div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Total Deposits (7d)</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(safeBalances.reduce((sum, s) => sum + Number(s.total_deposited || 0), 0))}
                </div>
                <div className="text-xs text-zinc-600 mt-1">
                  {safeBalances.reduce((sum, s) => sum + (s.total_deposits || 0), 0)} transactions
                </div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Low Balance Alerts</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {lowBalanceLocations.length}
                </div>
                <div className="text-xs text-zinc-600 mt-1">Below $500</div>
              </div>
            </div>

            {/* Safe Balances by Location */}
            <div className="bg-zinc-950 border border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Safe Balances by Location</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-900">
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Current Balance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Drops (7d)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Total Dropped
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Deposits (7d)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Total Deposited
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {safeBalances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 text-sm">
                          No safe data available
                        </td>
                      </tr>
                    ) : (
                      safeBalances.map((safe) => {
                        const isLow = Number(safe.current_balance || 0) < 500
                        const balance = Number(safe.current_balance || 0)
                        const dropped = Number(safe.total_dropped || 0)
                        const deposited = Number(safe.total_deposited || 0)

                        return (
                          <tr
                            key={safe.location_id}
                            onClick={() => fetchSafeTransactionHistory(safe)}
                            className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {safe.location?.name || 'Unknown Location'}
                                </span>
                                {isLow && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                                    LOW
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums font-medium text-white">
                              {formatCurrency(balance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 text-right tabular-nums">
                              {safe.total_drops || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 text-right tabular-nums">
                              {formatCurrency(dropped)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 text-right tabular-nums">
                              {safe.total_deposits || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 text-right tabular-nums">
                              {formatCurrency(deposited)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                              {safe.last_transaction_at ? format(new Date(safe.last_transaction_at), 'MMM d, h:mm a') : 'Never'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-zinc-950 border border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Recent Cash Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-900">
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Performed By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {safeTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 text-sm">
                          No recent transactions
                        </td>
                      </tr>
                    ) : (
                      safeTransactions.map((txn) => {
                        const amount = Number(txn.amount || 0)

                        return (
                          <tr
                            key={txn.id}
                            onClick={() => setSelectedTransaction(txn)}
                            className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                              {format(new Date(txn.created_at), 'MMM d, h:mm a')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {txn.location?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="px-2 py-0.5 text-[10px] font-medium border bg-zinc-900 text-zinc-400 border-zinc-800">
                                {txn.transaction_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-right tabular-nums font-medium">
                              {txn.transaction_type === 'DROP' ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                              {txn.performed_by || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-500 max-w-xs truncate">
                              {txn.notes || '—'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Balance Alerts */}
            {lowBalanceLocations.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Low Balance Alerts</h2>
                </div>
                <div className="divide-y divide-zinc-900">
                  {lowBalanceLocations.map((safe) => {
                    const balance = Number(safe.current_balance || 0)

                    return (
                      <div key={safe.location_id} className="px-6 py-4 hover:bg-zinc-900/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white mb-1">
                              {safe.location?.name || 'Unknown Location'}
                            </div>
                            <div className="text-xs text-zinc-500">
                              Last activity: {safe.last_transaction_at ? format(new Date(safe.last_transaction_at), 'MMM d, h:mm a') : 'Never'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono tabular-nums text-white font-medium">
                              {formatCurrency(balance)}
                            </div>
                            <div className="text-xs text-zinc-600 mt-1">
                              {balance < 200 ? 'Critical' : 'Low'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* Store Health Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Overall Compliance</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {totalLocations > 0 ? Math.round(((todayAudits.length + safesReconciled) / (totalLocations * 2)) * 100) : 0}%
                </div>
                <div className="text-xs text-zinc-600 mt-1">Across all stores</div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Missing Audits</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {totalLocations - todayAudits.length}
                </div>
                <div className="text-xs text-zinc-600 mt-1">Locations not audited today</div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Missing Reconciliations</div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {totalLocations - safesReconciled}
                </div>
                <div className="text-xs text-zinc-600 mt-1">Safes not reconciled today</div>
              </div>
            </div>

            {/* Action Items */}
            <div className="bg-zinc-950 border border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Action Items</h2>
              </div>
              <div className="divide-y divide-zinc-900">
                {/* Missing Daily Audits */}
                {totalLocations - todayAudits.length > 0 && (
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <XCircle className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-1">
                          {totalLocations - todayAudits.length} location{totalLocations - todayAudits.length !== 1 ? 's' : ''} missing daily audit
                        </div>
                        <div className="text-xs text-zinc-500">
                          Daily audits should be completed by end of day for inventory accuracy
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600 whitespace-nowrap">
                        Priority: High
                      </div>
                    </div>
                  </div>
                )}

                {/* Missing Cash Reconciliation */}
                {totalLocations - safesReconciled > 0 && (
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <XCircle className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-1">
                          {totalLocations - safesReconciled} location{totalLocations - safesReconciled !== 1 ? 's' : ''} missing cash reconciliation
                        </div>
                        <div className="text-xs text-zinc-500">
                          Safe balances should be reconciled daily to track cash flow
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600 whitespace-nowrap">
                        Priority: High
                      </div>
                    </div>
                  </div>
                )}

                {/* Low Safe Balances */}
                {lowBalanceLocations.length > 0 && (
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <AlertTriangle className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-1">
                          {lowBalanceLocations.length} location{lowBalanceLocations.length !== 1 ? 's' : ''} with low safe balance
                        </div>
                        <div className="text-xs text-zinc-500">
                          Safe balances below $500 may require replenishment
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {lowBalanceLocations.map((safe) => (
                            <span
                              key={safe.location_id}
                              className="px-2 py-0.5 text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800"
                            >
                              {safe.location?.name || 'Unknown'}: {formatCurrency(Number(safe.current_balance || 0))}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600 whitespace-nowrap">
                        Priority: Medium
                      </div>
                    </div>
                  </div>
                )}

                {/* All Clear */}
                {totalLocations === todayAudits.length &&
                 totalLocations === safesReconciled &&
                 lowBalanceLocations.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <div className="text-sm text-zinc-500">All compliance checks passed</div>
                    <div className="text-xs text-zinc-600 mt-1">No action items at this time</div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Health Status */}
            <div className="bg-zinc-950 border border-zinc-800">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Location Health Status</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-900">
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Daily Audit
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Cash Reconciled
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Safe Balance
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Overall Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {safeBalances.map((safe) => {
                      const hasAudit = todayAudits.some(a => a.location_id === safe.location_id)
                      const hasReconciliation = safe.last_transaction_at && isToday(new Date(safe.last_transaction_at))
                      const hasGoodBalance = Number(safe.current_balance || 0) >= 500
                      const healthScore = [hasAudit, hasReconciliation, hasGoodBalance].filter(Boolean).length

                      return (
                        <tr key={safe.location_id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                            {safe.location?.name || 'Unknown Location'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {hasAudit ? (
                              <CheckCircle2 className="w-5 h-5 text-zinc-400 inline-block" />
                            ) : (
                              <XCircle className="w-5 h-5 text-zinc-600 inline-block" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {hasReconciliation ? (
                              <CheckCircle2 className="w-5 h-5 text-zinc-400 inline-block" />
                            ) : (
                              <XCircle className="w-5 h-5 text-zinc-600 inline-block" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {hasGoodBalance ? (
                              <CheckCircle2 className="w-5 h-5 text-zinc-400 inline-block" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-zinc-500 inline-block" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-medium border ${
                              healthScore === 3 ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                              healthScore === 2 ? 'bg-zinc-900 text-zinc-500 border-zinc-800' :
                              'bg-zinc-900 text-zinc-600 border-zinc-800'
                            }`}>
                              {healthScore === 3 ? 'HEALTHY' : healthScore === 2 ? 'FAIR' : 'NEEDS ATTENTION'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance Trends (Last 7 Days) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-zinc-950 border border-zinc-800">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Audit Compliance (7d)</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {Array.from(new Set(audits.map(a => a.audit_date)))
                      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                      .slice(0, 7)
                      .map(date => {
                        const auditsOnDate = audits.filter(a => a.audit_date === date)
                        const percentage = totalLocations > 0 ? (auditsOnDate.length / totalLocations) * 100 : 0

                        return (
                          <div key={date}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-zinc-500">
                                {format(new Date(date), 'MMM d, yyyy')}
                              </span>
                              <span className="text-xs text-zinc-400 tabular-nums">
                                {auditsOnDate.length}/{totalLocations} ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <div className="w-full bg-zinc-900 h-1.5">
                              <div
                                className="bg-zinc-600 h-1.5"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Cash Reconciliation (7d)</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = subDays(new Date(), i)
                      const reconciliationsOnDate = safeTransactions.filter(t =>
                        isToday(new Date(t.created_at)) === isToday(date) &&
                        format(new Date(t.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      )
                      const uniqueLocations = new Set(reconciliationsOnDate.map(t => t.location_id))
                      const percentage = totalLocations > 0 ? (uniqueLocations.size / totalLocations) * 100 : 0

                      return (
                        <div key={date.toISOString()}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-500">
                              {format(date, 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-zinc-400 tabular-nums">
                              {uniqueLocations.size}/{totalLocations} ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="w-full bg-zinc-900 h-1.5">
                            <div
                              className="bg-zinc-600 h-1.5"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Details Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setSelectedAudit(null)}>
          <div className="bg-zinc-950 border border-zinc-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Audit Details</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedAudit.location?.name} • {format(new Date(selectedAudit.audit_date), 'MMM d, yyyy')}
                </p>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="p-2 hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Total Adjustments</div>
                  <div className="text-lg font-semibold text-white">{selectedAudit.adjustment_count}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Shrinkage</div>
                  <div className="text-lg font-semibold text-white">{formatCurrency(Number(selectedAudit.total_shrinkage || 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Additions</div>
                  <div className="text-lg font-semibold text-zinc-500">{formatCurrency(Number(selectedAudit.total_additions || 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Net Change</div>
                  <div className={`text-lg font-semibold ${Number(selectedAudit.net_change) < 0 ? 'text-white' : 'text-zinc-500'}`}>
                    {formatCurrency(Number(selectedAudit.net_change || 0))}
                  </div>
                </div>
              </div>
            </div>

            {/* Adjustments List */}
            <div className="flex-1 overflow-y-auto">
              {auditDetails.length === 0 ? (
                <div className="px-6 py-12 text-center text-zinc-600 text-sm">
                  Loading details...
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {auditDetails.map((adj: any) => (
                    <div key={adj.id} className="px-6 py-4 hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-zinc-600" />
                            <span className="text-sm font-medium text-white">
                              {adj.product?.name || `Product ${adj.product_id}`}
                            </span>
                          </div>
                          {adj.product?.sku && (
                            <div className="text-xs text-zinc-600 ml-6">SKU: {adj.product.sku}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-mono font-semibold ${
                            Number(adj.quantity_change) < 0 ? 'text-white' : 'text-zinc-500'
                          }`}>
                            {Number(adj.quantity_change) > 0 ? '+' : ''}{Math.round(Number(adj.quantity_change))}
                          </div>
                          <div className="text-xs text-zinc-600">
                            {Math.round(Number(adj.quantity_before))} → {Math.round(Number(adj.quantity_after))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-xs mt-3">
                        <div>
                          <div className="text-zinc-600 mb-1 uppercase tracking-wide">Reason</div>
                          <div className="text-sm text-zinc-300">{adj.reason || 'Not specified'}</div>
                        </div>
                        <div>
                          <div className="text-zinc-600 mb-1 uppercase tracking-wide">Performed By</div>
                          <div className="text-sm text-zinc-300 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {(adj as any).user_name
                              ? (adj as any).user_name.includes('-')
                                ? `User ${(adj as any).user_name.split('-')[0]}`
                                : (adj as any).user_name
                              : 'System'}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-600 mb-1 uppercase tracking-wide">Time</div>
                          <div className="text-sm text-zinc-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(adj.created_at), 'h:mm a')}
                          </div>
                        </div>
                      </div>

                      {adj.notes && (
                        <div className="mt-3 pt-3 border-t border-zinc-900">
                          <div className="text-xs text-zinc-600 mb-1 uppercase tracking-wide">Notes</div>
                          <div className="text-sm text-zinc-300">{adj.notes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safe Transaction Details Modal */}
      {selectedSafe && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setSelectedSafe(null)}>
          <div className="bg-zinc-950 border border-zinc-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Safe Transaction History</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedSafe.location?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSafe(null)}
                className="p-2 hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Current Balance</div>
                  <div className="text-lg font-semibold text-white">{formatCurrency(Number(selectedSafe.current_balance || 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Total Drops</div>
                  <div className="text-lg font-semibold text-white">{selectedSafe.total_drops}</div>
                  <div className="text-xs text-zinc-600">{formatCurrency(Number(selectedSafe.total_dropped || 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Total Deposits</div>
                  <div className="text-lg font-semibold text-white">{selectedSafe.total_deposits}</div>
                  <div className="text-xs text-zinc-600">{formatCurrency(Number(selectedSafe.total_deposited || 0))}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Last Activity</div>
                  <div className="text-sm text-zinc-400">
                    {selectedSafe.last_transaction_at
                      ? format(new Date(selectedSafe.last_transaction_at), 'MMM d, h:mm a')
                      : 'No recent activity'}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-zinc-900">
                {safeTransactionDetails.length === 0 ? (
                  <div className="px-6 py-12 text-center text-zinc-600 text-sm">
                    No transactions found
                  </div>
                ) : (
                  safeTransactionDetails.map((txn) => (
                    <div key={txn.id} className="px-6 py-4 hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`px-2 py-0.5 text-xs font-medium border ${
                              txn.transaction_type === 'drop' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' :
                              txn.transaction_type === 'deposit' ? 'bg-zinc-900 border-zinc-700 text-zinc-300' :
                              'bg-zinc-900 border-zinc-800 text-zinc-500'
                            }`}>
                              {txn.transaction_type?.toUpperCase() || 'UNKNOWN'}
                            </div>
                            <span className="text-sm text-zinc-400">
                              {format(new Date(txn.created_at), 'MMM d, yyyy • h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-mono font-semibold text-white">
                          {formatCurrency(Number(txn.amount || 0))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-zinc-600 mb-0.5">Performed By</div>
                          <div className="text-zinc-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {txn.performed_by || 'Unknown'}
                          </div>
                        </div>
                        {txn.notes && (
                          <div>
                            <div className="text-zinc-600 mb-0.5">Notes</div>
                            <div className="text-zinc-400">{txn.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Adjustment Details Modal */}
      {selectedAdjustment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setSelectedAdjustment(null)}>
          <div className="bg-zinc-950 border border-zinc-800 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Adjustment Details</h2>
              <button
                onClick={() => setSelectedAdjustment(null)}
                className="p-2 hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Product ID</div>
                  <div className="text-sm text-white font-mono">{selectedAdjustment.product_id}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Before</div>
                    <div className="text-lg font-semibold text-white">{selectedAdjustment.quantity_before}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Change</div>
                    <div className={`text-lg font-semibold ${selectedAdjustment.quantity_change < 0 ? 'text-white' : 'text-zinc-500'}`}>
                      {selectedAdjustment.quantity_change > 0 ? '+' : ''}{selectedAdjustment.quantity_change}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">After</div>
                    <div className="text-lg font-semibold text-white">{selectedAdjustment.quantity_after}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Reason</div>
                  <div className="text-sm text-white">{selectedAdjustment.reason || 'Not specified'}</div>
                </div>
                {selectedAdjustment.notes && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Notes</div>
                    <div className="text-sm text-white">{selectedAdjustment.notes}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Created By</div>
                    <div className="text-sm text-white">{selectedAdjustment.created_by || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Created At</div>
                    <div className="text-sm text-white">{format(new Date(selectedAdjustment.created_at), 'MMM d, yyyy • h:mm a')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setSelectedTransaction(null)}>
          <div className="bg-zinc-950 border border-zinc-800 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Transaction Details</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Type</div>
                    <div className="text-sm text-white uppercase">{selectedTransaction.transaction_type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Amount</div>
                    <div className="text-lg font-semibold text-white">{formatCurrency(Number(selectedTransaction.amount || 0))}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Location</div>
                  <div className="text-sm text-white">{selectedTransaction.location?.name || 'Unknown'}</div>
                </div>
                {selectedTransaction.notes && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Notes</div>
                    <div className="text-sm text-white">{selectedTransaction.notes}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Performed By</div>
                    <div className="text-sm text-white">{selectedTransaction.performed_by || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Time</div>
                    <div className="text-sm text-white">{format(new Date(selectedTransaction.created_at), 'MMM d, yyyy • h:mm a')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
