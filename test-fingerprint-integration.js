#!/usr/bin/env node

/**
 * End-to-end test for browser fingerprinting integration
 * Tests all API endpoints and database integration
 */

const DASHBOARD_URL = 'http://localhost:3000';
const VENDOR_ID = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'; // Flora Distro

// Mock fingerprint data
const mockFingerprint = {
  id: `test_fp_${Date.now()}`,
  components: {
    canvas: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...',
    webgl: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
    audio: '0.12345678901234567',
    screen: '1920x1080x24',
    fonts: ['Arial', 'Verdana', 'Times New Roman'],
    plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer'],
    timezone: 'America/New_York',
    language: 'en-US',
    platform: 'MacIntel',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    colorDepth: 24,
    pixelRatio: 2,
    touchSupport: false,
    cookieEnabled: true,
    doNotTrack: null,
  },
  confidence: 85
};

const visitor_id = `test_visitor_${Date.now()}`;
const session_id = `test_session_${Date.now()}`;

async function testEndpoint(name, url, method, body) {
  console.log(`\n📡 Testing ${name}...`);
  console.log(`   URL: ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   Error:`, JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`   ❌ Request failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🧪 Browser Fingerprinting Integration Test\n');
  console.log('='.repeat(70));
  console.log(`\nDashboard URL: ${DASHBOARD_URL}`);
  console.log(`Vendor ID: ${VENDOR_ID}`);
  console.log(`Test Fingerprint ID: ${mockFingerprint.id}`);
  console.log(`Test Visitor ID: ${visitor_id}`);

  const results = [];

  // Test 1: POST /api/fingerprint
  console.log('\n\n1️⃣ TEST: Store Device Fingerprint');
  console.log('─'.repeat(70));
  const fpResult = await testEndpoint(
    'POST /api/fingerprint',
    `${DASHBOARD_URL}/api/fingerprint`,
    'POST',
    {
      vendor_id: VENDOR_ID,
      visitor_id,
      session_id,
      fingerprint_id: mockFingerprint.id,
      fingerprint_confidence: mockFingerprint.confidence,
      fingerprint_components: mockFingerprint.components,
      page_url: 'http://localhost:3001/test',
    }
  );
  results.push({ test: 'Store Fingerprint', ...fpResult });

  // Test 2: POST /api/track with fingerprint_id
  console.log('\n\n2️⃣ TEST: Track Page View with Fingerprint');
  console.log('─'.repeat(70));
  const trackResult = await testEndpoint(
    'POST /api/track',
    `${DASHBOARD_URL}/api/track`,
    'POST',
    {
      vendor_id: VENDOR_ID,
      visitor_id,
      session_id,
      fingerprint_id: mockFingerprint.id,
      page_url: 'http://localhost:3001/test',
      page_path: '/test',
      referrer: '',
      utm_source: 'test',
      utm_medium: 'automated',
      utm_campaign: 'fingerprint_test',
      screen_width: 1920,
      screen_height: 1080,
      is_returning: false,
    }
  );
  results.push({ test: 'Track with Fingerprint', ...trackResult });

  // Test 3: POST /api/event with fingerprint_id
  console.log('\n\n3️⃣ TEST: Track Event with Fingerprint');
  console.log('─'.repeat(70));
  const eventResult = await testEndpoint(
    'POST /api/event',
    `${DASHBOARD_URL}/api/event`,
    'POST',
    {
      vendor_id: VENDOR_ID,
      visitor_id,
      session_id,
      fingerprint_id: mockFingerprint.id,
      event_name: 'test_fingerprint_event',
      event_data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    }
  );
  results.push({ test: 'Track Event with Fingerprint', ...eventResult });

  // Test 4: POST /api/cart-abandoned
  console.log('\n\n4️⃣ TEST: Track Abandoned Cart');
  console.log('─'.repeat(70));
  const cartResult = await testEndpoint(
    'POST /api/cart-abandoned',
    `${DASHBOARD_URL}/api/cart-abandoned`,
    'POST',
    {
      vendor_id: VENDOR_ID,
      visitor_id,
      fingerprint_id: mockFingerprint.id,
      cartItems: [
        { id: 'prod_1', name: 'Test Product 1', price: 29.99, quantity: 2 },
        { id: 'prod_2', name: 'Test Product 2', price: 19.99, quantity: 1 },
      ],
      cartTotal: 79.97,
      itemCount: 3,
      email: 'test@example.com',
      phone: '+1234567890',
      name: 'Test User',
      checkoutUrl: 'http://localhost:3001/checkout',
    }
  );
  results.push({ test: 'Track Abandoned Cart', ...cartResult });

  // Test 5: GET /api/cart-abandoned
  console.log('\n\n5️⃣ TEST: Retrieve Abandoned Carts');
  console.log('─'.repeat(70));
  const getCartResult = await testEndpoint(
    'GET /api/cart-abandoned',
    `${DASHBOARD_URL}/api/cart-abandoned?vendor_id=${VENDOR_ID}&email=test@example.com`,
    'GET'
  );
  results.push({ test: 'Get Abandoned Carts', ...getCartResult });

  // Test 6: POST /api/fingerprint again (returning visitor)
  console.log('\n\n6️⃣ TEST: Store Fingerprint Again (Returning Visitor)');
  console.log('─'.repeat(70));
  const fpReturnResult = await testEndpoint(
    'POST /api/fingerprint (returning)',
    `${DASHBOARD_URL}/api/fingerprint`,
    'POST',
    {
      vendor_id: VENDOR_ID,
      visitor_id: `${visitor_id}_return`,
      session_id: `${session_id}_return`,
      fingerprint_id: mockFingerprint.id,
      fingerprint_confidence: mockFingerprint.confidence,
      fingerprint_components: mockFingerprint.components,
      page_url: 'http://localhost:3001/test',
    }
  );
  results.push({ test: 'Returning Visitor Detection', ...fpReturnResult });

  // Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${result.test}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`\nTotal: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Fingerprinting integration is working correctly.\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Check the output above for details.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ Test suite failed:', err.message);
  process.exit(1);
});
