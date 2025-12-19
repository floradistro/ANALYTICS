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
      fingerprint_confidence,
      fingerprint_components,
      page_url,
    } = body

    if (!vendor_id || !fingerprint_id) {
      return NextResponse.json(
        { error: 'vendor_id and fingerprint_id required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[Fingerprint API] Received fingerprint:', {
      vendor_id,
      visitor_id,
      fingerprint_id,
      confidence: fingerprint_confidence
    })

    // Check if fingerprint already exists
    const { data: existing } = await supabase
      .from('device_fingerprints')
      .select('fingerprint_id, linked_visitor_ids, total_visits')
      .eq('fingerprint_id', fingerprint_id)
      .eq('vendor_id', vendor_id)
      .single()

    if (existing) {
      // Fingerprint exists - update visit count and linked visitor IDs
      const linkedVisitorIds = existing.linked_visitor_ids || []
      if (visitor_id && !linkedVisitorIds.includes(visitor_id)) {
        linkedVisitorIds.push(visitor_id)
      }

      const { error: updateError } = await supabase
        .from('device_fingerprints')
        .update({
          total_visits: existing.total_visits + 1,
          linked_visitor_ids: linkedVisitorIds,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('fingerprint_id', fingerprint_id)
        .eq('vendor_id', vendor_id)

      if (updateError) {
        console.error('[Fingerprint API] Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update fingerprint' },
          { status: 500, headers: corsHeaders }
        )
      }

      console.log('[Fingerprint API] Updated existing fingerprint, total visits:', existing.total_visits + 1)

      return NextResponse.json({
        success: true,
        fingerprint_id,
        is_returning: true,
        total_visits: existing.total_visits + 1,
      }, { headers: corsHeaders })
    }

    // New fingerprint - insert it
    const { error: insertError } = await supabase
      .from('device_fingerprints')
      .insert({
        vendor_id,
        fingerprint_id,
        confidence_score: fingerprint_confidence || 0,
        canvas_fingerprint: fingerprint_components?.canvas?.substring(0, 255) || null,
        webgl_fingerprint: fingerprint_components?.webgl?.substring(0, 255) || null,
        audio_fingerprint: fingerprint_components?.audio?.substring(0, 255) || null,
        screen_resolution: fingerprint_components?.screen || null,
        fonts: fingerprint_components?.fonts || [],
        plugins: fingerprint_components?.plugins || [],
        timezone: fingerprint_components?.timezone || null,
        language: fingerprint_components?.language || null,
        platform: fingerprint_components?.platform || null,
        hardware_concurrency: fingerprint_components?.hardwareConcurrency || null,
        device_memory: fingerprint_components?.deviceMemory || null,
        color_depth: fingerprint_components?.colorDepth || null,
        pixel_ratio: fingerprint_components?.pixelRatio || null,
        touch_support: fingerprint_components?.touchSupport || false,
        cookie_enabled: fingerprint_components?.cookieEnabled || false,
        do_not_track: fingerprint_components?.doNotTrack || null,
        linked_visitor_ids: visitor_id ? [visitor_id] : [],
        total_visits: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[Fingerprint API] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to store fingerprint' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('[Fingerprint API] Created new fingerprint')

    return NextResponse.json({
      success: true,
      fingerprint_id,
      is_returning: false,
      total_visits: 1,
    }, { headers: corsHeaders })
  } catch (err) {
    console.error('[Fingerprint API] Error:', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
