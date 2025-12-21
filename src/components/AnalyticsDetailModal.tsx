'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Play, Pause, SkipBack, SkipForward,
  MousePointer, AlertTriangle, Scroll, User,
  Globe, Monitor, Smartphone, Calendar, Clock,
  ChevronLeft, ChevronRight, Maximize2, ExternalLink
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
    page_url: string
    created_at: string
  }
}

interface AnalyticsDetailModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'rage' | 'scroll' | 'heatmap' | 'recording' | 'visitors' | 'pages'
  title: string
  vendorId: string
  dateRange: { start: string; end: string }
}

export function AnalyticsDetailModal({
  isOpen,
  onClose,
  type,
  title,
  vendorId,
  dateRange
}: AnalyticsDetailModalProps) {
  const [data, setData] = useState<BehavioralRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<BehavioralRecord | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const playbackRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/analytics/behavioral-details?vendor_id=${vendorId}&type=${type}&start=${dateRange.start}&end=${dateRange.end}&limit=100`
        )
        const result = await response.json()
        setData(result.items || [])
        if (result.items?.length > 0) {
          setSelectedItem(result.items[0])
        }
      } catch (err) {
        console.error('Failed to fetch details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, type, vendorId, dateRange])

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current)
      }
    }
  }, [])

  const startPlayback = () => {
    if (!selectedItem?.data) return
    setIsPlaying(true)
    setPlaybackIndex(0)

    const events = selectedItem.data_type === 'recording'
      ? selectedItem.data.events || []
      : selectedItem.data_type === 'rage'
      ? selectedItem.data || []
      : []

    if (events.length === 0) return

    playbackRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= events.length - 1) {
          if (playbackRef.current) clearInterval(playbackRef.current)
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 100)
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    if (playbackRef.current) {
      clearInterval(playbackRef.current)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[90vw] max-w-6xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {type === 'rage' && <AlertTriangle className="w-5 h-5 text-red-400" />}
            {type === 'scroll' && <Scroll className="w-5 h-5 text-blue-400" />}
            {type === 'heatmap' && <MousePointer className="w-5 h-5 text-orange-400" />}
            {type === 'recording' && <Play className="w-5 h-5 text-green-400" />}
            <h2 className="text-lg font-light text-white">{title}</h2>
            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
              {data.length} events
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            No {type} data found for this period
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Event List */}
            <div className="w-80 border-r border-zinc-800 overflow-y-auto">
              {data.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item)
                    setPlaybackIndex(0)
                    stopPlayback()
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${
                    selectedItem?.id === item.id
                      ? 'bg-zinc-900'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate max-w-[180px]">
                      {item.page_path || '/'}
                    </span>
                    <span className="text-xs text-zinc-500">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.collected_at).toLocaleDateString()}
                    <Clock className="w-3 h-3 ml-1" />
                    {new Date(item.collected_at).toLocaleTimeString()}
                  </div>
                  {item.visitor && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-600">
                      {item.visitor.device_type === 'mobile' ? (
                        <Smartphone className="w-3 h-3" />
                      ) : (
                        <Monitor className="w-3 h-3" />
                      )}
                      <span>{item.visitor.browser}</span>
                      <span>|</span>
                      <span>{item.visitor.country}</span>
                    </div>
                  )}
                  {type === 'rage' && item.data && (
                    <div className="mt-1.5 text-xs text-red-400">
                      {Array.isArray(item.data) ? item.data.length : 1} rage clicks
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Detail View */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedItem ? (
                <>
                  {/* Visitor Info Bar */}
                  {selectedItem.visitor && (
                    <div className="px-6 py-3 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <User className="w-4 h-4" />
                        <span className="text-zinc-300 font-mono text-xs">
                          {selectedItem.visitor.visitor_id?.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Globe className="w-4 h-4" />
                        <span>{selectedItem.visitor.city}, {selectedItem.visitor.country}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        {selectedItem.visitor.device_type === 'mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                        <span>{selectedItem.visitor.browser} / {selectedItem.visitor.os}</span>
                      </div>
                    </div>
                  )}

                  {/* Main Visualization Area */}
                  <div className="flex-1 p-6 overflow-auto">
                    {type === 'rage' && selectedItem.data && (
                      <RageClickVisualization
                        data={selectedItem.data}
                        pagePath={selectedItem.page_path}
                        pageUrl={selectedItem.page_url}
                        playbackIndex={playbackIndex}
                        isPlaying={isPlaying}
                      />
                    )}

                    {type === 'scroll' && selectedItem.data && (
                      <ScrollVisualization data={selectedItem.data} />
                    )}

                    {type === 'heatmap' && selectedItem.data && (
                      <HeatmapVisualization
                        data={selectedItem.data}
                        pagePath={selectedItem.page_path}
                        pageUrl={selectedItem.page_url}
                      />
                    )}

                    {type === 'recording' && selectedItem.data && (
                      <RecordingVisualization
                        data={selectedItem.data}
                        playbackIndex={playbackIndex}
                        isPlaying={isPlaying}
                      />
                    )}
                  </div>

                  {/* Playback Controls */}
                  {(type === 'rage' || type === 'recording') && selectedItem.data && (
                    <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPlaybackIndex(Math.max(0, playbackIndex - 10))}
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                        >
                          <SkipBack className="w-5 h-5" />
                        </button>

                        <button
                          onClick={isPlaying ? stopPlayback : startPlayback}
                          className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </button>

                        <button
                          onClick={() => {
                            const events = selectedItem.data_type === 'recording'
                              ? selectedItem.data.events || []
                              : selectedItem.data || []
                            setPlaybackIndex(Math.min(events.length - 1, playbackIndex + 10))
                          }}
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                        >
                          <SkipForward className="w-5 h-5" />
                        </button>

                        <div className="ml-4 text-sm text-zinc-500">
                          Event {playbackIndex + 1} / {
                            (selectedItem.data_type === 'recording'
                              ? selectedItem.data.events?.length
                              : selectedItem.data?.length) || 0
                          }
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 transition-all duration-100"
                          style={{
                            width: `${(playbackIndex / Math.max(1,
                              (selectedItem.data_type === 'recording'
                                ? selectedItem.data.events?.length
                                : selectedItem.data?.length) - 1
                            )) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  Select an event to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Rage Click Visualization
function RageClickVisualization({
  data,
  pagePath,
  pageUrl,
  playbackIndex,
  isPlaying
}: {
  data: any[]
  pagePath: string
  pageUrl?: string
  playbackIndex: number
  isPlaying: boolean
}) {
  const clicks = Array.isArray(data) ? data : []
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Build the actual URL to show in iframe
  const siteUrl = pageUrl || `https://floradistro.com${pagePath}`

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm text-white">Rage Click Locations</h4>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
          >
            Open page <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Live page preview with click overlay */}
        <div className="relative bg-zinc-950 border border-zinc-700 rounded overflow-hidden" style={{ height: '500px' }}>
          {/* Iframe of actual page */}
          <iframe
            src={siteUrl}
            className="w-full h-full border-0 pointer-events-none"
            style={{
              transform: 'scale(0.75)',
              transformOrigin: 'top left',
              width: '133.33%',
              height: '133.33%'
            }}
            onLoad={() => setIframeLoaded(true)}
            sandbox="allow-same-origin allow-scripts"
          />

          {/* Loading overlay */}
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mx-auto mb-2" />
                <span className="text-zinc-500 text-sm">Loading {pagePath}...</span>
              </div>
            </div>
          )}

          {/* Click markers overlay - scaled to match iframe */}
          <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%', height: '133.33%' }}>
            {clicks.slice(0, isPlaying ? playbackIndex + 1 : clicks.length).map((click, idx) => (
              <div
                key={idx}
                className="absolute w-12 h-12 rounded-full border-2 border-red-500 bg-red-500/30"
                style={{
                  left: `${click.x}px`,
                  top: `${click.y}px`,
                  transform: 'translate(-50%, -50%)',
                  animation: isPlaying ? 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
                  animationDelay: `${idx * 100}ms`,
                }}
              />
            ))}

            {clicks.slice(0, isPlaying ? playbackIndex + 1 : clicks.length).map((click, idx) => (
              <div
                key={`dot-${idx}`}
                className="absolute w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                style={{
                  left: `${click.x}px`,
                  top: `${click.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Click Details Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <h4 className="text-sm text-white mb-4">Click Details</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Position (X, Y)</th>
                <th className="pb-2 pr-4">Element</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {clicks.map((click, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-zinc-800/50 ${
                    isPlaying && idx === playbackIndex ? 'bg-red-900/20' : ''
                  }`}
                >
                  <td className="py-2 pr-4 text-zinc-500">{idx + 1}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {click.x}, {click.y}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-400 truncate max-w-[200px]">
                    {click.target || 'unknown'}
                  </td>
                  <td className="py-2 font-mono text-xs text-zinc-500">
                    {new Date(click.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Scroll Visualization
function ScrollVisualization({ data }: { data: any }) {
  const maxDepth = data?.maxDepth || 0
  const scrollEvents = data?.scrollEvents || 0
  const dwellZones = data?.dwellZones || []

  return (
    <div className="space-y-6">
      {/* Scroll Depth Meter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <h4 className="text-sm text-white mb-4">Maximum Scroll Depth</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-8 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
              style={{ width: `${maxDepth}%` }}
            />
          </div>
          <span className="text-2xl font-light text-white w-20 text-right">
            {maxDepth}%
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          User scrolled through {maxDepth}% of the page ({scrollEvents} scroll events)
        </p>
      </div>

      {/* Page Heatmap */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <h4 className="text-sm text-white mb-4">Scroll Heatmap</h4>
        <div className="relative h-96 bg-zinc-950 border border-zinc-700 rounded overflow-hidden">
          {/* Gradient overlay showing engagement */}
          <div
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-green-500/30 via-yellow-500/30 to-red-500/30"
            style={{ height: `${maxDepth}%` }}
          />

          {/* Depth markers */}
          {[0, 25, 50, 75, 100].map(depth => (
            <div
              key={depth}
              className="absolute left-0 right-0 border-t border-dashed border-zinc-700 flex items-center"
              style={{ top: `${depth}%` }}
            >
              <span className="text-xs text-zinc-500 bg-zinc-900 px-1 ml-2">
                {depth}%
              </span>
            </div>
          ))}

          {/* Max depth indicator */}
          <div
            className="absolute left-0 right-0 border-t-2 border-blue-500"
            style={{ top: `${maxDepth}%` }}
          >
            <span className="absolute right-2 -top-3 text-xs text-blue-400 bg-zinc-900 px-2">
              Max: {maxDepth}%
            </span>
          </div>

          {/* Dwell zones */}
          {dwellZones.map((zone: any, idx: number) => (
            <div
              key={idx}
              className="absolute left-0 right-0 bg-orange-500/20 border-l-2 border-orange-500"
              style={{
                top: `${zone.start}%`,
                height: `${zone.end - zone.start}%`
              }}
            >
              <span className="text-xs text-orange-400 ml-2">
                Dwell zone ({zone.duration}s)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Heatmap Visualization
function HeatmapVisualization({
  data,
  pagePath,
  pageUrl
}: {
  data: any
  pagePath: string
  pageUrl?: string
}) {
  const clicks = data?.clicks || []
  const hotspots = data?.hotspots || []
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const siteUrl = pageUrl || `https://floradistro.com${pagePath}`

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm text-white">
            Click Heatmap - {pagePath}
            <span className="text-zinc-500 ml-2">({clicks.length} clicks)</span>
          </h4>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
          >
            Open page <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="relative bg-zinc-950 border border-zinc-700 rounded overflow-hidden" style={{ height: '500px' }}>
          {/* Iframe of actual page */}
          <iframe
            src={siteUrl}
            className="w-full h-full border-0 pointer-events-none"
            style={{
              transform: 'scale(0.75)',
              transformOrigin: 'top left',
              width: '133.33%',
              height: '133.33%'
            }}
            onLoad={() => setIframeLoaded(true)}
            sandbox="allow-same-origin allow-scripts"
          />

          {/* Loading overlay */}
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mx-auto mb-2" />
                <span className="text-zinc-500 text-sm">Loading {pagePath}...</span>
              </div>
            </div>
          )}

          {/* Heatmap overlay - scaled to match iframe */}
          <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%', height: '133.33%' }}>
            {/* Hotspots with intensity */}
            {hotspots.map((spot: any, idx: number) => {
              const intensity = Math.min(spot.count / 10, 1)
              return (
                <div
                  key={idx}
                  className="absolute rounded-full blur-xl pointer-events-none"
                  style={{
                    left: `${spot.x}px`,
                    top: `${spot.y}px`,
                    width: `${80 + spot.count * 10}px`,
                    height: `${80 + spot.count * 10}px`,
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle,
                      rgba(239, 68, 68, ${intensity * 0.7}) 0%,
                      rgba(249, 115, 22, ${intensity * 0.5}) 40%,
                      transparent 70%)`
                  }}
                />
              )
            })}

            {/* Individual clicks */}
            {clicks.slice(0, 200).map((click: any, idx: number) => (
              <div
                key={idx}
                className="absolute w-3 h-3 rounded-full bg-orange-500/60"
                style={{
                  left: `${click.x}px`,
                  top: `${click.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Hotspot List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <h4 className="text-sm text-white mb-4">Top Click Areas</h4>
        <div className="space-y-2">
          {hotspots.slice(0, 10).map((spot: any, idx: number) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="text-xs text-zinc-500 w-6">#{idx + 1}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                  style={{ width: `${(spot.count / hotspots[0].count) * 100}%` }}
                />
              </div>
              <span className="text-sm text-zinc-300 w-16 text-right">
                {spot.count} clicks
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Session Recording Visualization
function RecordingVisualization({
  data,
  playbackIndex,
  isPlaying
}: {
  data: any
  playbackIndex: number
  isPlaying: boolean
}) {
  const events = data?.events || []
  const currentEvent = events[playbackIndex]

  return (
    <div className="space-y-6">
      {/* Viewport Simulation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm text-white">Session Replay</h4>
          <span className="text-xs text-zinc-500">
            {events.length} events recorded
          </span>
        </div>

        <div className="relative bg-zinc-950 border border-zinc-700 rounded aspect-video overflow-hidden">
          {/* Cursor position */}
          {currentEvent && currentEvent.type === 'mouse' && (
            <div
              className="absolute w-4 h-4 pointer-events-none transition-all duration-75"
              style={{
                left: `${(currentEvent.x / (currentEvent.viewportWidth || 1920)) * 100}%`,
                top: `${(currentEvent.y / (currentEvent.viewportHeight || 1080)) * 100}%`,
              }}
            >
              <MousePointer className="w-4 h-4 text-white drop-shadow-lg" />
            </div>
          )}

          {/* Click indicator */}
          {currentEvent && currentEvent.type === 'click' && (
            <div
              className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-blue-500 animate-ping"
              style={{
                left: `${(currentEvent.x / (currentEvent.viewportWidth || 1920)) * 100}%`,
                top: `${(currentEvent.y / (currentEvent.viewportHeight || 1080)) * 100}%`,
              }}
            />
          )}

          {/* Trail of recent positions */}
          {events.slice(Math.max(0, playbackIndex - 20), playbackIndex).map((evt: any, idx: number) => (
            evt.type === 'mouse' && (
              <div
                key={idx}
                className="absolute w-1 h-1 rounded-full bg-blue-500"
                style={{
                  left: `${(evt.x / (evt.viewportWidth || 1920)) * 100}%`,
                  top: `${(evt.y / (evt.viewportHeight || 1080)) * 100}%`,
                  opacity: (idx / 20) * 0.5
                }}
              />
            )
          ))}
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4">
        <h4 className="text-sm text-white mb-4">Event Log</h4>
        <div className="max-h-48 overflow-y-auto font-mono text-xs space-y-1">
          {events.slice(Math.max(0, playbackIndex - 5), playbackIndex + 6).map((evt: any, idx: number) => {
            const actualIdx = Math.max(0, playbackIndex - 5) + idx
            const isCurrent = actualIdx === playbackIndex

            return (
              <div
                key={actualIdx}
                className={`flex items-center gap-3 py-1 px-2 rounded ${
                  isCurrent ? 'bg-blue-900/30 text-blue-300' : 'text-zinc-500'
                }`}
              >
                <span className="w-8">{actualIdx}</span>
                <span className={`w-16 ${
                  evt.type === 'click' ? 'text-orange-400' :
                  evt.type === 'scroll' ? 'text-green-400' : 'text-zinc-400'
                }`}>
                  {evt.type}
                </span>
                <span className="flex-1">
                  {evt.x !== undefined && `(${evt.x}, ${evt.y})`}
                  {evt.scrollY !== undefined && `Y: ${evt.scrollY}`}
                </span>
                <span className="text-zinc-600">
                  +{evt.timestamp ? new Date(evt.timestamp).getMilliseconds() : 0}ms
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
