import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import UAParser from 'ua-parser-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      code, // QR code
      vendor_id,
      visitor_id,
      fingerprint_id,
      session_id,
      // Location data
      latitude,
      longitude,
      geolocation_accuracy,
      geolocation_source,
      city,
      region,
      country,
      postal_code,
      timezone,
      // Referrer & UTM
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      // Custom data
      custom_data
    } = body;

    // Validation
    if (!code || !vendor_id) {
      return NextResponse.json(
        { error: 'Missing required fields: code, vendor_id' },
        { status: 400 }
      );
    }

    // Get QR code
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .eq('vendor_id', vendor_id)
      .single();

    if (qrError || !qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // Check if active
    if (!qrCode.is_active) {
      return NextResponse.json(
        { error: 'QR code is not active' },
        { status: 403 }
      );
    }

    // Check if expired
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'QR code has expired' },
        { status: 410 }
      );
    }

    // Check if max scans reached
    if (qrCode.max_scans && qrCode.total_scans >= qrCode.max_scans) {
      return NextResponse.json(
        { error: 'QR code has reached maximum scans' },
        { status: 429 }
      );
    }

    // Parse user agent
    const userAgent = request.headers.get('user-agent') || '';
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] :
                request.headers.get('x-real-ip') ||
                'unknown';

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('qr_scans')
      .insert({
        qr_code_id: qrCode.id,
        vendor_id,
        visitor_id,
        fingerprint_id,
        session_id,
        // Location
        latitude,
        longitude,
        geolocation_accuracy,
        geolocation_source,
        city,
        region,
        country,
        postal_code,
        timezone,
        // Device & Browser
        user_agent: userAgent,
        device_type: uaResult.device.type || 'desktop',
        device_brand: uaResult.device.vendor || null,
        device_model: uaResult.device.model || null,
        os_name: uaResult.os.name || null,
        os_version: uaResult.os.version || null,
        browser_name: uaResult.browser.name || null,
        browser_version: uaResult.browser.version || null,
        // Network
        ip_address: ip,
        // Referrer & UTM
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        // Custom
        custom_data
      })
      .select()
      .single();

    if (scanError) {
      console.error('Error creating scan record:', scanError);
      return NextResponse.json(
        { error: 'Failed to record scan', details: scanError.message },
        { status: 500 }
      );
    }

    // Return QR code data for redirect/landing page
    return NextResponse.json({
      success: true,
      scan_id: scan.id,
      qr_code: {
        id: qrCode.id,
        code: qrCode.code,
        name: qrCode.name,
        type: qrCode.type,
        destination_url: qrCode.destination_url,
        landing_page_url: qrCode.landing_page_url,
        landing_page_title: qrCode.landing_page_title,
        landing_page_description: qrCode.landing_page_description,
        landing_page_image_url: qrCode.landing_page_image_url,
        landing_page_cta_text: qrCode.landing_page_cta_text,
        landing_page_cta_url: qrCode.landing_page_cta_url,
        campaign_name: qrCode.campaign_name
      },
      is_first_scan: scan.is_first_scan
    });

  } catch (error: any) {
    console.error('Error in QR code scan tracking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
