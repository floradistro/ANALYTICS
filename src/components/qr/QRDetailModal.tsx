'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, QrCode, Eye, Users, MapPin, Calendar, Clock,
  ExternalLink, Package, ShoppingBag, Megaphone, Copy, Check,
  Smartphone, Monitor, Tablet, Globe, TrendingUp, User,
  DollarSign, Hash, Tag, Link2, ArrowRight, UserCircle,
  Building, Receipt
} from 'lucide-react'
import { format } from 'date-fns'

interface QRCode {
  id: string
  code: string
  name: string
  type: string
  destination_url: string | null
  landing_page_url?: string | null
  total_scans: number
  unique_scans: number
  is_active: boolean
  created_at: string
  updated_at?: string
  last_scanned_at: string | null
  product_id: string | null
  order_id: string | null
  location_id: string | null
  location_name: string | null
  customer_id: string | null
  customer_name: string | null
  staff_id: string | null
  staff_name: string | null
  sold_at: string | null
  unit_price: number | null
  quantity_index: number | null
  campaign_name: string | null
  landing_page_title?: string | null
  landing_page_description?: string | null
  landing_page_image_url?: string | null
  landing_page_cta_text?: string | null
  landing_page_cta_url?: string | null
  logo_url?: string | null
  brand_color?: string | null
  tags?: string[] | null
  expires_at?: string | null
  max_scans?: number | null
  created_by?: string | null
}

interface QRScan {
  id: string
  qr_code_id: string
  scanned_at: string
  city: string | null
  region: string | null
  country: string | null
  device_type: string | null
  browser_name: string | null
  os_name: string | null
  is_unique: boolean
  latitude?: number | null
  longitude?: number | null
}

interface QRDetailModalProps {
  isOpen: boolean
  onClose: () => void
  qrCode: QRCode | null
  vendorId: string
}

