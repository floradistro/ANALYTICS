'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, MapPin, Users, Eye, Clock, ShoppingCart, Smartphone, TrendingUp, Calendar, User, ExternalLink } from 'lucide-react'

interface QRCodeData {
  id: string
  code: string
  name: string
  type: string
  destination_url: string
  campaign_name: string | null
  total_scans: number
  unique_devices: number
  created_at: string
  created_by?: string
  landing_page_title?: string
  landing_page_description?: string
}

interface QRAnalyticsModalProps {
  qrCode: QRCodeData
  vendorId: string
  onClose: () => void
}

interface ScanData {
  total_scans: number
  unique_scanners: number
  gps_scans: number
  unique_cities: number
  avg_scans_per_user: number
  first_scan: string | null
  last_scan: string | null
}

interface LocationData {
  city: string
  region: string
  country: string
  scan_count: number
  unique_scanners: number
  avg_latitude?: number
  avg_longitude?: number
}

interface CTAData {
  cta_label: string
  cta_id: string
  total_clicks: number
  unique_clicks: number
  click_through_rate: number
}

interface DeviceData {
  device_type: string
  count: number
}

interface RecentScan {
  scanned_at: string
  city: string
  region: string
  device_type: string
  fingerprint_id: string
}

interface OrderData {
  order_id: string
  order_number: string
  total: number
  created_at: string
  status: string
  customer_name?: string
}

