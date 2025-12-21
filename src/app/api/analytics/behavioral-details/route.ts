import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const vendorId = url.searchParams.get('vendor_id')
  const dataType = url.searchParams.get('type') // 'rage', 'scroll', 'heatmap', 'recording'
  const startDate = url.searchParams.get('start')
  const endDate = url.searchParams.get('end')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id required' }, { status: 400 })
  }

  const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const end = endDate || new Date().toISOString()

  try {
    let query = supabase
      .from('behavioral_data')
      .select('*')
      .eq('vendor_id', vendorId)
      .gte('collected_at', start)
      .lte('collected_at', end)
      .order('collected_at', { ascending: false })
      .limit(limit)

    if (dataType) {
      query = query.eq('data_type', dataType)
    }

    const { data, error } = await query

    if (error) throw error

    // Enrich with visitor info if we have session_id
    const enrichedData = await Promise.all(
      (data || []).map(async (record) => {
        if (record.session_id) {
          const { data: visitor } = await supabase
            .from('website_visitors')
            .select('visitor_id, fingerprint_id, browser, os, device_type, country, city, page_url, created_at')
            .eq('session_id', record.session_id)
            .limit(1)
            .single()

          return { ...record, visitor }
        }
        return record
      })
    )

    // Group by page for summary
    const byPage: Record<string, { count: number; items: typeof enrichedData }> = {}
    enrichedData.forEach(item => {
      const page = item.page_path || '/'
      if (!byPage[page]) {
        byPage[page] = { count: 0, items: [] }
      }
      byPage[page].count++
      byPage[page].items.push(item)
    })

    return NextResponse.json({
      items: enrichedData,
      byPage,
      total: enrichedData.length,
      dateRange: { start, end }
    })
  } catch (error) {
    console.error('[Behavioral Details] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch behavioral data' }, { status: 500 })
  }
}
