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

// Comprehensive bot detection with scoring
interface BotDetectionResult {
  isBot: boolean
  score: number  // 0-100, higher = more likely bot
  reasons: string[]
}

function detectBot(ua: string, hasFingerprint: boolean, source?: string): BotDetectionResult {
  const reasons: string[] = []
  let score = 0

  // Check for known bot patterns (definitive)
  const definiteBotPatterns = [
    { pattern: /SentryUptimeBot/i, name: 'sentry_uptime', score: 100 },
    { pattern: /facebookexternalhit/i, name: 'facebook_crawler', score: 100 },
    { pattern: /AhrefsBot/i, name: 'ahrefs_seo', score: 100 },
    { pattern: /SEMrushBot/i, name: 'semrush_seo', score: 100 },
    { pattern: /MJ12bot/i, name: 'majestic_seo', score: 100 },
    { pattern: /Googlebot/i, name: 'googlebot', score: 100 },
    { pattern: /bingbot/i, name: 'bingbot', score: 100 },
    { pattern: /YandexBot/i, name: 'yandex', score: 100 },
    { pattern: /DuckDuckBot/i, name: 'duckduckgo', score: 100 },
    { pattern: /Baiduspider/i, name: 'baidu', score: 100 },
    { pattern: /Slackbot/i, name: 'slack_preview', score: 100 },
    { pattern: /Twitterbot/i, name: 'twitter_preview', score: 100 },
    { pattern: /LinkedInBot/i, name: 'linkedin_preview', score: 100 },
    { pattern: /WhatsApp/i, name: 'whatsapp_preview', score: 100 },
    { pattern: /Discordbot/i, name: 'discord_preview', score: 100 },
    { pattern: /TelegramBot/i, name: 'telegram_preview', score: 100 },
    { pattern: /Applebot/i, name: 'applebot', score: 100 },
    { pattern: /PingdomBot/i, name: 'pingdom_monitor', score: 100 },
    { pattern: /UptimeRobot/i, name: 'uptimerobot_monitor', score: 100 },
    { pattern: /StatusCake/i, name: 'statuscake_monitor', score: 100 },
    { pattern: /vercel-screenshot/i, name: 'vercel_screenshot', score: 100 },
    { pattern: /vercel-favicon/i, name: 'vercel_favicon', score: 100 },
    { pattern: /Vercel Edge/i, name: 'vercel_edge', score: 100 },
    { pattern: /EasyPost/i, name: 'easypost_webhook', score: 100 },
    { pattern: /Go-http-client/i, name: 'go_client', score: 90 },
    { pattern: /python-requests/i, name: 'python_requests', score: 90 },
    { pattern: /axios/i, name: 'axios_client', score: 90 },
    { pattern: /node-fetch/i, name: 'node_fetch', score: 90 },
    { pattern: /WordPress/i, name: 'wordpress', score: 100 },
    { pattern: /ChatGPT-User/i, name: 'chatgpt', score: 100 },
    { pattern: /GPTBot/i, name: 'gptbot', score: 100 },
    { pattern: /anthropic-ai/i, name: 'anthropic', score: 100 },
    { pattern: /Claude-Web/i, name: 'claude', score: 100 },
    { pattern: /PerplexityBot/i, name: 'perplexity', score: 100 },
    { pattern: /meta-externalagent/i, name: 'meta_agent', score: 100 },
  ]

  // Check definitive bot patterns
  for (const { pattern, name, score: patternScore } of definiteBotPatterns) {
    if (pattern.test(ua)) {
      reasons.push(name)
      score = Math.max(score, patternScore)
    }
  }

  // Check generic bot indicators
  const genericBotPatterns = [
    { pattern: /bot/i, name: 'generic_bot', score: 80 },
    { pattern: /crawler/i, name: 'generic_crawler', score: 80 },
    { pattern: /spider/i, name: 'generic_spider', score: 80 },
    { pattern: /scraper/i, name: 'generic_scraper', score: 80 },
  ]

  for (const { pattern, name, score: patternScore } of genericBotPatterns) {
    if (pattern.test(ua) && !reasons.length) {
      reasons.push(name)
      score = Math.max(score, patternScore)
    }
  }

  // Check for headless browsers (high suspicion)
  const headlessBrowserPatterns = [
    { pattern: /HeadlessChrome/i, name: 'headless_chrome', score: 95 },
    { pattern: /PhantomJS/i, name: 'phantomjs', score: 95 },
    { pattern: /Puppeteer/i, name: 'puppeteer', score: 95 },
    { pattern: /Playwright/i, name: 'playwright', score: 95 },
    { pattern: /Selenium/i, name: 'selenium', score: 95 },
    { pattern: /WebDriver/i, name: 'webdriver', score: 95 },
    { pattern: /Lighthouse/i, name: 'lighthouse', score: 90 },
  ]

  for (const { pattern, name, score: patternScore } of headlessBrowserPatterns) {
    if (pattern.test(ua)) {
      reasons.push(name)
      score = Math.max(score, patternScore)
    }
  }

  // Suspicious user agent patterns
  if (!ua || ua.length < 10) {
    reasons.push('empty_or_short_ua')
    score = Math.max(score, 70)
  }

  // Missing expected browser features in UA
  if (ua && !/(Mozilla|Chrome|Safari|Firefox|Edge|Opera)/i.test(ua) && score < 50) {
    reasons.push('non_browser_ua')
    score = Math.max(score, 60)
  }

  // Old Chrome versions (often used by bots)
  const chromeMatch = ua.match(/Chrome\/(\d+)/)
  if (chromeMatch) {
    const chromeVersion = parseInt(chromeMatch[1])
    if (chromeVersion < 90) {
      reasons.push('outdated_chrome')
      score = Math.max(score, 40)
    }
  }

  // Edge request from server (no fingerprint on initial page load is OK)
  // But if source is 'client' and no fingerprint, suspicious
  if (source === 'client' && !hasFingerprint) {
    reasons.push('no_js_fingerprint')
    score = Math.max(score, 50)
  }

  return {
    isBot: score >= 70,
    score,
    reasons
  }
}

