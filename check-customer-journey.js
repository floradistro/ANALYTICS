#!/usr/bin/env node

const ENDPOINT = 'https://uaednwpxursknmwdeejn.supabase.co/functions/v1/exec-ddl';
const AUTH = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg';

const visitorId = process.argv[2] || 'v_1765816891557_bk3zx3cntc';

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
  console.log(`\n🔍 Customer Journey for ${visitorId}\n`);

  const sql = `
    SELECT
      timestamp,
      session_id,
      event_name,
      page_url,
      product_name,
      revenue,
      metadata::text
    FROM analytics_events
    WHERE visitor_id = '${visitorId}'
    ORDER BY timestamp DESC
    LIMIT 100;
  `;

  const result = await runSQL(sql);

  if (result.result.rows.length === 0) {
    console.log('No events found for this visitor\n');
    return;
  }

  console.log(`Total Events: ${result.result.rows.length}\n`);

  let lastSession = '';
  result.result.rows.forEach((row) => {
    const [timestamp, session_id, event_name, page_url, product_name, revenue, metadata] = row;
    const time = new Date(timestamp).toLocaleTimeString();
    const url = page_url ? page_url.split('?')[0].split('.com')[1] || page_url : '';

    if (session_id !== lastSession) {
      console.log(`\n━━━ Session: ${session_id} ━━━\n`);
      lastSession = session_id;
    }

    console.log(`[${time}] ${event_name}`);
    if (product_name) console.log(`  🛍️  ${product_name}`);
    if (url && url.length > 1) console.log(`  📄 ${url}`);
    if (revenue) console.log(`  💰 $${revenue}`);

    if (metadata && metadata !== '{}' && metadata !== 'null') {
      try {
        const meta = JSON.parse(metadata);
        if (meta.payment_method) console.log(`  💳 Payment: ${meta.payment_method}`);
        if (meta.error) console.log(`  ❌ Error: ${meta.error}`);
        if (meta.button_text) console.log(`  🔘 Button: ${meta.button_text}`);
        if (meta.order_id) console.log(`  📦 Order: ${meta.order_id}`);
      } catch (e) {}
    }
  });

  console.log('\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
