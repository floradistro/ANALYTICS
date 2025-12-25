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
      store_id,
      visitor_id,
      session_id,
      fingerprint_id,
      fingerprint_confidence,
      fingerprint_components,
      page_url,
    } = body

    if (!store_id || !fingerprint_id) {
      return NextResponse.json(
        { error: 'store_id and fingerprint_id required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[Fingerprint API] Received fingerprint:', {
      store_id,
      visitor_id,
      session_id,
      fingerprint_id,
      confidence: fingerprint_confidence
    })

    // CRITICAL: Update website_visitors with fingerprint_id and mark JS execution
    // This links the anonymous visitor session to the device fingerprint
    // Also proves this is a real browser (executed JavaScript)
    if (visitor_id || session_id) {
      const { error: visitorUpdateError } = await supabase
        .from('website_visitors')
        .update({
          fingerprint_id,
          has_js_execution: true,  // Fingerprint requires JS - this proves it's a real browser
          is_bot: false,           // If they executed our fingerprint JS, not a bot
          bot_score: 0,
        })
        .eq('store_id', store_id)
        .or(`visitor_id.eq.${visitor_id},session_id.eq.${session_id}`)

      if (visitorUpdateError) {
        console.error('[Fingerprint API] Failed to link fingerprint to visitor:', visitorUpdateError)
      } else {
        console.log('[Fingerprint API] Linked fingerprint to visitor:', { visitor_id, session_id, fingerprint_id })
      }
    }

    // Check if fingerprint already exists
    const { data: existing } = await supabase
      .from('device_fingerprints')
      .select('fingerprint_id, linked_visitor_ids, total_visits')
      .eq('fingerprint_id', fingerprint_id)
      .eq('store_id', store_id)
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
        .eq('store_id', store_id)

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
        store_id,
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
