import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for webhook (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // EasyPost sends event objects
    // Event types: tracker.created, tracker.updated
    const { description, result } = body

    console.log('EasyPost webhook received:', description)

    // Only process tracker events
    if (!description?.startsWith('tracker.')) {
      return NextResponse.json({ received: true })
    }

    // result contains the Tracker object
    const tracker = result
    if (!tracker?.tracking_code) {
      console.error('No tracking code in webhook')
      return NextResponse.json({ error: 'No tracking code' }, { status: 400 })
    }

    const trackingNumber = tracker.tracking_code

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

    // Update tracking record in database
    const { error } = await supabase
      .from('shipment_tracking')
      .upsert({
        tracking_number: trackingNumber,
        easypost_tracker_id: tracker.id,
        carrier: tracker.carrier || 'USPS',
        status: mapStatus(tracker.status || ''),
        status_category: tracker.status || '',
        status_description: tracker.status_detail || tracker.status || '',
        estimated_delivery: tracker.est_delivery_date || null,
        actual_delivery: tracker.status === 'delivered' ? latestEvent?.eventTimestamp : null,
        last_location: lastLocation,
        last_update: latestEvent?.eventTimestamp || new Date().toISOString(),
        events: events,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tracking_number'
      })

    if (error) {
      console.error('Failed to update tracking:', error)
      // Still return 200 to prevent EasyPost from retrying
    }

    console.log(`Updated tracking for ${trackingNumber}: ${tracker.status}`)

    // Return 200 quickly (EasyPost requires response within 7 seconds)
    return NextResponse.json({ received: true, tracking_number: trackingNumber })

  } catch (error) {
    console.error('Webhook error:', error)
    // Return 200 to prevent retries for parse errors
    return NextResponse.json({ received: true, error: 'Parse error' })
  }
}

// EasyPost may send GET requests to verify endpoint
export async function GET() {
  return NextResponse.json({ status: 'EasyPost webhook endpoint active' })
}
