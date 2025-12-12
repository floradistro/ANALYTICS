'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { supabase } from '@/lib/supabase'
import { getDateRangeForQuery } from '@/lib/date-utils'
import {
  getStatusColor,
  getStatusDisplayText,
  formatEventTimestamp,
  type TrackingStatus,
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
  Settings,
  HelpCircle,
  Send,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react'

interface CustomerData {
  first_name: string
  last_name: string
}

interface TrackingData {
  tracking_number: string
  status: string
  status_category: string
  status_description: string
  estimated_delivery: string | null
  last_location: string
  last_update: string
  carrier: string
  events: any[]
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
  trackingData?: TrackingData
  isRegistering?: boolean
}

// Helper to extract customer from Supabase join (can be array or object)
function getCustomer(customers: CustomerData | CustomerData[] | null | undefined): CustomerData | null {
  if (!customers) return null
  if (Array.isArray(customers)) return customers[0] || null
  return customers
}

// Validate USPS tracking number format (20-22 digits)
function isValidUSPSTrackingNumber(trackingNumber: string | null | undefined): boolean {
  if (!trackingNumber) return false
  const clean = trackingNumber.replace(/\s+/g, '')
  // Must be 20-22 digits
  return /^\d{20,22}$/.test(clean)
}

export default function ShipmentsPage() {
  const { vendorId } = useAuthStore()
  const { dateRange } = useDashboardStore()
  const [shipments, setShipments] = useState<TrackedShipment[]>([])
  const [trackingMap, setTrackingMap] = useState<Map<string, TrackingData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedShipment, setSelectedShipment] = useState<TrackedShipment | null>(null)
  const [isLive] = useState(false) // Realtime disabled - use Refresh button
  const [registeringNumbers, setRegisteringNumbers] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const hasInitialized = useRef(false)

  // Fetch shipping orders
  const fetchShippingOrders = useCallback(async () => {
    if (!vendorId) return

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

  // Fetch tracking data from database
  const fetchTrackingData = useCallback(async () => {
    if (!vendorId) {
      console.log('No vendorId yet')
      return
    }

    console.log('Fetching tracking data for vendor:', vendorId)

    try {
      // First check all data in table (for debugging)
      const { data: allData } = await supabase
        .from('shipment_tracking')
        .select('tracking_number, vendor_id, status')
        .limit(5)
      console.log('All tracking data in DB:', allData)

      const { data, error } = await supabase
        .from('shipment_tracking')
        .select('*')
        .eq('vendor_id', vendorId)

      console.log('Tracking data for this vendor:', data, 'Error:', error)

      if (error) {
        // Table might not exist yet
        console.log('Tracking table not ready:', error.message)
        return
      }

      const newMap = new Map<string, TrackingData>()
      for (const row of data || []) {
        newMap.set(row.tracking_number, {
          tracking_number: row.tracking_number,
          status: row.status,
          status_category: row.status_category,
          status_description: row.status_description,
          estimated_delivery: row.estimated_delivery,
          last_location: row.last_location,
          last_update: row.last_update,
          carrier: row.carrier,
          events: row.events || [],
        })
      }
      setTrackingMap(newMap)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to fetch tracking data:', error)
    }
  }, [vendorId])

  // Register tracking numbers that aren't in database yet
  const registerUnregisteredTrackers = useCallback(async () => {
    if (!vendorId || shipments.length === 0) return

    const unregisteredNumbers = shipments
      .filter(s => s.tracking_number && !trackingMap.has(s.tracking_number))
      .map(s => s.tracking_number!)

    if (unregisteredNumbers.length === 0) return

    setIsRefreshing(true)
    setRegisteringNumbers(new Set(unregisteredNumbers))

    try {
      const response = await fetch('/api/tracking/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumbers: unregisteredNumbers,
          vendorId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to register trackers')
      }

      // Refresh tracking data from database
      await fetchTrackingData()
    } catch (error: any) {
      console.error('Failed to register trackers:', error)
      if (error.message?.includes('rate-limited') || error.message?.includes('rate limit')) {
        setError('EasyPost API rate limited. Tracking data will update when webhooks arrive.')
      } else {
        setError(error.message || 'Failed to register tracking numbers')
      }
    } finally {
      setIsRefreshing(false)
      setRegisteringNumbers(new Set())
    }
  }, [vendorId, shipments, trackingMap, fetchTrackingData])

  // Register a single tracker
  const registerSingleTracker = useCallback(async (trackingNumber: string) => {
    if (!vendorId) return

    setRegisteringNumbers(prev => new Set(prev).add(trackingNumber))
    setError(null)

    try {
      console.log('Registering tracker:', trackingNumber, 'for vendor:', vendorId)

      const response = await fetch('/api/tracking/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumbers: [trackingNumber],
          vendorId,
        }),
      })

      const data = await response.json()
      console.log('Register response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register tracker')
      }

      // Refresh tracking data from database
      await fetchTrackingData()
    } catch (error: any) {
      console.error('Failed to register tracker:', error)
      if (error.message?.includes('rate-limited')) {
        setError('Rate limited. Try again in a few minutes.')
      }
    } finally {
      setRegisteringNumbers(prev => {
        const next = new Set(prev)
        next.delete(trackingNumber)
        return next
      })
    }
  }, [vendorId, fetchTrackingData])

  // Initial load
  useEffect(() => {
    fetchShippingOrders()
    fetchTrackingData()
  }, [fetchShippingOrders, fetchTrackingData])

  // Don't auto-register on page load - let users click "Track" manually
  // This prevents rate limiting from EasyPost
  // useEffect(() => {
  //   if (!loading && shipments.length > 0 && !hasInitialized.current) {
  //     hasInitialized.current = true
  //     registerUnregisteredTrackers()
  //   }
  // }, [loading, shipments.length, registerUnregisteredTrackers])

  // Real-time subscription disabled for now - enable in Supabase dashboard:
  // Database > Replication > Enable for shipment_tracking table
  // For now, use manual Refresh button to get updates

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

  // Combine shipments with tracking data
  const shipmentsWithTracking = shipments.map(s => {
    const trackingNum = s.tracking_number?.trim()
    const trackingData = trackingNum ? trackingMap.get(trackingNum) : undefined

    // Debug: log first shipment with tracking number
    if (s.tracking_number && !trackingData && trackingMap.size > 0) {
      console.log('No match for:', JSON.stringify(s.tracking_number), 'Map keys:', Array.from(trackingMap.keys()).slice(0, 3))
    }

    return {
      ...s,
      trackingData,
      isRegistering: trackingNum ? registeringNumbers.has(trackingNum) : false,
    }
  })

  const filteredShipments = shipmentsWithTracking.filter((s) => {
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
      if (!s.trackingData) return false
      if (s.trackingData.status !== statusFilter) return false
    }

    return true
  })

  // Stats
  const stats = {
    total: shipments.length,
    delivered: shipmentsWithTracking.filter((s) => s.trackingData?.status === 'delivered').length,
    outForDelivery: shipmentsWithTracking.filter((s) => s.trackingData?.status === 'out_for_delivery').length,
    inTransit: shipmentsWithTracking.filter((s) => s.trackingData?.status === 'in_transit').length,
    alerts: shipmentsWithTracking.filter((s) => s.trackingData?.status === 'alert').length,
    preTransit: shipmentsWithTracking.filter((s) => s.trackingData?.status === 'pre_transit').length,
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
          {/* Live indicator */}
          <span className={`flex items-center gap-2 px-3 py-2 text-xs border ${
            isLive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? 'Live Updates' : 'Connecting...'}
          </span>
          {lastRefresh && (
            <span className="text-xs text-zinc-500">
              Updated: {format(lastRefresh, 'h:mm:ss a')}
            </span>
          )}
          <button
            onClick={() => fetchTrackingData()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-xl"
          >
            &times;
          </button>
        </div>
      )}

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
                      {shipment.isRegistering ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-light border bg-zinc-800 border-zinc-700 text-zinc-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Registering...
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-light border ${getStatusColor(
                            (shipment.trackingData?.status || 'unknown') as TrackingStatus
                          )}`}
                        >
                          {getStatusIcon(shipment.trackingData?.status)}
                          {getStatusDisplayText((shipment.trackingData?.status || 'unknown') as TrackingStatus)}
                        </span>
                      )}
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
                        {shipment.trackingData?.last_location || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500 font-light">
                      {shipment.trackingData?.last_update
                        ? formatEventTimestamp(shipment.trackingData.last_update)
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-400 font-light">
                      {shipment.trackingData?.estimated_delivery || '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {shipment.tracking_number && isValidUSPSTrackingNumber(shipment.tracking_number) && !shipment.trackingData ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            registerSingleTracker(shipment.tracking_number!)
                          }}
                          disabled={shipment.isRegistering}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                        >
                          {shipment.isRegistering ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Track
                            </>
                          )}
                        </button>
                      ) : shipment.tracking_number && shipment.trackingData ? (
                        <span className="text-xs text-zinc-600">Auto-updating</span>
                      ) : shipment.tracking_number && !isValidUSPSTrackingNumber(shipment.tracking_number) ? (
                        <span className="text-xs text-zinc-500">Invalid #</span>
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
              <p className="text-xs text-zinc-500 mt-1">How tracking works</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-sm text-zinc-400">
                <p>
                  <strong className="text-white">Automatic Updates:</strong> Tracking numbers are registered with EasyPost once,
                  then updates are pushed automatically via webhooks.
                </p>
                <p>
                  <strong className="text-white">Real-time:</strong> When EasyPost detects a status change (usually within minutes),
                  it pushes the update to your dashboard instantly.
                </p>
                <p>
                  <strong className="text-white">No Rate Limits:</strong> Since updates are pushed (not polled),
                  you won't hit API rate limits.
                </p>
                <p>
                  <strong className="text-white">Data Persistence:</strong> Tracking data is stored in your database,
                  so it persists across page refreshes.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Webhook endpoint: <code className="text-zinc-400">/api/webhooks/easypost</code>
                </p>
              </div>
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
              {/* Status Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm border ${getStatusColor(
                    (selectedShipment.trackingData?.status || 'unknown') as TrackingStatus
                  )}`}
                >
                  {getStatusIcon(selectedShipment.trackingData?.status)}
                  {selectedShipment.trackingData?.status_description || 'No tracking data'}
                </span>
                {selectedShipment.trackingData?.carrier && (
                  <span className="text-xs text-zinc-500">
                    {selectedShipment.trackingData.carrier}
                  </span>
                )}
              </div>

              {/* Estimated Delivery */}
              {selectedShipment.trackingData?.estimated_delivery && (
                <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Estimated Delivery
                  </p>
                  <p className="text-white font-light">
                    {selectedShipment.trackingData.estimated_delivery}
                  </p>
                </div>
              )}

              {/* Tracking Events Timeline */}
              {selectedShipment.trackingData?.events &&
                selectedShipment.trackingData.events.length > 0 && (
                  <div>
                    <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">
                      Tracking History
                    </h3>
                    <div className="space-y-4">
                      {selectedShipment.trackingData.events.map((event: any, index: number) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-emerald-500' : 'bg-zinc-700'
                              }`}
                            />
                            {index < selectedShipment.trackingData!.events.length - 1 && (
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
