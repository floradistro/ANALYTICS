'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import {
  QrCode, Plus, RefreshCw, Package, ShoppingCart, Megaphone,
  Eye, Users, MapPin, TrendingUp, MoreVertical, Edit2, Trash2,
  ExternalLink, Copy, Check, X, Smartphone, Monitor, Tablet
} from 'lucide-react'
import { ResponsiveLine } from '@nivo/line'
import { nivoTheme } from '@/lib/theme'
import { LandingPageEditor } from '@/components/qr/LandingPageEditor'
import { CreateQRModal } from '@/components/qr/CreateQRModal'

type QRCodeType = 'product' | 'order' | 'marketing'

interface QRCode {
  id: string
  code: string
  type: QRCodeType
  name: string
  product_id?: string
  order_id?: string
  campaign_name?: string
  landing_page: any
  is_active: boolean
  total_scans: number
  unique_scans: number
  last_scanned_at?: string
  created_at: string
}

interface Stats {
  summary: {
    total_qr_codes: number
    active_qr_codes: number
    total_scans: number
    unique_scans: number
    scans_with_location: number
  }
  type_breakdown: Array<{ type: string; count: number; totalScans: number; uniqueScans: number }>
  time_series: Array<{ date: string; scans: number }>
  top_cities: Array<{ city: string; count: number }>
  devices: Array<{ device: string; count: number; percentage: number }>
  qr_codes: QRCode[]
}

