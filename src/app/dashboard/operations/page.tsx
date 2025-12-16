'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { format, isToday, startOfDay } from 'date-fns'
import { motion } from 'framer-motion'
import {
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

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

export default function OperationsPage() {
  const { vendorId } = useAuthStore()
  const [audits, setAudits] = useState<DailyAuditSummary[]>([])
  const [safeBalances, setSafeBalances] = useState<SafeBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [totalLocations, setTotalLocations] = useState(0)

  useEffect(() => {
    if (vendorId) {
      fetchOperationsData()
    }
  }, [vendorId])

  const fetchOperationsData = async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      // Fetch today's audits
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
      const { data: auditsData } = await supabase
        .from('daily_audit_summary')
        .select(`
          *,
          location:location_id (name)
        `)
        .eq('vendor_id', vendorId)
        .gte('audit_date', today)
        .order('audit_date', { ascending: false })

      // Fetch safe balances
      const { data: safesData } = await supabase
        .from('pos_safe_balances')
        .select(`
          *,
          location:location_id (name)
        `)
        .eq('vendor_id', vendorId)

      // Get total locations count
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('status', 'active')

      setAudits(auditsData || [])
      setSafeBalances(safesData || [])
      setTotalLocations(count || 0)
    } catch (error) {
      console.error('Failed to fetch operations data:', error)
    } finally {
      setLoading(false)
    }
  }

  const auditsCompletedToday = audits.filter(a => isToday(new Date(a.audit_date))).length
  const auditCompletionRate = totalLocations > 0 ? (auditsCompletedToday / totalLocations) * 100 : 0

  const safesReconciled = safeBalances.filter(s =>
    s.last_transaction_at && isToday(new Date(s.last_transaction_at))
  ).length
  const safeReconciliationRate = totalLocations > 0 ? (safesReconciled / totalLocations) * 100 : 0

  const lowBalanceLocations = safeBalances.filter(s => s.current_balance < 500)
  const totalSafeBalance = safeBalances.reduce((sum, s) => sum + Number(s.current_balance), 0)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

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
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="w-4 h-4" />
          Last updated: {format(new Date(), 'h:mm a')}
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <ClipboardCheck className="w-8 h-8 text-blue-400" />
            <span className={`text-2xl font-bold ${auditCompletionRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {Math.round(auditCompletionRate)}%
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Audit Completion</h3>
          <p className="text-xs text-zinc-600">
            {auditsCompletedToday} of {totalLocations} locations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            <span className={`text-2xl font-bold ${safeReconciliationRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {Math.round(safeReconciliationRate)}%
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Cash Reconciled</h3>
          <p className="text-xs text-zinc-600">
            {safesReconciled} of {totalLocations} locations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">
              {formatCurrency(totalSafeBalance)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Total in Safes</h3>
          <p className="text-xs text-zinc-600">
            Across {safeBalances.length} locations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-zinc-950 border border-zinc-900 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className={`w-8 h-8 ${lowBalanceLocations.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className={`text-2xl font-bold ${lowBalanceLocations.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {lowBalanceLocations.length}
            </span>
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Low Balance Alerts</h3>
          <p className="text-xs text-zinc-600">
            Safes under $500
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Audits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Today's Audits</h2>
              </div>
              <span className="text-xs text-zinc-500">
                {format(new Date(), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="divide-y divide-zinc-900 max-h-[400px] overflow-y-auto">
            {audits.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-sm">
                No audits completed today
              </div>
            ) : (
              audits.map((audit) => {
                const location = Array.isArray(audit.location) ? audit.location[0] : audit.location
                const netChange = Number(audit.net_change)

                return (
                  <Link
                    key={`${audit.location_id}-${audit.audit_date}`}
                    href={`/dashboard/locations/${audit.location_id}`}
                    className="p-4 hover:bg-zinc-900/50 transition-colors block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-medium text-white">
                            {location?.name || 'Unknown Location'}
                          </h3>
                          {audit.adjustment_count > 0 && (
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-medium rounded">
                              {audit.adjustment_count} adjustments
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>Last: {format(new Date(audit.last_adjustment), 'h:mm a')}</span>
                          {audit.reasons && audit.reasons.length > 0 && (
                            <span className="capitalize">{audit.reasons[0]}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                          netChange > 0 ? 'text-emerald-400' : netChange < 0 ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {netChange > 0 ? <TrendingUp className="w-4 h-4" /> : netChange < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                          {formatCurrency(Math.abs(netChange))}
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Cash Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Safe Balances</h2>
              </div>
              <span className="text-xs text-zinc-500">Real-time</span>
            </div>
          </div>

          <div className="divide-y divide-zinc-900 max-h-[400px] overflow-y-auto">
            {safeBalances.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-sm">
                No safe data available
              </div>
            ) : (
              safeBalances.map((safe) => {
                const location = Array.isArray(safe.location) ? safe.location[0] : safe.location
                const isLowBalance = Number(safe.current_balance) < 500
                const lastUpdated = safe.last_transaction_at ? new Date(safe.last_transaction_at) : null

                return (
                  <Link
                    key={safe.location_id}
                    href={`/dashboard/locations/${safe.location_id}`}
                    className="p-4 hover:bg-zinc-900/50 transition-colors block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-medium text-white">
                            {location?.name || 'Unknown Location'}
                          </h3>
                          {isLowBalance && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded border border-amber-500/20">
                              Low Balance
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          {lastUpdated && (
                            <span>
                              {isToday(lastUpdated) ? 'Today' : format(lastUpdated, 'MMM d')} {format(lastUpdated, 'h:mm a')}
                            </span>
                          )}
                          <span>{safe.total_drops} drops</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className={`text-sm font-medium ${isLowBalance ? 'text-amber-400' : 'text-white'}`}>
                          {formatCurrency(Number(safe.current_balance))}
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
