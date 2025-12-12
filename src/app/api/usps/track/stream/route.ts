import { NextRequest } from 'next/server'
import EasyPost from '@easypost/api'

// Streaming endpoint to watch tracking lookup
export async function POST(request: NextRequest) {
  const apiKey = process.env.EASYPOST_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'EASYPOST_API_KEY not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body = await request.json()
  const { trackingNumber } = body

  if (!trackingNumber) {
    return new Response(
      JSON.stringify({ error: 'Missing tracking number' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const client = new EasyPost(apiKey)

  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const cleanTrackingNumber = trackingNumber.replace(/\s+/g, '')

        send('status', { message: `Connecting to EasyPost API...` })

        send('tool', {
          message: `🔍 Looking up USPS tracking: ${cleanTrackingNumber}`,
          tool: 'EasyPost API'
        })

        // Create tracker
        const tracker = await client.Tracker.create({
          tracking_code: cleanTrackingNumber,
          carrier: 'USPS',
        })

        send('status', { message: `✅ Found tracking info from ${tracker.carrier || 'USPS'}` })

        // Parse tracking details
        const events = (tracker.tracking_details || []).map((detail: any) => ({
          eventTimestamp: detail.datetime || '',
          eventType: detail.message || detail.status || '',
          eventCity: detail.tracking_location?.city || '',
          eventState: detail.tracking_location?.state || '',
          eventZIPCode: detail.tracking_location?.zip || '',
          eventCountry: detail.tracking_location?.country || 'US',
        }))

        // Show events
        if (events.length > 0) {
          send('status', { message: `📦 Found ${events.length} tracking events` })

          // Show last few events
          const recentEvents = events.slice(0, 3)
          for (const event of recentEvents) {
            const location = [event.eventCity, event.eventState].filter(Boolean).join(', ')
            send('text', {
              text: `• ${event.eventType}${location ? ` - ${location}` : ''}\n`,
              fullText: ''
            })
          }
        }

        // Get latest event info
        const latestEvent = events[0]
        const lastLocation = latestEvent
          ? [latestEvent.eventCity, latestEvent.eventState].filter(Boolean).join(', ')
          : ''

        // Map status
        const statusLower = (tracker.status || '').toLowerCase()
        let status = 'in_transit'
        if (statusLower === 'delivered') status = 'delivered'
        else if (statusLower === 'out_for_delivery') status = 'out_for_delivery'
        else if (statusLower === 'pre_transit') status = 'pre_transit'
        else if (['return_to_sender', 'failure', 'cancelled', 'error'].includes(statusLower)) status = 'alert'

        send('status', { message: `📍 Status: ${tracker.status_detail || tracker.status || 'Unknown'}` })

        if (tracker.est_delivery_date) {
          send('status', { message: `📅 Estimated delivery: ${tracker.est_delivery_date}` })
        }

        // Send final result
        send('result', {
          trackingNumber: cleanTrackingNumber,
          status,
          statusCategory: tracker.status || '',
          statusDescription: tracker.status_detail || tracker.status || 'No status available',
          estimatedDelivery: tracker.est_delivery_date || null,
          lastUpdate: latestEvent?.eventTimestamp || '',
          lastLocation,
          carrier: tracker.carrier || 'USPS',
          events,
        })

        send('done', { message: 'Tracking complete!' })
        controller.close()

      } catch (error: any) {
        console.error('EasyPost tracking error:', error)
        send('error', {
          message: `Error: ${error?.message || 'Unknown error'}`,
          error: error?.message || 'Unknown error'
        })

        // Send error result
        send('result', {
          trackingNumber: trackingNumber.replace(/\s+/g, ''),
          status: 'unknown',
          statusCategory: '',
          statusDescription: error?.message || 'Failed to fetch tracking',
          estimatedDelivery: null,
          lastUpdate: '',
          lastLocation: '',
          carrier: '',
          events: [],
          error: error?.message || 'Unknown error'
        })

        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
