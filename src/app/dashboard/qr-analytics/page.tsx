'use client'

import { useEffect, useState } from 'react'
import { QrCode, MapPin, Smartphone, TrendingUp, Users, Eye, ExternalLink, Plus, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

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
  const { vendorId } = useAuthStore()
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQR, setSelectedQR] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'product' as 'product' | 'menu' | 'label' | 'marketing' | 'event',
    destination_url: '',
    landing_page_title: '',
    landing_page_description: '',
    landing_page_cta_text: '',
    landing_page_cta_url: '',
    campaign_name: '',
  })

  useEffect(() => {
    if (vendorId) {
      loadData()
      const interval = setInterval(loadData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [vendorId, selectedQR])

  const loadData = async () => {
    if (!vendorId) return

    try {
      // Load QR codes
      const qrResponse = await fetch(`/api/qr/list?vendor_id=${vendorId}&limit=100`)
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
          const aggregated = statsData.stats.reduce((acc: any, stat: any) => ({
            total_scans: (acc.total_scans || 0) + (stat.total_scan_events || 0),
            unique_devices: (acc.unique_devices || 0) + (stat.unique_devices || 0),
            gps_scans: (acc.gps_scans || 0) + (stat.gps_scans || 0),
            unique_cities: (acc.unique_cities || 0) + (stat.unique_cities || 0),
          }), {})
          setStats({ ...aggregated, total_qr_codes: qrCodes.length })
        } else if (statsData.stats) {
          setStats(statsData.stats)
        }
      }

      // Load heatmap
      const heatmapParams = new URLSearchParams({ vendor_id: vendorId })
      if (selectedQR) heatmapParams.append('qr_code_id', selectedQR)

      const heatmapResponse = await fetch(`/api/qr/heatmap?${heatmapParams}`)
      if (heatmapResponse.ok) {
        const heatmapDataRes = await heatmapResponse.json()
        setHeatmapData(heatmapDataRes.heatmap || [])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading QR analytics:', error)
      setLoading(false)
    }
  }

  const handleCreateQR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId) return

    setCreating(true)
    try {
      const response = await fetch('/api/qr/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          ...formData,
        }),
      })

      if (response.ok) {
        setShowCreateModal(false)
        setFormData({
          name: '',
          code: '',
          type: 'product',
          destination_url: '',
          landing_page_title: '',
          landing_page_description: '',
          landing_page_cta_text: '',
          landing_page_cta_url: '',
          campaign_name: '',
        })
        loadData() // Reload data
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating QR:', error)
      alert('Failed to create QR code')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create QR Code
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <QrCode className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">QR Codes</span>
          </div>
          <div className="text-2xl font-light text-white">
            {qrCodes.length}
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
            {stats?.total_scans && stats.total_scans > 0
              ? Math.round((stats.gps_scans / stats.total_scans) * 100)
              : 0}% capture rate
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Codes List */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-white">Your QR Codes</h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
            {qrCodes.length === 0 ? (
              <div className="p-8 text-center text-zinc-600">
                <QrCode className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-sm">No QR codes yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                >
                  Create your first QR code
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
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
                <MapPin className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-sm">No scan locations yet</p>
                <p className="text-xs mt-2">Scan locations will appear here when users scan your QR codes</p>
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

      {/* Create QR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-light text-white">Create New QR Code</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQR} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">QR Code Name*</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                  placeholder="e.g., Product Label - Gelato #33"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Unique Code*</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm font-mono"
                  placeholder="e.g., PROD-001"
                />
                <p className="text-xs text-zinc-600 mt-1">This will be in the URL: /qr/{formData.code || 'CODE'}</p>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Type*</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                >
                  <option value="product">Product</option>
                  <option value="menu">Menu</option>
                  <option value="label">Label</option>
                  <option value="marketing">Marketing</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Destination URL*</label>
                <input
                  type="url"
                  required
                  value={formData.destination_url}
                  onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                  placeholder="https://floradistro.com/products/..."
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Campaign Name (optional)</label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                  placeholder="e.g., Summer 2024"
                />
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm text-white mb-4">Landing Page (optional)</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.landing_page_title}
                      onChange={(e) => setFormData({ ...formData, landing_page_title: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                      placeholder="Welcome to Flora Distro!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Description</label>
                    <textarea
                      value={formData.landing_page_description}
                      onChange={(e) => setFormData({ ...formData, landing_page_description: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Premium cannabis products..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">CTA Text</label>
                      <input
                        type="text"
                        value={formData.landing_page_cta_text}
                        onChange={(e) => setFormData({ ...formData, landing_page_cta_text: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                        placeholder="Shop Now"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">CTA URL</label>
                      <input
                        type="url"
                        value={formData.landing_page_cta_url}
                        onChange={(e) => setFormData({ ...formData, landing_page_cta_url: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 text-sm"
                        placeholder="/shop"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create QR Code
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
