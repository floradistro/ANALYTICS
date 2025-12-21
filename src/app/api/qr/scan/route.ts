import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UAParser } from 'ua-parser-js';

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
    let { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .eq('vendor_id', vendor_id)
      .single();

    // Auto-create QR code if not found (for product/order codes)
    if (qrError || !qrCode) {
      // Parse code type from prefix: P = product, O = order, L = location, C = campaign
      const codeType = code.charAt(0);
      const shortId = code.substring(1).toUpperCase(); // The 8-char UUID prefix

      if (codeType === 'P' || codeType === 'O' || codeType === 'L') {
        const typeMap: Record<string, string> = {
          'P': 'product',
          'O': 'order',
          'L': 'location'
        };

        // The shortId is first 8 chars of UUID (no dashes). We need to find the full UUID.
        // Product IDs look like: 8e67f0b8-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        // We stored P8E67F0B8 so we need to find product where id starts with 8e67f0b8

        let fullId: string | null = null;
        let itemName = `${typeMap[codeType]} ${shortId}`;
        let destinationUrl = 'https://floradistro.com';
        let coaUrl: string | null = null;

        // Try to find the actual item in the main database
        // Note: This queries the MAIN Supabase (same as storefront), not analytics
        const mainSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (codeType === 'P') {
          // Find product by UUID prefix
          // shortId is like "8E67F0B8", product id is like "8e67f0b8-xxxx-xxxx-xxxx-xxxx"
          // We need to match the first 8 chars of the UUID (no dashes)
          const searchPattern = shortId.toLowerCase();

          // Fetch all products and find one that matches the prefix
          // Note: coa_url is in custom_fields, not a direct column
          const { data: products, error: productError } = await mainSupabase
            .from('products')
            .select('id, name, custom_fields')
            .limit(1000);

          if (productError) {
            console.error('Product lookup error:', productError);
          }

          console.log(`Product lookup - searching for ${searchPattern} in ${products?.length || 0} products`);

          if (products) {
            // Find product where id starts with the pattern (UUIDs have dashes, so we remove them)
            const product = products.find(p =>
              p.id.replace(/-/g, '').toLowerCase().startsWith(searchPattern)
            );

            if (product) {
              console.log(`Found product: ${product.name} (${product.id})`);
              fullId = product.id;
              itemName = product.name;
              // Extract COA URL from custom_fields if available
              const cf = product.custom_fields as Record<string, any> || {};
              coaUrl = cf.coa_url || cf.coaUrl || cf.coa_file_url || null;
              destinationUrl = coaUrl || `https://floradistro.com/product/${product.id}`;
            }
          }
        } else if (codeType === 'O') {
          const { data: orders } = await mainSupabase
            .from('orders')
            .select('id, order_number')
            .limit(1000);

          if (orders) {
            const searchPattern = shortId.toLowerCase();
            const order = orders.find(o =>
              o.id.replace(/-/g, '').toLowerCase().startsWith(searchPattern)
            );

            if (order) {
              fullId = order.id;
              itemName = `Order #${order.order_number || order.id.substring(0, 8)}`;
              destinationUrl = `https://floradistro.com/orders/${order.id}`;
            }
          }
        }

        const { data: newQrCode, error: createError } = await supabase
          .from('qr_codes')
          .insert({
            vendor_id,
            code,
            name: itemName,
            type: typeMap[codeType],
            destination_url: destinationUrl,
            is_active: true,
            product_id: codeType === 'P' ? fullId : null,
            order_id: codeType === 'O' ? fullId : null,
            location_id: codeType === 'L' ? fullId : null,
            campaign_name: 'auto_created'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error auto-creating QR code:', createError);
          return NextResponse.json(
            { error: 'QR code not found and auto-creation failed', details: createError.message },
            { status: 404 }
          );
        }

        qrCode = newQrCode;
        console.log(`Auto-created QR code: ${code} -> ${fullId || 'unknown'} (${typeMap[codeType]})`);
      } else {
        // Unknown code format - can't auto-create
        return NextResponse.json(
          { error: 'QR code not found' },
          { status: 404 }
        );
      }
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
        product_id: qrCode.product_id,
        order_id: qrCode.order_id,
        location_id: qrCode.location_id,
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
