#!/bin/bash

echo "🧪 Testing ipinfo.io Integration"
echo "================================="
echo ""

# Test the analytics API
echo "1. Sending test visitor to analytics API..."
RESPONSE=$(curl -s -X POST https://floradashboard.com/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "cd2e1122-d511-4edb-be5d-98ef274b4baf",
    "visitor_id": "test_'$(date +%s)'",
    "session_id": "test_session_'$(date +%s)'",
    "page_url": "https://floradistro.com/test"
  }')

echo "Response: $RESPONSE"
echo ""

# Wait a moment for DB to update
echo "2. Waiting 3 seconds for database..."
sleep 3
echo ""

# Check recent visitor
echo "3. Checking most recent visitor in database..."
node -e "
const sql = \`SELECT city, region, postal_code, latitude, longitude, geolocation_source, geolocation_accuracy FROM website_visitors WHERE created_at > NOW() - INTERVAL '2 minutes' ORDER BY created_at DESC LIMIT 1;\`;

fetch('https://uaednwpxursknmwdeejn.supabase.co/functions/v1/exec-ddl', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg'
  },
  body: JSON.stringify({ sql })
})
.then(r => r.json())
.then(data => {
  if (data.result && data.result.rows && data.result.rows.length > 0) {
    const [city, region, postal, lat, lng, source, accuracy] = data.result.rows[0];
    console.log('✅ Recent Visitor Data:');
    console.log('   City: ' + city + ', ' + region);
    console.log('   ZIP Code: ' + (postal || 'NULL ❌'));
    console.log('   Coordinates: ' + lat + ', ' + lng);
    console.log('   Source: ' + source);
    console.log('   Accuracy: ' + (accuracy ? (accuracy + 'm') : 'NULL'));
    console.log('');

    if (source === 'ipinfo' && postal) {
      console.log('🎉 SUCCESS! ipinfo.io Plus is working!');
      console.log('   ✓ ZIP code captured');
      console.log('   ✓ Using ipinfo source');
    } else if (source === 'vercel_headers') {
      console.log('❌ FAILED! Still using Vercel headers (datacenter IPs)');
      console.log('   Wait ~2 minutes for deployment to complete');
    } else if (source === 'browser_gps') {
      console.log('✅ GPS location captured (even better!)');
    }
  } else {
    console.log('⚠️  No recent visitors found. Visit floradistro.com to test.');
  }
})
.catch(err => console.error('Error:', err));
"

echo ""
echo "================================="
echo "Test complete!"
