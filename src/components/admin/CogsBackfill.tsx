'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Loader2, Database } from 'lucide-react'

interface BackfillStats {
  itemsProcessed: number
  itemsUpdated: number
  itemsNoCost: number
}

interface AnalysisStats {
  totalMissing: number
  canBackfill: number
  revenueAffected: number
  earliestDate: string | null
  latestDate: string | null
}

export function CogsBackfill() {
  const { vendorId } = useAuthStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null)
  const [backfillStats, setBackfillStats] = useState<BackfillStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeData = async () => {
    if (!vendorId) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Count items missing cost
      const { count: totalMissing } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .is('cost_per_unit', null)

      // Count items that can be backfilled from product cost_price
      const { data: backfillableItems } = await supabase
        .from('order_items')
        .select('id, line_subtotal, products!inner(cost_price)')
        .eq('vendor_id', vendorId)
        .is('cost_per_unit', null)
        .not('products.cost_price', 'is', null)
        .gt('products.cost_price', 0)

      const canBackfill = backfillableItems?.length || 0
      const revenueAffected = backfillableItems?.reduce((sum, item) => sum + (item.line_subtotal || 0), 0) || 0

      // Get date range of affected orders
      const { data: dateRange } = await supabase
        .from('order_items')
        .select('orders!inner(created_at)')
        .eq('vendor_id', vendorId)
        .is('cost_per_unit', null)
        .order('orders(created_at)', { ascending: true })
        .limit(1)

      const { data: latestDateRange } = await supabase
        .from('order_items')
        .select('orders!inner(created_at)')
        .eq('vendor_id', vendorId)
        .is('cost_per_unit', null)
        .order('orders(created_at)', { ascending: false })
        .limit(1)

      setAnalysisStats({
        totalMissing: totalMissing || 0,
        canBackfill,
        revenueAffected,
        earliestDate: dateRange?.[0]?.orders?.created_at || null,
        latestDate: latestDateRange?.[0]?.orders?.created_at || null,
      })
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze data')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runBackfill = async () => {
    if (!vendorId) return

    setIsBackfilling(true)
    setError(null)
    setBackfillStats(null)

    try {
      // Call the backfill function
      const { data, error: rpcError } = await supabase
        .rpc('backfill_order_item_costs')

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        setBackfillStats({
          itemsProcessed: data[0].items_processed,
          itemsUpdated: data[0].items_updated,
          itemsNoCost: data[0].items_no_cost,
        })
      }

      // Re-analyze after backfill
      await analyzeData()
    } catch (err) {
      console.error('Backfill error:', err)
      setError(err instanceof Error ? err.message : 'Failed to run backfill')
    } finally {
      setIsBackfilling(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">COGS Data Backfill</h2>
          <p className="text-sm text-zinc-400">
            Backfill missing cost data for historical orders using current product costs
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Error</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Stats */}
      {analysisStats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Missing</p>
            <p className="text-2xl font-bold text-white">{analysisStats.totalMissing.toLocaleString()}</p>
            <p className="text-xs text-zinc-400 mt-1">order items without cost data</p>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Can Backfill</p>
            <p className="text-2xl font-bold text-green-400">{analysisStats.canBackfill.toLocaleString()}</p>
            <p className="text-xs text-green-300 mt-1">
              {analysisStats.totalMissing > 0
                ? `${Math.round((analysisStats.canBackfill / analysisStats.totalMissing) * 100)}% of missing items`
                : '0% of missing items'}
            </p>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Revenue Affected</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(analysisStats.revenueAffected)}</p>
            <p className="text-xs text-blue-300 mt-1">from items that can be backfilled</p>
          </div>

          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg md:col-span-2 lg:col-span-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Date Range</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-zinc-400">Earliest</p>
                <p className="text-sm text-white font-medium">{formatDate(analysisStats.earliestDate)}</p>
              </div>
              <div className="flex-1 h-px bg-zinc-700" />
              <div>
                <p className="text-xs text-zinc-400">Latest</p>
                <p className="text-sm text-white font-medium">{formatDate(analysisStats.latestDate)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backfill Results */}
      {backfillStats && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-400 mb-2">Backfill Complete</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Processed</p>
                  <p className="text-white font-medium">{backfillStats.itemsProcessed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Updated</p>
                  <p className="text-green-400 font-medium">{backfillStats.itemsUpdated.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-400">No Cost Found</p>
                  <p className="text-zinc-400 font-medium">{backfillStats.itemsNoCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={analyzeData}
          disabled={isAnalyzing || isBackfilling}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Analyze Data
            </>
          )}
        </button>

        {analysisStats && analysisStats.canBackfill > 0 && (
          <button
            onClick={runBackfill}
            disabled={isAnalyzing || isBackfilling}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {isBackfilling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Backfill...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Run Backfill ({analysisStats.canBackfill.toLocaleString()} items)
              </>
            )}
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs font-medium text-blue-400 mb-2">How it works</p>
        <ul className="text-xs text-blue-300 space-y-1 list-disc list-inside">
          <li>First tries to find cost from purchase orders received before the order date</li>
          <li>Falls back to current product cost_price if no PO found</li>
          <li>As a last resort, uses any available PO cost as an estimate</li>
          <li>Automatically calculates profit_per_unit and margin_percentage</li>
          <li>Safe to run multiple times - only updates items with NULL cost_per_unit</li>
        </ul>
      </div>
    </div>
  )
}
