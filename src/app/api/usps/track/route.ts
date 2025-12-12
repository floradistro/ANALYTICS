import { NextRequest, NextResponse } from 'next/server'
import EasyPost from '@easypost/api'

// Simple in-memory cache to avoid repeated API calls
// Cache entries expire after 5 minutes
const trackingCache = new Map<string, { data: TrackingResult; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedResult(trackingNumber: string): TrackingResult | null {
  const cached = trackingCache.get(trackingNumber)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  // Clean up expired entry
  if (cached) {
    trackingCache.delete(trackingNumber)
  }
  return null
}

function setCachedResult(trackingNumber: string, data: TrackingResult): void {
  trackingCache.set(trackingNumber, { data, timestamp: Date.now() })
  // Clean up old entries if cache gets too large
  if (trackingCache.size > 100) {
    const now = Date.now()
    for (const [key, value] of trackingCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        trackingCache.delete(key)
      }
    }
  }
}

// Validate USPS tracking number format
function isValidUSPSTrackingNumber(trackingNumber: string): boolean {
  const clean = trackingNumber.replace(/\s+/g, '')
  // Must be 20-22 digits and contain only numbers
  if (!/^\d{20,22}$/.test(clean)) return false
  return true
}

interface TrackingResult {
  trackingNumber: string
  status: string
  statusCategory: string
  statusDescription: string
  estimatedDelivery: string | null
  lastUpdate: string
  lastLocation: string
  carrier: string
  events: Array<{
    eventTimestamp: string
    eventType: string
    eventCity: string
    eventState: string
    eventZIPCode: string
    eventCountry: string
  }>
  error?: string
}

// Map EasyPost status to our status
function mapStatus(status: string): TrackingResult['status'] {
  const statusLower = status?.toLowerCase() || ''

  if (statusLower === 'delivered') return 'delivered'
  if (statusLower === 'out_for_delivery') return 'out_for_delivery'
  if (statusLower === 'in_transit') return 'in_transit'
  if (statusLower === 'pre_transit') return 'pre_transit'
  if (statusLower === 'return_to_sender' || statusLower === 'failure' || statusLower === 'cancelled' || statusLower === 'error') return 'alert'
  if (statusLower === 'available_for_pickup') return 'out_for_delivery'

  return 'in_transit'
}

// Use EasyPost API for tracking
async function getTrackingWithEasyPost(trackingNumbers: string[]): Promise<TrackingResult[]> {
  const apiKey = process.env.EASYPOST_API_KEY

  if (!apiKey) {
    return trackingNumbers.map(num => ({
      trackingNumber: num,
      status: 'unknown',
      statusCategory: '',
      statusDescription: 'EasyPost API key not configured',
      estimatedDelivery: null,
      lastUpdate: '',
      lastLocation: '',
      carrier: '',
      events: [],
      error: 'EASYPOST_API_KEY not set',
    }))
  }

  const client = new EasyPost(apiKey)
  const results: TrackingResult[] = []

  // Process tracking numbers
  for (const trackingNumber of trackingNumbers) {
    const cleanTrackingNumber = trackingNumber.replace(/\s+/g, '')

    // Skip invalid tracking numbers
    if (!isValidUSPSTrackingNumber(cleanTrackingNumber)) {
      results.push({
        trackingNumber: cleanTrackingNumber,
        status: 'unknown',
        statusCategory: '',
        statusDescription: 'Invalid tracking number format',
        estimatedDelivery: null,
        lastUpdate: '',
        lastLocation: '',
        carrier: '',
        events: [],
        error: 'Invalid USPS tracking number - must be 20-22 digits',
      })
      continue
    }

    // Check cache first
    const cachedResult = getCachedResult(cleanTrackingNumber)
    if (cachedResult) {
      console.log(`Using cached result for ${cleanTrackingNumber}`)
      results.push(cachedResult)
      continue
    }

    try {
      // Create a tracker for the tracking number
      const tracker = await client.Tracker.create({
        tracking_code: cleanTrackingNumber,
        carrier: 'USPS',
      })

      // Parse tracking details
      const events = (tracker.tracking_details || []).map((detail: any) => ({
        eventTimestamp: detail.datetime || '',
        eventType: detail.message || detail.status || '',
        eventCity: detail.tracking_location?.city || '',
        eventState: detail.tracking_location?.state || '',
        eventZIPCode: detail.tracking_location?.zip || '',
        eventCountry: detail.tracking_location?.country || 'US',
      }))

      // Get latest event info
      const latestEvent = events[0]
      const lastLocation = latestEvent
        ? [latestEvent.eventCity, latestEvent.eventState].filter(Boolean).join(', ')
        : ''

      const result: TrackingResult = {
        trackingNumber: cleanTrackingNumber,
        status: mapStatus(tracker.status || ''),
        statusCategory: tracker.status || '',
        statusDescription: tracker.status_detail || tracker.status || 'No status available',
        estimatedDelivery: tracker.est_delivery_date || null,
        lastUpdate: latestEvent?.eventTimestamp || '',
        lastLocation,
        carrier: tracker.carrier || 'USPS',
        events,
      }

      // Cache successful result
      setCachedResult(cleanTrackingNumber, result)
      results.push(result)

    } catch (error: any) {
      console.error(`Error tracking ${trackingNumber}:`, error)
      // Don't cache errors - allow retry
      results.push({
        trackingNumber: cleanTrackingNumber,
        status: 'unknown',
        statusCategory: '',
        statusDescription: error?.message || 'Failed to fetch tracking',
        estimatedDelivery: null,
        lastUpdate: '',
        lastLocation: '',
        carrier: '',
        events: [],
        error: error?.message || 'Unknown error',
      })
    }
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackingNumbers } = body

    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Missing tracking numbers' },
        { status: 400 }
      )
    }

    // Use EasyPost API for tracking
    const results = await getTrackingWithEasyPost(trackingNumbers)

    return NextResponse.json(results)

  } catch (error) {
    console.error('USPS tracking error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
