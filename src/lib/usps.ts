// USPS Tracking API v3r2 Client
// Register at: https://developer.usps.com/
// OAuth2 Client Credentials Flow

export interface USPSTrackingEvent {
  eventTimestamp: string
  eventType: string
  eventCity: string
  eventState: string
  eventZIPCode: string
  eventCountry: string
  firm?: string
  recipientName?: string
  eventCode?: string
}

export interface USPSDeliveryExpectation {
  expectedDeliveryDate?: string
  predictedDeliveryDate?: string
  predictedDeliveryWindowStartTime?: string
  predictedDeliveryWindowEndTime?: string
  guaranteedDeliveryDate?: string
}

export interface USPSTrackingResult {
  trackingNumber: string
  status: 'in_transit' | 'delivered' | 'alert' | 'pre_transit' | 'out_for_delivery' | 'unknown'
  statusCategory: string
  statusDescription: string
  estimatedDelivery: string | null
  lastUpdate: string
  lastLocation: string
  mailClass: string
  events: USPSTrackingEvent[]
  error?: string
}

export interface USPSCredentials {
  clientId?: string
  clientSecret?: string
}

// Map USPS status to our status
function mapStatus(statusCategory: string, status: string): USPSTrackingResult['status'] {
  const category = statusCategory?.toLowerCase() || ''
  const statusLower = status?.toLowerCase() || ''

  if (category.includes('delivered') || statusLower.includes('delivered')) {
    return 'delivered'
  }
  if (category.includes('out for delivery') || statusLower.includes('out for delivery')) {
    return 'out_for_delivery'
  }
  if (category.includes('in transit') || category.includes('in-transit') ||
      statusLower.includes('in transit') || statusLower.includes('processed') ||
      statusLower.includes('arrived') || statusLower.includes('departed') ||
      statusLower.includes('accepted')) {
    return 'in_transit'
  }
  if (category.includes('pre-shipment') || category.includes('pre shipment') ||
      statusLower.includes('label created') || statusLower.includes('shipping label')) {
    return 'pre_transit'
  }
  if (category.includes('alert') || category.includes('exception') ||
      statusLower.includes('held') || statusLower.includes('notice') ||
      statusLower.includes('undeliverable') || statusLower.includes('return')) {
    return 'alert'
  }

  return 'in_transit'
}

// Parse API response to our format
function parseTrackingResponse(data: any): USPSTrackingResult {
  const trackingNumber = data.trackingNumber || ''
  const status = mapStatus(data.statusCategory || '', data.status || '')
  const statusCategory = data.statusCategory || ''
  const statusDescription = data.statusSummary || data.status || 'Unknown'

  // Get delivery expectation
  const deliveryExp = data.deliveryDateExpectation || {}
  const estimatedDelivery = deliveryExp.expectedDeliveryDate ||
                           deliveryExp.predictedDeliveryDate ||
                           deliveryExp.guaranteedDeliveryDate || null

  // Parse events
  const events: USPSTrackingEvent[] = (data.trackingEvents || []).map((event: any) => ({
    eventTimestamp: event.eventTimestamp || '',
    eventType: event.eventType || '',
    eventCity: event.eventCity || '',
    eventState: event.eventState || '',
    eventZIPCode: event.eventZIPCode || '',
    eventCountry: event.eventCountry || '',
    firm: event.firm,
    recipientName: event.recipientName,
    eventCode: event.eventCode,
  }))

  // Get latest event for last update info
  const latestEvent = events[0]
  const lastUpdate = latestEvent?.eventTimestamp || ''
  const lastLocation = latestEvent
    ? [latestEvent.eventCity, latestEvent.eventState, latestEvent.eventZIPCode]
        .filter(Boolean)
        .join(', ')
    : ''

  return {
    trackingNumber,
    status,
    statusCategory,
    statusDescription,
    estimatedDelivery,
    lastUpdate,
    lastLocation,
    mailClass: data.mailClass || '',
    events,
  }
}

// Fetch tracking info via website scraping (no credentials needed)
export async function trackUSPSPackage(
  trackingNumber: string,
  credentials?: USPSCredentials
): Promise<USPSTrackingResult> {
  try {
    // Call our API route (scrapes USPS website)
    const response = await fetch('/api/usps/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingNumbers: [trackingNumber],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const data = await response.json()

    // API returns array of results
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0]
      return parseTrackingResponse(result)
    }

    throw new Error('No tracking data returned')
  } catch (error) {
    return {
      trackingNumber,
      status: 'unknown',
      statusCategory: '',
      statusDescription: 'Failed to fetch tracking info',
      estimatedDelivery: null,
      lastUpdate: '',
      lastLocation: '',
      mailClass: '',
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Track multiple packages via website scraping (no credentials needed)
export async function trackMultiplePackages(
  trackingNumbers: string[],
  credentials?: USPSCredentials
): Promise<USPSTrackingResult[]> {
  try {
    // Process in batches
    const batchSize = 10
    const results: USPSTrackingResult[] = []

    for (let i = 0; i < trackingNumbers.length; i += batchSize) {
      const batch = trackingNumbers.slice(i, i + batchSize)

      // Call our API route (scrapes USPS website)
      const response = await fetch('/api/usps/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingNumbers: batch,
        }),
      })

      if (!response.ok) {
        // Return error results for this batch
        batch.forEach(trackingNumber => {
          results.push({
            trackingNumber,
            status: 'unknown',
            statusCategory: '',
            statusDescription: 'API request failed',
            estimatedDelivery: null,
            lastUpdate: '',
            lastLocation: '',
            mailClass: '',
            events: [],
            error: `HTTP ${response.status}`,
          })
        })
        continue
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          results.push(parseTrackingResponse(item))
        })
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < trackingNumbers.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    return results
  } catch (error) {
    return trackingNumbers.map(trackingNumber => ({
      trackingNumber,
      status: 'unknown' as const,
      statusCategory: '',
      statusDescription: 'Failed to fetch tracking',
      estimatedDelivery: null,
      lastUpdate: '',
      lastLocation: '',
      mailClass: '',
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }))
  }
}

// Get status color for UI
export function getStatusColor(status: USPSTrackingResult['status']): string {
  switch (status) {
    case 'delivered':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    case 'out_for_delivery':
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'in_transit':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'pre_transit':
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
    case 'alert':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    default:
      return 'text-zinc-400 bg-zinc-800 border-zinc-700'
  }
}

// Get status display text
export function getStatusDisplayText(status: USPSTrackingResult['status']): string {
  switch (status) {
    case 'delivered':
      return 'Delivered'
    case 'out_for_delivery':
      return 'Out for Delivery'
    case 'in_transit':
      return 'In Transit'
    case 'pre_transit':
      return 'Pre-Transit'
    case 'alert':
      return 'Alert'
    default:
      return 'Unknown'
  }
}

// Format event timestamp for display
export function formatEventTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return timestamp
  }
}
