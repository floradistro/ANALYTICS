import { NextRequest, NextResponse } from 'next/server'
import EasyPost from '@easypost/api'

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
    try {
      // Create a tracker for the tracking number
      const tracker = await client.Tracker.create({
        tracking_code: trackingNumber.replace(/\s+/g, ''), // Remove spaces
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

      results.push({
        trackingNumber,
        status: mapStatus(tracker.status || ''),
        statusCategory: tracker.status || '',
        statusDescription: tracker.status_detail || tracker.status || 'No status available',
        estimatedDelivery: tracker.est_delivery_date || null,
        lastUpdate: latestEvent?.eventTimestamp || '',
        lastLocation,
        carrier: tracker.carrier || 'USPS',
        events,
      })

    } catch (error: any) {
      console.error(`Error tracking ${trackingNumber}:`, error)
      results.push({
        trackingNumber,
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
