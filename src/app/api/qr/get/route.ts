import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/qr/get
 * Fallback endpoint to fetch QR code data without tracking
 * Used when the scan endpoint fails (e.g., fingerprint issues)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const vendorId = searchParams.get('vendor_id');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code);

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data: qrCode, error } = await query.maybeSingle();

    if (error) {
      console.error('[QR Get] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch QR code' },
        { status: 500 }
      );
    }

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      qr_code: qrCode,
      message: 'QR code fetched without tracking'
    });

  } catch (error: any) {
    console.error('[QR Get] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
