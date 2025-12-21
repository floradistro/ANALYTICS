'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Crosshair, AlertCircle } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface GeoPoint {
  lat: number
  lng: number
  type: 'store' | 'shipping' | 'customer' | 'traffic'
  revenue: number
  orders: number
  customers?: number
  city?: string
  state?: string
  name?: string
  device?: string
  timestamp?: string
  // Extended data for popups
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  address?: string
  orderNumber?: string
  orderDate?: string
  orderStatus?: string
  totalSpent?: number
  totalOrders?: number
  // Attribution data for traffic
  channel?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  browser?: string
  os?: string
  isReturning?: boolean
  country?: string
  // Session activity data
  sessionId?: string
  visitorId?: string
  pageViews?: number
  productViews?: number
  addToCarts?: number
  purchases?: number
  sessionRevenue?: number
  landingPage?: string
  // Geolocation accuracy indicator
  geoSource?: 'browser_gps' | 'ipinfo' | 'vercel_headers' | 'city_centroid_backfill' | string
  geoAccuracy?: number // meters
}

interface MapLayers {
  stores: GeoPoint[]
  customers: GeoPoint[]
  shipping: GeoPoint[]
  traffic: GeoPoint[]
}

interface JourneyPoint {
  lat: number
  lng: number
  city: string
  state: string
  zip: string
  timestamp: string
  eventType: string
}

interface ShipmentJourney {
  trackingNumber: string
  orderId: string | null
  orderNumber?: string
  status: string
  carrier: string
  estimatedDelivery: string | null
  origin: JourneyPoint | null
  destination: { city: string; state: string; zip: string; lat: number | null; lng: number | null } | null
  points: JourneyPoint[]
  // Order & customer details
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  orderTotal?: number
  orderSubtotal?: number
  orderDate?: string
  storeName?: string
  // Transit metrics
  transitStarted?: string
  transitEnded?: string
  transitHours?: number
  transitDays?: number
}

interface MapboxMapProps {
  layers: MapLayers
  visibleLayers: { stores: boolean; customers: boolean; shipping: boolean; traffic: boolean; usps: boolean; journeys: boolean }
  isLoading: boolean
  journeys?: ShipmentJourney[]
}

// Memoized GeoJSON creators to prevent unnecessary re-renders
function createGeoJSON(points: GeoPoint[], maxRevenue: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: {
        name: p.name || '',
        city: p.city || '',
        state: p.state || '',
        orders: p.orders || 0,
        revenue: p.revenue || 0,
        customers: p.customers || 1,
        device: p.device || 'unknown',
        timestamp: p.timestamp || '',
        intensity: maxRevenue > 0 ? Math.min((p.revenue || 0) / maxRevenue + 0.2, 1) : 0.5,
        // Extended data
        customerName: p.customerName || '',
        customerEmail: p.customerEmail || '',
        customerPhone: p.customerPhone || '',
        address: p.address || '',
        orderNumber: p.orderNumber || '',
        orderDate: p.orderDate || '',
        orderStatus: p.orderStatus || '',
        totalSpent: p.totalSpent || 0,
        totalOrders: p.totalOrders || 0,
        // Attribution data
        channel: p.channel || '',
        utmSource: p.utmSource || '',
        utmMedium: p.utmMedium || '',
        utmCampaign: p.utmCampaign || '',
        referrer: p.referrer || '',
        browser: p.browser || '',
        os: p.os || '',
        isReturning: p.isReturning || false,
        country: p.country || '',
        // Session activity data
        sessionId: p.sessionId || '',
        visitorId: p.visitorId || '',
        pageViews: p.pageViews || 0,
        productViews: p.productViews || 0,
        addToCarts: p.addToCarts || 0,
        purchases: p.purchases || 0,
        sessionRevenue: p.sessionRevenue || 0,
        landingPage: p.landingPage || '',
        // Geolocation source for styling (accurate vs inaccurate)
        geoSource: p.geoSource || '',
        geoAccuracy: p.geoAccuracy || 0,
        // Only browser_gps and ipinfo are truly accurate - everything else clusters at city centers
        isAccurate: p.geoSource === 'browser_gps' || p.geoSource === 'ipinfo',
      },
    })),
  }
}

// Color palette for distinct journey colors
const JOURNEY_COLORS = [
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#a78bfa', // purple
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f87171', // red
  '#60a5fa', // blue
  '#4ade80', // green
  '#fb923c', // orange
  '#e879f9', // fuchsia
]

// Create curved arc between two points
function createArc(start: [number, number], end: [number, number], numPoints: number = 20): [number, number][] {
  const points: [number, number][] = []

  // Calculate midpoint and offset for curve
  const midX = (start[0] + end[0]) / 2
  const midY = (start[1] + end[1]) / 2

  // Calculate perpendicular offset for the curve (arc height based on distance)
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dist = Math.sqrt(dx * dx + dy * dy)
  const offset = dist * 0.15 // 15% of distance as arc height

  // Perpendicular direction
  const perpX = -dy / dist * offset
  const perpY = dx / dist * offset

  // Control point for quadratic curve
  const controlX = midX + perpX
  const controlY = midY + perpY

  // Generate points along quadratic bezier curve
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlX + t * t * end[0]
    const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlY + t * t * end[1]
    points.push([x, y])
  }

  return points
}

// Create GeoJSON for journey lines
function createJourneyGeoJSON(journeys: ShipmentJourney[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  journeys.forEach((journey, idx) => {
    if (journey.points.length < 2) return

    const color = JOURNEY_COLORS[idx % JOURNEY_COLORS.length]

    // Create curved segments between each pair of points
    for (let i = 0; i < journey.points.length - 1; i++) {
      const start: [number, number] = [journey.points[i].lng, journey.points[i].lat]
      const end: [number, number] = [journey.points[i + 1].lng, journey.points[i + 1].lat]

      // Create arc for this segment
      const arcCoords = createArc(start, end)

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: arcCoords,
        },
        properties: {
          trackingNumber: journey.trackingNumber,
          orderNumber: journey.orderNumber || '',
          status: journey.status,
          carrier: journey.carrier,
          pointCount: journey.points.length,
          index: idx,
          color: color,
          segmentIndex: i,
          // Order & customer details
          customerName: journey.customerName || '',
          customerEmail: journey.customerEmail || '',
          customerPhone: journey.customerPhone || '',
          shippingAddress: journey.shippingAddress || '',
          orderTotal: journey.orderTotal || 0,
          orderSubtotal: journey.orderSubtotal || 0,
          orderDate: journey.orderDate || '',
          storeName: journey.storeName || '',
          // Transit metrics
          transitHours: journey.transitHours || 0,
          transitDays: journey.transitDays || 0,
          estimatedDelivery: journey.estimatedDelivery || '',
        },
      })
    }
  })

  return { type: 'FeatureCollection', features }
}

// Create GeoJSON for journey waypoints
function createJourneyPointsGeoJSON(journeys: ShipmentJourney[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  journeys.forEach((journey, journeyIdx) => {
    if (journey.points.length < 2) return

    const color = JOURNEY_COLORS[journeyIdx % JOURNEY_COLORS.length]

    journey.points.forEach((point, idx) => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat],
        },
        properties: {
          trackingNumber: journey.trackingNumber,
          orderNumber: journey.orderNumber || '',
          status: journey.status,
          city: point.city,
          state: point.state,
          eventType: point.eventType,
          timestamp: point.timestamp,
          isOrigin: idx === 0,
          isDestination: idx === journey.points.length - 1,
          pointIndex: idx,
          totalPoints: journey.points.length,
          journeyIndex: journeyIdx,
          color: color,
          // Order & customer details
          customerName: journey.customerName || '',
          customerEmail: journey.customerEmail || '',
          customerPhone: journey.customerPhone || '',
          shippingAddress: journey.shippingAddress || '',
          orderTotal: journey.orderTotal || 0,
          orderSubtotal: journey.orderSubtotal || 0,
          orderDate: journey.orderDate || '',
          storeName: journey.storeName || '',
          carrier: journey.carrier || 'USPS',
          // Transit metrics
          transitHours: journey.transitHours || 0,
          transitDays: journey.transitDays || 0,
          estimatedDelivery: journey.estimatedDelivery || '',
        },
      })
    })
  })

  return { type: 'FeatureCollection', features }
}

