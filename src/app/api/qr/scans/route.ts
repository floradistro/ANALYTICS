import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Fetch scans for a specific QR code
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const qrCodeId = searchParams.get('qr_code_id')
  const vendorId = searchParams.get('vendor_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!qrCodeId || !vendorId) {
    return NextResponse.json(
      { error: 'qr_code_id and vendor_id are required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('qr_scans')
      .select('id, qr_code_id, scanned_at, city, region, country, device_type, browser_name, os_name, is_first_scan, latitude, longitude')
      .eq('qr_code_id', qrCodeId)
      .eq('vendor_id', vendorId)
      .order('scanned_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching scans:', error)
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
    }

    // Map is_first_scan to is_unique for frontend consistency
    const scans = (data || []).map(scan => ({
      ...scan,
      is_unique: scan.is_first_scan ?? false
    }))

    return NextResponse.json({
      success: true,
      scans,
      total: scans.length
    })
  } catch (err) {
    console.error('Error fetching scans:', err)
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
  }
}
