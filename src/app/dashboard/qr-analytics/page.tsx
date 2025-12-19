'use client'

import { useEffect, useState } from 'react'
import { QrCode, MapPin, Smartphone, TrendingUp, Users, Eye, ExternalLink, Calendar, Filter } from 'lucide-react'

interface QRCode {
  id: string
  code: string
  name: string
  type: string
  destination_url: string
  campaign_name: string | null
  total_scans: number
  unique_devices: number
  created_at: string
}

interface QRScan {
  id: string
  qr_code_id: string
  code: string
  name: string
  scanned_at: string
  city: string | null
  region: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  geolocation_source: string | null
  geolocation_accuracy: number | null
  device_type: string | null
  browser_name: string | null
  is_first_scan: boolean
}

interface HeatmapPoint {
  city: string
  region: string
  country: string
  avg_latitude: number
  avg_longitude: number
  scan_count: number
}

interface Stats {
  total_qr_codes: number
  total_scans: number
  unique_devices: number
  gps_scans: number
  unique_cities: number
}

export default function QRAnalyticsPage() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [recentScans, setRecentScans] = useState<QRScan[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQR, setSelectedQR] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Auto-refresh every 5 seconds
    return () => clearInterval(interval)
  }, [selectedQR, timeRange])

  const loadData = async () => {
    try {
      const vendorId = process.env.NEXT_PUBLIC_VENDOR_ID || ''

      // Load QR codes
      const qrResponse = await fetch(`/api/qr/list?vendor_id=${vendorId}&limit=50`)
      if (qrResponse.ok) {
        const qrData = await qrResponse.json()
        setQrCodes(qrData.qr_codes || [])
      }

      // Load stats
      const statsParams = new URLSearchParams({ vendor_id: vendorId })
      if (selectedQR) statsParams.append('qr_code_id', selectedQR)

      const statsResponse = await fetch(`/api/qr/stats?${statsParams}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (Array.isArray(statsData.stats)) {
          // Campaign/multi-QR stats
          const aggregated = statsData.stats.reduce((acc: any, stat: any) => ({
            total_scans: (acc.total_scans || 0) + (stat.total_scan_events || 0),
            unique_devices: (acc.unique_devices || 0) + (stat.unique_devices || 0),
            gps_scans: (acc.gps_scans || 0) + (stat.gps_scans || 0),
            unique_cities: (acc.unique_cities || 0) + (stat.unique_cities || 0),
          }), {})
          setStats({ ...aggregated, total_qr_codes: qrCodes.length })
        } else {
          setStats(statsData.stats)
        }
      }

      // Load heatmap
      const heatmapParams = new URLSearchParams({ vendor_id: vendorId })
      if (selectedQR) heatmapParams.append('qr_code_id', selectedQR)

      const heatmapResponse = await fetch(`/api/qr/heatmap?${heatmapParams}`)
      if (heatmapResponse.ok) {
        const heatmapData = await heatmapResponse.json()
        setHeatmapData(heatmapData.heatmap || [])
      }

      // Load recent scans (from database directly)
      // You could create a new API endpoint for this, or use exec-ddl

      setLoading(false)
    } catch (error) {
      console.error('Error loading QR analytics:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading QR Analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white mb-2">QR Code Analytics</h1>
          <p className="text-sm text-zinc-500">Track QR code scans with GPS precision</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm px-3 py-2"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <QrCode className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">QR Codes</span>
          </div>
          <div className="text-2xl font-light text-white">
            {stats?.total_qr_codes || qrCodes.length}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-4 h-4 text-green-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Scans</span>
          </div>
          <div className="text-2xl font-light text-white">
            {stats?.total_scans || 0}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Unique Devices</span>
          </div>
          <div className="text-2xl font-light text-white">
            {stats?.unique_devices || 0}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-4 h-4 text-red-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">GPS Scans</span>
          </div>
          <div className="text-2xl font-light text-white">
            {stats?.gps_scans || 0}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {stats?.total_scans ? Math.round((stats.gps_scans / stats.total_scans) * 100) : 0}% capture rate
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Cities Reached</span>
          </div>
          <div className="text-2xl font-light text-white">
            {stats?.unique_cities || 0}
          </div>
        </div>
      </div>

      {/* QR Codes List & Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Codes List */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-white">Your QR Codes</h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
            <button
              onClick={() => setSelectedQR(null)}
              className={`w-full text-left p-4 hover:bg-zinc-800 transition-colors ${
                !selectedQR ? 'bg-zinc-800' : ''
              }`}
            >
              <div className="text-sm text-white mb-1">All QR Codes</div>
              <div className="text-xs text-zinc-500">View combined analytics</div>
            </button>
            {qrCodes.map((qr) => (
              <button
                key={qr.id}
                onClick={() => setSelectedQR(qr.id)}
                className={`w-full text-left p-4 hover:bg-zinc-800 transition-colors ${
                  selectedQR === qr.id ? 'bg-zinc-800' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm text-white">{qr.name}</div>
                  <span className="text-xs text-zinc-600 bg-zinc-950 px-2 py-1">
                    {qr.type}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mb-2 font-mono">{qr.code}</div>
                {qr.campaign_name && (
                  <div className="text-xs text-blue-400 mb-2">{qr.campaign_name}</div>
                )}
                <div className="flex items-center gap-4 text-xs text-zinc-600">
                  <span>{qr.total_scans || 0} scans</span>
                  <span>{qr.unique_devices || 0} devices</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Location Heatmap */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-white">Scan Locations</h2>
          </div>
          <div className="p-4">
            {heatmapData.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                No scan locations yet. Create a QR code and share it!
              </div>
            ) : (
              <div className="space-y-3">
                {heatmapData.slice(0, 10).map((location, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm text-white">
                          {location.city}, {location.region}
                        </div>
                        <div className="text-xs text-zinc-600">{location.country}</div>
                        {location.avg_latitude && location.avg_longitude && (
                          <div className="text-xs text-zinc-600 font-mono">
                            {location.avg_latitude.toFixed(4)}, {location.avg_longitude.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white font-medium">{location.scan_count}</div>
                      <div className="text-xs text-zinc-600">scans</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance by QR Code */}
      <div className="bg-zinc-900 border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-white">QR Code Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                <th className="p-4">QR Code</th>
                <th className="p-4">Type</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Total Scans</th>
                <th className="p-4">Unique Devices</th>
                <th className="p-4">GPS Rate</th>
                <th className="p-4">Created</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {qrCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-600">
                    No QR codes yet. Create your first QR code to start tracking!
                  </td>
                </tr>
              ) : (
                qrCodes.map((qr) => (
                  <tr key={qr.id} className="hover:bg-zinc-800 transition-colors">
                    <td className="p-4">
                      <div className="text-sm text-white">{qr.name}</div>
                      <div className="text-xs text-zinc-600 font-mono">{qr.code}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-zinc-400 bg-zinc-950 px-2 py-1 border border-zinc-800">
                        {qr.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {qr.campaign_name || '-'}
                    </td>
                    <td className="p-4 text-sm text-white">{qr.total_scans || 0}</td>
                    <td className="p-4 text-sm text-white">{qr.unique_devices || 0}</td>
                    <td className="p-4 text-sm text-zinc-400">
                      {qr.total_scans ? '—' : '0%'}
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {new Date(qr.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <a
                        href={qr.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-900 border border-zinc-800 p-6">
        <h2 className="text-sm font-medium text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
            Create New QR Code
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors">
            Export Data
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors">
            View Map
          </button>
        </div>
      </div>
    </div>
  )
}