export default function MapboxMap({ layers, visibleLayers, isLoading, journeys = [] }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const layersInitialized = useRef(false)

  // Debug log journeys
  useEffect(() => {
    const withPoints = journeys.filter(j => j.points.length >= 2)
    console.log('[MapboxMap] Received', journeys.length, 'journeys,', withPoints.length, 'with 2+ points')
    if (withPoints.length > 0) {
      console.log('[MapboxMap] Sample journey:', withPoints[0].trackingNumber, withPoints[0].points.map(p => `${p.city},${p.state}`))
    }
  }, [journeys])

  // Memoize GeoJSON data to prevent unnecessary recalculations
  const geoJsonData = useMemo(() => {
    const customerMax = Math.max(...layers.customers.map(p => p.revenue || 1), 1)
    const shippingMax = Math.max(...layers.shipping.map(p => p.revenue || 1), 1)
    const storeMax = Math.max(...layers.stores.map(p => p.revenue || 1), 1)

    return {
      customers: createGeoJSON(layers.customers, customerMax),
      shipping: createGeoJSON(layers.shipping, shippingMax),
      stores: createGeoJSON(layers.stores, storeMax),
      traffic: createGeoJSON(layers.traffic, 1),
      journeyLines: createJourneyGeoJSON(journeys),
      journeyPoints: createJourneyPointsGeoJSON(journeys),
    }
  }, [layers, journeys])

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not configured')
      return
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN

      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-98, 39], // Center of USA
        zoom: 4,
        minZoom: 2,  // Prevent zooming out too far
        maxZoom: 18, // Allow detailed zoom
        pitch: 45, // Tilt for 3D effect
        bearing: -10, // Slight rotation
        attributionControl: false,
        antialias: true,
        projection: 'globe', // Globe projection for modern look
      })

      map.current = mapInstance

      // Add zoom controls
      mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'bottom-right')

      // Smooth zoom/pan
      mapInstance.scrollZoom.setWheelZoomRate(1/200)
      mapInstance.scrollZoom.enable()
      mapInstance.dragRotate.enable()
      mapInstance.touchZoomRotate.enable()

      mapInstance.on('style.load', () => {
        // Add 3D terrain
        mapInstance.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
        mapInstance.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

        // Atmospheric effects for globe - transparent space to show Matrix rain
        mapInstance.setFog({
          color: 'rgba(0, 8, 0, 0.8)', // Slight green tint
          'high-color': 'rgba(0, 20, 5, 0.6)',
          'horizon-blend': 0.12,
          'space-color': 'rgba(0, 0, 0, 0)', // Transparent to show Matrix
          'star-intensity': 0, // No stars - Matrix provides the background
        })

        // Add prominent state/province boundaries
        mapInstance.addSource('admin-boundaries', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8',
        })

        // State boundaries (admin level 1)
        mapInstance.addLayer({
          id: 'state-boundaries',
          type: 'line',
          source: 'admin-boundaries',
          'source-layer': 'admin',
          filter: ['==', 'admin_level', 1],
          paint: {
            'line-color': 'rgba(0, 255, 100, 0.6)',
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 6, 2, 10, 3],
            'line-dasharray': [2, 1],
          },
        })

        // Country boundaries (admin level 0)
        mapInstance.addLayer({
          id: 'country-boundaries',
          type: 'line',
          source: 'admin-boundaries',
          'source-layer': 'admin',
          filter: ['==', 'admin_level', 0],
          paint: {
            'line-color': 'rgba(0, 255, 100, 0.8)',
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 6, 3, 10, 4],
          },
        })

        // Initialize empty sources for all layers
        mapInstance.addSource('customer-data', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        mapInstance.addSource('shipping-data', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        mapInstance.addSource('store-data', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        mapInstance.addSource('traffic-data', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        // Journey visualization sources
        mapInstance.addSource('journey-lines', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        mapInstance.addSource('journey-points', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        // USPS Distribution Centers (comprehensive list)
        mapInstance.addSource('usps-facilities', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              // Network Distribution Centers (NDCs) - 21 major hubs
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.2437, 33.9425] }, properties: { name: 'Los Angeles NDC', type: 'NDC', city: 'Los Angeles', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.3894, 37.7749] }, properties: { name: 'San Francisco NDC', type: 'NDC', city: 'San Francisco', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.8214, 39.7684] }, properties: { name: 'Denver NDC', type: 'NDC', city: 'Denver', state: 'CO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-96.8716, 32.8998] }, properties: { name: 'Dallas NDC', type: 'NDC', city: 'Coppell', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.434, 29.8168] }, properties: { name: 'Houston NDC', type: 'NDC', city: 'Houston', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.8867, 41.8328] }, properties: { name: 'Chicago NDC', type: 'NDC', city: 'Forest Park', state: 'IL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.1022, 42.4095] }, properties: { name: 'Detroit NDC', type: 'NDC', city: 'Allen Park', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.4473, 33.6407] }, properties: { name: 'Atlanta NDC', type: 'NDC', city: 'Atlanta', state: 'GA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.6879, 30.3322] }, properties: { name: 'Jacksonville NDC', type: 'NDC', city: 'Jacksonville', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.1018, 40.0021] }, properties: { name: 'Philadelphia NDC', type: 'NDC', city: 'Philadelphia', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.0776, 40.6892] }, properties: { name: 'New Jersey NDC', type: 'NDC', city: 'Jersey City', state: 'NJ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.8855, 40.8176] }, properties: { name: 'DVD NDC', type: 'NDC', city: 'Bronx', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-72.5653, 42.1015] }, properties: { name: 'Springfield NDC', type: 'NDC', city: 'Springfield', state: 'MA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.3321, 47.5469] }, properties: { name: 'Seattle NDC', type: 'NDC', city: 'Seattle', state: 'WA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-112.008, 33.4373] }, properties: { name: 'Phoenix NDC', type: 'NDC', city: 'Phoenix', state: 'AZ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-93.1716, 44.8547] }, properties: { name: 'Minneapolis NDC', type: 'NDC', city: 'Eagan', state: 'MN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.3356, 38.7503] }, properties: { name: 'St. Louis NDC', type: 'NDC', city: 'Hazelwood', state: 'MO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-94.6105, 39.0997] }, properties: { name: 'Kansas City NDC', type: 'NDC', city: 'Kansas City', state: 'MO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-89.9711, 35.0624] }, properties: { name: 'Memphis NDC', type: 'NDC', city: 'Memphis', state: 'TN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-79.9714, 40.4568] }, properties: { name: 'Pittsburgh NDC', type: 'NDC', city: 'Pittsburgh', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.6944, 41.4993] }, properties: { name: 'Cleveland NDC', type: 'NDC', city: 'Cleveland', state: 'OH' } },

              // Processing & Distribution Centers (P&DCs) - Major facilities by state
              // Alabama
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.8025, 33.5207] }, properties: { name: 'Birmingham P&DC', type: 'P&DC', city: 'Birmingham', state: 'AL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-88.0399, 30.6954] }, properties: { name: 'Mobile P&DC', type: 'P&DC', city: 'Mobile', state: 'AL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.2999, 32.3792] }, properties: { name: 'Montgomery P&DC', type: 'P&DC', city: 'Montgomery', state: 'AL' } },
              // Alaska
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-149.9003, 61.2181] }, properties: { name: 'Anchorage P&DC', type: 'P&DC', city: 'Anchorage', state: 'AK' } },
              // Arizona
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-110.9747, 32.2226] }, properties: { name: 'Tucson P&DC', type: 'P&DC', city: 'Tucson', state: 'AZ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-111.9391, 33.4152] }, properties: { name: 'Phoenix P&DC', type: 'P&DC', city: 'Phoenix', state: 'AZ' } },
              // Arkansas
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-92.2896, 34.7465] }, properties: { name: 'Little Rock P&DC', type: 'P&DC', city: 'Little Rock', state: 'AR' } },
              // California
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-117.1611, 32.7157] }, properties: { name: 'San Diego P&DC', type: 'P&DC', city: 'San Diego', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-117.8265, 33.6846] }, properties: { name: 'Santa Ana P&DC', type: 'P&DC', city: 'Santa Ana', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.1937, 33.7701] }, properties: { name: 'Long Beach P&DC', type: 'P&DC', city: 'Long Beach', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.4085, 34.0195] }, properties: { name: 'Santa Monica P&DC', type: 'P&DC', city: 'Los Angeles', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.3287, 34.0928] }, properties: { name: 'Hollywood P&DC', type: 'P&DC', city: 'Los Angeles', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-117.3948, 33.9533] }, properties: { name: 'Riverside P&DC', type: 'P&DC', city: 'Riverside', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-119.7871, 36.7378] }, properties: { name: 'Fresno P&DC', type: 'P&DC', city: 'Fresno', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-119.0187, 35.3733] }, properties: { name: 'Bakersfield P&DC', type: 'P&DC', city: 'Bakersfield', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-121.8863, 37.3382] }, properties: { name: 'San Jose P&DC', type: 'P&DC', city: 'San Jose', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.0322, 37.5485] }, properties: { name: 'Oakland P&DC', type: 'P&DC', city: 'Oakland', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-121.4944, 38.5816] }, properties: { name: 'Sacramento P&DC', type: 'P&DC', city: 'Sacramento', state: 'CA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-121.2908, 37.9577] }, properties: { name: 'Stockton P&DC', type: 'P&DC', city: 'Stockton', state: 'CA' } },
              // Colorado
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.9903, 39.7392] }, properties: { name: 'Denver P&DC', type: 'P&DC', city: 'Denver', state: 'CO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.8214, 38.8339] }, properties: { name: 'Colorado Springs P&DC', type: 'P&DC', city: 'Colorado Springs', state: 'CO' } },
              // Connecticut
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-72.9279, 41.3083] }, properties: { name: 'New Haven P&DC', type: 'P&DC', city: 'New Haven', state: 'CT' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-72.6851, 41.7658] }, properties: { name: 'Hartford P&DC', type: 'P&DC', city: 'Hartford', state: 'CT' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.2048, 41.1865] }, properties: { name: 'Stamford P&DC', type: 'P&DC', city: 'Stamford', state: 'CT' } },
              // Delaware
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.5277, 39.7391] }, properties: { name: 'Wilmington P&DC', type: 'P&DC', city: 'Wilmington', state: 'DE' } },
              // Florida
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.2994, 25.8003] }, properties: { name: 'Miami P&DC', type: 'P&DC', city: 'Miami', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.1918, 25.7617] }, properties: { name: 'Miami Beach P&DC', type: 'P&DC', city: 'Miami Beach', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.0577, 26.7153] }, properties: { name: 'West Palm Beach P&DC', type: 'P&DC', city: 'West Palm Beach', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.1373, 26.1224] }, properties: { name: 'Fort Lauderdale P&DC', type: 'P&DC', city: 'Fort Lauderdale', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-82.5093, 27.9758] }, properties: { name: 'Tampa P&DC', type: 'P&DC', city: 'Tampa', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-82.4572, 27.3364] }, properties: { name: 'Sarasota P&DC', type: 'P&DC', city: 'Sarasota', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.6557, 30.3322] }, properties: { name: 'Jacksonville P&DC', type: 'P&DC', city: 'Jacksonville', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.3792, 28.5383] }, properties: { name: 'Orlando P&DC', type: 'P&DC', city: 'Orlando', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.9564, 26.6406] }, properties: { name: 'Fort Myers P&DC', type: 'P&DC', city: 'Fort Myers', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.2807, 30.4383] }, properties: { name: 'Tallahassee P&DC', type: 'P&DC', city: 'Tallahassee', state: 'FL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.217, 30.4213] }, properties: { name: 'Pensacola P&DC', type: 'P&DC', city: 'Pensacola', state: 'FL' } },
              // Georgia
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.388, 33.749] }, properties: { name: 'Atlanta P&DC', type: 'P&DC', city: 'Atlanta', state: 'GA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.0998, 32.0809] }, properties: { name: 'Savannah P&DC', type: 'P&DC', city: 'Savannah', state: 'GA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.6324, 32.8407] }, properties: { name: 'Macon P&DC', type: 'P&DC', city: 'Macon', state: 'GA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-82.0107, 33.4735] }, properties: { name: 'Augusta P&DC', type: 'P&DC', city: 'Augusta', state: 'GA' } },
              // Hawaii
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-157.8583, 21.3069] }, properties: { name: 'Honolulu P&DC', type: 'P&DC', city: 'Honolulu', state: 'HI' } },
              // Idaho
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-116.2023, 43.6150] }, properties: { name: 'Boise P&DC', type: 'P&DC', city: 'Boise', state: 'ID' } },
              // Illinois
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.6501, 41.8500] }, properties: { name: 'Chicago P&DC', type: 'P&DC', city: 'Chicago', state: 'IL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-88.3001, 41.8528] }, properties: { name: 'Carol Stream P&DC', type: 'P&DC', city: 'Carol Stream', state: 'IL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-89.6501, 39.8017] }, properties: { name: 'Springfield IL P&DC', type: 'P&DC', city: 'Springfield', state: 'IL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-89.0940, 42.2711] }, properties: { name: 'Rockford P&DC', type: 'P&DC', city: 'Rockford', state: 'IL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.5709, 41.5067] }, properties: { name: 'Quad Cities P&DC', type: 'P&DC', city: 'Moline', state: 'IL' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-89.6442, 40.6936] }, properties: { name: 'Peoria P&DC', type: 'P&DC', city: 'Peoria', state: 'IL' } },
              // Indiana
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.1581, 39.7684] }, properties: { name: 'Indianapolis P&DC', type: 'P&DC', city: 'Indianapolis', state: 'IN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-85.1394, 41.0793] }, properties: { name: 'Fort Wayne P&DC', type: 'P&DC', city: 'Fort Wayne', state: 'IN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.2520, 41.6764] }, properties: { name: 'South Bend P&DC', type: 'P&DC', city: 'South Bend', state: 'IN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.5089, 41.4925] }, properties: { name: 'Gary P&DC', type: 'P&DC', city: 'Gary', state: 'IN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.4139, 39.4667] }, properties: { name: 'Terre Haute P&DC', type: 'P&DC', city: 'Terre Haute', state: 'IN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-85.7585, 38.2527] }, properties: { name: 'Evansville P&DC', type: 'P&DC', city: 'Evansville', state: 'IN' } },
              // Iowa
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-93.6091, 41.5868] }, properties: { name: 'Des Moines P&DC', type: 'P&DC', city: 'Des Moines', state: 'IA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-91.6656, 41.9779] }, properties: { name: 'Cedar Rapids P&DC', type: 'P&DC', city: 'Cedar Rapids', state: 'IA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.5885, 41.5236] }, properties: { name: 'Davenport P&DC', type: 'P&DC', city: 'Davenport', state: 'IA' } },
              // Kansas
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.3301, 37.6872] }, properties: { name: 'Wichita P&DC', type: 'P&DC', city: 'Wichita', state: 'KS' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.6890, 39.0558] }, properties: { name: 'Topeka P&DC', type: 'P&DC', city: 'Topeka', state: 'KS' } },
              // Kentucky
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-85.7585, 38.2527] }, properties: { name: 'Louisville P&DC', type: 'P&DC', city: 'Louisville', state: 'KY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.5037, 38.0406] }, properties: { name: 'Lexington P&DC', type: 'P&DC', city: 'Lexington', state: 'KY' } },
              // Louisiana
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.0715, 29.9511] }, properties: { name: 'New Orleans P&DC', type: 'P&DC', city: 'New Orleans', state: 'LA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-91.1871, 30.4515] }, properties: { name: 'Baton Rouge P&DC', type: 'P&DC', city: 'Baton Rouge', state: 'LA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-93.7502, 32.5252] }, properties: { name: 'Shreveport P&DC', type: 'P&DC', city: 'Shreveport', state: 'LA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-92.0198, 30.2241] }, properties: { name: 'Lafayette P&DC', type: 'P&DC', city: 'Lafayette', state: 'LA' } },
              // Maine
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-70.2553, 43.6591] }, properties: { name: 'Portland ME P&DC', type: 'P&DC', city: 'Portland', state: 'ME' } },
              // Maryland
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.6122, 39.2904] }, properties: { name: 'Baltimore P&DC', type: 'P&DC', city: 'Baltimore', state: 'MD' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.8867, 39.0458] }, properties: { name: 'Southern MD P&DC', type: 'P&DC', city: 'Capitol Heights', state: 'MD' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.6413, 39.4015] }, properties: { name: 'Linthicum P&DC', type: 'P&DC', city: 'Linthicum', state: 'MD' } },
              // Massachusetts
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.0589, 42.3601] }, properties: { name: 'Boston P&DC', type: 'P&DC', city: 'Boston', state: 'MA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.8023, 42.2626] }, properties: { name: 'Worcester P&DC', type: 'P&DC', city: 'Worcester', state: 'MA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-72.5898, 42.1015] }, properties: { name: 'Springfield MA P&DC', type: 'P&DC', city: 'Springfield', state: 'MA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.2824, 42.4473] }, properties: { name: 'Waltham P&DC', type: 'P&DC', city: 'Waltham', state: 'MA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-70.9342, 41.6362] }, properties: { name: 'Brockton P&DC', type: 'P&DC', city: 'Brockton', state: 'MA' } },
              // Michigan
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.0458, 42.3314] }, properties: { name: 'Detroit P&DC', type: 'P&DC', city: 'Detroit', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.7430, 42.2808] }, properties: { name: 'Ann Arbor P&DC', type: 'P&DC', city: 'Ann Arbor', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-85.6681, 42.9634] }, properties: { name: 'Grand Rapids P&DC', type: 'P&DC', city: 'Grand Rapids', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.6875, 43.0125] }, properties: { name: 'Flint P&DC', type: 'P&DC', city: 'Flint', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.5555, 42.7325] }, properties: { name: 'Lansing P&DC', type: 'P&DC', city: 'Lansing', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.2520, 41.9253] }, properties: { name: 'Kalamazoo P&DC', type: 'P&DC', city: 'Kalamazoo', state: 'MI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.9508, 43.4195] }, properties: { name: 'Saginaw P&DC', type: 'P&DC', city: 'Saginaw', state: 'MI' } },
              // Minnesota
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-93.0938, 44.9537] }, properties: { name: 'St Paul P&DC', type: 'P&DC', city: 'Saint Paul', state: 'MN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-93.2650, 44.9778] }, properties: { name: 'Minneapolis P&DC', type: 'P&DC', city: 'Minneapolis', state: 'MN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-92.1005, 46.7867] }, properties: { name: 'Duluth P&DC', type: 'P&DC', city: 'Duluth', state: 'MN' } },
              // Mississippi
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.1848, 32.2988] }, properties: { name: 'Jackson MS P&DC', type: 'P&DC', city: 'Jackson', state: 'MS' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-88.8840, 30.3674] }, properties: { name: 'Gulfport P&DC', type: 'P&DC', city: 'Gulfport', state: 'MS' } },
              // Missouri
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.1994, 38.6270] }, properties: { name: 'St Louis P&DC', type: 'P&DC', city: 'St Louis', state: 'MO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-94.5786, 39.0997] }, properties: { name: 'Kansas City MO P&DC', type: 'P&DC', city: 'Kansas City', state: 'MO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-93.2923, 37.2090] }, properties: { name: 'Springfield MO P&DC', type: 'P&DC', city: 'Springfield', state: 'MO' } },
              // Montana
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-108.5007, 45.7833] }, properties: { name: 'Billings P&DC', type: 'P&DC', city: 'Billings', state: 'MT' } },
              // Nebraska
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.9345, 41.2565] }, properties: { name: 'Omaha P&DC', type: 'P&DC', city: 'Omaha', state: 'NE' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-96.6852, 40.8258] }, properties: { name: 'Lincoln P&DC', type: 'P&DC', city: 'Lincoln', state: 'NE' } },
              // Nevada
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-115.1398, 36.1699] }, properties: { name: 'Las Vegas P&DC', type: 'P&DC', city: 'Las Vegas', state: 'NV' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-119.8138, 39.5296] }, properties: { name: 'Reno P&DC', type: 'P&DC', city: 'Reno', state: 'NV' } },
              // New Hampshire
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.4548, 42.9956] }, properties: { name: 'Manchester NH P&DC', type: 'P&DC', city: 'Manchester', state: 'NH' } },
              // New Jersey
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.1724, 40.7357] }, properties: { name: 'Newark P&DC', type: 'P&DC', city: 'Newark', state: 'NJ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.0776, 40.7282] }, properties: { name: 'Jersey City P&DC', type: 'P&DC', city: 'Jersey City', state: 'NJ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.6672, 40.3573] }, properties: { name: 'Trenton P&DC', type: 'P&DC', city: 'Trenton', state: 'NJ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.1199, 39.9526] }, properties: { name: 'South Jersey P&DC', type: 'P&DC', city: 'Bellmawr', state: 'NJ' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.4057, 40.4774] }, properties: { name: 'Kilmer P&DC', type: 'P&DC', city: 'Edison', state: 'NJ' } },
              // New Mexico
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-106.6504, 35.0844] }, properties: { name: 'Albuquerque P&DC', type: 'P&DC', city: 'Albuquerque', state: 'NM' } },
              // New York
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.9712, 40.7831] }, properties: { name: 'Manhattan P&DC', type: 'P&DC', city: 'New York', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.9442, 40.6501] }, properties: { name: 'Brooklyn P&DC', type: 'P&DC', city: 'Brooklyn', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.8479, 40.7282] }, properties: { name: 'Flushing P&DC', type: 'P&DC', city: 'Flushing', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.7854, 40.6413] }, properties: { name: 'Jamaica P&DC', type: 'P&DC', city: 'Jamaica', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.2137, 40.7587] }, properties: { name: 'Long Island P&DC', type: 'P&DC', city: 'Melville', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.8855, 41.0534] }, properties: { name: 'White Plains P&DC', type: 'P&DC', city: 'White Plains', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.7562, 42.6526] }, properties: { name: 'Albany P&DC', type: 'P&DC', city: 'Albany', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.1474, 43.0481] }, properties: { name: 'Syracuse P&DC', type: 'P&DC', city: 'Syracuse', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-77.6109, 43.1566] }, properties: { name: 'Rochester P&DC', type: 'P&DC', city: 'Rochester', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-78.8784, 42.8864] }, properties: { name: 'Buffalo P&DC', type: 'P&DC', city: 'Buffalo', state: 'NY' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.4557, 43.2128] }, properties: { name: 'Utica P&DC', type: 'P&DC', city: 'Utica', state: 'NY' } },
              // North Carolina
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.8431, 35.2271] }, properties: { name: 'Charlotte P&DC', type: 'P&DC', city: 'Charlotte', state: 'NC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-78.6382, 35.7796] }, properties: { name: 'Raleigh P&DC', type: 'P&DC', city: 'Raleigh', state: 'NC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-79.7920, 36.0726] }, properties: { name: 'Greensboro P&DC', type: 'P&DC', city: 'Greensboro', state: 'NC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.2442, 36.0999] }, properties: { name: 'Winston-Salem P&DC', type: 'P&DC', city: 'Winston-Salem', state: 'NC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-77.9447, 34.2257] }, properties: { name: 'Wilmington NC P&DC', type: 'P&DC', city: 'Wilmington', state: 'NC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-82.5515, 35.5951] }, properties: { name: 'Asheville P&DC', type: 'P&DC', city: 'Asheville', state: 'NC' } },
              // North Dakota
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-96.7898, 46.8772] }, properties: { name: 'Fargo P&DC', type: 'P&DC', city: 'Fargo', state: 'ND' } },
              // Ohio
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.6944, 41.4993] }, properties: { name: 'Cleveland P&DC', type: 'P&DC', city: 'Cleveland', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-82.9988, 39.9612] }, properties: { name: 'Columbus P&DC', type: 'P&DC', city: 'Columbus', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.5120, 39.1031] }, properties: { name: 'Cincinnati P&DC', type: 'P&DC', city: 'Cincinnati', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-84.1916, 39.7589] }, properties: { name: 'Dayton P&DC', type: 'P&DC', city: 'Dayton', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.5190, 41.0814] }, properties: { name: 'Akron P&DC', type: 'P&DC', city: 'Akron', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.5552, 41.6528] }, properties: { name: 'Toledo P&DC', type: 'P&DC', city: 'Toledo', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.6665, 41.0998] }, properties: { name: 'Youngstown P&DC', type: 'P&DC', city: 'Youngstown', state: 'OH' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.3789, 40.7989] }, properties: { name: 'Canton P&DC', type: 'P&DC', city: 'Canton', state: 'OH' } },
              // Oklahoma
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.5164, 35.4676] }, properties: { name: 'Oklahoma City P&DC', type: 'P&DC', city: 'Oklahoma City', state: 'OK' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.9928, 36.1540] }, properties: { name: 'Tulsa P&DC', type: 'P&DC', city: 'Tulsa', state: 'OK' } },
              // Oregon
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.6765, 45.5231] }, properties: { name: 'Portland OR P&DC', type: 'P&DC', city: 'Portland', state: 'OR' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-123.0868, 44.0521] }, properties: { name: 'Eugene P&DC', type: 'P&DC', city: 'Eugene', state: 'OR' } },
              // Pennsylvania
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.1652, 39.9526] }, properties: { name: 'Philadelphia P&DC', type: 'P&DC', city: 'Philadelphia', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-79.9959, 40.4406] }, properties: { name: 'Pittsburgh P&DC', type: 'P&DC', city: 'Pittsburgh', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.8844, 40.2732] }, properties: { name: 'Harrisburg P&DC', type: 'P&DC', city: 'Harrisburg', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.4714, 40.6084] }, properties: { name: 'Lehigh Valley P&DC', type: 'P&DC', city: 'Bethlehem', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.8913, 41.4090] }, properties: { name: 'Scranton P&DC', type: 'P&DC', city: 'Scranton', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.3055, 40.0379] }, properties: { name: 'Lancaster P&DC', type: 'P&DC', city: 'Lancaster', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.0851, 42.1292] }, properties: { name: 'Erie P&DC', type: 'P&DC', city: 'Erie', state: 'PA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.9279, 40.3357] }, properties: { name: 'Reading P&DC', type: 'P&DC', city: 'Reading', state: 'PA' } },
              // Rhode Island
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-71.4128, 41.8240] }, properties: { name: 'Providence P&DC', type: 'P&DC', city: 'Providence', state: 'RI' } },
              // South Carolina
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.0348, 34.0007] }, properties: { name: 'Columbia SC P&DC', type: 'P&DC', city: 'Columbia', state: 'SC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-79.9311, 32.7765] }, properties: { name: 'Charleston P&DC', type: 'P&DC', city: 'Charleston', state: 'SC' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-82.3940, 34.8526] }, properties: { name: 'Greenville P&DC', type: 'P&DC', city: 'Greenville', state: 'SC' } },
              // South Dakota
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-96.7311, 43.5460] }, properties: { name: 'Sioux Falls P&DC', type: 'P&DC', city: 'Sioux Falls', state: 'SD' } },
              // Tennessee
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-86.7816, 36.1627] }, properties: { name: 'Nashville P&DC', type: 'P&DC', city: 'Nashville', state: 'TN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-90.0490, 35.1495] }, properties: { name: 'Memphis P&DC', type: 'P&DC', city: 'Memphis', state: 'TN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-83.9207, 35.9606] }, properties: { name: 'Knoxville P&DC', type: 'P&DC', city: 'Knoxville', state: 'TN' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-85.3097, 35.0456] }, properties: { name: 'Chattanooga P&DC', type: 'P&DC', city: 'Chattanooga', state: 'TN' } },
              // Texas
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-96.7970, 32.7767] }, properties: { name: 'Dallas P&DC', type: 'P&DC', city: 'Dallas', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.3308, 32.7555] }, properties: { name: 'Fort Worth P&DC', type: 'P&DC', city: 'Fort Worth', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.3698, 29.7604] }, properties: { name: 'Houston P&DC', type: 'P&DC', city: 'Houston', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-95.2353, 29.9844] }, properties: { name: 'North Houston P&DC', type: 'P&DC', city: 'Houston', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-98.4936, 29.4241] }, properties: { name: 'San Antonio P&DC', type: 'P&DC', city: 'San Antonio', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.7431, 30.2672] }, properties: { name: 'Austin P&DC', type: 'P&DC', city: 'Austin', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-106.4850, 31.7619] }, properties: { name: 'El Paso P&DC', type: 'P&DC', city: 'El Paso', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.1081, 32.7357] }, properties: { name: 'Arlington P&DC', type: 'P&DC', city: 'Arlington', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.4395, 25.9017] }, properties: { name: 'McAllen P&DC', type: 'P&DC', city: 'McAllen', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-97.3964, 27.8006] }, properties: { name: 'Corpus Christi P&DC', type: 'P&DC', city: 'Corpus Christi', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-101.8313, 35.2220] }, properties: { name: 'Amarillo P&DC', type: 'P&DC', city: 'Amarillo', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-101.8552, 33.5779] }, properties: { name: 'Lubbock P&DC', type: 'P&DC', city: 'Lubbock', state: 'TX' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-96.7665, 32.9545] }, properties: { name: 'North Texas P&DC', type: 'P&DC', city: 'Coppell', state: 'TX' } },
              // Utah
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-111.8910, 40.7608] }, properties: { name: 'Salt Lake City P&DC', type: 'P&DC', city: 'Salt Lake City', state: 'UT' } },
              // Vermont
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.2121, 44.4759] }, properties: { name: 'Burlington P&DC', type: 'P&DC', city: 'Burlington', state: 'VT' } },
              // Virginia
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-77.4360, 37.5407] }, properties: { name: 'Richmond P&DC', type: 'P&DC', city: 'Richmond', state: 'VA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-76.2859, 36.8508] }, properties: { name: 'Norfolk P&DC', type: 'P&DC', city: 'Norfolk', state: 'VA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-77.0469, 38.9072] }, properties: { name: 'Northern VA P&DC', type: 'P&DC', city: 'Merrifield', state: 'VA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-79.9414, 37.2710] }, properties: { name: 'Roanoke P&DC', type: 'P&DC', city: 'Roanoke', state: 'VA' } },
              // Washington
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.3321, 47.6062] }, properties: { name: 'Seattle P&DC', type: 'P&DC', city: 'Seattle', state: 'WA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.2015, 47.6101] }, properties: { name: 'Bellevue P&DC', type: 'P&DC', city: 'Bellevue', state: 'WA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.4443, 47.2529] }, properties: { name: 'Tacoma P&DC', type: 'P&DC', city: 'Tacoma', state: 'WA' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-117.4260, 47.6587] }, properties: { name: 'Spokane P&DC', type: 'P&DC', city: 'Spokane', state: 'WA' } },
              // West Virginia
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-81.6326, 38.3498] }, properties: { name: 'Charleston WV P&DC', type: 'P&DC', city: 'Charleston', state: 'WV' } },
              // Wisconsin
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-87.9065, 43.0389] }, properties: { name: 'Milwaukee P&DC', type: 'P&DC', city: 'Milwaukee', state: 'WI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-89.4012, 43.0731] }, properties: { name: 'Madison P&DC', type: 'P&DC', city: 'Madison', state: 'WI' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-88.0198, 44.5192] }, properties: { name: 'Green Bay P&DC', type: 'P&DC', city: 'Green Bay', state: 'WI' } },
              // Wyoming
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.8202, 41.1400] }, properties: { name: 'Cheyenne P&DC', type: 'P&DC', city: 'Cheyenne', state: 'WY' } },
              // Puerto Rico
              { type: 'Feature', geometry: { type: 'Point', coordinates: [-66.1057, 18.4655] }, properties: { name: 'San Juan P&DC', type: 'P&DC', city: 'San Juan', state: 'PR' } },
            ],
          },
        })

        // Add all layers upfront (will be empty initially)
        addAllLayers(mapInstance)

        layersInitialized.current = true
        setMapLoaded(true)

        // Smooth intro animation
        setTimeout(() => {
          mapInstance.flyTo({
            center: [-95, 38],
            zoom: 4.5,
            pitch: 50,
            bearing: 0,
            duration: 3000,
            essential: true,
          })
        }, 500)
      })

      mapInstance.on('error', (e) => {
        // Only log errors with actual error content (suppress empty tile errors)
        if (e.error?.message) {
          console.error('Map error:', e.error.message)
        }
      })

    } catch (err) {
      console.error('Map init error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize map')
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
        layersInitialized.current = false
      }
    }
  }, [])

  // Update data without re-creating layers (prevents flickering)
  useEffect(() => {
    if (!map.current || !mapLoaded || !layersInitialized.current) return

    const m = map.current

    // Update sources with new data (no layer recreation!)
    const customerSource = m.getSource('customer-data') as mapboxgl.GeoJSONSource
    const shippingSource = m.getSource('shipping-data') as mapboxgl.GeoJSONSource
    const storeSource = m.getSource('store-data') as mapboxgl.GeoJSONSource
    const trafficSource = m.getSource('traffic-data') as mapboxgl.GeoJSONSource
    const journeyLinesSource = m.getSource('journey-lines') as mapboxgl.GeoJSONSource
    const journeyPointsSource = m.getSource('journey-points') as mapboxgl.GeoJSONSource

    if (customerSource) customerSource.setData(geoJsonData.customers)
    if (shippingSource) shippingSource.setData(geoJsonData.shipping)
    if (storeSource) storeSource.setData(geoJsonData.stores)
    if (trafficSource) trafficSource.setData(geoJsonData.traffic)
    if (journeyLinesSource) journeyLinesSource.setData(geoJsonData.journeyLines)
    if (journeyPointsSource) journeyPointsSource.setData(geoJsonData.journeyPoints)

  }, [mapLoaded, geoJsonData])

  // Handle visibility changes without recreating layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !layersInitialized.current) return

    const m = map.current

    // Toggle layer visibility
    const setLayerVisibility = (layerIds: string[], visible: boolean) => {
      layerIds.forEach(id => {
        if (m.getLayer(id)) {
          m.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
        }
      })
    }

    setLayerVisibility(['customers-heat', 'customers', 'customers-glow'], visibleLayers.customers)
    setLayerVisibility(['shipping-heat', 'shipping', 'shipping-glow'], visibleLayers.shipping)
    setLayerVisibility(['stores-glow', 'stores', 'stores-pulse'], visibleLayers.stores)
    setLayerVisibility(['traffic-heat', 'traffic', 'traffic-glow', 'traffic-city-aggregate', 'traffic-city-aggregate-label'], visibleLayers.traffic)
    setLayerVisibility(['usps-glow', 'usps-facilities', 'usps-labels'], visibleLayers.usps)
    setLayerVisibility(['journey-lines', 'journey-lines-glow', 'journey-points', 'journey-points-glow'], visibleLayers.journeys)

  }, [mapLoaded, visibleLayers])

  // Adaptive brightness - dark by default, lightens as user zooms in
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    const m = map.current

    const updateBrightness = () => {
      const zoom = m.getZoom()
      // Zoom 3-4: dark (0.35), Zoom 8+: brighter (0.8)
      const brightness = Math.min(0.8, Math.max(0.35, 0.35 + (zoom - 4) * 0.1))
      const saturation = Math.min(0, Math.max(-0.4, -0.4 + (zoom - 4) * 0.08))

      const style = m.getStyle()
      if (!style?.layers) return

      style.layers.forEach(layer => {
        if (layer.type === 'raster' && layer.id.includes('satellite')) {
          try {
            m.setPaintProperty(layer.id, 'raster-brightness-max', brightness)
            m.setPaintProperty(layer.id, 'raster-saturation', saturation)
          } catch (err) {
            // Layer might not support these properties
          }
        }
      })

      // Adjust fog based on zoom too
      const fogOpacity = Math.max(0.6, 0.9 - (zoom - 4) * 0.05)
      m.setFog({
        color: `rgba(0, 5, 0, ${fogOpacity})`,
        'high-color': `rgba(0, 10, 5, ${fogOpacity * 0.8})`,
        'horizon-blend': 0.12,
        'space-color': 'rgba(0, 0, 0, 0)',
        'star-intensity': 0,
      })
    }

    // Set initial dark state
    updateBrightness()

    // Update on zoom
    m.on('zoom', updateBrightness)

    return () => {
      m.off('zoom', updateBrightness)
    }
  }, [mapLoaded])

  // Click handlers setup (once)
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const m = map.current

    const createPopup = (e: mapboxgl.MapLayerMouseEvent, layerId: string, color: string) => {
      if (!e.features?.[0]) return
      const feature = e.features[0]
      if (!feature.geometry || feature.geometry.type !== 'Point') return

      const props = feature.properties || {}
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]

      let content = ''
      if (layerId === 'stores') {
        content = `
          <div class="map-popup" style="min-width: 240px;">
            <div class="popup-header" style="color: ${color}">${props.name || 'STORE'}</div>
            <div class="popup-location">${props.city}, ${props.state}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">ORDERS</span>
                <span style="font-size: 14px; color: #fff;">${props.orders?.toLocaleString() || 0}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">REVENUE</span>
                <span style="font-size: 14px; color: ${color};">$${Math.round(props.revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        `
      } else if (layerId === 'customers') {
        const customerName = props.customerName || 'Customer'
        const totalOrders = props.totalOrders || props.orders || 0
        const totalSpent = props.totalSpent || props.revenue || 0
        content = `
          <div class="map-popup" style="min-width: 280px;">
            <div class="popup-header" style="color: ${color}">CUSTOMER</div>
            ${customerName ? `<div style="font-size: 14px; color: #fff; font-weight: 500; margin: 6px 0;">${customerName}</div>` : ''}
            ${props.customerEmail ? `<div style="font-size: 11px; color: #60a5fa; margin-bottom: 2px;">${props.customerEmail}</div>` : ''}
            ${props.customerPhone ? `<div style="font-size: 11px; color: #a1a1aa; margin-bottom: 8px;">${props.customerPhone}</div>` : ''}
            <div class="popup-location" style="margin-bottom: 10px;">${props.address ? `${props.address}, ` : ''}${props.city ? `${props.city}, ` : ''}${props.state || ''}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">TOTAL ORDERS</span>
                <span style="font-size: 14px; color: #fff;">${totalOrders}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">TOTAL SPENT</span>
                <span style="font-size: 14px; color: ${color};">$${Math.round(totalSpent).toLocaleString()}</span>
              </div>
            </div>
          </div>
        `
      } else if (layerId === 'shipping') {
        const statusColors: Record<string, string> = {
          'delivered': '#22c55e', 'shipped': '#22d3ee', 'pending': '#fbbf24', 'confirmed': '#a855f7',
        }
        const statusColor = statusColors[props.orderStatus] || '#a1a1aa'
        const statusLabel = (props.orderStatus || 'order').toUpperCase()
        content = `
          <div class="map-popup" style="min-width: 280px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div class="popup-header" style="color: ${color}; margin: 0;">SHIPPING ORDER</div>
              <span style="margin-left: auto; font-size: 10px; color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
            </div>
            ${props.customerName ? `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 8px -4px 10px -4px;">
              <div style="font-size: 9px; color: #71717a; letter-spacing: 0.05em; margin-bottom: 4px;">SHIP TO</div>
              <div style="font-size: 12px; color: #fff; font-weight: 500;">${props.customerName}</div>
              ${props.customerEmail ? `<div style="font-size: 10px; color: #60a5fa; margin-top: 2px;">${props.customerEmail}</div>` : ''}
              ${props.customerPhone ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">${props.customerPhone}</div>` : ''}
              ${props.address ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 4px;">${props.address}, ${props.city}, ${props.state}</div>` : ''}
            </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">ORDER</span>
                <span style="font-size: 12px; color: #fff;">${props.orderNumber ? `#${props.orderNumber.slice(0,12)}...` : 'N/A'}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">TOTAL</span>
                <span style="font-size: 12px; color: #22c55e;">$${parseFloat(props.revenue || 0).toFixed(2)}</span>
              </div>
            </div>
            ${props.orderDate ? `<div style="font-size: 10px; color: #71717a;">Ordered: ${new Date(props.orderDate).toLocaleDateString()}</div>` : ''}
          </div>
        `
      } else if (layerId === 'traffic') {
        // Channel colors
        const channelColors: Record<string, string> = {
          'direct': '#60a5fa',
          'organic': '#22c55e',
          'social': '#ec4899',
          'paid': '#f59e0b',
          'email': '#a78bfa',
          'referral': '#14b8a6',
        }
        const channelColor = channelColors[props.channel] || '#a1a1aa'
        const channelLabel = (props.channel || 'direct').toUpperCase()

        // Parse referrer domain
        let referrerDomain = ''
        if (props.referrer) {
          try { referrerDomain = new URL(props.referrer).hostname.replace('www.', '') } catch {}
        }

        // Session activity data
        const pageViews = parseInt(props.pageViews) || 0
        const productViews = parseInt(props.productViews) || 0
        const addToCarts = parseInt(props.addToCarts) || 0
        const purchases = parseInt(props.purchases) || 0
        const sessionRevenue = parseFloat(props.sessionRevenue) || 0
        const hasActivity = pageViews > 0 || productViews > 0 || addToCarts > 0 || purchases > 0
        const converted = purchases > 0

        content = `
          <div class="map-popup" style="min-width: 300px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div class="popup-header" style="color: ${color}; margin: 0;">VISITOR</div>
              ${props.isReturning === 'true' || props.isReturning === true ?
                `<span style="font-size: 9px; padding: 2px 6px; background: rgba(139, 92, 246, 0.2); color: #a78bfa; border-radius: 2px;">RETURNING</span>` :
                `<span style="font-size: 9px; padding: 2px 6px; background: rgba(34, 197, 94, 0.2); color: #22c55e; border-radius: 2px;">NEW</span>`}
              ${converted ? `<span style="font-size: 9px; padding: 2px 6px; background: rgba(34, 197, 94, 0.3); color: #22c55e; border-radius: 2px;">CONVERTED</span>` : ''}
              <span style="margin-left: auto; font-size: 10px; color: ${channelColor}; font-weight: 600;">${channelLabel}</span>
            </div>

            <div class="popup-location" style="font-size: 13px; color: #fff; margin-bottom: 10px;">
              ${props.city ? `${props.city}, ${props.state}` : (props.state || 'Unknown')}${props.country ? ` (${props.country})` : ''}
            </div>

            ${hasActivity ? `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; margin: 0 -4px 10px -4px;">
              <div style="font-size: 9px; color: #71717a; letter-spacing: 0.05em; margin-bottom: 8px;">SESSION ACTIVITY</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                ${pageViews > 0 ? `<div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                  <span style="font-size: 12px; color: #fff; font-weight: 600;">${pageViews}</span>
                  <span style="font-size: 9px; color: #a1a1aa;">pages</span>
                </div>` : ''}
                ${productViews > 0 ? `<div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(139, 92, 246, 0.15); border-radius: 3px;">
                  <span style="font-size: 12px; color: #a78bfa; font-weight: 600;">${productViews}</span>
                  <span style="font-size: 9px; color: #a1a1aa;">products</span>
                </div>` : ''}
                ${addToCarts > 0 ? `<div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(59, 130, 246, 0.15); border-radius: 3px;">
                  <span style="font-size: 12px; color: #60a5fa; font-weight: 600;">${addToCarts}</span>
                  <span style="font-size: 9px; color: #a1a1aa;">cart adds</span>
                </div>` : ''}
                ${purchases > 0 ? `<div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(34, 197, 94, 0.2); border-radius: 3px;">
                  <span style="font-size: 12px; color: #22c55e; font-weight: 600;">${purchases}</span>
                  <span style="font-size: 9px; color: #a1a1aa;">purchase${purchases > 1 ? 's' : ''}</span>
                </div>` : ''}
              </div>
              ${sessionRevenue > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1);">
                <span style="font-size: 10px; color: #71717a;">Session Revenue</span>
                <span style="font-size: 14px; color: #22c55e; font-weight: 600;">$${sessionRevenue.toFixed(2)}</span>
              </div>` : ''}
            </div>
            ` : ''}

            ${props.landingPage ? `
            <div style="margin-bottom: 10px;">
              <div style="font-size: 9px; color: #71717a; margin-bottom: 4px;">LANDING PAGE</div>
              <div style="font-size: 11px; color: #60a5fa; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${props.landingPage}</div>
            </div>
            ` : ''}

            ${(props.utmSource || props.utmCampaign || referrerDomain) ? `
            <div style="background: rgba(255,255,255,0.03); padding: 10px; margin: 0 -4px 10px -4px;">
              <div style="font-size: 9px; color: #71717a; letter-spacing: 0.05em; margin-bottom: 6px;">ACQUISITION SOURCE</div>
              ${props.utmSource ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 10px; color: #a1a1aa;">Source</span>
                <span style="font-size: 10px; color: #fff; font-weight: 500;">${props.utmSource}</span>
              </div>` : ''}
              ${props.utmMedium ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 10px; color: #a1a1aa;">Medium</span>
                <span style="font-size: 10px; color: #fff;">${props.utmMedium}</span>
              </div>` : ''}
              ${props.utmCampaign ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 10px; color: #a1a1aa;">Campaign</span>
                <span style="font-size: 10px; color: #fbbf24;">${props.utmCampaign}</span>
              </div>` : ''}
              ${referrerDomain ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 10px; color: #a1a1aa;">Referrer</span>
                <span style="font-size: 10px; color: #60a5fa;">${referrerDomain}</span>
              </div>` : ''}
            </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.03); padding: 6px; text-align: center;">
                <span style="font-size: 8px; color: #71717a; display: block;">DEVICE</span>
                <span style="font-size: 10px; color: #fff;">${(props.device || 'unknown').charAt(0).toUpperCase() + (props.device || 'unknown').slice(1)}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 6px; text-align: center;">
                <span style="font-size: 8px; color: #71717a; display: block;">BROWSER</span>
                <span style="font-size: 10px; color: #fff;">${props.browser || '?'}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 6px; text-align: center;">
                <span style="font-size: 8px; color: #71717a; display: block;">OS</span>
                <span style="font-size: 10px; color: #fff;">${props.os || '?'}</span>
              </div>
            </div>

            ${props.timestamp ? `
            <div style="font-size: 10px; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
              Visited: ${new Date(props.timestamp).toLocaleString()}
            </div>` : ''}
          </div>
        `
      } else if (layerId === 'usps-facilities') {
        content = `
          <div class="map-popup">
            <div class="popup-header" style="color: ${color}">${props.name}</div>
            <div class="popup-location">${props.city}, ${props.state}</div>
            <div class="popup-stats">
              <div><span class="label">TYPE</span><span class="value">${props.type}</span></div>
            </div>
            <div class="popup-time">USPS Distribution Center</div>
          </div>
        `
      } else if (layerId === 'journey-points') {
        const pointType = props.isOrigin ? 'ORIGIN' : props.isDestination ? 'DELIVERED' : 'IN TRANSIT'
        const pointColor = props.color || color
        const statusColors: Record<string, string> = {
          'delivered': '#22c55e',
          'in_transit': '#22d3ee',
          'out_for_delivery': '#f59e0b',
          'pre_transit': '#a855f7',
          'alert': '#ef4444',
        }
        const statusColor = statusColors[props.status] || '#22d3ee'
        const statusLabel = (props.status || 'tracking').replace(/_/g, ' ').toUpperCase()
        const orderTotal = props.orderTotal ? `$${parseFloat(props.orderTotal).toFixed(2)}` : ''
        const transitTime = props.transitDays ? `${props.transitDays} days` : props.transitHours ? `${props.transitHours}h` : ''

        content = `
          <div class="map-popup" style="min-width: 280px;">
            ${props.storeName ? `<div style="font-size: 9px; color: #71717a; margin-bottom: 4px; letter-spacing: 0.05em;">FROM: ${props.storeName.toUpperCase()}</div>` : ''}
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${pointColor};"></div>
              <div class="popup-header" style="color: ${pointColor}; margin: 0;">${pointType}</div>
              <span style="margin-left: auto; font-size: 10px; color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
            </div>
            <div class="popup-location" style="font-size: 13px; color: #fff; margin-bottom: 10px;">
              ${props.city ? `${props.city}, ${props.state}` : props.state || 'Unknown'}
            </div>

            ${props.customerName ? `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 0 -4px 10px -4px;">
              <div style="font-size: 9px; color: #71717a; letter-spacing: 0.05em; margin-bottom: 4px;">CUSTOMER</div>
              <div style="font-size: 12px; color: #fff; font-weight: 500;">${props.customerName}</div>
              ${props.customerEmail ? `<div style="font-size: 10px; color: #60a5fa; margin-top: 2px;">${props.customerEmail}</div>` : ''}
              ${props.customerPhone ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">${props.customerPhone}</div>` : ''}
              ${props.shippingAddress ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1);">${props.shippingAddress}</div>` : ''}
            </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">ORDER</span>
                <span style="font-size: 12px; color: #fff;">${props.orderNumber ? `#${props.orderNumber}` : 'N/A'}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">TOTAL</span>
                <span style="font-size: 12px; color: #22c55e;">${orderTotal || 'N/A'}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">STOP</span>
                <span style="font-size: 12px; color: #fff;">${(props.pointIndex || 0) + 1} of ${props.totalPoints || '?'}</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 8px;">
                <span style="font-size: 9px; color: #71717a; display: block;">TRANSIT TIME</span>
                <span style="font-size: 12px; color: #fff;">${transitTime || 'In progress'}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
              <div>
                <div style="font-size: 9px; color: #71717a;">TRACKING</div>
                <div style="font-size: 10px; color: #d4d4d8; font-family: monospace;">${props.trackingNumber || 'N/A'}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 9px; color: #71717a;">CARRIER</div>
                <div style="font-size: 10px; color: #fff;">${props.carrier || 'USPS'}</div>
              </div>
            </div>

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
              <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">${props.eventType || 'Tracking Update'}</div>
              ${props.timestamp ? `<div style="font-size: 9px; color: #71717a;">${new Date(props.timestamp).toLocaleString()}</div>` : ''}
            </div>
          </div>
        `
      } else {
        // Generic fallback popup
        content = `
          <div class="map-popup">
            <div class="popup-header" style="color: ${color}">${props.name || props.state || 'LOCATION'}</div>
            ${props.city ? `<div class="popup-location">${props.city}, ${props.state}</div>` : ''}
            <div class="popup-stats">
              ${props.orders ? `<div><span class="label">ORDERS</span><span class="value">${props.orders?.toLocaleString() || 0}</span></div>` : ''}
              ${props.revenue ? `<div><span class="label">REVENUE</span><span class="value" style="color: ${color}">$${Math.round(props.revenue || 0).toLocaleString()}</span></div>` : ''}
            </div>
          </div>
        `
      }

      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' })
        .setLngLat(coords)
        .setHTML(content)
        .addTo(m)
    }

    // Journey line click handler - shows full journey info
    const handleJourneyLineClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.[0]) return
      const props = e.features[0].properties || {}
      const coords = e.lngLat

      const statusColors: Record<string, string> = {
        'delivered': '#22c55e',
        'in_transit': '#22d3ee',
        'out_for_delivery': '#f59e0b',
        'pre_transit': '#a855f7',
        'alert': '#ef4444',
      }
      const color = props.color || '#22d3ee'
      const statusColor = statusColors[props.status] || color
      const statusLabel = (props.status || 'tracking').replace(/_/g, ' ').toUpperCase()
      const orderTotal = props.orderTotal ? `$${parseFloat(props.orderTotal).toFixed(2)}` : ''
      const transitTime = props.transitDays ? `${props.transitDays} days` : props.transitHours ? `${props.transitHours}h` : ''

      const content = `
        <div class="map-popup" style="min-width: 300px;">
          ${props.storeName ? `<div style="font-size: 9px; color: #71717a; margin-bottom: 4px; letter-spacing: 0.05em;">FROM: ${props.storeName.toUpperCase()}</div>` : ''}
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
            <div class="popup-header" style="color: ${color}; margin: 0;">SHIPMENT</div>
            <span style="margin-left: auto; font-size: 10px; color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
          </div>

          ${props.customerName ? `
          <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 8px -4px 10px -4px;">
            <div style="font-size: 9px; color: #71717a; letter-spacing: 0.05em; margin-bottom: 4px;">SHIPPING TO</div>
            <div style="font-size: 12px; color: #fff; font-weight: 500;">${props.customerName}</div>
            ${props.customerEmail ? `<div style="font-size: 10px; color: #60a5fa; margin-top: 2px;">${props.customerEmail}</div>` : ''}
            ${props.customerPhone ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">${props.customerPhone}</div>` : ''}
            ${props.shippingAddress ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1);">${props.shippingAddress}</div>` : ''}
          </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div style="background: rgba(255,255,255,0.03); padding: 8px;">
              <span style="font-size: 9px; color: #71717a; display: block;">ORDER</span>
              <span style="font-size: 12px; color: #fff;">${props.orderNumber ? `#${props.orderNumber}` : 'N/A'}</span>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px;">
              <span style="font-size: 9px; color: #71717a; display: block;">TOTAL</span>
              <span style="font-size: 12px; color: #22c55e;">${orderTotal || 'N/A'}</span>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px;">
              <span style="font-size: 9px; color: #71717a; display: block;">STOPS</span>
              <span style="font-size: 12px; color: #fff;">${props.pointCount || '?'}</span>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px;">
              <span style="font-size: 9px; color: #71717a; display: block;">TRANSIT TIME</span>
              <span style="font-size: 12px; color: #fff;">${transitTime || 'In progress'}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
            <div>
              <div style="font-size: 9px; color: #71717a;">TRACKING</div>
              <div style="font-size: 10px; color: #d4d4d8; font-family: monospace;">${props.trackingNumber || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 9px; color: #71717a;">CARRIER</div>
              <div style="font-size: 10px; color: #fff;">${props.carrier || 'USPS'}</div>
            </div>
          </div>

          ${props.estimatedDelivery ? `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 9px; color: #71717a;">ESTIMATED DELIVERY</div>
            <div style="font-size: 11px; color: #fbbf24;">${new Date(props.estimatedDelivery).toLocaleDateString()}</div>
          </div>
          ` : ''}
        </div>
      `

      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '340px' })
        .setLngLat(coords)
        .setHTML(content)
        .addTo(m)
    }

    const handlers = {
      stores: (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'stores', '#f59e0b'),
      customers: (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'customers', '#a855f7'),
      shipping: (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'shipping', '#14b8a6'),
      traffic: (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'traffic', '#f43f5e'),
      'usps-facilities': (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'usps-facilities', '#3b82f6'),
      'journey-points': (e: mapboxgl.MapLayerMouseEvent) => createPopup(e, 'journey-points', '#22d3ee'),
      'journey-lines': handleJourneyLineClick,
    }

    const setCursor = () => { m.getCanvas().style.cursor = 'pointer' }
    const resetCursor = () => { m.getCanvas().style.cursor = '' }

    Object.entries(handlers).forEach(([layer, handler]) => {
      m.on('click', layer, handler)
      m.on('mouseenter', layer, setCursor)
      m.on('mouseleave', layer, resetCursor)
    })

    return () => {
      Object.entries(handlers).forEach(([layer, handler]) => {
        m.off('click', layer, handler)
        m.off('mouseenter', layer, setCursor)
        m.off('mouseleave', layer, resetCursor)
      })
    }
  }, [mapLoaded])

  const resetView = () => {
    if (map.current) {
      map.current.flyTo({
        center: [-98, 39],
        zoom: 4,
        pitch: 45,
        bearing: -10,
        duration: 1500,
      })
    }
  }

  return (
    <div className="absolute inset-0 w-full h-full" style={{ background: 'transparent' }}>
      <div ref={mapContainer} className="w-full h-full" style={{ background: 'transparent' }} />

      {/* Reset View Button */}
      {mapLoaded && (
        <button
          onClick={resetView}
          className="absolute top-4 right-4 z-50 px-3 py-2 bg-black/80 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider hover:bg-slate-800/80 hover:border-slate-600 transition-all"
          title="Reset map view"
        >
          Reset View
        </button>
      )}

      {/* Loading overlay with fade - transparent to show Matrix */}
      <div
        className={`absolute inset-0 flex items-center justify-center z-30 transition-opacity duration-1000 ${
          mapLoaded && !isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      >
        <div className="text-center">
          {error ? (
            <>
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-xs font-mono text-red-400 uppercase tracking-wider">Map Error</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-2 max-w-xs">{error}</p>
            </>
          ) : (
            <>
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 border-2 border-green-900/40 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-green-500 rounded-full animate-spin" />
                <div className="absolute inset-2 border border-green-800/30 rounded-full" />
                <div className="absolute inset-2 border border-transparent border-t-green-400/60 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <Crosshair className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
              </div>
              <p className="text-xs font-mono text-green-500/80 uppercase tracking-wider">
                {isLoading ? 'Loading intel...' : 'Initializing display...'}
              </p>
              <p className="text-[10px] font-mono text-green-900 mt-1">
                {'>'} SYSTEM ONLINE
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .mapboxgl-map { font: inherit !important; }
        .mapboxgl-canvas { outline: none !important; }
        .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-logo { display: none !important; }

        /* Navigation controls styling */
        .mapboxgl-ctrl-group {
          background: rgba(0, 0, 0, 0.85) !important;
          border: 1px solid rgba(100, 116, 139, 0.3) !important;
          border-radius: 0 !important;
        }
        .mapboxgl-ctrl-group button {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(100, 116, 139, 0.2) !important;
        }
        .mapboxgl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .mapboxgl-ctrl-group button:hover {
          background: rgba(100, 116, 139, 0.2) !important;
        }
        .mapboxgl-ctrl-group button .mapboxgl-ctrl-icon {
          filter: invert(1) brightness(0.7) !important;
        }
        .mapboxgl-ctrl-group button:hover .mapboxgl-ctrl-icon {
          filter: invert(1) brightness(1) !important;
        }

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

        .map-popup {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(100, 116, 139, 0.3);
          padding: 16px 20px;
          font-family: ui-monospace, monospace;
          min-width: 180px;
        }
        .popup-header {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .popup-location {
          color: #a1a1aa;
          font-size: 11px;
          margin-bottom: 12px;
        }
        .popup-stats {
          display: flex;
          gap: 20px;
        }
        .popup-stats .label {
          display: block;
          color: #71717a;
          font-size: 9px;
          letter-spacing: 0.05em;
        }
        .popup-stats .value {
          display: block;
          color: #fff;
          font-size: 14px;
          margin-top: 2px;
        }
        .popup-time {
          color: #52525b;
          font-size: 9px;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid rgba(100, 116, 139, 0.2);
        }
      `}</style>
    </div>
  )
}

// Add all layers once during initialization
function addAllLayers(m: mapboxgl.Map) {
  // Helper to safely add layer
  const safeAddLayer = (layer: mapboxgl.AnyLayer) => {
    try {
      if (!m.getLayer(layer.id)) {
        m.addLayer(layer)
      }
    } catch (err) {
      console.error(`Failed to add layer ${layer.id}:`, err)
    }
  }

  // === CUSTOMER LAYERS (Purple) ===
  safeAddLayer({
    id: 'customers-heat',
    type: 'heatmap',
    source: 'customer-data',
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 5, 0.8, 8, 1.5],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 20, 5, 30, 8, 40],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 10, 0.5],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0, 0, 0, 0)',
        0.15, 'rgba(139, 92, 246, 0.25)',
        0.35, 'rgba(167, 139, 250, 0.45)',
        0.55, 'rgba(192, 132, 252, 0.6)',
        0.75, 'rgba(216, 180, 254, 0.75)',
        1, 'rgba(243, 232, 255, 0.9)',
      ],
    },
  })

  safeAddLayer({
    id: 'customers-glow',
    type: 'circle',
    source: 'customer-data',
    minzoom: 5,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 16],
      'circle-color': '#a855f7',
      'circle-opacity': 0.15,
      'circle-blur': 1,
    },
  })

  safeAddLayer({
    id: 'customers',
    type: 'circle',
    source: 'customer-data',
    minzoom: 5,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 7],
      'circle-color': '#a855f7',
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 8, 0.85],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#c084fc',
      'circle-stroke-opacity': 0.8,
    },
  })

  // === SHIPPING LAYERS (Teal) ===
  safeAddLayer({
    id: 'shipping-heat',
    type: 'heatmap',
    source: 'shipping-data',
    paint: {
      'heatmap-weight': ['get', 'intensity'],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 1, 5, 1.5, 8, 2],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 40, 5, 60, 8, 80],
      'heatmap-opacity': 0.75,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0, 0, 0, 0)',
        0.15, 'rgba(20, 184, 166, 0.2)',
        0.35, 'rgba(45, 212, 191, 0.4)',
        0.55, 'rgba(94, 234, 212, 0.55)',
        0.75, 'rgba(153, 246, 228, 0.7)',
        1, 'rgba(204, 251, 241, 0.85)',
      ],
    },
  })

  safeAddLayer({
    id: 'shipping-glow',
    type: 'circle',
    source: 'shipping-data',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 20, 0.5, 35, 1, 55],
      'circle-color': '#14b8a6',
      'circle-opacity': 0.12,
      'circle-blur': 1,
    },
  })

  safeAddLayer({
    id: 'shipping',
    type: 'circle',
    source: 'shipping-data',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 6, 0.5, 12, 1, 20],
      'circle-color': '#14b8a6',
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#5eead4',
      'circle-stroke-opacity': 0.9,
    },
  })

  // === STORE LAYERS (Amber) ===
  safeAddLayer({
    id: 'stores-glow',
    type: 'circle',
    source: 'store-data',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 30, 0.5, 50, 1, 75],
      'circle-color': '#f59e0b',
      'circle-opacity': 0.15,
      'circle-blur': 1,
    },
  })

  safeAddLayer({
    id: 'stores-pulse',
    type: 'circle',
    source: 'store-data',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 18, 0.5, 28, 1, 40],
      'circle-color': '#f59e0b',
      'circle-opacity': 0.25,
      'circle-blur': 0.5,
    },
  })

  safeAddLayer({
    id: 'stores',
    type: 'circle',
    source: 'store-data',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 10, 0.5, 16, 1, 24],
      'circle-color': '#f59e0b',
      'circle-opacity': 1,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#fbbf24',
    },
  })

  // === TRAFFIC LAYERS (Rose) - Split into accurate vs inaccurate ===
  // Accurate = browser_gps or ipinfo (real location data)
  // Inaccurate = everything else (city centroids, datacenter IPs, unknown)

  // Accurate traffic heatmap (browser_gps, ipinfo only)
  safeAddLayer({
    id: 'traffic-heat',
    type: 'heatmap',
    source: 'traffic-data',
    filter: ['any',
      ['==', ['get', 'geoSource'], 'browser_gps'],
      ['==', ['get', 'geoSource'], 'ipinfo']
    ],
    maxzoom: 9,
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 9, 1.5],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 9, 20],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 9, 0.3],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0, 0, 0, 0)',
        0.2, 'rgba(225, 29, 72, 0.3)',
        0.4, 'rgba(244, 63, 94, 0.5)',
        0.6, 'rgba(251, 113, 133, 0.6)',
        0.8, 'rgba(253, 164, 175, 0.7)',
        1, 'rgba(255, 228, 230, 0.85)',
      ],
    },
  })

  // Accurate traffic glow
  safeAddLayer({
    id: 'traffic-glow',
    type: 'circle',
    source: 'traffic-data',
    filter: ['any',
      ['==', ['get', 'geoSource'], 'browser_gps'],
      ['==', ['get', 'geoSource'], 'ipinfo']
    ],
    minzoom: 6,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 12, 10],
      'circle-color': '#f43f5e',
      'circle-opacity': 0.15,
      'circle-blur': 1,
    },
  })

  // Accurate traffic points - prominent rose color
  safeAddLayer({
    id: 'traffic',
    type: 'circle',
    source: 'traffic-data',
    filter: ['any',
      ['==', ['get', 'geoSource'], 'browser_gps'],
      ['==', ['get', 'geoSource'], 'ipinfo']
    ],
    minzoom: 6,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 12, 6],
      'circle-color': '#f43f5e',
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fb7185',
      'circle-stroke-opacity': 0.7,
    },
  })

  // === CITY AGGREGATE LAYERS (for inaccurate/unknown locations) ===
  // These show as labeled markers with visitor counts per city

  // City aggregate circles - size based on count
  safeAddLayer({
    id: 'traffic-city-aggregate',
    type: 'circle',
    source: 'traffic-data',
    filter: ['==', ['get', 'geoSource'], 'city_aggregate'],
    paint: {
      // Size based on visitor count (stored in pageViews/customers)
      'circle-radius': [
        'interpolate', ['linear'],
        ['coalesce', ['get', 'customers'], ['get', 'pageViews'], 1],
        1, 8,
        10, 12,
        50, 18,
        100, 24,
        500, 32
      ],
      'circle-color': 'rgba(107, 114, 128, 0.6)', // Gray
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(156, 163, 175, 0.8)',
    },
  })

  // City aggregate labels showing count
  safeAddLayer({
    id: 'traffic-city-aggregate-label',
    type: 'symbol',
    source: 'traffic-data',
    filter: ['==', ['get', 'geoSource'], 'city_aggregate'],
    layout: {
      'text-field': ['to-string', ['coalesce', ['get', 'customers'], ['get', 'pageViews'], '']],
      'text-size': 11,
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0, 0, 0, 0.5)',
      'text-halo-width': 1,
    },
  })

  // === USPS FACILITY LAYERS (Blue) ===
  safeAddLayer({
    id: 'usps-glow',
    type: 'circle',
    source: 'usps-facilities',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 15, 6, 25, 10, 40],
      'circle-color': '#3b82f6',
      'circle-opacity': 0.2,
      'circle-blur': 1,
    },
  })

  safeAddLayer({
    id: 'usps-facilities',
    type: 'circle',
    source: 'usps-facilities',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 6, 10, 10, 14],
      'circle-color': '#3b82f6',
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#60a5fa',
      'circle-stroke-opacity': 1,
    },
  })

  // USPS facility labels
  safeAddLayer({
    id: 'usps-labels',
    type: 'symbol',
    source: 'usps-facilities',
    minzoom: 5,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': '#93c5fd',
      'text-halo-color': 'rgba(0, 0, 0, 0.8)',
      'text-halo-width': 1,
    },
  })

  // === JOURNEY LAYERS (Per-journey colors) ===
  // Journey line glow
  safeAddLayer({
    id: 'journey-lines-glow',
    type: 'line',
    source: 'journey-lines',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 10,
      'line-opacity': 0.25,
      'line-blur': 4,
    },
  })

  // Journey lines (curved arcs with per-journey colors)
  safeAddLayer({
    id: 'journey-lines',
    type: 'line',
    source: 'journey-lines',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 8, 4],
      'line-opacity': 0.9,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  })

  // Journey waypoint glow
  safeAddLayer({
    id: 'journey-points-glow',
    type: 'circle',
    source: 'journey-points',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 16],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.2,
      'circle-blur': 1,
    },
  })

  // Journey waypoints
  safeAddLayer({
    id: 'journey-points',
    type: 'circle',
    source: 'journey-points',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        3, ['case', ['any', ['get', 'isOrigin'], ['get', 'isDestination']], 7, 4],
        8, ['case', ['any', ['get', 'isOrigin'], ['get', 'isDestination']], 12, 7],
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': 1,
      'circle-stroke-width': ['case', ['any', ['get', 'isOrigin'], ['get', 'isDestination']], 3, 2],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.8,
    },
  })
}
