import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Fetch all QR codes for a vendor with full data
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const vendorId = searchParams.get('vendor_id')
  const type = searchParams.get('type')

  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id is required' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('qr_codes')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching QR codes:', error)
      return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
    }

    // Calculate stats
    const allCodes = data || []
    const totalScans = allCodes.reduce((sum, qr) => sum + (qr.total_scans || 0), 0)
    const uniqueScans = allCodes.reduce((sum, qr) => sum + (qr.unique_scans || 0), 0)

    const byType: Record<string, number> = {}
    allCodes.forEach((qr) => {
      byType[qr.type] = (byType[qr.type] || 0) + 1
    })

    // Count codes with recent scans (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentlyScanned = allCodes.filter(qr =>
      qr.last_scanned_at && new Date(qr.last_scanned_at) >= sevenDaysAgo
    ).length

    return NextResponse.json({
      success: true,
      qr_codes: allCodes,
      stats: {
        total: allCodes.length,
        totalScans,
        uniqueScans,
        byType,
        recentScans: recentlyScanned,
      }
    })
  } catch (err) {
    console.error('Error fetching QR codes:', err)
    return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
  }
}
