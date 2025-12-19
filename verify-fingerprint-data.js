#!/usr/bin/env node

const ENDPOINT = 'https://uaednwpxursknmwdeejn.supabase.co/functions/v1/exec-ddl';
const AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg';

async function runSQL(sql) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': AUTH
    },
    body: JSON.stringify({ sql })
  });
  const data = await response.json();
  if (!data.success) throw new Error(`SQL failed: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('\n🔍 Verifying Fingerprint Data in Database\n');
  console.log('='.repeat(70));

  // Check device_fingerprints table
  console.log('\n📋 Device Fingerprints:');
  const fpResult = await runSQL(`
    SELECT fingerprint_id, confidence_score, total_visits, linked_visitor_ids, created_at
    FROM device_fingerprints
    ORDER BY created_at DESC
    LIMIT 5;
  `);

  if (fpResult.result.rows.length > 0) {
    console.log(`\n   Found ${fpResult.result.rows.length} fingerprints:\n`);
    fpResult.result.rows.forEach(row => {
      const [fp_id, confidence, visits, visitors, created] = row;
      console.log(`   - ${fp_id}`);
      console.log(`     Confidence: ${confidence}%`);
      console.log(`     Total Visits: ${visits}`);
      console.log(`     Linked Visitors: ${visitors ? visitors.length : 0}`);
      console.log(`     Created: ${created}`);
      console.log('');
    });
  } else {
    console.log('   ❌ No fingerprints found');
  }

  // Check abandoned_carts table
  console.log('\n🛒 Abandoned Carts:');
  const cartResult = await runSQL(`
    SELECT id, visitor_id, fingerprint_id, cart_total, item_count, email, recovered, created_at
    FROM abandoned_carts
    ORDER BY created_at DESC
    LIMIT 5;
  `);

  if (cartResult.result.rows.length > 0) {
    console.log(`\n   Found ${cartResult.result.rows.length} abandoned carts:\n`);
    cartResult.result.rows.forEach(row => {
      const [id, visitor_id, fp_id, total, count, email, recovered, created] = row;
      console.log(`   - Cart #${id}`);
      console.log(`     Visitor: ${visitor_id}`);
      console.log(`     Fingerprint: ${fp_id || 'N/A'}`);
      console.log(`     Total: $${total}`);
      console.log(`     Items: ${count}`);
      console.log(`     Email: ${email || 'N/A'}`);
      console.log(`     Recovered: ${recovered ? 'Yes' : 'No'}`);
      console.log(`     Created: ${created}`);
      console.log('');
    });
  } else {
    console.log('   ❌ No abandoned carts found');
  }

  // Check website_visitors with fingerprint_id
  console.log('\n👥 Website Visitors with Fingerprints:');
  const visitorsResult = await runSQL(`
    SELECT visitor_id, fingerprint_id, created_at
    FROM website_visitors
    WHERE fingerprint_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5;
  `);

  if (visitorsResult.result.rows.length > 0) {
    console.log(`\n   Found ${visitorsResult.result.rows.length} visitors with fingerprints:\n`);
    visitorsResult.result.rows.forEach(row => {
      const [visitor_id, fp_id, created] = row;
      console.log(`   - Visitor: ${visitor_id}`);
      console.log(`     Fingerprint: ${fp_id}`);
      console.log(`     Created: ${created}`);
      console.log('');
    });
  } else {
    console.log('   ❌ No visitors with fingerprints found');
  }

  // Check analytics_events with fingerprint_id
  console.log('\n📊 Analytics Events with Fingerprints:');
  const eventsResult = await runSQL(`
    SELECT event_name, fingerprint_id, timestamp
    FROM analytics_events
    WHERE fingerprint_id IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT 5;
  `);

  if (eventsResult.result.rows.length > 0) {
    console.log(`\n   Found ${eventsResult.result.rows.length} events with fingerprints:\n`);
    eventsResult.result.rows.forEach(row => {
      const [event_name, fp_id, timestamp] = row;
      console.log(`   - Event: ${event_name}`);
      console.log(`     Fingerprint: ${fp_id}`);
      console.log(`     Time: ${timestamp}`);
      console.log('');
    });
  } else {
    console.log('   ❌ No events with fingerprints found');
  }

  console.log('='.repeat(70));
  console.log('\n✅ Database verification complete!\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
