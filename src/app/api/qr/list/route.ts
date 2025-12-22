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
    // Select all fields explicitly including sale-level tracking
    let query = supabase
      .from('qr_codes')
      .select(`
        id, vendor_id, code, name, type,
        destination_url, landing_page_url,
        qr_style, eye_style,
        logo_url, brand_color,
        product_id, order_id, location_id, campaign_name,
        landing_page_title, landing_page_description, landing_page_image_url,
        landing_page_cta_text, landing_page_cta_url,
        is_active, expires_at, max_scans,
        created_at, updated_at, created_by, tags,
        total_scans, unique_scans, last_scanned_at,
        customer_id, staff_id, sold_at, unit_price, quantity_index, location_name
      `)
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

    const rawCodes = data || []

    // Collect unique staff_ids and customer_ids for lookups
    const staffIds = [...new Set(rawCodes.map(qr => qr.staff_id).filter(Boolean))]
    const customerIds = [...new Set(rawCodes.map(qr => qr.customer_id).filter(Boolean))]

    // Fetch staff names from users table
    // staff_id in qr_codes is the Supabase auth.users ID, stored in users.auth_user_id
    let staffMap: Record<string, string> = {}
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('users')
        .select('id, first_name, last_name, auth_user_id')
        .in('auth_user_id', staffIds)

      if (staffData) {
        staffData.forEach(staff => {
          if (staff.auth_user_id) {
            const name = [staff.first_name, staff.last_name].filter(Boolean).join(' ')
            staffMap[staff.auth_user_id] = name || staff.auth_user_id.slice(0, 8) + '...'
          }
        })
      }
    }

    // Fetch customer names from customers table
    let customerMap: Record<string, string> = {}
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .in('id', customerIds)

      if (customerData) {
        customerData.forEach(customer => {
          const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
          customerMap[customer.id] = name || customer.email || 'Unknown Customer'
        })
      }
    }

    // Enrich QR codes with staff and customer names
    const allCodes = rawCodes.map(qr => ({
      ...qr,
      staff_name: qr.staff_id ? staffMap[qr.staff_id] || null : null,
      customer_name: qr.customer_id ? customerMap[qr.customer_id] || null : null
    }))
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
