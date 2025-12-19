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
  console.log('\n📊 WEBSITE VISITOR DATA QUALITY REPORT - LAST 24 HOURS\n');
  console.log('='.repeat(80));

  // Total visitors last 24 hours
  const totalSql = `
    SELECT COUNT(DISTINCT visitor_id) as total_visitors
    FROM website_visitors
    WHERE created_at > NOW() - INTERVAL '24 hours';
  `;

  const totalResult = await runSQL(totalSql);
  const totalVisitors = totalResult.result.rows[0][0];

  console.log(`\n📈 Total Unique Visitors (24h): ${totalVisitors}\n`);

  // Breakdown by geolocation source
  const geoSourceSql = `
    SELECT
      geolocation_source,
      COUNT(DISTINCT visitor_id) as visitor_count,
      COUNT(*) as total_records,
      ROUND(AVG(geolocation_accuracy), 2) as avg_accuracy_meters
    FROM website_visitors
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND geolocation_source IS NOT NULL
    GROUP BY geolocation_source
    ORDER BY visitor_count DESC;
  `;

  const geoResult = await runSQL(geoSourceSql);

  console.log('🌍 GEOLOCATION DATA SOURCES:\n');
  console.log('Source                  Visitors    Records    Avg Accuracy');
  console.log('-'.repeat(70));

  geoResult.result.rows.forEach(row => {
    const [source, visitors, records, accuracy] = row;
    console.log(`${(source || 'NULL').padEnd(22)} ${String(visitors).padStart(8)} ${String(records).padStart(10)} ${accuracy ? String(accuracy) + 'm' : 'N/A'}`);
  });

  // Check for missing data
  const missingSql = `
    SELECT
      COUNT(*) FILTER (WHERE city IS NULL) as missing_city,
      COUNT(*) FILTER (WHERE region IS NULL) as missing_region,
      COUNT(*) FILTER (WHERE postal_code IS NULL) as missing_postal,
      COUNT(*) FILTER (WHERE latitude IS NULL) as missing_coords,
      COUNT(*) FILTER (WHERE geolocation_source IS NULL) as missing_source,
      COUNT(*) as total_records
    FROM website_visitors
    WHERE created_at > NOW() - INTERVAL '24 hours';
  `;

  const missingResult = await runSQL(missingSql);
  const [missingCity, missingRegion, missingPostal, missingCoords, missingSource, totalRecords] = missingResult.result.rows[0];

  console.log('\n\n❌ MISSING DATA ANALYSIS:\n');
  console.log('Field               Missing    Total      % Missing');
  console.log('-'.repeat(70));
  console.log(`City                ${String(missingCity).padStart(7)} ${String(totalRecords).padStart(9)} ${((missingCity/totalRecords)*100).toFixed(1).padStart(12)}%`);
  console.log(`Region              ${String(missingRegion).padStart(7)} ${String(totalRecords).padStart(9)} ${((missingRegion/totalRecords)*100).toFixed(1).padStart(12)}%`);
  console.log(`Postal Code         ${String(missingPostal).padStart(7)} ${String(totalRecords).padStart(9)} ${((missingPostal/totalRecords)*100).toFixed(1).padStart(12)}%`);
  console.log(`Coordinates         ${String(missingCoords).padStart(7)} ${String(totalRecords).padStart(9)} ${((missingCoords/totalRecords)*100).toFixed(1).padStart(12)}%`);
  console.log(`Geo Source          ${String(missingSource).padStart(7)} ${String(totalRecords).padStart(9)} ${((missingSource/totalRecords)*100).toFixed(1).padStart(12)}%`);

  // Recent high-quality data (last 3 hours)
  const recentSql = `
    SELECT
      COUNT(*) FILTER (WHERE geolocation_source = 'browser_gps') as gps_count,
      COUNT(*) FILTER (WHERE geolocation_source = 'address_autocomplete') as autocomplete_count,
      COUNT(*) FILTER (WHERE city IS NOT NULL AND latitude IS NOT NULL) as complete_count,
      COUNT(*) as total
    FROM website_visitors
    WHERE created_at > NOW() - INTERVAL '3 hours';
  `;

  const recentResult = await runSQL(recentSql);
  const [gpsCount, autocompleteCount, completeCount, recentTotal] = recentResult.result.rows[0];

  console.log('\n\n🔥 RECENT DATA QUALITY (Last 3 hours):\n');
  console.log(`Total Records:           ${recentTotal}`);
  console.log(`GPS Locations:           ${gpsCount} (${((gpsCount/recentTotal)*100).toFixed(1)}%)`);
  console.log(`Address Autocomplete:    ${autocompleteCount} (${((autocompleteCount/recentTotal)*100).toFixed(1)}%)`);
  console.log(`Complete Data:           ${completeCount} (${((completeCount/recentTotal)*100).toFixed(1)}%)`);

  // Sample of recent clean data
  const sampleSql = `
    SELECT
      created_at,
      city,
      region,
      geolocation_source,
      ROUND(geolocation_accuracy::numeric, 0) as accuracy,
      page_url
    FROM website_visitors
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND city IS NOT NULL
      AND geolocation_source IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 10;
  `;

  const sampleResult = await runSQL(sampleSql);

  console.log('\n\n✅ SAMPLE OF RECENT CLEAN DATA:\n');
  console.log('Time        Location              Source              Accuracy  Page');
  console.log('-'.repeat(90));

  sampleResult.result.rows.forEach(row => {
    const [timestamp, city, region, source, accuracy, url] = row;
    const time = new Date(timestamp).toLocaleTimeString();
    const location = `${city}, ${region}`;
    const page = (url || '').split('?')[0].split('.com')[1] || '/';
    console.log(`${time.padEnd(11)} ${location.padEnd(21)} ${(source || 'N/A').padEnd(19)} ${String(accuracy || 'N/A').padEnd(9)} ${page}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