// Simple boolean check for backwards compatibility
function isBot(ua: string): boolean {
  return detectBot(ua, false).isBot
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
      store_id,
      page_url,
      page_path,
      referrer,
      visitor_id,
      session_id,
      fingerprint_id,
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
      is_new_session,
      // Source: 'edge' for server-side, 'client' for browser
      source,
      // User agent from edge middleware
      user_agent,
      // Geo from edge middleware or browser
      city: edgeCity,
      region: edgeRegion,
      country: edgeCountry,
      // Browser-provided geolocation (most accurate)
      latitude: browserLat,
      longitude: browserLng,
      geolocation_source: browserGeoSource,
      geolocation_accuracy: browserGeoAccuracy,
    } = body

    if (!store_id) {
      return NextResponse.json({ error: 'store_id required' }, { status: 400, headers: corsHeaders })
    }

    // Get geolocation with priority: browser GPS > ipinfo.io > Vercel headers
    let latitude: number | null = null
    let longitude: number | null = null
    let city: string | null = edgeCity || request.headers.get('x-vercel-ip-city')
    let region: string | null = edgeRegion || request.headers.get('x-vercel-ip-country-region')
    let country: string | null = edgeCountry || request.headers.get('x-vercel-ip-country')
    let postalCode: string | null = null
    let geoSource = 'vercel_headers'
    let geoAccuracy: number | null = null

    // Priority 1: Browser-provided GPS coordinates (most accurate)
    if (browserLat && browserLng && browserGeoSource === 'browser_gps') {
      latitude = parseFloat(String(browserLat))
      longitude = parseFloat(String(browserLng))
      geoSource = 'browser_gps'
      geoAccuracy = browserGeoAccuracy || null
      console.log('[Track API] Using browser GPS:', { latitude, longitude, accuracy: geoAccuracy })
    }
    // Priority 2: Use ipinfo.io for accurate IP-based geolocation
    else {
      const ipinfoToken = process.env.IPINFO_TOKEN
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 request.headers.get('x-real-ip') ||
                 null

      // Enhanced debug logging to diagnose ipinfo coverage issues
      console.log('[Track API] IP Detection:', {
        xForwardedFor: request.headers.get('x-forwarded-for'),
        xRealIp: request.headers.get('x-real-ip'),
        extractedIp: ip,
        hasToken: !!ipinfoToken,
        tokenLength: ipinfoToken?.length || 0
      })

      if (ipinfoToken && ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.')) {
        try {
          console.log('[Track API] ✓ Fetching ipinfo for IP:', ip)
          const ipinfoResponse = await fetch(`https://ipinfo.io/${ip}?token=${ipinfoToken}`, {
            headers: { 'Accept': 'application/json' }
          })

          if (ipinfoResponse.ok) {
            const ipinfoData = await ipinfoResponse.json()
            console.log('[Track API] ipinfo.io response:', ipinfoData)

            // Parse lat,lng from ipinfo "loc" field (format: "37.4056,-122.0775")
            if (ipinfoData.loc) {
              const [lat, lng] = ipinfoData.loc.split(',').map(Number)
              if (!isNaN(lat) && !isNaN(lng)) {
                latitude = lat
                longitude = lng
                geoSource = 'ipinfo'

                // ipinfo Plus provides accuracy_radius (in km)
                // Convert to meters for consistency with GPS accuracy
                if (ipinfoData.accuracy_radius) {
                  geoAccuracy = ipinfoData.accuracy_radius * 1000 // km to meters
                  console.log('[Track API] ipinfo accuracy radius:', geoAccuracy, 'meters')
                }

                console.log('[Track API] Using ipinfo.io coordinates:', {
                  latitude,
                  longitude,
                  postal: ipinfoData.postal,
                  accuracy_km: ipinfoData.accuracy_radius
                })
              }
            }

            // Use ipinfo city/region/country/postal if available (more reliable than Vercel headers)
            city = ipinfoData.city || city
            region = ipinfoData.region || region
            country = ipinfoData.country || country
            postalCode = ipinfoData.postal || null

            // Log postal code for debugging
            if (postalCode) {
              console.log('[Track API] ZIP code:', postalCode)
            }
          }
        } catch (err) {
          console.error('[Track API] ✗ ipinfo.io error:', err)
          // Fall through to Vercel headers
        }
      } else {
        // Log why ipinfo was skipped
        console.log('[Track API] ✗ Skipped ipinfo:', {
          reason: !ipinfoToken ? 'NO_TOKEN' :
                  !ip ? 'NO_IP' :
                  ip === '127.0.0.1' ? 'LOCALHOST' :
                  ip.startsWith('192.168.') ? 'PRIVATE_IP' : 'UNKNOWN',
          ip: ip || 'null'
        })
      }

      // Priority 3: Fallback to Vercel headers (datacenter IPs, less accurate)
      if (!latitude || !longitude) {
        const vercelLat = request.headers.get('x-vercel-ip-latitude')
        const vercelLng = request.headers.get('x-vercel-ip-longitude')
        if (vercelLat && vercelLng) {
          latitude = parseFloat(vercelLat)
          longitude = parseFloat(vercelLng)
          geoSource = 'vercel_headers'
          console.log('[Track API] Using Vercel headers (datacenter):', { latitude, longitude })
        }
      }
    }

    // Get user agent for device detection - prefer edge-provided
    const userAgent = user_agent || request.headers.get('user-agent') || ''
    const deviceType = detectDeviceType(userAgent)
    const { browser, os } = parseUserAgent(userAgent)

    // Use comprehensive bot detection with scoring
    const hasFingerprint = !!fingerprint_id
    const botDetection = detectBot(userAgent, hasFingerprint, source)

    // Log bot detection for monitoring
    if (botDetection.isBot) {
      console.log('[Track API] Bot detected:', {
        score: botDetection.score,
        reasons: botDetection.reasons,
        ua: userAgent.substring(0, 100)
      })
    }

    // Detect channel from referrer and UTM
    const channel = detectChannel(referrer, utm_source, utm_medium)

    // Use provided session ID or generate new one
    const sessionId = session_id || generateSessionId()

    // Insert visitor record
    const { error } = await supabase
      .from('website_visitors')
      .upsert({
        store_id,
        session_id: sessionId,
        visitor_id,
        fingerprint_id: fingerprint_id || null,
        latitude,
        longitude,
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
        is_bot: botDetection.isBot,
        bot_score: botDetection.score,
        bot_reasons: botDetection.reasons,
        has_js_execution: hasFingerprint,
        // Geolocation tracking fields
        geolocation_source: geoSource,
        geolocation_accuracy: geoAccuracy,
        postal_code: postalCode,
      }, {
        onConflict: 'store_id,session_id'
      })

    if (error) {
      console.error('Visitor tracking error:', error)
      return NextResponse.json({ error: 'Failed to track' }, { status: 500, headers: corsHeaders })
    }

    // Also insert page view record (every page view, not just unique sessions)
    const { page_title } = body
    let pagePath = page_path
    if (!pagePath && page_url) {
      try {
        pagePath = new URL(page_url).pathname
      } catch {
        pagePath = '/'
      }
    }

    // Only use columns that exist in page_views table
    const { error: pvError } = await supabase
      .from('page_views')
      .insert({
        store_id,
        visitor_id,
        session_id: sessionId,
        page_url,
        page_title: page_title || null,
      })

    if (pvError) {
      console.error('Page view tracking error:', pvError.message)
    }

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
  const store_id = url.searchParams.get('v')

  if (!store_id) {
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
      store_id,
      session_id: sessionId,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      city: city ? decodeURIComponent(city) : null,
      region,
      country,
      user_agent: userAgent.substring(0, 500),
      device_type: deviceType,
    }, {
      onConflict: 'store_id,session_id'
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
