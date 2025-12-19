import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendor_id,
      visitor_id,
      session_id,
      fingerprint_id,
      event_name,
      event_data,
      revenue,
      channel,
      utm_source,
      utm_campaign,
    } = body

    if (!vendor_id || !event_name) {
      return NextResponse.json(
        { error: 'vendor_id and event_name required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get geolocation from Vercel headers
    const latitude = request.headers.get('x-vercel-ip-latitude')
    const longitude = request.headers.get('x-vercel-ip-longitude')
    const city = request.headers.get('x-vercel-ip-city')
    const region = request.headers.get('x-vercel-ip-country-region')
    const country = request.headers.get('x-vercel-ip-country')

    const userAgent = request.headers.get('user-agent') || ''
    const deviceType = detectDeviceType(userAgent)

    const { error } = await supabase.from('analytics_events').insert({
      vendor_id,
      visitor_id,
      session_id,
      fingerprint_id: fingerprint_id || null,
      event_name,
      event_properties: event_data,
      revenue: revenue || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      city: city ? decodeURIComponent(city) : null,
      region,
      country,
      channel,
      utm_source,
      utm_campaign,
      device_type: deviceType,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Event tracking error:', error)
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true, event: event_name }, { headers: corsHeaders })
  } catch (err) {
    console.error('Event API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders })
  }
}

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) return 'tablet'
    return 'mobile'
  }
  return 'desktop'
}