export function QRAnalyticsModal({ qrCode, vendorId, onClose }: QRAnalyticsModalProps) {
  const [loading, setLoading] = useState(true)
  const [scanData, setScanData] = useState<ScanData | null>(null)
  const [locationData, setLocationData] = useState<LocationData[]>([])
  const [ctaData, setCTAData] = useState<CTAData[]>([])
  const [deviceData, setDeviceData] = useState<DeviceData[]>([])
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [orders, setOrders] = useState<OrderData[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    loadAnalytics()
  }, [qrCode.id])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Load scan stats
      const statsRes = await fetch(`/api/qr/stats?vendor_id=${vendorId}&qr_code_id=${qrCode.id}`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (Array.isArray(statsData.stats) && statsData.stats.length > 0) {
          setScanData(statsData.stats[0])
        }
      }

      // Load location heatmap
      const heatmapRes = await fetch(`/api/qr/heatmap?vendor_id=${vendorId}&qr_code_id=${qrCode.id}`)
      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json()
        setLocationData(heatmapData.heatmap || [])
      }

      // Load CTA performance
      const ctaRes = await fetch(`/api/qr/ctas/click?qr_code_id=${qrCode.id}`)
      if (ctaRes.ok) {
        const ctaAnalytics = await ctaRes.json()
        // Transform analytics data into CTA performance
        // This would need the actual CTA data joined
      }

      // Load recent scans
      const scansRes = await fetch(`/api/qr/scans?qr_code_id=${qrCode.id}&limit=10`)
      if (scansRes.ok) {
        const scansData = await scansRes.json()
        setRecentScans(scansData.scans || [])

        // Aggregate device data
        const devices: { [key: string]: number } = {}
        scansData.scans?.forEach((scan: RecentScan) => {
          devices[scan.device_type] = (devices[scan.device_type] || 0) + 1
        })
        setDeviceData(Object.entries(devices).map(([device_type, count]) => ({ device_type, count })))
      }

      // Load attributed orders (orders from visitors who scanned this QR)
      const ordersRes = await fetch(`/api/qr/orders?qr_code_id=${qrCode.id}`)
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData.orders || [])
        const revenue = (ordersData.orders || []).reduce((sum: number, order: OrderData) => sum + parseFloat(order.total.toString()), 0)
        setTotalRevenue(revenue)
      }

    } catch (error) {
      console.error('Error loading QR analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 max-w-6xl w-full my-8">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-xl font-light text-white">{qrCode.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-zinc-500 font-mono">{qrCode.code}</p>
              <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 capitalize">{qrCode.type}</span>
              {qrCode.campaign_name && (
                <span className="text-xs px-2 py-1 bg-blue-950 text-blue-400 border border-blue-900">{qrCode.campaign_name}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-zinc-500">Total Scans</span>
                </div>
                <div className="text-2xl font-light text-white">{scanData?.total_scans || 0}</div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-500">Unique Users</span>
                </div>
                <div className="text-2xl font-light text-white">{scanData?.unique_scanners || 0}</div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-zinc-500">GPS Scans</span>
                </div>
                <div className="text-2xl font-light text-white">{scanData?.gps_scans || 0}</div>
                <div className="text-xs text-zinc-600 mt-1">
                  {scanData?.total_scans && scanData.total_scans > 0
                    ? Math.round((scanData.gps_scans / scanData.total_scans) * 100)
                    : 0}% capture
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-zinc-500">Revenue</span>
                </div>
                <div className="text-2xl font-light text-white">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs text-zinc-600 mt-1">{orders.length} orders</div>
              </div>
            </div>

            {/* QR Code Info */}
            <div className="bg-zinc-950 border border-zinc-800 p-4">
              <h3 className="text-sm font-medium text-white mb-3">QR Code Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-500 mb-1">Created</div>
                  <div className="text-white">{formatDate(qrCode.created_at)}</div>
                </div>
                <div>
                  <div className="text-zinc-500 mb-1">Destination</div>
                  <a href={qrCode.destination_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    {qrCode.destination_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {qrCode.landing_page_title && (
                  <div className="col-span-2">
                    <div className="text-zinc-500 mb-1">Landing Page Title</div>
                    <div className="text-white">{qrCode.landing_page_title}</div>
                  </div>
                )}
                {qrCode.landing_page_description && (
                  <div className="col-span-2">
                    <div className="text-zinc-500 mb-1">Landing Page Description</div>
                    <div className="text-white">{qrCode.landing_page_description}</div>
                  </div>
                )}
                {scanData?.first_scan && (
                  <div>
                    <div className="text-zinc-500 mb-1">First Scan</div>
                    <div className="text-white">{formatDate(scanData.first_scan)}</div>
                  </div>
                )}
                {scanData?.last_scan && (
                  <div>
                    <div className="text-zinc-500 mb-1">Last Scan</div>
                    <div className="text-white">{formatDate(scanData.last_scan)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Heatmap */}
            <div className="bg-zinc-950 border border-zinc-800 p-4">
              <h3 className="text-sm font-medium text-white mb-3">Top Locations</h3>
              {locationData.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">No location data yet</div>
              ) : (
                <div className="space-y-2">
                  {locationData.slice(0, 5).map((loc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-zinc-600">#{i + 1}</div>
                        <div>
                          <div className="text-sm text-white">{loc.city}, {loc.region}</div>
                          <div className="text-xs text-zinc-600">{loc.country}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white font-medium">{loc.scan_count} scans</div>
                        <div className="text-xs text-zinc-600">{loc.unique_scanners} unique</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Device Breakdown */}
            {deviceData.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <h3 className="text-sm font-medium text-white mb-3">Device Types</h3>
                <div className="grid grid-cols-3 gap-3">
                  {deviceData.map((device, i) => (
                    <div key={i} className="p-3 bg-zinc-900 border border-zinc-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500 capitalize">{device.device_type || 'Unknown'}</span>
                      </div>
                      <div className="text-lg font-light text-white">{device.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Performance */}
            {ctaData.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <h3 className="text-sm font-medium text-white mb-3">CTA Performance</h3>
                <div className="space-y-2">
                  {ctaData.map((cta, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800">
                      <div className="text-sm text-white">{cta.cta_label}</div>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-zinc-500">Clicks:</span>{' '}
                          <span className="text-white">{cta.total_clicks}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">CTR:</span>{' '}
                          <span className="text-white">{cta.click_through_rate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attributed Orders */}
            {orders.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <h3 className="text-sm font-medium text-white mb-3">Attributed Orders ({orders.length})</h3>
                <div className="space-y-2">
                  {orders.slice(0, 5).map((order, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800">
                      <div>
                        <div className="text-sm text-white">#{order.order_number}</div>
                        <div className="text-xs text-zinc-600">{formatDate(order.created_at)}</div>
                        {order.customer_name && (
                          <div className="text-xs text-zinc-500">{order.customer_name}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white font-medium">{formatCurrency(parseFloat(order.total.toString()))}</div>
                        <div className="text-xs text-zinc-600 capitalize">{order.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {recentScans.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-800 p-4">
                <h3 className="text-sm font-medium text-white mb-3">Recent Scans</h3>
                <div className="space-y-2">
                  {recentScans.slice(0, 10).map((scan, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800 text-xs">
                      <div className="flex items-center gap-3">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="text-zinc-400">{formatDate(scan.scanned_at)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500">{scan.city}, {scan.region}</span>
                        <span className="text-zinc-600 capitalize">{scan.device_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
