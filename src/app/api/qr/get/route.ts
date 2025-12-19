import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const qr_code_id = searchParams.get('qr_code_id');
    const vendor_id = searchParams.get('vendor_id');

    if (!code && !qr_code_id) {
      return NextResponse.json(
        { error: 'code or qr_code_id is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('qr_codes').select('*');

    if (qr_code_id) {
      query = query.eq('id', qr_code_id);
    } else if (code) {
      query = query.eq('code', code);
      if (vendor_id) {
        query = query.eq('vendor_id', vendor_id);
      }
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'QR code not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching QR code:', error);
      return NextResponse.json(
        { error: 'Failed to fetch QR code', details: error.message },
        { status: 500 }
      );
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({
        success: true,
        qr_code: data,
        expired: true
      });
    }

    // Check if max scans reached
    if (data.max_scans && data.total_scans >= data.max_scans) {
      return NextResponse.json({
        success: true,
        qr_code: data,
        max_scans_reached: true
      });
    }

    return NextResponse.json({
      success: true,
      qr_code: data
    });

  } catch (error: any) {
    console.error('Error in QR code get:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
