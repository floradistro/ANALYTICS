import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import EasyPost from '@easypost/api'

// Use service role key for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validate USPS tracking number format
// USPS tracking numbers are typically 20-22 digits
function isValidUSPSTrackingNumber(trackingNumber: string): boolean {
  const clean = trackingNumber.replace(/\s+/g, '')
  // Must be 20-22 digits and contain only numbers
  if (!/^\d{20,22}$/.test(clean)) return false
  // Most USPS tracking numbers start with 94
  if (clean.startsWith('94') || clean.startsWith('92') || clean.startsWith('93')) return true
  // Some start with other prefixes
  return true
}

// Map EasyPost status to our status
function mapStatus(status: string): string {
  const statusLower = status?.toLowerCase() || ''
  if (statusLower === 'delivered') return 'delivered'
  if (statusLower === 'out_for_delivery') return 'out_for_delivery'
  if (statusLower === 'in_transit') return 'in_transit'
  if (statusLower === 'pre_transit') return 'pre_transit'
  if (['return_to_sender', 'failure', 'cancelled', 'error'].includes(statusLower)) return 'alert'
  if (statusLower === 'available_for_pickup') return 'out_for_delivery'
  return 'in_transit'
}

// Register a tracking number with EasyPost and store in database
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.EASYPOST_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'EasyPost API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { trackingNumbers, vendorId, orderId } = body

    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json({ error: 'Missing tracking numbers' }, { status: 400 })
    }

    if (!vendorId) {
      return NextResponse.json({ error: 'Missing vendor ID' }, { status: 400 })
    }

    const client = new EasyPost(apiKey)
    const results = []

    for (const trackingNumber of trackingNumbers) {
      const cleanTrackingNumber = trackingNumber.replace(/\s+/g, '')

      // Skip invalid tracking numbers
      if (!isValidUSPSTrackingNumber(cleanTrackingNumber)) {
        results.push({
          trackingNumber: cleanTrackingNumber,
          status: 'invalid',
          error: 'Invalid USPS tracking number format',
        })
        continue
      }

      try {
        // Check if already registered
        const { data: existing } = await supabase
          .from('shipment_tracking')
          .select('id, status, last_update')
          .eq('tracking_number', cleanTrackingNumber)
          .single()

        if (existing) {
          // Already registered, return existing data
          results.push({
            trackingNumber: cleanTrackingNumber,
            status: 'already_registered',
            message: 'Tracker already exists',
          })
          continue
        }

        // Create tracker with EasyPost
        const tracker = await client.Tracker.create({
          tracking_code: cleanTrackingNumber,
          carrier: 'USPS',
        })

        // Parse tracking events
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

        // Store in database
        const { error: insertError } = await supabase
          .from('shipment_tracking')
          .insert({
            tracking_number: cleanTrackingNumber,
            order_id: orderId || null,
            vendor_id: vendorId,
            easypost_tracker_id: tracker.id,
            carrier: tracker.carrier || 'USPS',
            status: mapStatus(tracker.status || ''),
            status_category: tracker.status || '',
            status_description: tracker.status_detail || tracker.status || '',
            estimated_delivery: tracker.est_delivery_date || null,
            last_location: lastLocation,
            last_update: latestEvent?.eventTimestamp || new Date().toISOString(),
            events: events,
          })

        if (insertError) {
          console.error('Failed to insert tracking:', insertError)
        }

        results.push({
          trackingNumber: cleanTrackingNumber,
          status: 'registered',
          trackingStatus: mapStatus(tracker.status || ''),
          statusDescription: tracker.status_detail || tracker.status || '',
          lastLocation,
          estimatedDelivery: tracker.est_delivery_date,
        })

      } catch (error: any) {
        console.error(`Error registering ${trackingNumber}:`, error)
        results.push({
          trackingNumber: cleanTrackingNumber,
          status: 'error',
          error: error?.message || 'Failed to register tracker',
        })
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
