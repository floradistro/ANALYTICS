import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendor_id = searchParams.get('vendor_id');
    const qr_code_id = searchParams.get('qr_code_id');
    const code = searchParams.get('code');

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'vendor_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('qr_scan_heatmap')
      .select('*')
      .eq('vendor_id', vendor_id)
      .order('scan_count', { ascending: false });

    if (qr_code_id) {
      query = query.eq('qr_code_id', qr_code_id);
    } else if (code) {
      // Get QR code ID first
      const { data: qrCode } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('code', code)
        .eq('vendor_id', vendor_id)
        .single();

      if (qrCode) {
        query = query.eq('qr_code_id', qrCode.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching heatmap data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch heatmap data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      heatmap: data || []
    });

  } catch (error: any) {
    console.error('Error in QR code heatmap:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
