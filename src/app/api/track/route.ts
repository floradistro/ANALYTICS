import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Edge runtime to access Vercel's geolocation headers
export const runtime = 'edge'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Create Supabase client with service role for inserts
const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

// Detect channel from referrer
function detectChannel(referrer: string | null, utmSource?: string, utmMedium?: string): string {
  if (utmMedium === 'cpc' || utmMedium === 'ppc' || utmMedium === 'paid') return 'paid'
  if (utmMedium === 'email') return 'email'
  if (utmMedium === 'social') return 'social'
  if (utmSource) {
    const source = utmSource.toLowerCase()
    if (['facebook', 'instagram', 'tiktok', 'twitter', 'x', 'linkedin', 'pinterest', 'snapchat', 'youtube'].includes(source)) return 'social'
    if (['google', 'bing', 'yahoo', 'duckduckgo'].includes(source)) return 'search'
  }

  if (!referrer) return 'direct'

  const ref = referrer.toLowerCase()

  // Social
  if (/facebook\.com|fb\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|linkedin\.com|pinterest\.com|snapchat\.com|youtube\.com|reddit\.com/.test(ref)) {
    return 'social'
  }

  // Search engines
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(ref)) {
    return 'organic'
  }

  // Email providers
  if (/mail\.google\.com|outlook\.|mail\.yahoo\.com|mailchimp\.com|klaviyo\.com/.test(ref)) {
    return 'email'
  }

  return 'referral'
}

// Parse browser and OS from user agent
function parseUserAgent(ua: string): { browser: string; os: string } {
  const uaLower = ua.toLowerCase()

  let browser = 'unknown'
  if (uaLower.includes('chrome') && !uaLower.includes('edg')) browser = 'Chrome'
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari'
  else if (uaLower.includes('firefox')) browser = 'Firefox'
  else if (uaLower.includes('edg')) browser = 'Edge'
  else if (uaLower.includes('opera') || uaLower.includes('opr')) browser = 'Opera'

  let os = 'unknown'
  if (uaLower.includes('windows')) os = 'Windows'
  else if (uaLower.includes('mac os') || uaLower.includes('macos')) os = 'macOS'
  else if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS'
  else if (uaLower.includes('android')) os = 'Android'
  else if (uaLower.includes('linux')) os = 'Linux'

  return { browser, os }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendor_id,
      page_url,
      referrer,
      visitor_id,
      // UTM parameters
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      // Screen info
      screen_width,
      screen_height,
      // Return visitor flag
      is_returning,
    } = body

    if (!vendor_id) {
      return NextResponse.json({ error: 'vendor_id required' }, { status: 400, headers: corsHeaders })
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
    const { browser, os } = parseUserAgent(userAgent)

    // Detect channel from referrer and UTM
    const channel = detectChannel(referrer, utm_source, utm_medium)

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
        // New fields
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        channel,
        browser,
        os,
        screen_width,
        screen_height,
        is_returning: is_returning || false,
      }, {
        onConflict: 'vendor_id,session_id'
      })

    if (error) {
      console.error('Visitor tracking error:', error)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500, headers: corsHeaders })
    }

    // Also insert page view record (every page view, not just unique sessions)
    const { page_title } = body
    const pagePath = page_url ? new URL(page_url).pathname : '/'

    await supabase
      .from('page_views')
      .insert({
        vendor_id,
        visitor_id,
        session_id: sessionId,
        page_url,
        page_path: pagePath,
        page_title: page_title || null,
        referrer,
        city: city ? decodeURIComponent(city) : null,
        region,
        country,
        device_type: deviceType,
        browser,
        os,
        channel,
        utm_source,
        utm_campaign,
      })

    return NextResponse.json({
      success: true,
      geo: { latitude, longitude, city, region, country },
      channel,
    }, { headers: corsHeaders })
  } catch (err) {
    console.error('Track API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders })
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
      ...corsHeaders,
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}
