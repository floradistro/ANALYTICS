import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/qr/ctas/click - Track CTA click with GPS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      cta_id,
      qr_code_id,
      scan_id,
      vendor_id,
      visitor_id,
      fingerprint_id,
      session_id,
      latitude,
      longitude,
      city,
      region,
      country,
      time_since_scan_seconds,
      cta_position,
      total_ctas_shown,
      device_type,
      browser_name,
      user_agent,
      referrer
    } = body

    // Validate required fields
    if (!cta_id || !qr_code_id || !vendor_id) {
      return NextResponse.json(
        { error: 'Missing required fields: cta_id, qr_code_id, vendor_id' },
        { status: 400 }
      )
    }

    // Get IP address from request
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      null

    // Insert click record
    const { data: click, error } = await supabase
      .from('qr_cta_clicks')
      .insert({
        cta_id,
        qr_code_id,
        scan_id,
        vendor_id,
        visitor_id,
        fingerprint_id,
        session_id,
        latitude,
        longitude,
        city,
        region,
        country,
        time_since_scan_seconds,
        cta_position,
        total_ctas_shown,
        device_type,
        browser_name,
        user_agent,
        ip_address,
        referrer
      })
      .select()
      .single()

    if (error) {
      console.error('Error tracking CTA click:', error)
      return NextResponse.json(
        { error: 'Failed to track click' },
        { status: 500 }
      )
    }

    // The trigger update_cta_stats() will automatically update the CTA stats

    return NextResponse.json({ click })
  } catch (error) {
    console.error('Error in POST /api/qr/ctas/click:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/qr/ctas/click/analytics?cta_id=xxx or qr_code_id=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ctaId = searchParams.get('cta_id')
    const qrCodeId = searchParams.get('qr_code_id')
    const groupBy = searchParams.get('group_by') || 'city' // city, region, hour, day

    if (!ctaId && !qrCodeId) {
      return NextResponse.json(
        { error: 'Either cta_id or qr_code_id is required' },
        { status: 400 }
      )
    }

    let query = supabase.from('qr_cta_clicks').select('*')

    if (ctaId) {
      query = query.eq('cta_id', ctaId)
    } else if (qrCodeId) {
      query = query.eq('qr_code_id', qrCodeId)
    }

    const { data: clicks, error } = await query

    if (error) {
      console.error('Error fetching CTA click analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    // Group data based on group_by parameter
    let analytics: any = {
      total_clicks: clicks?.length || 0,
      unique_visitors: new Set(clicks?.map(c => c.fingerprint_id).filter(Boolean)).size,
      clicks_by_location: {},
      clicks_by_time: {},
      avg_time_to_click: 0,
      avg_position: 0
    }

    if (clicks && clicks.length > 0) {
      // Group by location
      clicks.forEach(click => {
        const key = groupBy === 'region' ? click.region : click.city
        if (key) {
          if (!analytics.clicks_by_location[key]) {
            analytics.clicks_by_location[key] = {
              count: 0,
              unique: new Set(),
              coords: []
            }
          }
          analytics.clicks_by_location[key].count++
          if (click.fingerprint_id) {
            analytics.clicks_by_location[key].unique.add(click.fingerprint_id)
          }
          if (click.latitude && click.longitude) {
            analytics.clicks_by_location[key].coords.push({
              lat: click.latitude,
              lng: click.longitude
            })
          }
        }
      })

      // Convert sets to counts
      Object.keys(analytics.clicks_by_location).forEach(key => {
        analytics.clicks_by_location[key].unique_count = analytics.clicks_by_location[key].unique.size
        delete analytics.clicks_by_location[key].unique
      })

      // Calculate averages
      const validTimings = clicks.filter(c => c.time_since_scan_seconds !== null)
      if (validTimings.length > 0) {
        analytics.avg_time_to_click = validTimings.reduce((sum, c) => sum + (c.time_since_scan_seconds || 0), 0) / validTimings.length
      }

      const validPositions = clicks.filter(c => c.cta_position !== null)
      if (validPositions.length > 0) {
        analytics.avg_position = validPositions.reduce((sum, c) => sum + (c.cta_position || 0), 0) / validPositions.length
      }

      // Group by time (hour of day)
      clicks.forEach(click => {
        const hour = new Date(click.clicked_at).getHours()
        analytics.clicks_by_time[hour] = (analytics.clicks_by_time[hour] || 0) + 1
      })
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error in GET /api/qr/ctas/click/analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
