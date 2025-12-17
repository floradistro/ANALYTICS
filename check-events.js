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
  console.log('🔍 Checking E-Commerce Event Tracking\n');

  const sql = `
    SELECT
      COUNT(*)::int as total_events,
      COUNT(DISTINCT event_name)::int as unique_event_types,
      MIN(timestamp) as first_event,
      MAX(timestamp) as last_event
    FROM analytics_events;
  `;

  const result = await runSQL(sql);
  const [total, unique, first, last] = result.result.rows[0];

  console.log(`Total Events:        ${total.toLocaleString()}`);
  console.log(`Unique Event Types:  ${unique.toLocaleString()}`);
  console.log(`First Event:         ${first ? new Date(first).toLocaleString() : 'N/A'}`);
  console.log(`Last Event:          ${last ? new Date(last).toLocaleString() : 'N/A'}\n`);

  if (total === 0) {
    console.log('⚠️  NO EVENTS FOUND!\n');
    console.log('This means either:');
    console.log('   1. No orders/interactions have happened yet');
    console.log('   2. Event tracking is not wired up correctly\n');
    console.log('To test:');
    console.log('   1. Visit floradistro.com');
    console.log('   2. Add a product to cart');
    console.log('   3. Check browser console for "[Analytics] Sending event"');
    console.log('   4. Re-run this script\n');
    return;
  }

  // Show event breakdown
  const breakdownSQL = `
    SELECT
      event_name,
      COUNT(*)::int as count,
      SUM(COALESCE(revenue, 0))::float as total_revenue
    FROM analytics_events
    GROUP BY event_name
    ORDER BY count DESC
    LIMIT 20;
  `;

  const breakdown = await runSQL(breakdownSQL);

  console.log('Event Breakdown:\n');
  breakdown.result.rows.forEach(([name, count, revenue]) => {
    const revStr = revenue > 0 ? `($${revenue.toFixed(2)})` : '';
    console.log(`   ${name.padEnd(35)} ${count.toString().padStart(6)} ${revStr}`);
  });
  console.log('');

  // Check for purchases
  const purchaseSQL = `
    SELECT
      COUNT(*)::int as purchases,
      SUM(revenue)::float as total_revenue,
      AVG(revenue)::float as avg_order_value
    FROM analytics_events
    WHERE event_name = 'purchase';
  `;

  const purchases = await runSQL(purchaseSQL);
  const [purchaseCount, totalRev, avgRev] = purchases.result.rows[0];

  if (purchaseCount > 0) {
    console.log('✅ Order Tracking is Working!\n');
    console.log(`   Total Purchases:     ${purchaseCount.toLocaleString()}`);
    console.log(`   Total Revenue:       $${totalRev.toFixed(2)}`);
    console.log(`   Avg Order Value:     $${avgRev.toFixed(2)}\n`);
  } else {
    console.log('⚠️  No Purchase Events Found\n');
    console.log('Checkout tracking may not be wired up or no orders yet.\n');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