export function QRDetailModal({ isOpen, onClose, qrCode, vendorId }: QRDetailModalProps) {
  const router = useRouter()
  const [scans, setScans] = useState<QRScan[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'scans' | 'locations'>('overview')

  useEffect(() => {
    if (!isOpen || !qrCode) {
      setScans([])
      setActiveTab('overview')
      return
    }

    const fetchScans = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/qr/scans?qr_code_id=${qrCode.id}&vendor_id=${vendorId}&limit=100`)
        const data = await res.json()
        if (data.success) {
          setScans(data.scans || [])
        } else {
          console.error('Failed to fetch scans:', data.error)
        }
      } catch (err) {
        console.error('Failed to fetch scans:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [isOpen, qrCode, vendorId])

  if (!isOpen || !qrCode) return null

  const trackingUrl = `https://floradistro.com/qr/${qrCode.code}`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(trackingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const navigateToOrder = () => {
    if (qrCode.order_id) {
      // Store in sessionStorage for cross-page navigation
      sessionStorage.setItem('openOrderId', qrCode.order_id)
      onClose()
      router.push('/dashboard/orders')
    }
  }

  const navigateToProduct = () => {
    if (qrCode.product_id) {
      // Store in sessionStorage for cross-page navigation
      sessionStorage.setItem('openProductId', qrCode.product_id)
      onClose()
      router.push('/dashboard/products')
    }
  }

  const getTypeIcon = () => {
    switch (qrCode.type) {
      case 'product': return <Package className="w-5 h-5 text-blue-400" />
      case 'sale': return <ShoppingBag className="w-5 h-5 text-green-400" />
      case 'order': return <MapPin className="w-5 h-5 text-purple-400" />
      case 'marketing': return <Megaphone className="w-5 h-5 text-orange-400" />
      default: return <QrCode className="w-5 h-5 text-zinc-400" />
    }
  }

  const getTypeColor = () => {
    switch (qrCode.type) {
      case 'product': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'sale': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'order': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'marketing': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    }
  }

  // Calculate stats from scans
  const deviceStats = scans.reduce((acc, scan) => {
    const device = scan.device_type || 'unknown'
    acc[device] = (acc[device] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const locationStats = scans.reduce((acc, scan) => {
    if (scan.city) {
      const loc = `${scan.city}${scan.region ? `, ${scan.region}` : ''}`
      acc[loc] = (acc[loc] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const countryStats = scans.reduce((acc, scan) => {
    if (scan.country) {
      acc[scan.country] = (acc[scan.country] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const browserStats = scans.reduce((acc, scan) => {
    if (scan.browser_name) {
      acc[scan.browser_name] = (acc[scan.browser_name] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const osStats = scans.reduce((acc, scan) => {
    if (scan.os_name) {
      acc[scan.os_name] = (acc[scan.os_name] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const uniqueScansFromData = scans.filter(s => s.is_unique).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {getTypeIcon()}
              <h2 className="text-xl font-medium text-white truncate">{qrCode.name}</h2>
              <span className={`shrink-0 px-2 py-1 text-[10px] uppercase tracking-wider border ${getTypeColor()}`}>
                {qrCode.type}
              </span>
              <span className={`shrink-0 px-2 py-1 text-[10px] uppercase tracking-wider border ${
                qrCode.is_active
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
              }`}>
                {qrCode.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <code className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono text-xs">
                {qrCode.code}
              </code>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span className="text-xs">{copied ? 'Copied!' : 'Copy URL'}</span>
              </button>
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs">Open Landing Page</span>
              </a>
              {qrCode.destination_url && (
                <a
                  href={qrCode.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="text-xs">Destination</span>
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-zinc-800 bg-zinc-900/30">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-zinc-500" />
              <span className="text-2xl font-light text-white">{qrCode.total_scans || 0}</span>
            </div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Scans</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-zinc-500" />
              <span className="text-2xl font-light text-white">{qrCode.unique_scans || uniqueScansFromData || 0}</span>
            </div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Unique Scans</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-light text-white">
                {format(new Date(qrCode.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Created</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-light text-white">
                {qrCode.last_scanned_at
                  ? format(new Date(qrCode.last_scanned_at), 'MMM d, h:mm a')
                  : 'Never'}
              </span>
            </div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Last Scan</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-zinc-800">
          {(['overview', 'scans', 'locations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-light capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-white border-white'
                  : 'text-zinc-500 border-transparent hover:text-white'
              }`}
            >
              {tab}
              {tab === 'scans' && scans.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-zinc-700 rounded-full">{scans.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border border-zinc-700 border-t-white animate-spin rounded-full" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  qrCode={qrCode}
                  deviceStats={deviceStats}
                  browserStats={browserStats}
                  osStats={osStats}
                  scansCount={scans.length}
                  onNavigateToOrder={navigateToOrder}
                  onNavigateToProduct={navigateToProduct}
                />
              )}
              {activeTab === 'scans' && (
                <ScansTab scans={scans} />
              )}
              {activeTab === 'locations' && (
                <LocationsTab locationStats={locationStats} countryStats={countryStats} scans={scans} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({
  qrCode,
  deviceStats,
  browserStats,
  osStats,
  scansCount,
  onNavigateToOrder,
  onNavigateToProduct
}: {
  qrCode: QRCode
  deviceStats: Record<string, number>
  browserStats: Record<string, number>
  osStats: Record<string, number>
  scansCount: number
  onNavigateToOrder: () => void
  onNavigateToProduct: () => void
}) {
  const totalDevices = Object.values(deviceStats).reduce((a, b) => a + b, 0)
  const totalBrowsers = Object.values(browserStats).reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Quick Links (Backlinks) */}
        {(qrCode.product_id || qrCode.order_id) && (
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Quick Links</h3>
            <div className="flex flex-wrap gap-2">
              {qrCode.product_id && (
                <button
                  onClick={onNavigateToProduct}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors rounded"
                >
                  <Package className="w-4 h-4" />
                  <span className="text-sm">View Product</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {qrCode.order_id && (
                <button
                  onClick={onNavigateToOrder}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors rounded"
                >
                  <Receipt className="w-4 h-4" />
                  <span className="text-sm">View Order</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sale Information (for sale-type QR codes) */}
        {qrCode.type === 'sale' && (
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Sale Information</h3>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {qrCode.location_name && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-zinc-500 uppercase">Location</span>
                    </div>
                    <span className="text-white">{qrCode.location_name}</span>
                  </div>
                )}
                {qrCode.sold_at && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-zinc-500 uppercase">Sold At</span>
                    </div>
                    <span className="text-white">
                      {format(new Date(qrCode.sold_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
                {qrCode.unit_price !== null && qrCode.unit_price !== undefined && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-zinc-500 uppercase">Unit Price</span>
                    </div>
                    <span className="text-white text-lg">${Number(qrCode.unit_price).toFixed(2)}</span>
                  </div>
                )}
                {qrCode.quantity_index !== null && qrCode.quantity_index !== undefined && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-zinc-500 uppercase">Unit Number</span>
                    </div>
                    <span className="text-white">#{qrCode.quantity_index}</span>
                  </div>
                )}
              </div>

              {/* Staff & Customer Info */}
              {(qrCode.staff_id || qrCode.customer_id) && (
                <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 gap-4">
                  {qrCode.staff_id && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <UserCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-zinc-500 uppercase">Sold By</span>
                      </div>
                      <span className="text-white font-light">
                        {qrCode.staff_name || 'Unknown Staff'}
                      </span>
                    </div>
                  )}
                  {qrCode.customer_id && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-zinc-500 uppercase">Customer</span>
                      </div>
                      <span className="text-white font-light">
                        {qrCode.customer_name || 'Unknown Customer'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR Code Details */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Details</h3>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            {qrCode.landing_page_title && (
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Landing Page Title</span>
                <p className="text-white">{qrCode.landing_page_title}</p>
              </div>
            )}
            {qrCode.landing_page_description && (
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Description</span>
                <p className="text-zinc-300 text-sm">{qrCode.landing_page_description}</p>
              </div>
            )}
            {qrCode.campaign_name && (
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Campaign</span>
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-orange-400" />
                  <p className="text-white">{qrCode.campaign_name}</p>
                </div>
              </div>
            )}
            {qrCode.landing_page_cta_text && (
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Call to Action</span>
                <p className="text-emerald-400">{qrCode.landing_page_cta_text}</p>
              </div>
            )}
            {qrCode.tags && qrCode.tags.length > 0 && (
              <div>
                <span className="text-xs text-zinc-500 block mb-2">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {qrCode.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {qrCode.expires_at && (
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Expires</span>
                <p className="text-yellow-400">{format(new Date(qrCode.expires_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}
            {qrCode.max_scans && (
              <div>
                <span className="text-xs text-zinc-500 block mb-1">Max Scans</span>
                <p className="text-white">{qrCode.total_scans || 0} / {qrCode.max_scans}</p>
              </div>
            )}

            {/* IDs Section */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              {qrCode.product_id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Product ID</span>
                  <code className="text-xs text-zinc-400 font-mono">{qrCode.product_id.slice(0, 8)}...</code>
                </div>
              )}
              {qrCode.order_id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Order ID</span>
                  <code className="text-xs text-zinc-400 font-mono">{qrCode.order_id.slice(0, 8)}...</code>
                </div>
              )}
              {qrCode.location_id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Location ID</span>
                  <code className="text-xs text-zinc-400 font-mono">{qrCode.location_id.slice(0, 8)}...</code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Analytics */}
      <div className="space-y-6">
        {/* Device Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Device Breakdown</h3>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            {totalDevices === 0 ? (
              <div className="text-center py-6">
                <Smartphone className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-sm">No scan data yet</p>
                <p className="text-zinc-600 text-xs mt-1">Device info appears after QR codes are scanned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(deviceStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([device, count]) => (
                    <div key={device} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        {device === 'mobile' && <Smartphone className="w-4 h-4 text-blue-400" />}
                        {device === 'desktop' && <Monitor className="w-4 h-4 text-green-400" />}
                        {device === 'tablet' && <Tablet className="w-4 h-4 text-purple-400" />}
                        {!['mobile', 'desktop', 'tablet'].includes(device) && (
                          <Globe className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white capitalize">{device}</span>
                          <span className="text-xs text-zinc-500">
                            {count} ({((count / totalDevices) * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${
                              device === 'mobile' ? 'bg-blue-500' :
                              device === 'desktop' ? 'bg-green-500' :
                              device === 'tablet' ? 'bg-purple-500' :
                              'bg-zinc-500'
                            }`}
                            style={{ width: `${(count / totalDevices) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Browser Breakdown */}
        {totalBrowsers > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Browser Breakdown</h3>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="space-y-2">
                {Object.entries(browserStats)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([browser, count]) => (
                    <div key={browser} className="flex items-center justify-between">
                      <span className="text-sm text-white">{browser}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-zinc-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded"
                            style={{ width: `${(count / totalBrowsers) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* OS Breakdown */}
        {Object.keys(osStats).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Operating System</h3>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(osStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([os, count]) => (
                    <span key={os} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-sm rounded">
                      {os} <span className="text-zinc-500">({count})</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Scans Tab
function ScansTab({ scans }: { scans: QRScan[] }) {
  if (scans.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
        <p className="text-zinc-400 text-lg mb-1">No scans recorded yet</p>
        <p className="text-zinc-600 text-sm">
          Scans will appear here when someone scans this QR code
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-500 mb-4">
        Showing {scans.length} most recent scans
      </div>
      {scans.map((scan) => (
        <div
          key={scan.id}
          className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              {scan.device_type === 'mobile' && <Smartphone className="w-5 h-5 text-blue-400" />}
              {scan.device_type === 'desktop' && <Monitor className="w-5 h-5 text-green-400" />}
              {scan.device_type === 'tablet' && <Tablet className="w-5 h-5 text-purple-400" />}
              {!scan.device_type && <Globe className="w-5 h-5 text-zinc-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-white">
                  {scan.city || 'Unknown location'}
                  {scan.region && `, ${scan.region}`}
                </span>
                {scan.is_unique && (
                  <span className="px-1.5 py-0.5 text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 uppercase rounded">
                    First Visit
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {scan.browser_name && <span>{scan.browser_name}</span>}
                {scan.os_name && <span>• {scan.os_name}</span>}
                {scan.country && <span>• {scan.country}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-zinc-300">
              {format(new Date(scan.scanned_at), 'MMM d, yyyy')}
            </div>
            <div className="text-xs text-zinc-500">
              {format(new Date(scan.scanned_at), 'h:mm:ss a')}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Locations Tab
function LocationsTab({
  locationStats,
  countryStats,
  scans
}: {
  locationStats: Record<string, number>
  countryStats: Record<string, number>
  scans: QRScan[]
}) {
  const totalLocations = Object.values(locationStats).reduce((a, b) => a + b, 0)
  const totalCountries = Object.values(countryStats).reduce((a, b) => a + b, 0)

  // Get scans with coordinates for potential map display
  const geoScans = scans.filter(s => s.latitude && s.longitude)

  if (totalLocations === 0 && totalCountries === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
        <p className="text-zinc-400 text-lg mb-1">No location data available</p>
        <p className="text-zinc-600 text-sm">
          Location data will appear after QR codes are scanned
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light text-white mb-1">{Object.keys(locationStats).length}</div>
          <div className="text-xs text-zinc-500 uppercase">Unique Cities</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light text-white mb-1">{Object.keys(countryStats).length}</div>
          <div className="text-xs text-zinc-500 uppercase">Countries</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-light text-white mb-1">{geoScans.length}</div>
          <div className="text-xs text-zinc-500 uppercase">GPS Scans</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cities */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Top Cities</h3>
          <div className="space-y-2">
            {Object.entries(locationStats)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([city, count], index) => (
                <div key={city} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white truncate block">{city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded"
                        style={{ width: `${(count / totalLocations) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 w-12 text-right">
                      {count} ({((count / totalLocations) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            {Object.keys(locationStats).length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-4">No city data</p>
            )}
          </div>
        </div>

        {/* Countries */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Countries</h3>
          <div className="space-y-2">
            {Object.entries(countryStats)
              .sort(([, a], [, b]) => b - a)
              .map(([country, count], index) => (
                <div key={country} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white">{country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded"
                        style={{ width: `${(count / totalCountries) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 w-12 text-right">
                      {count} ({((count / totalCountries) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            {Object.keys(countryStats).length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-4">No country data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
