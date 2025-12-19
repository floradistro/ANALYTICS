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
    const campaign_name = searchParams.get('campaign_name');

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'vendor_id is required' },
        { status: 400 }
      );
    }

    // Get stats from performance summary view
    let query = supabase
      .from('qr_performance_summary')
      .select('*')
      .eq('vendor_id', vendor_id);

    if (qr_code_id) {
      query = query.eq('qr_code_id', qr_code_id);
      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching QR stats:', error);
        return NextResponse.json(
          { error: 'Failed to fetch stats', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        stats: data
      });
    }

    if (code) {
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

    if (campaign_name) {
      query = query.eq('campaign_name', campaign_name);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching QR stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: data || []
    });

  } catch (error: any) {
    console.error('Error in QR code stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
