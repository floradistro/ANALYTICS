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
    const type = searchParams.get('type');
    const campaign_name = searchParams.get('campaign_name');
    const is_active = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'vendor_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('qr_codes')
      .select('*', { count: 'exact' })
      .eq('vendor_id', vendor_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (campaign_name) {
      query = query.eq('campaign_name', campaign_name);
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching QR codes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch QR codes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qr_codes: data || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Error in QR code listing:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
