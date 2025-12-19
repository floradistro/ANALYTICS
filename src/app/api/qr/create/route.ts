import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      vendor_id,
      code, // Short unique code (e.g., "ORD123", "PROD456")
      name, // Human-readable name
      type, // product, order, location, campaign, custom
      destination_url, // Where QR redirects
      landing_page_url, // Optional custom landing page
      qr_style = 'rounded',
      eye_style = 'rounded',
      logo_url,
      brand_color,
      product_id,
      order_id,
      location_id,
      campaign_name,
      landing_page_title,
      landing_page_description,
      landing_page_image_url,
      landing_page_cta_text,
      landing_page_cta_url,
      expires_at,
      max_scans,
      tags = [],
      created_by
    } = body;

    // Validation
    if (!vendor_id || !code || !type || !destination_url) {
      return NextResponse.json(
        { error: 'Missing required fields: vendor_id, code, type, destination_url' },
        { status: 400 }
      );
    }

    // Check if code already exists for this vendor
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('id')
      .eq('vendor_id', vendor_id)
      .eq('code', code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'QR code with this code already exists for this vendor' },
        { status: 409 }
      );
    }

    // Create QR code
    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        vendor_id,
        code,
        name,
        type,
        destination_url,
        landing_page_url,
        qr_style,
        eye_style,
        logo_url,
        brand_color,
        product_id,
        order_id,
        location_id,
        campaign_name,
        landing_page_title,
        landing_page_description,
        landing_page_image_url,
        landing_page_cta_text,
        landing_page_cta_url,
        expires_at,
        max_scans,
        tags,
        created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating QR code:', error);
      return NextResponse.json(
        { error: 'Failed to create QR code', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qr_code: data
    });

  } catch (error: any) {
    console.error('Error in QR code creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
