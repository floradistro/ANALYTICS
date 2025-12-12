'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Crosshair, AlertCircle } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface GeoPoint {
  lat: number
  lng: number
  type: 'store' | 'shipping' | 'customer'
  revenue: number
  orders: number
  customers?: number
  city?: string
  state?: string
  name?: string
}

interface MapLayers {
  stores: GeoPoint[]
  customers: GeoPoint[]
  shipping: GeoPoint[]
}

interface MapboxMapProps {
  layers: MapLayers
  visibleLayers: { stores: boolean; customers: boolean; shipping: boolean }
  isLoading: boolean
}

export default function MapboxMap({ layers, visibleLayers, isLoading }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return

    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not configured')
      return
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN

      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-80.5, 35.5], // Center on NC/TN area
        zoom: 6,
        attributionControl: false,
        preserveDrawingBuffer: true,
      })

      map.current = mapInstance

      mapInstance.on('load', () => {
        console.log('Map loaded')

        mapInstance.setFog({
          color: 'rgb(5, 5, 10)',
          'high-color': 'rgb(20, 20, 35)',
          'horizon-blend': 0.08,
        })

        setMapLoaded(true)
      })

      mapInstance.on('error', (e) => {
        console.error('Map error:', e)
        setError('Failed to load map')
      })

    } catch (err) {
      console.error('Map init error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize map')
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update layers when data or visibility changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const m = map.current

    // Helper to safely remove layer and source
    const removeLayerAndSource = (layerId: string, sourceId: string) => {
      if (m.getLayer(layerId)) m.removeLayer(layerId)
      if (m.getLayer(layerId + '-glow')) m.removeLayer(layerId + '-glow')
      if (m.getLayer(layerId + '-heat')) m.removeLayer(layerId + '-heat')
      if (m.getSource(sourceId)) m.removeSource(sourceId)
    }

    // === CUSTOMER HEATMAP (Purple) - Individual customers ===
    removeLayerAndSource('customers', 'customer-data')
    if (visibleLayers.customers && layers.customers.length > 0) {
      const maxRevenue = Math.max(...layers.customers.map(p => p.revenue || 1), 1)

      const customerGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: layers.customers.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          properties: {
            customers: p.customers || 1,
            revenue: p.revenue || 0,
            orders: p.orders || 0,
            city: p.city || '',
            state: p.state || '',
            intensity: Math.min((p.revenue || 0) / maxRevenue + 0.2, 1),
          },
        })),
      }

      m.addSource('customer-data', { type: 'geojson', data: customerGeoJson })

      // Customer heatmap - shows density of individual customers
      m.addLayer({
        id: 'customers-heat',
        type: 'heatmap',
        source: 'customer-data',
        paint: {
          'heatmap-weight': 1, // Equal weight per customer
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 1.5, 12, 3],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 15, 8, 25, 12, 40],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 12, 0.4],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(147, 51, 234, 0.3)',
            0.3, 'rgba(168, 85, 247, 0.5)',
            0.5, 'rgba(192, 132, 252, 0.6)',
            0.7, 'rgba(216, 180, 254, 0.7)',
            1, 'rgba(250, 232, 255, 0.9)',
          ],
        },
      })

      // Individual customer points (visible when zoomed in)
      m.addLayer({
        id: 'customers',
        type: 'circle',
        source: 'customer-data',
        minzoom: 6,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 6, 14, 10],
          'circle-color': '#a855f7',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 10, 0.8],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#c084fc',
        },
      })
    }

    // === SHIPPING HEATMAP (Teal) ===
    removeLayerAndSource('shipping', 'shipping-data')
    if (visibleLayers.shipping && layers.shipping.length > 0) {
      const maxRevenue = Math.max(...layers.shipping.map(p => p.revenue), 1)

      const shippingGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: layers.shipping.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          properties: {
            orders: p.orders,
            revenue: p.revenue,
            state: p.state || '',
            intensity: p.revenue / maxRevenue,
          },
        })),
      }

      m.addSource('shipping-data', { type: 'geojson', data: shippingGeoJson })

      // Shipping heatmap
      m.addLayer({
        id: 'shipping-heat',
        type: 'heatmap',
        source: 'shipping-data',
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': 1.5,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 50, 7, 70, 10, 100],
          'heatmap-opacity': 0.7,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(15, 118, 110, 0.2)',
            0.3, 'rgba(20, 184, 166, 0.4)',
            0.5, 'rgba(45, 212, 191, 0.5)',
            0.7, 'rgba(94, 234, 212, 0.6)',
            1, 'rgba(153, 246, 228, 0.8)',
          ],
        },
      })

      // Shipping points
      m.addLayer({
        id: 'shipping',
        type: 'circle',
        source: 'shipping-data',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 8, 0.5, 14, 1, 22],
          'circle-color': '#14b8a6',
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#5eead4',
        },
      })
    }

    // === STORE LOCATIONS (Amber) ===
    removeLayerAndSource('stores', 'store-data')
    if (visibleLayers.stores && layers.stores.length > 0) {
      const maxStoreRevenue = Math.max(...layers.stores.map(p => p.revenue), 1)

      const storeGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: layers.stores.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          properties: {
            name: p.name || '',
            city: p.city || '',
            state: p.state || '',
            orders: p.orders,
            revenue: p.revenue,
            intensity: p.revenue / maxStoreRevenue,
          },
        })),
      }

      m.addSource('store-data', { type: 'geojson', data: storeGeoJson })

      // Store glow
      m.addLayer({
        id: 'stores-glow',
        type: 'circle',
        source: 'store-data',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 25, 0.5, 35, 1, 50],
          'circle-color': '#f59e0b',
          'circle-opacity': 0.2,
          'circle-blur': 1,
        },
      })

      // Store points
      m.addLayer({
        id: 'stores',
        type: 'circle',
        source: 'store-data',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 10, 0.5, 14, 1, 20],
          'circle-color': '#f59e0b',
          'circle-opacity': 1,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fbbf24',
        },
      })
    }

  }, [mapLoaded, layers, visibleLayers])

  // Separate effect for click handlers to avoid re-registering
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const m = map.current

    const createPopup = (e: mapboxgl.MapLayerMouseEvent, layerId: string, color: string) => {
      if (!e.features?.[0]) return

      // Ensure we have valid feature data
      const feature = e.features[0]
      if (!feature.geometry || feature.geometry.type !== 'Point') return

      const props = feature.properties || {}
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]

      let content = ''
      if (layerId === 'stores') {
        content = `
          <div style="background: rgba(0,0,0,0.95); border: 1px solid ${color}; padding: 12px 16px; font-family: monospace; min-width: 180px;">
            <div style="color: ${color}; font-size: 14px; font-weight: bold; margin-bottom: 8px;">${props.name || props.state}</div>
            <div style="color: #71717a; font-size: 10px;">${props.city}, ${props.state}</div>
            <div style="margin-top: 8px; display: flex; gap: 16px;">
              <div><span style="color: #71717a; font-size: 10px;">ORDERS</span><br/><span style="color: #fff;">${props.orders?.toLocaleString() || 0}</span></div>
              <div><span style="color: #71717a; font-size: 10px;">REVENUE</span><br/><span style="color: ${color};">$${Math.round(props.revenue || 0).toLocaleString()}</span></div>
            </div>
          </div>
        `
      } else if (layerId === 'customers') {
        const location = props.city ? `${props.city}, ${props.state}` : props.state
        content = `
          <div style="background: rgba(0,0,0,0.95); border: 1px solid ${color}; padding: 12px 16px; font-family: monospace; min-width: 160px;">
            <div style="color: ${color}; font-size: 14px; font-weight: bold; margin-bottom: 4px;">CUSTOMER</div>
            <div style="color: #a1a1aa; font-size: 11px; margin-bottom: 8px;">${location}</div>
            <div style="display: flex; gap: 16px;">
              <div><span style="color: #71717a; font-size: 10px;">ORDERS</span><br/><span style="color: #fff;">${props.orders || 0}</span></div>
              <div><span style="color: #71717a; font-size: 10px;">SPENT</span><br/><span style="color: ${color};">$${Math.round(props.revenue || 0).toLocaleString()}</span></div>
            </div>
          </div>
        `
      } else {
        content = `
          <div style="background: rgba(0,0,0,0.95); border: 1px solid ${color}; padding: 12px 16px; font-family: monospace; min-width: 160px;">
            <div style="color: ${color}; font-size: 14px; font-weight: bold; margin-bottom: 8px;">${props.state} SHIPPING</div>
            <div style="display: flex; gap: 16px;">
              <div><span style="color: #71717a; font-size: 10px;">ORDERS</span><br/><span style="color: #fff;">${props.orders?.toLocaleString() || 0}</span></div>
              <div><span style="color: #71717a; font-size: 10px;">REVENUE</span><br/><span style="color: ${color};">$${Math.round(props.revenue || 0).toLocaleString()}</span></div>
            </div>
          </div>
        `
      }

      new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(coords)
        .setHTML(content)
        .addTo(m)
    }

    // Click handlers
    const onStoreClick = (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'stores', '#f59e0b')
    const onCustomerClick = (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'customers', '#a855f7')
    const onShippingClick = (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'shipping', '#14b8a6')

    const setCursor = () => { m.getCanvas().style.cursor = 'pointer' }
    const resetCursor = () => { m.getCanvas().style.cursor = '' }

    // Register handlers
    m.on('click', 'stores', onStoreClick)
    m.on('click', 'customers', onCustomerClick)
    m.on('click', 'shipping', onShippingClick)

    m.on('mouseenter', 'stores', setCursor)
    m.on('mouseleave', 'stores', resetCursor)
    m.on('mouseenter', 'customers', setCursor)
    m.on('mouseleave', 'customers', resetCursor)
    m.on('mouseenter', 'shipping', setCursor)
    m.on('mouseleave', 'shipping', resetCursor)

    // Cleanup
    return () => {
      m.off('click', 'stores', onStoreClick)
      m.off('click', 'customers', onCustomerClick)
      m.off('click', 'shipping', onShippingClick)
      m.off('mouseenter', 'stores', setCursor)
      m.off('mouseleave', 'stores', resetCursor)
      m.off('mouseenter', 'customers', setCursor)
      m.off('mouseleave', 'customers', resetCursor)
      m.off('mouseenter', 'shipping', setCursor)
      m.off('mouseleave', 'shipping', resetCursor)
    }
  }, [mapLoaded])

  return (
    <div className="absolute inset-0 w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Loading/Error overlay */}
      {(isLoading || !mapLoaded || error) && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
          <div className="text-center">
            {error ? (
              <>
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-xs font-mono text-red-400 uppercase tracking-wider">Map Error</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-2 max-w-xs">{error}</p>
              </>
            ) : (
              <>
                <Crosshair className="w-8 h-8 text-teal-400 mx-auto mb-3 animate-pulse" />
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  {isLoading ? 'Loading data...' : 'Initializing map...'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .mapboxgl-map { font: inherit !important; }
        .mapboxgl-canvas { outline: none !important; }
        .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-logo { display: none !important; }
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .mapboxgl-popup-tip { display: none !important; }
        .mapboxgl-popup-close-button {
          color: #71717a !important;
          font-size: 18px !important;
          padding: 4px 8px !important;
          right: 4px !important;
          top: 4px !important;
        }
        .mapboxgl-popup-close-button:hover {
          color: #fff !important;
          background: transparent !important;
        }
      `}</style>
    </div>
  )
}
