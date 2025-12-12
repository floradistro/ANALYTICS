import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Edge runtime to access Vercel's geolocation headers
export const runtime = 'edge'

// Create Supabase client with service role for inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendor_id, page_url, referrer, visitor_id } = body

    if (!vendor_id) {
      return NextResponse.json({ error: 'vendor_id required' }, { status: 400 })
    }

    // Get geolocation from Vercel headers (automatically provided)
    const latitude = request.headers.get('x-vercel-ip-latitude')
    const longitude = request.headers.get('x-vercel-ip-longitude')
    const city = request.headers.get('x-vercel-ip-city')
    const region = request.headers.get('x-vercel-ip-country-region')
    const country = request.headers.get('x-vercel-ip-country')

    // Get user agent for device detection
    const userAgent = request.headers.get('user-agent') || ''
    const deviceType = detectDeviceType(userAgent)

    // Generate unique session ID
    const sessionId = generateSessionId()

    // Insert visitor record
    const { error } = await supabase
      .from('website_visitors')
      .upsert({
        vendor_id,
        session_id: sessionId,
        visitor_id,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        city: city ? decodeURIComponent(city) : null,
        region,
        country,
        page_url,
        referrer,
        user_agent: userAgent.substring(0, 500),
        device_type: deviceType,
      }, {
        onConflict: 'vendor_id,session_id'
      })

    if (error) {
      console.error('Visitor tracking error:', error)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      geo: { latitude, longitude, city, region, country }
    })
  } catch (err) {
    console.error('Track API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      return 'tablet'
    }
    return 'mobile'
  }
  return 'desktop'
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Also handle GET for simple tracking pixel
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const vendor_id = url.searchParams.get('v')

  if (!vendor_id) {
    return new NextResponse('', { status: 204 })
  }

  // Get geolocation from Vercel headers
  const latitude = request.headers.get('x-vercel-ip-latitude')
  const longitude = request.headers.get('x-vercel-ip-longitude')
  const city = request.headers.get('x-vercel-ip-city')
  const region = request.headers.get('x-vercel-ip-country-region')
  const country = request.headers.get('x-vercel-ip-country')

  const userAgent = request.headers.get('user-agent') || ''
  const deviceType = detectDeviceType(userAgent)
  const sessionId = generateSessionId()

  await supabase
    .from('website_visitors')
    .upsert({
      vendor_id,
      session_id: sessionId,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      city: city ? decodeURIComponent(city) : null,
      region,
      country,
      user_agent: userAgent.substring(0, 500),
      device_type: deviceType,
    }, {
      onConflict: 'vendor_id,session_id'
    })

  // Return 1x1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(gif, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}
