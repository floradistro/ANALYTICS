'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import {
  trackMultiplePackages,
  getStatusColor,
  getStatusDisplayText,
  formatEventTimestamp,
  type USPSTrackingResult,
} from '@/lib/usps'
import { format } from 'date-fns'
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Clock,
  Search,
  ExternalLink,
  Pause,
  Play,
  Settings,
  HelpCircle,
  Send,
  Bot,
  Globe,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'

interface CustomerData {
  first_name: string
  last_name: string
}

interface ShippingOrder {
  id: string
  order_number: string
  tracking_number: string | null
  status: string
  payment_status: string
  shipping_name: string | null
  shipping_city: string | null
  shipping_state: string | null
  created_at: string
  total_amount: number
  customers?: CustomerData | CustomerData[] | null
}

interface TrackedShipment extends ShippingOrder {
  trackingInfo?: USPSTrackingResult
  isLoading?: boolean
}

// Helper to extract customer from Supabase join (can be array or object)
function getCustomer(customers: CustomerData | CustomerData[] | null | undefined): CustomerData | null {
  if (!customers) return null
  if (Array.isArray(customers)) return customers[0] || null
  return customers
}

export default function ShipmentsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [shipments, setShipments] = useState<TrackedShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60) // seconds
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedShipment, setSelectedShipment] = useState<TrackedShipment | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Agent activity streaming state
  const [showAgentActivity, setShowAgentActivity] = useState(false)
  const [agentLogs, setAgentLogs] = useState<Array<{ type: string; message: string; timestamp: Date }>>([])
  const [agentStreaming, setAgentStreaming] = useState(false)
  const [streamingTrackingNumber, setStreamingTrackingNumber] = useState<string | null>(null)
  const agentLogsEndRef = useRef<HTMLDivElement>(null)

  // Fetch shipping orders
  const fetchShippingOrders = useCallback(async () => {
    if (!vendorId) return

    // Get validated date range from store - bulletproof for accounting
    const { start, end } = getDateRangeForQuery()

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          tracking_number,
          status,
          payment_status,
          shipping_name,
          shipping_city,
          shipping_state,
          created_at,
          total_amount,
          customers (
            first_name,
            last_name
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('order_type', 'shipping')
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (error) throw error

      setShipments(data || [])
    } catch (error) {
      console.error('Failed to fetch shipping orders:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId, dateRange])

  // Fetch tracking info for all shipments (no credentials needed)
  const refreshTrackingInfo = useCallback(async () => {
    if (shipments.length === 0) return

    setIsRefreshing(true)

    const shipmentsWithTracking = shipments.filter((s) => s.tracking_number)
    const trackingNumbers = shipmentsWithTracking
      .map((s) => s.tracking_number)
      .filter((t): t is string => !!t)

    if (trackingNumbers.length === 0) {
      setIsRefreshing(false)
      return
    }

    try {
      // Use batch API for efficiency
      const results = await trackMultiplePackages(trackingNumbers)

      // Map results back to shipments
      const resultsMap = new Map(results.map((r) => [r.trackingNumber, r]))

      setShipments((prev) =>
        prev.map((s) => {
          if (s.tracking_number && resultsMap.has(s.tracking_number)) {
            return { ...s, trackingInfo: resultsMap.get(s.tracking_number), isLoading: false }
          }
          return s
        })
      )

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to refresh tracking:', error)
    }

    setIsRefreshing(false)
  }, [shipments])

  // Initial load
  useEffect(() => {
    fetchShippingOrders()
  }, [fetchShippingOrders])

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh && shipments.length > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshTrackingInfo()
      }, refreshInterval * 1000)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, shipments.length, refreshTrackingInfo])

  // Auto-scroll agent logs
  useEffect(() => {
    agentLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentLogs])

  // Stream tracking for a single package with live agent activity
  const streamTrackingForPackage = useCallback(async (trackingNumber: string) => {
    setShowAgentActivity(true)
    setAgentStreaming(true)
    setStreamingTrackingNumber(trackingNumber)
    setAgentLogs([{ type: 'status', message: 'Initializing Claude agent...', timestamp: new Date() }])

    try {
      const response = await fetch('/api/usps/track/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            continue
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.message) {
                setAgentLogs(prev => [...prev, {
                  type: data.tool || data.query ? 'tool' : 'status',
                  message: data.message,
                  timestamp: new Date()
                }])
              }
              if (data.text) {
                setAgentLogs(prev => [...prev, {
                  type: 'text',
                  message: data.text,
                  timestamp: new Date()
                }])
              }
              if (data.trackingNumber && data.status) {
                // Got the result - update the shipment
                setShipments(prev => prev.map(s => {
                  if (s.tracking_number === trackingNumber) {
                    return { ...s, trackingInfo: data as USPSTrackingResult, isLoading: false }
                  }
                  return s
                }))
                setLastRefresh(new Date())
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setAgentLogs(prev => [...prev, {
        type: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }])
    }

    setAgentStreaming(false)
  }, [])

  // Don't auto-refresh - let users click to track manually on USPS.com
  // Website scraping is too slow for live tracking

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'out_for_delivery':
        return <Send className="w-4 h-4" />
      case 'in_transit':
        return <Truck className="w-4 h-4" />
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />
      case 'pre_transit':
        return <Package className="w-4 h-4" />
      default:
        return <HelpCircle className="w-4 h-4" />
    }
  }

  const filteredShipments = shipments.filter((s) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        s.order_number.toLowerCase().includes(searchLower) ||
        s.tracking_number?.toLowerCase().includes(searchLower) ||
        s.shipping_name?.toLowerCase().includes(searchLower) ||
        getCustomer(s.customers)?.first_name?.toLowerCase().includes(searchLower) ||
        getCustomer(s.customers)?.last_name?.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (!s.trackingInfo) return false
      if (s.trackingInfo.status !== statusFilter) return false
    }

    return true
  })

  // Stats
  const stats = {
    total: shipments.length,
    delivered: shipments.filter((s) => s.trackingInfo?.status === 'delivered').length,
    outForDelivery: shipments.filter((s) => s.trackingInfo?.status === 'out_for_delivery').length,
    inTransit: shipments.filter((s) => s.trackingInfo?.status === 'in_transit').length,
    alerts: shipments.filter((s) => s.trackingInfo?.status === 'alert').length,
    preTransit: shipments.filter((s) => s.trackingInfo?.status === 'pre_transit').length,
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-light text-white tracking-wide">Shipment Tracking</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">
            Live USPS tracking for all shipping orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-zinc-500">
              Last updated: {format(lastRefresh, 'h:mm:ss a')}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={refreshTrackingInfo}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </button>
          {agentLogs.length > 0 && (
            <button
              onClick={() => setShowAgentActivity(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              <Bot className="w-4 h-4" />
              Agent Activity
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-zinc-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-light text-white mt-2">{stats.total}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Out for Delivery</span>
          </div>
          <p className="text-2xl font-light text-green-400 mt-2">{stats.outForDelivery}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">In Transit</span>
          </div>
          <p className="text-2xl font-light text-blue-400 mt-2">{stats.inTransit}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Delivered</span>
          </div>
          <p className="text-2xl font-light text-emerald-400 mt-2">{stats.delivered}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-zinc-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Pre-Transit</span>
          </div>
          <p className="text-2xl font-light text-zinc-400 mt-2">{stats.preTransit}</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Alerts</span>
          </div>
          <p className="text-2xl font-light text-red-400 mt-2">{stats.alerts}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by order, tracking #, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-700 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="pre_transit">Pre-Transit</option>
          <option value="alert">Alerts</option>
        </select>
      </div>

      {/* Shipments Table */}
      <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-900">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-4 py-4 text-left text-xs font-light text-zinc-500 uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-4 py-4 text-right text-xs font-light text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    Loading shipments...
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No shipments found
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-light border ${getStatusColor(
                          shipment.trackingInfo?.status || 'unknown'
                        )}`}
                      >
                        {getStatusIcon(shipment.trackingInfo?.status)}
                        {getStatusDisplayText(shipment.trackingInfo?.status || 'unknown')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-light text-white">{shipment.order_number}</p>
                      <p className="text-xs text-zinc-500">
                        {formatCurrency(shipment.total_amount)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {shipment.tracking_number ? (
                        <a
                          href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${shipment.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          {shipment.tracking_number}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-zinc-500">No tracking</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-300 font-light">
                      {getCustomer(shipment.customers)
                        ? `${getCustomer(shipment.customers)!.first_name} ${getCustomer(shipment.customers)!.last_name}`
                        : shipment.shipping_name || 'Guest'}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300 font-light">
                        {shipment.trackingInfo?.lastLocation || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500 font-light">
                      {shipment.trackingInfo?.lastUpdate
                        ? formatEventTimestamp(shipment.trackingInfo.lastUpdate)
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-400 font-light">
                      {shipment.trackingInfo?.estimatedDelivery || '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {shipment.tracking_number ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            streamTrackingForPackage(shipment.tracking_number!)
                          }}
                          disabled={agentStreaming && streamingTrackingNumber === shipment.tracking_number}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                        >
                          {agentStreaming && streamingTrackingNumber === shipment.tracking_number ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Tracking...
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3" />
                              Track
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 max-w-md w-full">
            <div className="p-6 border-b border-zinc-900">
              <h2 className="text-sm font-light text-white tracking-wide">Tracking Settings</h2>
              <p className="text-xs text-zinc-500 mt-1">Configure auto-refresh behavior</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                  Refresh Interval
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-zinc-700 text-sm"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>

              <p className="text-xs text-zinc-500">
                Tracking data is fetched directly from USPS.com - no API credentials required.
              </p>
            </div>
            <div className="p-6 border-t border-zinc-900 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-zinc-800 text-white text-sm hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Activity Panel */}
      {showAgentActivity && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-light text-white">Claude Agent Activity</span>
                </div>
                {agentStreaming && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Live
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAgentActivity(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {streamingTrackingNumber && (
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-400">
                Tracking: <span className="text-white font-mono">{streamingTrackingNumber}</span>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-xs">
              {agentLogs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'tool' ? 'text-blue-400' :
                    log.type === 'text' ? 'text-zinc-300' :
                    'text-zinc-400'
                  }`}
                >
                  <span className="text-zinc-600 shrink-0">
                    {format(log.timestamp, 'HH:mm:ss')}
                  </span>
                  {log.type === 'tool' && <Globe className="w-3 h-3 mt-0.5 shrink-0" />}
                  {log.type === 'status' && <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />}
                  {log.type === 'error' && <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
                  <span className="break-all">{log.message}</span>
                </div>
              ))}
              <div ref={agentLogsEndRef} />
            </div>

            <div className="p-4 border-t border-zinc-900 flex justify-end">
              <button
                onClick={() => setShowAgentActivity(false)}
                className="px-4 py-2 bg-zinc-800 text-white text-sm hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Detail Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-zinc-950">
              <div>
                <h2 className="text-sm font-light text-white tracking-wide">
                  Order #{selectedShipment.order_number}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Tracking: {selectedShipment.tracking_number || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="text-zinc-500 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              {/* Track with AI Button */}
              {selectedShipment.tracking_number && (
                <button
                  onClick={() => {
                    setSelectedShipment(null)
                    streamTrackingForPackage(selectedShipment.tracking_number!)
                  }}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  <span>Track with AI Agent (Live View)</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              )}

              {/* Status Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm border ${getStatusColor(
                    selectedShipment.trackingInfo?.status || 'unknown'
                  )}`}
                >
                  {getStatusIcon(selectedShipment.trackingInfo?.status)}
                  {selectedShipment.trackingInfo?.statusDescription || 'No tracking data'}
                </span>
                {selectedShipment.trackingInfo?.mailClass && (
                  <span className="text-xs text-zinc-500">
                    {selectedShipment.trackingInfo.mailClass}
                  </span>
                )}
              </div>

              {/* Estimated Delivery */}
              {selectedShipment.trackingInfo?.estimatedDelivery && (
                <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Estimated Delivery
                  </p>
                  <p className="text-white font-light">
                    {selectedShipment.trackingInfo.estimatedDelivery}
                  </p>
                </div>
              )}

              {/* Tracking Events Timeline */}
              {selectedShipment.trackingInfo?.events &&
                selectedShipment.trackingInfo.events.length > 0 && (
                  <div>
                    <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">
                      Tracking History
                    </h3>
                    <div className="space-y-4">
                      {selectedShipment.trackingInfo.events.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-emerald-500' : 'bg-zinc-700'
                              }`}
                            />
                            {index < selectedShipment.trackingInfo!.events.length - 1 && (
                              <div className="w-px h-full bg-zinc-800 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm text-white font-light">{event.eventType}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {(event.eventCity || event.eventState) && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                  <MapPin className="w-3 h-3" />
                                  {[event.eventCity, event.eventState, event.eventZIPCode]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              )}
                              {event.eventTimestamp && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Clock className="w-3 h-3" />
                                  {formatEventTimestamp(event.eventTimestamp)}
                                </span>
                              )}
                            </div>
                            {event.recipientName && (
                              <p className="text-xs text-zinc-400 mt-1">
                                Signed by: {event.recipientName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Ship To */}
              <div className="mt-6 pt-6 border-t border-zinc-900">
                <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Ship To</h3>
                <p className="text-sm text-white font-light">
                  {selectedShipment.shipping_name ||
                    (getCustomer(selectedShipment.customers)
                      ? `${getCustomer(selectedShipment.customers)!.first_name} ${getCustomer(selectedShipment.customers)!.last_name}`
                      : 'Guest')}
                </p>
                {selectedShipment.shipping_city && (
                  <p className="text-sm text-zinc-400">
                    {selectedShipment.shipping_city}, {selectedShipment.shipping_state}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
