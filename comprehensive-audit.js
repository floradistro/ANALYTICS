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
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE ANALYTICS DATA INTEGRITY AUDIT');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ============================================================================
  // 1. DATABASE TABLES OVERVIEW
  // ============================================================================
  console.log('📊 SECTION 1: Database Tables Overview\n');

  const tablesSQL = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const tables = await runSQL(tablesSQL);
  console.log('Available Tables:');
  tables.result.rows.forEach(([name]) => {
    console.log(`   - ${name}`);
  });
  console.log('');

  // ============================================================================
  // 2. WEBSITE_VISITORS TABLE AUDIT
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 SECTION 2: Website Visitors Data Quality\n');

  // 2.1 Basic Stats
  const visitorStatsSQL = `
    SELECT
      COUNT(*)::int as total_records,
      COUNT(DISTINCT visitor_id)::int as unique_visitors,
      COUNT(DISTINCT session_id)::int as unique_sessions,
      MIN(created_at) as earliest_record,
      MAX(created_at) as latest_record
    FROM website_visitors;
  `;

  const stats = await runSQL(visitorStatsSQL);
  const [totalRecords, uniqueVisitors, uniqueSessions, earliest, latest] = stats.result.rows[0];

  console.log('Basic Statistics:');
  console.log(`   Total Page Views:    ${totalRecords.toLocaleString()}`);
  console.log(`   Unique Visitors:     ${uniqueVisitors.toLocaleString()}`);
  console.log(`   Unique Sessions:     ${uniqueSessions.toLocaleString()}`);
  console.log(`   Avg Pages/Visitor:   ${(totalRecords / uniqueVisitors).toFixed(2)}`);
  console.log(`   Avg Pages/Session:   ${(totalRecords / uniqueSessions).toFixed(2)}`);
  console.log(`   Date Range:          ${new Date(earliest).toLocaleDateString()} - ${new Date(latest).toLocaleDateString()}\n`);

  // 2.2 Check for NULL/Invalid Data
  const nullCheckSQL = `
    SELECT
      COUNT(*) FILTER (WHERE visitor_id IS NULL)::int as null_visitor_id,
      COUNT(*) FILTER (WHERE session_id IS NULL)::int as null_session_id,
      COUNT(*) FILTER (WHERE page_url IS NULL)::int as null_page_url,
      COUNT(*) FILTER (WHERE created_at IS NULL)::int as null_created_at,
      COUNT(*) FILTER (WHERE page_url = '')::int as empty_page_url,
      COUNT(*) FILTER (WHERE visitor_id = '')::int as empty_visitor_id
    FROM website_visitors;
  `;

  const nulls = await runSQL(nullCheckSQL);
  const [nullVid, nullSid, nullUrl, nullCreated, emptyUrl, emptyVid] = nulls.result.rows[0];

  console.log('Data Integrity Check:');
  console.log(`   NULL visitor_id:     ${nullVid} ${nullVid > 0 ? '⚠️' : '✅'}`);
  console.log(`   NULL session_id:     ${nullSid} ${nullSid > 0 ? '⚠️' : '✅'}`);
  console.log(`   NULL page_url:       ${nullUrl} ${nullUrl > 0 ? '⚠️' : '✅'}`);
  console.log(`   NULL created_at:     ${nullCreated} ${nullCreated > 0 ? '⚠️' : '✅'}`);
  console.log(`   Empty page_url:      ${emptyUrl} ${emptyUrl > 0 ? '⚠️' : '✅'}`);
  console.log(`   Empty visitor_id:    ${emptyVid} ${emptyVid > 0 ? '⚠️' : '✅'}\n`);

  // 2.3 Geolocation Data Quality
  const geoQualitySQL = `
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE geolocation_source IS NOT NULL)::int as has_geo_source,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL)::int as has_latitude,
      COUNT(*) FILTER (WHERE longitude IS NOT NULL)::int as has_longitude,
      COUNT(*) FILTER (WHERE city IS NOT NULL)::int as has_city,
      COUNT(*) FILTER (WHERE region IS NOT NULL)::int as has_region,
      COUNT(*) FILTER (WHERE postal_code IS NOT NULL)::int as has_postal
    FROM website_visitors;
  `;

  const geo = await runSQL(geoQualitySQL);
  const [gTotal, hasSource, hasLat, hasLng, hasCity, hasRegion, hasPostal] = geo.result.rows[0];

  console.log('Geolocation Data Coverage:');
  console.log(`   Has geo source:      ${hasSource.toLocaleString()} (${(hasSource/gTotal*100).toFixed(1)}%)`);
  console.log(`   Has coordinates:     ${hasLat.toLocaleString()} (${(hasLat/gTotal*100).toFixed(1)}%)`);
  console.log(`   Has city:            ${hasCity.toLocaleString()} (${(hasCity/gTotal*100).toFixed(1)}%)`);
  console.log(`   Has region:          ${hasRegion.toLocaleString()} (${(hasRegion/gTotal*100).toFixed(1)}%)`);
  console.log(`   Has postal code:     ${hasPostal.toLocaleString()} (${(hasPostal/gTotal*100).toFixed(1)}%)\n`);

  // 2.4 Geolocation Source Breakdown
  const geoSourceSQL = `
    SELECT
      geolocation_source,
      COUNT(*)::int as count,
      ROUND(AVG(geolocation_accuracy))::int as avg_accuracy
    FROM website_visitors
    WHERE geolocation_source IS NOT NULL
    GROUP BY geolocation_source
    ORDER BY count DESC;
  `;

  const geoSources = await runSQL(geoSourceSQL);
  console.log('Geolocation Sources:');
  geoSources.result.rows.forEach(([source, count, accuracy]) => {
    const pct = (count / hasSource * 100).toFixed(1);
    const accStr = accuracy ? `~${accuracy}m` : 'N/A';
    console.log(`   ${(source || 'unknown').padEnd(20)} ${count.toString().padStart(6)} (${pct.padStart(5)}%)  Accuracy: ${accStr}`);
  });
  console.log('');

  // 2.5 Check for Asset Pollution (should be 0 after cleanup)
  const assetCheckSQL = `
    SELECT
      COUNT(*)::int as total_assets,
      COUNT(*) FILTER (WHERE page_url LIKE '%.otf')::int as font_files,
      COUNT(*) FILTER (WHERE page_url LIKE '%manifest.webmanifest%')::int as manifests,
      COUNT(*) FILTER (WHERE page_url LIKE '%apple-icon%')::int as apple_icons,
      COUNT(*) FILTER (WHERE page_url LIKE '%opengraph-image%')::int as og_images,
      COUNT(*) FILTER (WHERE page_url LIKE '%/icon?%')::int as dynamic_icons,
      COUNT(*) FILTER (WHERE page_url LIKE '%.well-known%')::int as well_known
    FROM website_visitors;
  `;

  const assets = await runSQL(assetCheckSQL);
  const [totalAssets, fonts, manifests, appleIcons, ogImages, dynIcons, wellKnown] = assets.result.rows[0];

  console.log('Asset Pollution Check:');
  console.log(`   Font files (.otf):       ${fonts} ${fonts > 0 ? '⚠️  SHOULD BE 0' : '✅'}`);
  console.log(`   Manifests:               ${manifests} ${manifests > 0 ? '⚠️  SHOULD BE 0' : '✅'}`);
  console.log(`   Apple icons:             ${appleIcons} ${appleIcons > 0 ? '⚠️  SHOULD BE 0' : '✅'}`);
  console.log(`   OG images:               ${ogImages} ${ogImages > 0 ? '⚠️  SHOULD BE 0' : '✅'}`);
  console.log(`   Dynamic icons:           ${dynIcons} ${dynIcons > 0 ? '⚠️  SHOULD BE 0' : '✅'}`);
  console.log(`   .well-known:             ${wellKnown} ${wellKnown > 0 ? '⚠️  SHOULD BE 0' : '✅'}`);
  console.log(`   TOTAL ASSET POLLUTION:   ${totalAssets} ${totalAssets > 0 ? '⚠️' : '✅'}\n`);

  // 2.6 Top Pages
  const topPagesSQL = `
    SELECT
      page_url,
      COUNT(*)::int as views,
      COUNT(DISTINCT visitor_id)::int as unique_visitors
    FROM website_visitors
    GROUP BY page_url
    ORDER BY views DESC
    LIMIT 15;
  `;

  const topPages = await runSQL(topPagesSQL);
  console.log('Top 15 Pages by Views:');
  topPages.result.rows.forEach(([url, views, uniq], i) => {
    const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
    console.log(`   ${(i+1).toString().padStart(2)}. ${views.toString().padStart(5)} views | ${uniq.toString().padStart(4)} uniq | ${shortUrl}`);
  });
  console.log('');

  // ============================================================================
  // 3. EVENTS TABLE AUDIT
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 SECTION 3: Events Tracking\n');

  try {
    const eventsStatsSQL = `
      SELECT
        COUNT(*)::int as total_events,
        COUNT(DISTINCT visitor_id)::int as unique_visitors,
        COUNT(DISTINCT event_name)::int as unique_event_types,
        MIN(created_at) as earliest_event,
        MAX(created_at) as latest_event
      FROM events;
    `;

    const eventStats = await runSQL(eventsStatsSQL);
    const [totalEvents, eventVisitors, eventTypes, earliestEvent, latestEvent] = eventStats.result.rows[0];

    console.log('Event Tracking Stats:');
    console.log(`   Total Events:        ${totalEvents.toLocaleString()}`);
    console.log(`   Unique Visitors:     ${eventVisitors.toLocaleString()}`);
    console.log(`   Event Types:         ${eventTypes.toLocaleString()}`);
    console.log(`   Date Range:          ${new Date(earliestEvent).toLocaleDateString()} - ${new Date(latestEvent).toLocaleDateString()}\n`);

    // Event breakdown
    const eventBreakdownSQL = `
      SELECT
        event_name,
        COUNT(*)::int as count,
        COUNT(DISTINCT visitor_id)::int as unique_visitors,
        SUM(COALESCE(revenue, 0))::float as total_revenue
      FROM events
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 20;
    `;

    const eventBreakdown = await runSQL(eventBreakdownSQL);
    console.log('Event Types Breakdown (Top 20):');
    eventBreakdown.result.rows.forEach(([name, count, uniq, revenue]) => {
      const revStr = revenue > 0 ? `$${revenue.toFixed(2)}` : '';
      console.log(`   ${name.padEnd(35)} ${count.toString().padStart(6)} events | ${uniq.toString().padStart(4)} uniq ${revStr}`);
    });
    console.log('');

    // Check for revenue events
    const revenueSQL = `
      SELECT
        COUNT(*) FILTER (WHERE revenue > 0)::int as events_with_revenue,
        SUM(COALESCE(revenue, 0))::float as total_revenue,
        AVG(revenue) FILTER (WHERE revenue > 0)::float as avg_revenue_per_event,
        MAX(revenue)::float as max_revenue
      FROM events;
    `;

    const revenue = await runSQL(revenueSQL);
    const [revenueEvents, totalRev, avgRev, maxRev] = revenue.result.rows[0];

    console.log('Revenue Tracking:');
    console.log(`   Events with revenue: ${revenueEvents.toLocaleString()}`);
    console.log(`   Total revenue:       $${totalRev.toFixed(2)}`);
    console.log(`   Avg per event:       $${avgRev ? avgRev.toFixed(2) : '0.00'}`);
    console.log(`   Max single event:    $${maxRev.toFixed(2)}\n`);

  } catch (err) {
    console.log('⚠️  Events table not accessible or empty\n');
  }

  // ============================================================================
  // 4. ORDERS TRACKING AUDIT
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🛒 SECTION 4: Orders & Customer Journey Tracking\n');

  try {
    // Check if we have purchase events
    const purchaseEventsSQL = `
      SELECT
        COUNT(*)::int as purchase_events,
        COUNT(DISTINCT visitor_id)::int as unique_purchasers,
        SUM(revenue)::float as total_order_value
      FROM events
      WHERE event_name = 'purchase';
    `;

    const purchases = await runSQL(purchaseEventsSQL);
    const [purchaseCount, uniquePurchasers, totalOrderValue] = purchases.result.rows[0];

    console.log('Purchase Events:');
    console.log(`   Total purchases:     ${purchaseCount.toLocaleString()}`);
    console.log(`   Unique purchasers:   ${uniquePurchasers.toLocaleString()}`);
    console.log(`   Total order value:   $${totalOrderValue.toFixed(2)}`);
    console.log(`   Avg order value:     $${purchaseCount > 0 ? (totalOrderValue / purchaseCount).toFixed(2) : '0.00'}\n`);

    // Check checkout funnel
    const funnelSQL = `
      SELECT
        SUM(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END)::int as add_to_cart,
        SUM(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END)::int as begin_checkout,
        SUM(CASE WHEN event_name = 'checkout_started' THEN 1 ELSE 0 END)::int as checkout_started,
        SUM(CASE WHEN event_name = 'checkout_submission_attempt' THEN 1 ELSE 0 END)::int as submission_attempts,
        SUM(CASE WHEN event_name = 'checkout_success' THEN 1 ELSE 0 END)::int as checkout_success,
        SUM(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END)::int as purchases
      FROM events;
    `;

    const funnel = await runSQL(funnelSQL);
    const [addCart, beginCheck, startCheck, submitAttempt, checkSuccess, purch] = funnel.result.rows[0];

    console.log('Checkout Funnel:');
    console.log(`   1. Add to cart:              ${addCart.toLocaleString()}`);
    console.log(`   2. Begin checkout:           ${beginCheck.toLocaleString()} ${beginCheck > 0 ? `(${(beginCheck/addCart*100).toFixed(1)}%)` : ''}`);
    console.log(`   3. Checkout started:         ${startCheck.toLocaleString()} ${startCheck > 0 ? `(${(startCheck/addCart*100).toFixed(1)}%)` : ''}`);
    console.log(`   4. Submission attempts:      ${submitAttempt.toLocaleString()} ${submitAttempt > 0 ? `(${(submitAttempt/startCheck*100).toFixed(1)}%)` : ''}`);
    console.log(`   5. Checkout success:         ${checkSuccess.toLocaleString()} ${checkSuccess > 0 ? `(${(checkSuccess/submitAttempt*100).toFixed(1)}%)` : ''}`);
    console.log(`   6. Purchase completed:       ${purch.toLocaleString()} ${purch > 0 ? `(${(purch/addCart*100).toFixed(1)}%)` : ''}\n`);

    // Check for checkout errors
    const errorsSQL = `
      SELECT
        SUM(CASE WHEN event_name = 'checkout_validation_error' THEN 1 ELSE 0 END)::int as validation_errors,
        SUM(CASE WHEN event_name = 'checkout_api_error' THEN 1 ELSE 0 END)::int as api_errors,
        SUM(CASE WHEN event_name = 'checkout_payment_error' THEN 1 ELSE 0 END)::int as payment_errors,
        SUM(CASE WHEN event_name = 'location_denied' THEN 1 ELSE 0 END)::int as location_denied,
        SUM(CASE WHEN event_name = 'location_granted' THEN 1 ELSE 0 END)::int as location_granted
      FROM events;
    `;

    const errors = await runSQL(errorsSQL);
    const [valErrors, apiErrors, payErrors, locDenied, locGranted] = errors.result.rows[0];

    console.log('Error Tracking:');
    console.log(`   Validation errors:   ${valErrors.toLocaleString()}`);
    console.log(`   API errors:          ${apiErrors.toLocaleString()}`);
    console.log(`   Payment errors:      ${payErrors.toLocaleString()}\n`);

    console.log('Location Permission Tracking:');
    console.log(`   Location granted:    ${locGranted.toLocaleString()}`);
    console.log(`   Location denied:     ${locDenied.toLocaleString()}`);
    const totalLoc = locGranted + locDenied;
    console.log(`   Grant rate:          ${totalLoc > 0 ? (locGranted/totalLoc*100).toFixed(1) : '0'}%\n`);

  } catch (err) {
    console.log('⚠️  Unable to analyze events/orders data\n');
    console.log('Error:', err.message, '\n');
  }

  // ============================================================================
  // 5. SESSION QUALITY AUDIT
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⏱️  SECTION 5: Session Quality Analysis\n');

  const sessionQualitySQL = `
    SELECT
      COUNT(DISTINCT session_id)::int as total_sessions,
      COUNT(DISTINCT session_id) FILTER (
        WHERE session_id IN (
          SELECT session_id FROM website_visitors GROUP BY session_id HAVING COUNT(*) = 1
        )
      )::int as single_page_sessions,
      COUNT(DISTINCT session_id) FILTER (
        WHERE session_id IN (
          SELECT session_id FROM website_visitors GROUP BY session_id HAVING COUNT(*) >= 2
        )
      )::int as multi_page_sessions
    FROM website_visitors;
  `;

  const sessionQual = await runSQL(sessionQualitySQL);
  const [totalSess, singlePage, multiPage] = sessionQual.result.rows[0];

  const sessionBounceRate = (singlePage / totalSess * 100).toFixed(1);

  console.log('Session Metrics:');
  console.log(`   Total sessions:          ${totalSess.toLocaleString()}`);
  console.log(`   Single-page sessions:    ${singlePage.toLocaleString()} (${sessionBounceRate}%)`);
  console.log(`   Multi-page sessions:     ${multiPage.toLocaleString()} (${(multiPage/totalSess*100).toFixed(1)}%)`);
  console.log(`   Session bounce rate:     ${sessionBounceRate}% ${parseFloat(sessionBounceRate) > 90 ? '⚠️  HIGH' : parseFloat(sessionBounceRate) > 70 ? '⚠️  MODERATE' : '✅ GOOD'}\n`);

  // Recent session behavior (last 24 hours)
  const recentSessionSQL = `
    SELECT
      COUNT(DISTINCT session_id)::int as sessions_24h,
      COUNT(*)::int as page_views_24h,
      COUNT(DISTINCT visitor_id)::int as visitors_24h
    FROM website_visitors
    WHERE created_at > NOW() - INTERVAL '24 hours';
  `;

  const recent = await runSQL(recentSessionSQL);
  const [sessions24h, views24h, visitors24h] = recent.result.rows[0];

  console.log('Last 24 Hours Activity:');
  console.log(`   Visitors:            ${visitors24h.toLocaleString()}`);
  console.log(`   Sessions:            ${sessions24h.toLocaleString()}`);
  console.log(`   Page views:          ${views24h.toLocaleString()}`);
  console.log(`   Avg pages/session:   ${sessions24h > 0 ? (views24h/sessions24h).toFixed(2) : '0.00'}\n`);

  // ============================================================================
  // 6. RECOMMENDATIONS
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 SECTION 6: Recommendations\n');

  const issues = [];
  const warnings = [];
  const successes = [];

  // Check asset pollution
  if (totalAssets > 0) {
    issues.push(`Asset pollution detected: ${totalAssets} asset requests tracked as page views`);
  } else {
    successes.push('No asset pollution detected');
  }

  // Check null data
  if (nullVid > 0 || nullSid > 0 || nullUrl > 0) {
    issues.push(`NULL data found: ${nullVid} null visitor_ids, ${nullSid} null session_ids, ${nullUrl} null URLs`);
  } else {
    successes.push('No NULL data in critical fields');
  }

  // Check geolocation
  if (hasPostal < gTotal * 0.5) {
    warnings.push(`Only ${(hasPostal/gTotal*100).toFixed(1)}% of records have postal codes (expected >50%)`);
  } else {
    successes.push(`Good geolocation coverage: ${(hasPostal/gTotal*100).toFixed(1)}% with postal codes`);
  }

  // Check session bounce rate
  if (parseFloat(sessionBounceRate) > 95) {
    issues.push(`Session bounce rate is ${sessionBounceRate}% (critically high - session tracking may be broken)`);
  } else if (parseFloat(sessionBounceRate) > 80) {
    warnings.push(`Session bounce rate is ${sessionBounceRate}% (higher than ideal for e-commerce)`);
  } else {
    successes.push(`Session bounce rate is ${sessionBounceRate}% (healthy)`);
  }

  // Check order tracking
  if (purchaseCount === 0 && addCart === 0) {
    warnings.push('No purchase or add-to-cart events detected - verify e-commerce tracking is wired up');
  } else if (purchaseCount > 0) {
    successes.push(`Order tracking working: ${purchaseCount} purchases tracked`);
  }

  console.log('✅ Successes:');
  if (successes.length > 0) {
    successes.forEach(s => console.log(`   ✓ ${s}`));
  } else {
    console.log('   None');
  }
  console.log('');

  console.log('⚠️  Warnings:');
  if (warnings.length > 0) {
    warnings.forEach(w => console.log(`   ! ${w}`));
  } else {
    console.log('   None');
  }
  console.log('');

  console.log('🔴 Critical Issues:');
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ✗ ${i}`));
  } else {
    console.log('   None');
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Audit Complete - ' + new Date().toLocaleString());
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
