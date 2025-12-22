import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Build landing_page object from database row (individual columns)
function buildLandingPageFromRow(row: any) {
  const type = row.type || 'product'

  // Build CTA buttons based on stored values
  const ctaButtons: any[] = []

  if (row.landing_page_cta_text) {
    ctaButtons.push({
      label: row.landing_page_cta_text,
      action: row.landing_page_cta_url ? 'url' : (type === 'product' ? 'coa' : 'url'),
      url: row.landing_page_cta_url || undefined,
      style: 'primary'
    })
  }

  // Add default secondary button based on type
  if (type === 'product') {
    ctaButtons.push({ label: 'Shop Online', action: 'shop', style: 'secondary' })
  } else if (type === 'order') {
    ctaButtons.push({ label: 'Contact Support', action: 'support', style: 'secondary' })
  }

  // Default buttons if none exist
  if (ctaButtons.length === 0) {
    if (type === 'product') {
      ctaButtons.push(
        { label: 'View Lab Results', action: 'coa', style: 'primary' },
        { label: 'Shop Online', action: 'shop', style: 'secondary' }
      )
    } else if (type === 'order') {
      ctaButtons.push(
        { label: 'Track Order', action: 'track', style: 'primary' },
        { label: 'Contact Support', action: 'support', style: 'secondary' }
      )
    } else {
      ctaButtons.push({ label: 'Learn More', action: 'url', url: '', style: 'primary' })
    }
  }

  return {
    title: row.landing_page_title || row.name || 'Welcome',
    description: row.landing_page_description || '',
    theme: row.landing_page_theme || 'dark',
    image_url: row.landing_page_image_url || undefined,
    show_product_info: type === 'product',
    show_coa: type === 'product',
    show_order_status: type === 'order',
    show_tracking: type === 'order',
    cta_buttons: ctaButtons
  }
}

// GET - Fetch QR analytics stats
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const vendorId = searchParams.get('vendor_id')
  const qrCodeId = searchParams.get('qr_code_id')
  const type = searchParams.get('type')
  const days = parseInt(searchParams.get('days') || '30')

  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id is required' }, { status: 400 })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // Get QR code summary stats (including landing page columns)
    let qrQuery = supabase
      .from('qr_codes')
      .select('id, code, type, name, total_scans, unique_scans, is_active, created_at, last_scanned_at, landing_page_title, landing_page_description, landing_page_image_url, landing_page_cta_text, landing_page_cta_url, landing_page_theme')
      .eq('vendor_id', vendorId)

    if (qrCodeId) {
      qrQuery = qrQuery.eq('id', qrCodeId)
    }
    if (type) {
      qrQuery = qrQuery.eq('type', type)
    }

    const { data: qrCodes, error: qrError } = await qrQuery

    if (qrError) {
      console.error('Error fetching QR codes:', qrError)
      return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
    }

    // Get scan analytics for the period
    let scansQuery = supabase
      .from('qr_scans')
      .select('id, qr_code_id, vendor_id, visitor_id, city, region, country, device_type, browser_name, os_name, is_first_scan, scanned_at, latitude, longitude')
      .eq('vendor_id', vendorId)
      .gte('scanned_at', startDate.toISOString())
      .order('scanned_at', { ascending: false })

    if (qrCodeId) {
      scansQuery = scansQuery.eq('qr_code_id', qrCodeId)
    }

    const { data: scans, error: scansError } = await scansQuery

    if (scansError) {
      console.error('Error fetching scans:', scansError)
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
    }

    // Calculate aggregated stats
    const totalScans = scans?.length || 0
    const uniqueScans = scans?.filter(s => s.is_first_scan).length || 0

    // Geographic breakdown
    const byCity: Record<string, number> = {}
    const byCountry: Record<string, number> = {}
    const byDevice: Record<string, number> = {}

    // Time series (daily)
    const byDay: Record<string, number> = {}

    scans?.forEach(scan => {
      // City
      if (scan.city) {
        byCity[scan.city] = (byCity[scan.city] || 0) + 1
      }
      // Country
      if (scan.country) {
        byCountry[scan.country] = (byCountry[scan.country] || 0) + 1
      }
      // Device
      const device = scan.device_type || 'unknown'
      byDevice[device] = (byDevice[device] || 0) + 1

      // Day
      const day = scan.scanned_at?.substring(0, 10)
      if (day) {
        byDay[day] = (byDay[day] || 0) + 1
      }
    })

    // Convert to sorted arrays
    const topCities = Object.entries(byCity)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topCountries = Object.entries(byCountry)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const devices = Object.entries(byDevice)
      .map(([device, count]) => ({ device, count, percentage: totalScans > 0 ? (count / totalScans) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)

    // Generate daily time series for the period
    const timeSeries: Array<{ date: string; scans: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().substring(0, 10)
      timeSeries.push({
        date: dateStr,
        scans: byDay[dateStr] || 0
      })
    }

    // QR code type breakdown
    const byType: Record<string, { count: number; totalScans: number; uniqueScans: number }> = {}
    qrCodes?.forEach(qr => {
      if (!byType[qr.type]) {
        byType[qr.type] = { count: 0, totalScans: 0, uniqueScans: 0 }
      }
      byType[qr.type].count++
      byType[qr.type].totalScans += qr.total_scans || 0
      byType[qr.type].uniqueScans += qr.unique_scans || 0
    })

    const typeBreakdown = Object.entries(byType)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.totalScans - a.totalScans)

    // Recent scans (last 20) - map is_first_scan to is_unique for frontend consistency
    const recentScans = scans?.slice(0, 20).map(scan => ({
      id: scan.id,
      qr_code_id: scan.qr_code_id,
      city: scan.city,
      country: scan.country,
      device_type: scan.device_type,
      is_unique: scan.is_first_scan ?? false,
      scanned_at: scan.scanned_at
    })) || []

    return NextResponse.json({
      success: true,
      period: {
        days,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        total_qr_codes: qrCodes?.length || 0,
        active_qr_codes: qrCodes?.filter(q => q.is_active).length || 0,
        total_scans: totalScans,
        unique_scans: uniqueScans,
        scans_with_location: scans?.filter(s => s.latitude || s.city).length || 0
      },
      type_breakdown: typeBreakdown,
      time_series: timeSeries,
      top_cities: topCities,
      top_countries: topCountries,
      devices,
      recent_scans: recentScans,
      qr_codes: qrCodes?.map(qr => ({
        id: qr.id,
        code: qr.code,
        type: qr.type,
        name: qr.name,
        total_scans: qr.total_scans,
        unique_scans: qr.unique_scans,
        is_active: qr.is_active,
        last_scanned_at: qr.last_scanned_at,
        landing_page: buildLandingPageFromRow(qr)
      })) || []
    })
  } catch (err) {
    console.error('Error calculating stats:', err)
    return NextResponse.json({ error: 'Failed to calculate stats' }, { status: 500 })
  }
}