const TYPE_CONFIG = {
  product: { icon: Package, label: 'Product', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  order: { icon: ShoppingCart, label: 'Order', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  marketing: { icon: Megaphone, label: 'Marketing', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' }
}

export default function QRDashboardPage() {
  const { vendorId, vendor } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<QRCodeType | 'all'>('all')
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!vendorId) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/qr/stats?vendor_id=${vendorId}&days=30`)
      const data = await res.json()
      if (data.success) {
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleCopyCode = (code: string) => {
    const url = `https://floradistro.com/qr/${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleToggleActive = async (qr: QRCode) => {
    try {
      await fetch('/api/qr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: qr.id,
          vendor_id: vendorId,
          is_active: !qr.is_active
        })
      })
      fetchStats()
    } catch (err) {
      console.error('Error toggling QR code:', err)
    }
  }

  const handleDelete = async (qr: QRCode) => {
    if (!confirm(`Delete QR code "${qr.name}"? This cannot be undone.`)) return

    try {
      await fetch(`/api/qr?id=${qr.id}&vendor_id=${vendorId}`, { method: 'DELETE' })
      fetchStats()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error deleting QR code:', err)
    }
  }

  const handleEditLanding = (qr: QRCode) => {
    setSelectedQR(qr)
    setShowEditor(true)
    setMenuOpen(null)
  }

  const handleSaveLandingPage = async (landingPage: any) => {
    if (!selectedQR) return

    try {
      await fetch('/api/qr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedQR.id,
          vendor_id: vendorId,
          landing_page: landingPage
        })
      })
      setShowEditor(false)
      setSelectedQR(null)
      fetchStats()
    } catch (err) {
      console.error('Error saving landing page:', err)
    }
  }

  const filteredQRCodes = stats?.qr_codes.filter(qr =>
    activeTab === 'all' || qr.type === activeTab
  ) || []

  const formatNumber = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  const lineData = [{
    id: 'scans',
    data: stats?.time_series.map(d => ({ x: d.date, y: d.scans })) || []
  }]

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading QR analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light text-zinc-100 tracking-wide">QR Code Manager</h1>
          <p className="text-zinc-500 text-sm mt-1">Create, manage, and track QR codes for products, orders, and marketing</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-600 hover:bg-slate-500 text-white transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create QR Code
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <QrCode className="w-3.5 h-3.5" />
            Total QR Codes
          </div>
          <div className="text-3xl font-light text-white">{stats?.summary.total_qr_codes || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">{stats?.summary.active_qr_codes || 0} active</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <Eye className="w-3.5 h-3.5" />
            Total Scans
          </div>
          <div className="text-3xl font-light text-white">{formatNumber(stats?.summary.total_scans || 0)}</div>
          <div className="text-xs text-zinc-500 mt-1">Last 30 days</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            Unique Scans
          </div>
          <div className="text-3xl font-light text-white">{formatNumber(stats?.summary.unique_scans || 0)}</div>
          <div className="text-xs text-zinc-500 mt-1">Unique devices</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5" />
            With Location
          </div>
          <div className="text-3xl font-light text-white">{formatNumber(stats?.summary.scans_with_location || 0)}</div>
          <div className="text-xs text-zinc-500 mt-1">GPS tracked</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Scan Rate
          </div>
          <div className="text-3xl font-light text-white">
            {stats?.summary.total_qr_codes
              ? ((stats.summary.total_scans / stats.summary.total_qr_codes)).toFixed(1)
              : '0'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Avg per code</div>
        </div>
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {(['product', 'order', 'marketing'] as QRCodeType[]).map(type => {
          const config = TYPE_CONFIG[type]
          const data = stats?.type_breakdown.find(t => t.type === type)
          const Icon = config.icon

          return (
            <div key={type} className={`${config.bg} border ${config.border} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className="text-white font-medium">{config.label} QR Codes</span>
                </div>
                <span className="text-2xl font-light text-white">{data?.count || 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Total Scans</span>
                  <p className="text-white">{formatNumber(data?.totalScans || 0)}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Unique Scans</span>
                  <p className="text-white">{formatNumber(data?.uniqueScans || 0)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scans Over Time Chart */}
      <div className="bg-zinc-950 border border-zinc-800/50 p-6">
        <h3 className="text-xs text-zinc-400 mb-4 tracking-wide uppercase">Scans Over Time (30 Days)</h3>
        <div className="h-48">
          {stats?.time_series && stats.time_series.length > 0 ? (
            <ResponsiveLine
              data={lineData}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 0, max: 'auto' }}
              curve="monotoneX"
              enableArea={true}
              areaOpacity={0.15}
              colors={['#64748b']}
              lineWidth={2}
              pointSize={0}
              enableGridX={false}
              enableGridY={true}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 12,
                tickRotation: -45,
                format: (value) => {
                  const date = new Date(String(value))
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                },
                tickValues: stats.time_series.filter((_, i) => i % 5 === 0).map(d => d.date)
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 12,
                tickValues: 4
              }}
              useMesh={true}
              tooltip={({ point }) => (
                <div className="bg-zinc-900/95 border border-zinc-700 px-3 py-2 text-sm">
                  <div className="text-zinc-400 text-xs">{String(point.data.x)}</div>
                  <div className="text-white font-medium">{point.data.y} scans</div>
                </div>
              )}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600">
              No scan data available
            </div>
          )}
        </div>
      </div>

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Cities */}
        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Top Cities</h3>
          <div className="space-y-2">
            {stats?.top_cities.slice(0, 8).map((city, i) => (
              <div key={city.city} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                  <span className="text-sm text-zinc-300">{city.city}</span>
                </div>
                <span className="text-sm text-white">{city.count}</span>
              </div>
            ))}
            {(!stats?.top_cities || stats.top_cities.length === 0) && (
              <div className="text-center py-4 text-zinc-600 text-sm">No location data</div>
            )}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-zinc-950 border border-zinc-900 p-5">
          <h3 className="text-sm text-white mb-4 pb-3 border-b border-zinc-800">Devices</h3>
          <div className="space-y-3">
            {stats?.devices.map(d => (
              <div key={d.device}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {d.device.toLowerCase() === 'mobile' && <Smartphone className="w-4 h-4 text-zinc-500" />}
                    {d.device.toLowerCase() === 'desktop' && <Monitor className="w-4 h-4 text-zinc-500" />}
                    {d.device.toLowerCase() === 'tablet' && <Tablet className="w-4 h-4 text-zinc-500" />}
                    <span className="text-sm text-zinc-300 capitalize">{d.device}</span>
                  </div>
                  <span className="text-sm text-zinc-400">{d.percentage.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-500 to-slate-400"
                    style={{ width: `${d.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {(!stats?.devices || stats.devices.length === 0) && (
              <div className="text-center py-4 text-zinc-600 text-sm">No device data</div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code List */}
      <div className="bg-zinc-950 border border-zinc-900">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 text-sm transition-colors ${
              activeTab === 'all'
                ? 'text-white border-b-2 border-slate-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({stats?.qr_codes.length || 0})
          </button>
          {(['product', 'order', 'marketing'] as QRCodeType[]).map(type => {
            const config = TYPE_CONFIG[type]
            const count = stats?.qr_codes.filter(q => q.type === type).length || 0
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-5 py-3 text-sm transition-colors flex items-center gap-2 ${
                  activeTab === type
                    ? `${config.color} border-b-2 border-current`
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <config.icon className="w-4 h-4" />
                {config.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-5 py-3">QR Code</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Scans</th>
                <th className="px-5 py-3">Unique</th>
                <th className="px-5 py-3">Last Scan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredQRCodes.map(qr => {
                const config = TYPE_CONFIG[qr.type]
                return (
                  <tr key={qr.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${config.bg} border ${config.border} flex items-center justify-center`}>
                          <QrCode className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-white font-medium">{qr.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="text-xs text-zinc-500 font-mono">{qr.code}</code>
                            <button
                              onClick={() => handleCopyCode(qr.code)}
                              className="text-zinc-600 hover:text-zinc-400 transition-colors"
                              title="Copy URL"
                            >
                              {copiedCode === qr.code ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs ${config.bg} ${config.color} rounded`}>
                        <config.icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white">{formatNumber(qr.total_scans)}</td>
                    <td className="px-5 py-4 text-zinc-400">{formatNumber(qr.unique_scans)}</td>
                    <td className="px-5 py-4 text-zinc-500 text-sm">
                      {qr.last_scanned_at
                        ? new Date(qr.last_scanned_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(qr)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                          qr.is_active
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      >
                        {qr.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === qr.id ? null : qr.id)}
                          className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === qr.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 shadow-lg z-20">
                              <button
                                onClick={() => handleEditLanding(qr)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Landing Page
                              </button>
                              <a
                                href={`https://floradistro.com/qr/${qr.code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Preview Landing Page
                              </a>
                              <button
                                onClick={() => handleDelete(qr)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredQRCodes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-zinc-600">
                    <QrCode className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No QR codes found</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Create your first QR code
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateQRModal
          vendorId={vendorId!}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            fetchStats()
          }}
        />
      )}

      {showEditor && selectedQR && (
        <LandingPageEditor
          qrCode={selectedQR}
          onClose={() => {
            setShowEditor(false)
            setSelectedQR(null)
          }}
          onSave={handleSaveLandingPage}
        />
      )}
    </div>
  )
}
