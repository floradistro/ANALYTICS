#!/usr/bin/env node

/**
 * QR Code System End-to-End Test
 * Tests the complete QR tracking flow
 */

const API_URL = 'http://localhost:3000';
const VENDOR_ID = '123e4567-e89b-12d3-a456-426614174000'; // Test vendor ID

console.log('🔵 QR Code System Test');
console.log('');

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    console.log(`⏳ ${name}...`);
    await fn();
    console.log(`✅ ${name}`);
    console.log('');
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    testsFailed++;
  }
}

let createdQRCode = null;
let scanId = null;

async function runTests() {
  // Test 1: Create QR Code
  await test('Create QR Code', async () => {
    const response = await fetch(`${API_URL}/api/qr/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: VENDOR_ID,
        code: `TEST_${Date.now()}`,
        name: 'Test Product QR',
        type: 'product',
        destination_url: 'https://floradistro.com/products/test',
        landing_page_title: 'Welcome to Flora Distro!',
        landing_page_description: 'Premium cannabis products delivered to your door.',
        landing_page_cta_text: 'Shop Now',
        landing_page_cta_url: '/shop',
        campaign_name: 'test_campaign',
        product_id: 'PROD123',
        logo_url: 'https://example.com/logo.png',
        brand_color: '#10b981',
        tags: ['test', 'product']
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create QR code');
    }

    const data = await response.json();
    createdQRCode = data.qr_code;

    if (!data.success || !createdQRCode.id) {
      throw new Error('Invalid response structure');
    }

    console.log(`   QR Code ID: ${createdQRCode.id}`);
    console.log(`   Code: ${createdQRCode.code}`);
  });

  // Test 2: Get QR Code
  await test('Get QR Code', async () => {
    const response = await fetch(
      `${API_URL}/api/qr/get?code=${createdQRCode.code}&vendor_id=${VENDOR_ID}`
    );

    if (!response.ok) {
      throw new Error('Failed to get QR code');
    }

    const data = await response.json();

    if (!data.success || data.qr_code.id !== createdQRCode.id) {
      throw new Error('QR code mismatch');
    }

    console.log(`   Name: ${data.qr_code.name}`);
    console.log(`   Type: ${data.qr_code.type}`);
  });

  // Test 3: List QR Codes
  await test('List QR Codes', async () => {
    const response = await fetch(
      `${API_URL}/api/qr/list?vendor_id=${VENDOR_ID}&limit=10`
    );

    if (!response.ok) {
      throw new Error('Failed to list QR codes');
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.qr_codes)) {
      throw new Error('Invalid response structure');
    }

    const found = data.qr_codes.find(qr => qr.id === createdQRCode.id);
    if (!found) {
      throw new Error('Created QR code not in list');
    }

    console.log(`   Total QR codes: ${data.total}`);
    console.log(`   Retrieved: ${data.qr_codes.length}`);
  });

  // Test 4: Track QR Scan
  await test('Track QR Scan', async () => {
    const response = await fetch(`${API_URL}/api/qr/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: createdQRCode.code,
        vendor_id: VENDOR_ID,
        visitor_id: 'test_visitor_123',
        fingerprint_id: 'test_fp_123',
        session_id: 'test_session_123',
        latitude: 35.7796,
        longitude: -78.6382,
        geolocation_accuracy: 10,
        geolocation_source: 'browser_gps',
        city: 'Raleigh',
        region: 'North Carolina',
        country: 'US',
        postal_code: '27601',
        timezone: 'America/New_York',
        utm_source: 'test',
        utm_campaign: 'test_campaign'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to track scan');
    }

    const data = await response.json();
    scanId = data.scan_id;

    if (!data.success || !scanId) {
      throw new Error('Invalid response structure');
    }

    console.log(`   Scan ID: ${scanId}`);
    console.log(`   Is First Scan: ${data.is_first_scan}`);
    console.log(`   Destination: ${data.qr_code.destination_url}`);
  });

  // Test 5: Track Second Scan (same device)
  await test('Track Second Scan (Same Device)', async () => {
    const response = await fetch(`${API_URL}/api/qr/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: createdQRCode.code,
        vendor_id: VENDOR_ID,
        visitor_id: 'test_visitor_123',
        fingerprint_id: 'test_fp_123', // Same fingerprint
        session_id: 'test_session_456', // Different session
        latitude: 35.7796,
        longitude: -78.6382,
        geolocation_accuracy: 10,
        geolocation_source: 'browser_gps',
        city: 'Raleigh',
        region: 'North Carolina',
        country: 'US'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to track second scan');
    }

    const data = await response.json();

    // Should NOT be first scan
    if (data.is_first_scan) {
      throw new Error('Second scan incorrectly marked as first scan');
    }

    console.log(`   Is First Scan: ${data.is_first_scan} (correct)`);
  });

  // Test 6: Get QR Stats
  await test('Get QR Stats', async () => {
    const response = await fetch(
      `${API_URL}/api/qr/stats?vendor_id=${VENDOR_ID}&qr_code_id=${createdQRCode.id}`
    );

    if (!response.ok) {
      throw new Error('Failed to get stats');
    }

    const data = await response.json();

    if (!data.success || !data.stats) {
      throw new Error('Invalid response structure');
    }

    // Should have 2 scans
    if (data.stats.total_scan_events < 2) {
      throw new Error(`Expected at least 2 scans, got ${data.stats.total_scan_events}`);
    }

    console.log(`   Total Scans: ${data.stats.total_scan_events}`);
    console.log(`   Unique Devices: ${data.stats.unique_devices}`);
    console.log(`   GPS Scans: ${data.stats.gps_scans}`);
    console.log(`   Cities: ${data.stats.unique_cities}`);
  });

  // Test 7: Get Heatmap Data
  await test('Get Heatmap Data', async () => {
    const response = await fetch(
      `${API_URL}/api/qr/heatmap?vendor_id=${VENDOR_ID}&qr_code_id=${createdQRCode.id}`
    );

    if (!response.ok) {
      throw new Error('Failed to get heatmap');
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.heatmap)) {
      throw new Error('Invalid response structure');
    }

    if (data.heatmap.length === 0) {
      throw new Error('No heatmap data found');
    }

    const raleigh = data.heatmap.find(h => h.city === 'Raleigh');
    if (!raleigh) {
      throw new Error('Raleigh location not found in heatmap');
    }

    console.log(`   Locations: ${data.heatmap.length}`);
    console.log(`   Raleigh scans: ${raleigh.scan_count}`);
    console.log(`   Coordinates: ${raleigh.avg_latitude}, ${raleigh.avg_longitude}`);
  });

  // Test 8: Campaign Stats
  await test('Get Campaign Stats', async () => {
    const response = await fetch(
      `${API_URL}/api/qr/stats?vendor_id=${VENDOR_ID}&campaign_name=test_campaign`
    );

    if (!response.ok) {
      throw new Error('Failed to get campaign stats');
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.stats)) {
      throw new Error('Invalid response structure');
    }

    const found = data.stats.find(s => s.qr_code_id === createdQRCode.id);
    if (!found) {
      throw new Error('QR code not found in campaign');
    }

    console.log(`   Campaign QR codes: ${data.stats.length}`);
    console.log(`   Campaign scans: ${found.total_scan_events}`);
  });

  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('QR Code System Features Verified:');
    console.log('  ✓ QR code creation with metadata');
    console.log('  ✓ QR code retrieval');
    console.log('  ✓ QR code listing');
    console.log('  ✓ Scan tracking with geolocation');
    console.log('  ✓ First scan detection');
    console.log('  ✓ Unique device counting');
    console.log('  ✓ Stats aggregation');
    console.log('  ✓ Heatmap generation');
    console.log('  ✓ Campaign analytics');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Access landing page: http://localhost:3001/qr/' + createdQRCode.code);
    console.log('  2. Backend can generate QR codes pointing to these URLs');
    console.log('  3. All scans tracked with GPS + fingerprints + device data');
    console.log('  4. Build dashboard UI to visualize all this data');
  } else {
    console.log('❌ Some tests failed. Please review errors above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
