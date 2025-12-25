'use client'

import { useState, useEffect } from 'react'
import {
  X, MousePointer, AlertTriangle, Scroll,
  Globe, Monitor, Smartphone, Clock, ExternalLink,
  Target, TrendingDown, Zap
} from 'lucide-react'

interface BehavioralRecord {
  id: string
  data_type: string
  data: any
  page_path: string
  page_url?: string
  collected_at: string
  session_id?: string
  visitor?: {
    visitor_id: string
    fingerprint_id?: string
    browser: string
    os: string
    device_type: string
    country: string
    city: string
  }
}

interface AnalyticsDetailModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'rage' | 'scroll' | 'heatmap' | 'recording' | 'visitors' | 'pages'
  title: string
  storeId: string
  dateRange: { start: string; end: string }
}

export function AnalyticsDetailModal({
  isOpen,
  onClose,
  type,
  storeId,
  dateRange
}: AnalyticsDetailModalProps) {
  const [data, setData] = useState<BehavioralRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [groupedByPage, setGroupedByPage] = useState<Record<string, BehavioralRecord[]>>({})

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/analytics/behavioral-details?store_id=${storeId}&type=${type}&start=${dateRange.start}&end=${dateRange.end}&limit=100`
        )
        const result = await response.json()
        const items = result.items || []
        setData(items)

        // Group by page
        const grouped: Record<string, BehavioralRecord[]> = {}
        items.forEach((item: BehavioralRecord) => {
          const page = item.page_path || '/'
          if (!grouped[page]) grouped[page] = []
          grouped[page].push(item)
        })
        setGroupedByPage(grouped)
      } catch (err) {
        console.error('Failed to fetch details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, type, storeId, dateRange])

  if (!isOpen) return null

  const getTitle = () => {
    switch (type) {
      case 'rage': return 'Rage Clicks'
      case 'scroll': return 'Scroll Depth'
      case 'heatmap': return 'Click Heatmap'
      default: return 'Session Data'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'rage': return 'Users who clicked repeatedly in frustration - indicates broken buttons, slow loads, or confusing UI'
      case 'scroll': return 'How far users scroll on each page - low scroll depth may indicate content issues'
      case 'heatmap': return 'Where users click most frequently on your pages'
      default: return 'Behavioral data from your visitors'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {type === 'rage' && <AlertTriangle className="w-5 h-5 text-red-400" />}
              {type === 'scroll' && <Scroll className="w-5 h-5 text-blue-400" />}
              {type === 'heatmap' && <MousePointer className="w-5 h-5 text-orange-400" />}
              <h2 className="text-xl font-medium text-white">{getTitle()}</h2>
            </div>
            <p className="text-sm text-zinc-500 max-w-xl">{getDescription()}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                {type === 'rage' && <AlertTriangle className="w-6 h-6 text-zinc-600" />}
                {type === 'scroll' && <Scroll className="w-6 h-6 text-zinc-600" />}
                {type === 'heatmap' && <MousePointer className="w-6 h-6 text-zinc-600" />}
              </div>
              <p className="text-zinc-500">No data found for this period</p>
              <p className="text-zinc-600 text-sm mt-1">Try expanding your date range</p>
            </div>
          ) : (
            <>
              {type === 'rage' && <RageClicksView data={data} groupedByPage={groupedByPage} />}
              {type === 'scroll' && <ScrollDepthView data={data} groupedByPage={groupedByPage} />}
              {type === 'heatmap' && <HeatmapView data={data} groupedByPage={groupedByPage} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// RAGE CLICKS VIEW
// ============================================
function RageClicksView({
  data,
  groupedByPage
}: {
  data: BehavioralRecord[]
  groupedByPage: Record<string, BehavioralRecord[]>
}) {
  const pages = Object.keys(groupedByPage).sort((a, b) =>
    groupedByPage[b].length - groupedByPage[a].length
  )

  // Count total rage clicks
  const totalRageClicks = data.reduce((sum, item) => {
    return sum + (Array.isArray(item.data) ? item.data.length : 1)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-red-400">{totalRageClicks}</div>
          <div className="text-sm text-zinc-500 mt-1">Total Rage Clicks</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-white">{pages.length}</div>
          <div className="text-sm text-zinc-500 mt-1">Affected Pages</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-white">{data.length}</div>
          <div className="text-sm text-zinc-500 mt-1">Frustrated Sessions</div>
        </div>
      </div>

      {/* What to Fix */}
      <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h4 className="text-white font-medium mb-1">What This Means</h4>
            <p className="text-sm text-zinc-400">
              Rage clicks happen when users click the same area multiple times quickly - usually because something isn't responding.
              Check these pages for: broken buttons, slow-loading elements, non-clickable items that look clickable, or confusing UI.
            </p>
          </div>
        </div>
      </div>

      {/* Pages with Issues */}
      <div>
        <h3 className="text-white font-medium mb-4">Pages with Rage Clicks</h3>
        <div className="space-y-3">
          {pages.map(page => {
            const pageData = groupedByPage[page]
            const clickCount = pageData.reduce((sum, item) =>
              sum + (Array.isArray(item.data) ? item.data.length : 1), 0
            )

            // Get the most common element clicked
            const elements: Record<string, number> = {}
            pageData.forEach(item => {
              if (Array.isArray(item.data)) {
                item.data.forEach((click: any) => {
                  const el = click.element || click.target || 'unknown'
                  elements[el] = (elements[el] || 0) + 1
                })
              }
            })
            const topElement = Object.entries(elements).sort((a, b) => b[1] - a[1])[0]

            return (
              <div key={page} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">{page}</span>
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                        {clickCount} clicks
                      </span>
                    </div>
                    {topElement && (
                      <div className="text-sm text-zinc-500">
                        Most clicked: <code className="text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">{topElement[0]}</code>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
                      <span>{pageData.length} sessions</span>
                      <span>Last: {new Date(pageData[0].collected_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <a
                    href={`https://floradistro.com${page}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-white p-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Incidents */}
      <div>
        <h3 className="text-white font-medium mb-4">Recent Incidents</h3>
        <div className="space-y-2">
          {data.slice(0, 10).map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 py-3 border-b border-zinc-800/50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{item.page_path}</div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.collected_at).toLocaleString()}
                  </span>
                  {item.visitor && (
                    <>
                      <span className="flex items-center gap-1">
                        {item.visitor.device_type === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {item.visitor.browser}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {item.visitor.city}, {item.visitor.country}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm text-red-400">
                {Array.isArray(item.data) ? item.data.length : 1} clicks
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// SCROLL DEPTH VIEW
// ============================================
function ScrollDepthView({
  data,
  groupedByPage
}: {
  data: BehavioralRecord[]
  groupedByPage: Record<string, BehavioralRecord[]>
}) {
  const pages = Object.keys(groupedByPage)

  // Calculate average scroll depth per page
  const pageStats = pages.map(page => {
    const pageData = groupedByPage[page]
    const depths = pageData.map(item => item.data?.maxDepth || 0)
    const avgDepth = depths.length > 0 ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) : 0
    const scrollEvents = pageData.reduce((sum, item) => sum + (item.data?.scrollEvents || 0), 0)
    return { page, avgDepth, sessions: pageData.length, scrollEvents }
  }).sort((a, b) => b.sessions - a.sessions)

  // Overall average
  const overallAvg = pageStats.length > 0
    ? Math.round(pageStats.reduce((sum, p) => sum + p.avgDepth, 0) / pageStats.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-blue-400">{overallAvg}%</div>
          <div className="text-sm text-zinc-500 mt-1">Average Scroll Depth</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-white">{pages.length}</div>
          <div className="text-sm text-zinc-500 mt-1">Pages Tracked</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-white">{data.length}</div>
          <div className="text-sm text-zinc-500 mt-1">Sessions Recorded</div>
        </div>
      </div>

      {/* Interpretation */}
      <div className={`border rounded-lg p-4 ${
        overallAvg >= 70 ? 'bg-green-950/20 border-green-900/30' :
        overallAvg >= 40 ? 'bg-yellow-950/20 border-yellow-900/30' :
        'bg-red-950/20 border-red-900/30'
      }`}>
        <div className="flex items-start gap-3">
          <TrendingDown className={`w-5 h-5 mt-0.5 ${
            overallAvg >= 70 ? 'text-green-400' :
            overallAvg >= 40 ? 'text-yellow-400' :
            'text-red-400'
          }`} />
          <div>
            <h4 className="text-white font-medium mb-1">
              {overallAvg >= 70 ? 'Good Engagement' :
               overallAvg >= 40 ? 'Moderate Engagement' :
               'Low Engagement'}
            </h4>
            <p className="text-sm text-zinc-400">
              {overallAvg >= 70
                ? 'Users are scrolling through most of your content. Great job keeping them engaged!'
                : overallAvg >= 40
                ? 'Users scroll about halfway. Consider adding engaging content or visuals to encourage more scrolling.'
                : 'Most users aren\'t scrolling far. Your above-the-fold content may not be compelling enough, or pages may be too long.'}
            </p>
          </div>
        </div>
      </div>

      {/* Pages by Scroll Depth */}
      <div>
        <h3 className="text-white font-medium mb-4">Scroll Depth by Page</h3>
        <div className="space-y-3">
          {pageStats.map(({ page, avgDepth, sessions }) => (
            <div key={page} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-white">{page}</span>
                  <span className="text-xs text-zinc-500">{sessions} sessions</span>
                </div>
                <span className={`text-lg font-medium ${
                  avgDepth >= 70 ? 'text-green-400' :
                  avgDepth >= 40 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {avgDepth}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    avgDepth >= 70 ? 'bg-green-500' :
                    avgDepth >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${avgDepth}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// HEATMAP VIEW
// ============================================
function HeatmapView({
  data,
  groupedByPage
}: {
  data: BehavioralRecord[]
  groupedByPage: Record<string, BehavioralRecord[]>
}) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const pages = Object.keys(groupedByPage).sort((a, b) =>
    groupedByPage[b].length - groupedByPage[a].length
  )

  // Count total clicks
  const totalClicks = data.reduce((sum, item) => {
    return sum + (item.data?.clicks?.length || 0)
  }, 0)

  // Get hotspots for selected page
  const selectedPageData = selectedPage ? groupedByPage[selectedPage] : null
  const hotspots = selectedPageData?.flatMap(item => item.data?.hotspots || []) || []

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-orange-400">{totalClicks.toLocaleString()}</div>
          <div className="text-sm text-zinc-500 mt-1">Total Clicks Tracked</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-white">{pages.length}</div>
          <div className="text-sm text-zinc-500 mt-1">Pages with Data</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="text-3xl font-light text-white">{data.length}</div>
          <div className="text-sm text-zinc-500 mt-1">Sessions Recorded</div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-orange-950/20 border border-orange-900/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-orange-400 mt-0.5" />
          <div>
            <h4 className="text-white font-medium mb-1">How to Use This Data</h4>
            <p className="text-sm text-zinc-400">
              Heatmap data shows where users click most. Use this to optimize button placement,
              identify elements users expect to be clickable, and improve your conversion flow.
            </p>
          </div>
        </div>
      </div>

      {/* Page List */}
      <div>
        <h3 className="text-white font-medium mb-4">Pages by Click Activity</h3>
        <div className="space-y-2">
          {pages.map(page => {
            const pageData = groupedByPage[page]
            const clickCount = pageData.reduce((sum, item) => sum + (item.data?.clicks?.length || 0), 0)
            const isSelected = selectedPage === page

            return (
              <button
                key={page}
                onClick={() => setSelectedPage(isSelected ? null : page)}
                className={`w-full text-left bg-zinc-900/50 border rounded-lg p-4 transition-colors ${
                  isSelected ? 'border-orange-500/50 bg-orange-950/20' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white">{page}</span>
                    <div className="text-xs text-zinc-500 mt-1">
                      {pageData.length} sessions
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-medium text-orange-400">{clickCount.toLocaleString()}</span>
                    <div className="text-xs text-zinc-500">clicks</div>
                  </div>
                </div>

                {isSelected && hotspots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-xs text-zinc-400 mb-2">Top Click Areas:</div>
                    <div className="space-y-1">
                      {hotspots.slice(0, 5).map((spot: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="w-4 text-zinc-500">{idx + 1}.</span>
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${(spot.count / hotspots[0].count) * 100}%` }}
                            />
                          </div>
                          <span className="text-zinc-400 text-xs">{spot.count} clicks</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`https://floradistro.com${page}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs text-orange-400 hover:text-orange-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View page <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
