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
  console.log('🔍 Session Tracking Investigation\n');

  // Step 1: Check if each page view creates a new session
  console.log('Step 1: Examining session behavior...\n');

  const sessionAnalysisSQL = `
    SELECT
      visitor_id,
      session_id,
      page_url,
      created_at
    FROM website_visitors
    ORDER BY created_at DESC
    LIMIT 20;
  `;

  const sessions = await runSQL(sessionAnalysisSQL);

  console.log('Recent 20 page views:\n');
  sessions.result.rows.forEach(([vid, sid, url, created], i) => {
    const shortVid = vid.substring(0, 15) + '...';
    const shortSid = sid.substring(0, 15) + '...';
    const shortUrl = url.length > 40 ? url.substring(0, 40) + '...' : url;
    const time = new Date(created).toLocaleTimeString();
    console.log(`${(i+1).toString().padStart(2)}. ${time} | V:${shortVid} | S:${shortSid} | ${shortUrl}`);
  });

  console.log('\n');

  // Step 2: Check for duplicate visitor IDs with different session IDs
  const duplicateCheckSQL = `
    SELECT
      visitor_id,
      COUNT(DISTINCT session_id)::int as session_count,
      COUNT(*)::int as page_views,
      STRING_AGG(DISTINCT SUBSTRING(session_id, 1, 20), ', ') as session_ids
    FROM website_visitors
    GROUP BY visitor_id
    HAVING COUNT(DISTINCT session_id) > 1
    ORDER BY session_count DESC
    LIMIT 10;
  `;

  const duplicates = await runSQL(duplicateCheckSQL);

  console.log(`Step 2: Visitors with multiple sessions (${duplicates.result.rowCount} total):\n`);

  if (duplicates.result.rowCount > 0) {
    duplicates.result.rows.forEach(([vid, sessions, views, sids]) => {
      console.log(`Visitor: ${vid.substring(0, 25)}...`);
      console.log(`  Sessions: ${sessions} | Page Views: ${views}`);
      console.log(`  Session IDs: ${sids}...\n`);
    });
  } else {
    console.log('⚠️  NO VISITORS WITH MULTIPLE SESSIONS FOUND!\n');
    console.log('This is the problem - every page view is creating a new session.\n');
  }

  // Step 3: Check session cookie expiry logic
  console.log('Step 3: Checking if session cookies are being preserved...\n');

  const sameVisitorSQL = `
    SELECT
      visitor_id,
      COUNT(*)::int as total_page_views,
      COUNT(DISTINCT session_id)::int as unique_sessions,
      MIN(created_at) as first_visit,
      MAX(created_at) as last_visit,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as minutes_between
    FROM website_visitors
    GROUP BY visitor_id
    HAVING COUNT(*) > 1
    ORDER BY total_page_views DESC
    LIMIT 10;
  `;

  const sameVisitor = await runSQL(sameVisitorSQL);

  console.log('Visitors who visited multiple pages:\n');

  if (sameVisitor.result.rowCount > 0) {
    sameVisitor.result.rows.forEach(([vid, views, sessions, first, last, mins]) => {
      console.log(`Visitor: ${vid.substring(0, 30)}...`);
      console.log(`  Page Views: ${views} | Sessions: ${sessions} | Time Span: ${mins.toFixed(1)} min`);
      console.log(`  First: ${new Date(first).toLocaleTimeString()}`);
      console.log(`  Last:  ${new Date(last).toLocaleTimeString()}\n`);
    });

    const totalMultiPage = sameVisitor.result.rows.reduce((sum, row) => sum + row[1], 0);
    const totalSessions = sameVisitor.result.rows.reduce((sum, row) => sum + row[2], 0);

    console.log(`Analysis: ${totalMultiPage} page views created ${totalSessions} sessions.`);

    if (totalSessions === totalMultiPage) {
      console.log('🔴 PROBLEM: Every page view creates a new session!\n');
      console.log('Root Cause: Session cookies are NOT being preserved between page views.\n');
      console.log('Possible causes:');
      console.log('  1. Middleware always creates new session_id on every request');
      console.log('  2. Cookie not being read properly from request');
      console.log('  3. Cookie maxAge too short (currently 30 min)');
      console.log('  4. Browser blocking cookies\n');
    } else {
      console.log('✅ Some sessions are being preserved correctly.\n');
    }
  } else {
    console.log('⚠️  No multi-page visits found. This might indicate:\n');
    console.log('  - Users are bouncing immediately (real behavior)');
    console.log('  - OR session tracking is creating new visitor_id on every page\n');
  }

  // Step 4: Check if visitor cookies are working
  console.log('Step 4: Checking visitor cookie preservation...\n');

  const visitorCheckSQL = `
    SELECT
      COUNT(DISTINCT visitor_id)::int as unique_visitors,
      COUNT(*)::int as total_page_views,
      (COUNT(*)::float / COUNT(DISTINCT visitor_id)::float) as avg_pages_per_visitor
    FROM website_visitors;
  `;

  const visitorCheck = await runSQL(visitorCheckSQL);
  const [uniqueVisitors, totalPages, avgPages] = visitorCheck.result.rows[0];

  console.log(`Unique Visitors: ${uniqueVisitors}`);
  console.log(`Total Page Views: ${totalPages}`);
  console.log(`Avg Pages/Visitor: ${avgPages.toFixed(2)}\n`);

  if (avgPages < 1.1) {
    console.log('🔴 CRITICAL: Avg pages/visitor is ' + avgPages.toFixed(2));
    console.log('This means visitor cookies are ALSO not being preserved!\n');
    console.log('Root Cause: Every request creates a NEW visitor_id and session_id.\n');
    console.log('Fix needed: middleware.ts:54-76 (cookie logic)\n');
  } else {
    console.log('✅ Visitor cookies seem to be working (avg > 1.1 pages/visitor)\n');
  }
}

main().catch(console.error);
