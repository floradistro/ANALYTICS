import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/qr/scans?qr_code_id=xxx&limit=10
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const qrCodeId = searchParams.get('qr_code_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!qrCodeId) {
      return NextResponse.json(
        { error: 'qr_code_id is required' },
        { status: 400 }
      )
    }

    const { data: scans, error } = await supabase
      .from('qr_scans')
      .select('*')
      .eq('qr_code_id', qrCodeId)
      .order('scanned_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching scans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scans: scans || [] })
  } catch (error) {
    console.error('Error in GET /api/qr/scans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
