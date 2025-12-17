#!/usr/bin/env node

// Cleanup script for polluted analytics data
// Removes asset requests that were incorrectly tracked as page views

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
  if (!data.success) {
    throw new Error(`SQL failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('🧹 Analytics Data Cleanup Script\n');
  console.log('This will remove asset requests that were incorrectly tracked as page views.\n');

  // Step 1: Count polluted records
  console.log('📊 Step 1: Analyzing data pollution...\n');

  const countSQL = `
    SELECT
      (SELECT COUNT(*)::int FROM website_visitors) as total_records,
      COUNT(*)::int as polluted_records
    FROM website_visitors
    WHERE page_url LIKE '%.otf'
       OR page_url LIKE '%manifest.webmanifest%'
       OR page_url LIKE '%apple-icon%'
       OR page_url LIKE '%opengraph-image%'
       OR page_url LIKE '%/icon?%'
       OR page_url LIKE '%.well-known%';
  `;

  const countResult = await runSQL(countSQL);
  const [total, polluted] = countResult.result.rows[0];

  console.log(`   Total records: ${total}`);
  console.log(`   Polluted records: ${polluted}`);
  console.log(`   Clean records: ${total - polluted}`);
  console.log(`   Pollution rate: ${((polluted / total) * 100).toFixed(1)}%\n`);

  // Step 2: Show breakdown by asset type
  console.log('📋 Step 2: Breakdown by asset type...\n');

  const breakdownSQL = `
    SELECT
      CASE
        WHEN page_url LIKE '%.otf' THEN 'Font files (.otf)'
        WHEN page_url LIKE '%manifest.webmanifest%' THEN 'Web manifest'
        WHEN page_url LIKE '%apple-icon%' THEN 'Apple icons'
        WHEN page_url LIKE '%opengraph-image%' THEN 'OpenGraph images'
        WHEN page_url LIKE '%/icon?%' THEN 'Dynamic icons'
        WHEN page_url LIKE '%.well-known%' THEN 'Monitoring endpoints'
        ELSE 'Other'
      END as asset_type,
      COUNT(*)::int as count
    FROM website_visitors
    WHERE page_url LIKE '%.otf'
       OR page_url LIKE '%manifest.webmanifest%'
       OR page_url LIKE '%apple-icon%'
       OR page_url LIKE '%opengraph-image%'
       OR page_url LIKE '%/icon?%'
       OR page_url LIKE '%.well-known%'
    GROUP BY asset_type
    ORDER BY count DESC;
  `;

  const breakdownResult = await runSQL(breakdownSQL);
  breakdownResult.result.rows.forEach(([type, count]) => {
    console.log(`   ${type.padEnd(25)} ${count.toString().padStart(5)} records`);
  });

  console.log('\n⚠️  WARNING: This will permanently delete these records!\n');
  console.log('Press Ctrl+C now to cancel, or wait 5 seconds to continue...\n');

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 3: Delete polluted records
  console.log('🗑️  Step 3: Deleting polluted records...\n');

  const deleteSQL = `
    DELETE FROM website_visitors
    WHERE page_url LIKE '%.otf'
       OR page_url LIKE '%manifest.webmanifest%'
       OR page_url LIKE '%apple-icon%'
       OR page_url LIKE '%opengraph-image%'
       OR page_url LIKE '%/icon?%'
       OR page_url LIKE '%.well-known%';
  `;

  const deleteResult = await runSQL(deleteSQL);
  console.log(`   ✅ Deleted ${deleteResult.result.rowCount} polluted records\n`);

  // Step 4: Verify cleanup
  console.log('✅ Step 4: Verifying cleanup...\n');

  const verifyResult = await runSQL(countSQL);
  const [newTotal, newPolluted] = verifyResult.result.rows[0];

  console.log(`   Total records after cleanup: ${newTotal}`);
  console.log(`   Remaining polluted records: ${newPolluted}`);
  console.log(`   Clean records: ${newTotal - newPolluted}\n`);

  if (newPolluted === 0) {
    console.log('🎉 SUCCESS! All polluted data has been removed!\n');
  } else {
    console.log(`⚠️  Warning: ${newPolluted} polluted records remain (may be new incoming data)\n`);
  }

  console.log('📈 Next steps:');
  console.log('   1. The middleware fix is deploying now (will prevent future pollution)');
  console.log('   2. Monitor bounce rate over next 24 hours');
  console.log('   3. Bounce rate should normalize to 60-80% (typical for e-commerce)\n');
}

main().catch(console.error);
