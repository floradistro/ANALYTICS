'use client'

import { useEffect, useState, useCallback } from 'react'
import { QrCode, Package, ShoppingBag, MapPin, Megaphone, Eye, Users, TrendingUp, Calendar, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { MetricCard } from '@/components/ui/MetricCard'
import { QRDetailModal } from '@/components/qr/QRDetailModal'
import { format } from 'date-fns'

type QRType = 'all' | 'product' | 'sale' | 'order' | 'marketing'

interface QRCode {
  id: string
  code: string
  name: string
  type: string
  destination_url: string | null
  total_scans: number
  unique_scans: number
  is_active: boolean
  created_at: string
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
}

interface QRStats {
  total: number
  totalScans: number
  uniqueScans: number
  byType: Record<string, number>
  recentScans: number
}

const TAB_CONFIG: { key: QRType; label: string; icon: typeof QrCode }[] = [
  { key: 'all', label: 'All QR Codes', icon: QrCode },
  { key: 'product', label: 'Product', icon: Package },
  { key: 'sale', label: 'Sale', icon: ShoppingBag },
  { key: 'order', label: 'Order', icon: MapPin },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
]

export default function QRDashboard() {
  const { vendorId } = useAuthStore()

  const [activeTab, setActiveTab] = useState<QRType>('all')
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [stats, setStats] = useState<QRStats>({
    total: 0,
    totalScans: 0,
    uniqueScans: 0,
    byType: {},
    recentScans: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null)

  const fetchQRCodes = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)

    try {
      const params = new URLSearchParams({ vendor_id: vendorId })
      if (activeTab !== 'all') {
        params.set('type', activeTab)
      }

      const res = await fetch(`/api/qr/list?${params}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        console.error('Error fetching QR codes:', data.error)
        return
      }

      setQrCodes(data.qr_codes || [])
      setStats(data.stats || {
        total: 0,
        totalScans: 0,
        uniqueScans: 0,
        byType: {},
        recentScans: 0,
      })
    } catch (err) {
      console.error('Failed to fetch QR codes:', err)
    } finally {
      setLoading(false)
    }
  }, [vendorId, activeTab])

  useEffect(() => {
    fetchQRCodes()
  }, [fetchQRCodes])

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a')
  }

  const formatShortDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy')
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'sale':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'order':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'marketing':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    }
  }

  const filteredCodes = activeTab === 'all'
    ? qrCodes
    : qrCodes.filter(qr => qr.type === activeTab)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg lg:text-xl font-light text-white tracking-wide">QR Code Analytics</h1>
        <p className="text-zinc-500 text-xs lg:text-sm font-light mt-1">
          Track and manage your QR codes across products, sales, and marketing campaigns.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4">
        <MetricCard title="Total QR Codes" value={stats.total} icon={QrCode} />
        <MetricCard title="Total Scans" value={stats.totalScans} icon={Eye} />
        <MetricCard title="Unique Scans" value={stats.uniqueScans} icon={Users} />
        <MetricCard title="Scans (7 Days)" value={stats.recentScans} icon={TrendingUp} />
      </div>

      {/* Type Breakdown */}
      <div className="bg-zinc-950 border border-zinc-900 p-3 lg:p-4">
        <h2 className="text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider mb-3 lg:mb-4">
          QR Codes by Type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-blue-400 mb-2" />
            <div className="text-white text-lg font-light">{stats.byType['product'] || 0}</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Product</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-3 text-center">
            <ShoppingBag className="w-5 h-5 mx-auto text-green-400 mb-2" />
            <div className="text-white text-lg font-light">{stats.byType['sale'] || 0}</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Sale</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-3 text-center">
            <MapPin className="w-5 h-5 mx-auto text-purple-400 mb-2" />
            <div className="text-white text-lg font-light">{stats.byType['order'] || 0}</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Order</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-3 text-center">
            <Megaphone className="w-5 h-5 mx-auto text-orange-400 mb-2" />
            <div className="text-white text-lg font-light">{stats.byType['marketing'] || 0}</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Marketing</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-zinc-900">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-light whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'text-white bg-zinc-800 border border-zinc-700'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            {label}
            {key !== 'all' && stats.byType[key] > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-zinc-700 rounded-full">
                {stats.byType[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* QR Code Table */}
      <div className="bg-zinc-950 border border-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-12">
            <QrCode className="w-8 h-8 mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm">No QR codes found</p>
            <p className="text-zinc-600 text-xs mt-1">
              QR codes will appear here when created from the Whale POS app
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="border-b border-zinc-900">
                <tr>
                  <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Scans
                  </th>
                  {activeTab === 'sale' && (
                    <>
                      <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                        Sold At
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                        Price
                      </th>
                    </>
                  )}
                  <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-[10px] lg:text-xs font-light text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredCodes.map((qr) => (
                  <tr
                    key={qr.id}
                    onClick={() => setSelectedQR(qr)}
                    className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 lg:px-4 py-3 lg:py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-white bg-zinc-800 px-2 py-1 rounded">
                          {qr.code.length > 20 ? `${qr.code.substring(0, 20)}...` : qr.code}
                        </code>
                        {qr.destination_url && (
                          <a
                            href={qr.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-sm text-white font-light">
                      {qr.name}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] uppercase tracking-wider border ${getTypeColor(qr.type)}`}>
                        {qr.type}
                      </span>
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-sm text-white">{qr.total_scans || 0}</span>
                        <span className="text-xs text-zinc-500">({qr.unique_scans || 0} unique)</span>
                      </div>
                    </td>
                    {activeTab === 'sale' && (
                      <>
                        <td className="px-3 lg:px-4 py-3 lg:py-4 text-sm text-zinc-400 font-light">
                          {qr.location_name || '-'}
                        </td>
                        <td className="px-3 lg:px-4 py-3 lg:py-4 text-sm text-zinc-400 font-light">
                          {qr.sold_at ? formatShortDate(qr.sold_at) : '-'}
                        </td>
                        <td className="px-3 lg:px-4 py-3 lg:py-4 text-sm text-white font-light">
                          {qr.unit_price ? `$${qr.unit_price.toFixed(2)}` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-3 lg:px-4 py-3 lg:py-4 text-xs text-zinc-500 font-light whitespace-nowrap">
                      {formatShortDate(qr.created_at)}
                    </td>
                    <td className="px-3 lg:px-4 py-3 lg:py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] uppercase tracking-wider border ${
                        qr.is_active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                      }`}>
                        {qr.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Scanned QR Codes (show on all tabs if there are scans) */}
      {filteredCodes.some(qr => qr.total_scans > 0) && (
        <TopScannedCodes qrCodes={filteredCodes} />
      )}

      {/* Sale Analytics Section (only show on sale tab) */}
      {activeTab === 'sale' && filteredCodes.length > 0 && (
        <SaleAnalytics qrCodes={filteredCodes} />
      )}

      {/* QR Detail Modal */}
      <QRDetailModal
        isOpen={!!selectedQR}
        onClose={() => setSelectedQR(null)}
        qrCode={selectedQR}
        vendorId={vendorId || ''}
      />
    </div>
  )
}

// Top Scanned QR Codes Component
function TopScannedCodes({ qrCodes }: { qrCodes: QRCode[] }) {
  const topScanned = [...qrCodes]
    .filter(qr => qr.total_scans > 0)
    .sort((a, b) => (b.total_scans || 0) - (a.total_scans || 0))
    .slice(0, 10)

  if (topScanned.length === 0) return null

  const maxScans = topScanned[0]?.total_scans || 1

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-light text-zinc-500 uppercase tracking-wider">
          Top Scanned QR Codes
        </h3>
        <div className="text-xs text-zinc-600">
          {qrCodes.reduce((sum, qr) => sum + (qr.total_scans || 0), 0)} total scans
        </div>
      </div>
      <div className="space-y-3">
        {topScanned.map((qr, index) => (
          <div key={qr.id} className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center text-xs text-zinc-500 font-light">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-white font-light truncate">{qr.name}</span>
                <span className={`shrink-0 px-1.5 py-0.5 text-[9px] uppercase tracking-wider border ${
                  qr.type === 'product' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  qr.type === 'sale' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  qr.type === 'order' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  'bg-orange-500/20 text-orange-400 border-orange-500/30'
                }`}>
                  {qr.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/50 rounded"
                    style={{ width: `${((qr.total_scans || 0) / maxScans) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 w-16 text-right">
                  {qr.total_scans} scans
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Sale Analytics Sub-component
function SaleAnalytics({ qrCodes }: { qrCodes: QRCode[] }) {
  // Group by location
  const byLocation: Record<string, { count: number; scans: number; revenue: number }> = {}
  qrCodes.forEach((qr) => {
    const loc = qr.location_name || 'Unknown'
    if (!byLocation[loc]) {
      byLocation[loc] = { count: 0, scans: 0, revenue: 0 }
    }
    byLocation[loc].count++
    byLocation[loc].scans += qr.total_scans || 0
    byLocation[loc].revenue += qr.unit_price || 0
  })

  // Sales by day
  const byDay: Record<string, number> = {}
  qrCodes.forEach((qr) => {
    if (qr.sold_at) {
      const day = format(new Date(qr.sold_at), 'yyyy-MM-dd')
      byDay[day] = (byDay[day] || 0) + 1
    }
  })

  const sortedDays = Object.entries(byDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Location */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h3 className="text-xs font-light text-zinc-500 uppercase tracking-wider mb-4">
          Sales by Location
        </h3>
        <div className="space-y-3">
          {Object.entries(byLocation)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([location, data]) => (
              <div key={location} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white font-light">{location}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span>{data.count} units</span>
                  <span>{data.scans} scans</span>
                  <span className="text-green-400">${data.revenue.toFixed(2)}</span>
                </div>
              </div>
            ))}
          {Object.keys(byLocation).length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">No location data</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-950 border border-zinc-900 p-4">
        <h3 className="text-xs font-light text-zinc-500 uppercase tracking-wider mb-4">
          Recent Sales Activity
        </h3>
        <div className="space-y-3">
          {sortedDays.map(([date, count]) => (
            <div key={date} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white font-light">
                  {format(new Date(date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 bg-green-500/30 rounded" style={{ width: `${Math.min(count * 20, 100)}px` }} />
                <span className="text-xs text-zinc-400 w-12 text-right">{count} units</span>
              </div>
            </div>
          ))}
          {sortedDays.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">No recent sales</p>
          )}
        </div>
      </div>
    </div>
  )
}
