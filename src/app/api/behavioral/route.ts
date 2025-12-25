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
      page_url,
      page_path,
      type, // 'heatmap' | 'scroll' | 'form' | 'rage' | 'recording'
      data,
      collected_at,
    } = body

    if (!store_id || !type) {
      return NextResponse.json(
        { error: 'store_id and type required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[Behavioral API] Received:', {
      store_id,
      visitor_id: visitor_id?.substring(0, 20),
      type,
      dataSize: JSON.stringify(data).length,
    })

    // Store behavioral data
    const { error } = await supabase
      .from('behavioral_data')
      .insert({
        store_id,
        visitor_id,
        session_id,
        page_url,
        page_path,
        data_type: type,
        data,
        collected_at: collected_at || new Date().toISOString(),
      })

    if (error) {
      // If table doesn't exist, log but don't fail
      if (error.code === '42P01') {
        console.log('[Behavioral API] Table does not exist yet, data logged only')
        return NextResponse.json({ success: true, stored: false }, { headers: corsHeaders })
      }
      console.error('[Behavioral API] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to store behavioral data' },
        { status: 500, headers: corsHeaders }
      )
    }

    // For rage clicks, also update the visitor record to flag potential UX issues
    if (type === 'rage' && Array.isArray(data) && data.length > 0) {
      const rageCount = data.reduce((sum: number, r: { count?: number }) => sum + (r.count || 1), 0)

      // Update visitor with rage click count
      await supabase
        .from('website_visitors')
        .update({
          rage_click_count: rageCount,
          has_ux_issues: true,
        })
        .eq('store_id', store_id)
        .eq('session_id', session_id)
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err) {
    console.error('[Behavioral API] Error:', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET endpoint to retrieve behavioral data for a session (for replay)
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const store_id = url.searchParams.get('store_id')
  const session_id = url.searchParams.get('session_id')
  const type = url.searchParams.get('type')

  if (!store_id) {
    return NextResponse.json(
      { error: 'store_id required' },
      { status: 400, headers: corsHeaders }
    )
  }

  let query = supabase
    .from('behavioral_data')
    .select('*')
    .eq('store_id', store_id)
    .order('collected_at', { ascending: true })

  if (session_id) {
    query = query.eq('session_id', session_id)
  }

  if (type) {
    query = query.eq('data_type', type)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    console.error('[Behavioral API] Query error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500, headers: corsHeaders }
    )
  }

  return NextResponse.json({ data }, { headers: corsHeaders })
}
