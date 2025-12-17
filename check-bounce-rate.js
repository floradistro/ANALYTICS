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
  console.log('📊 Bounce Rate Analysis (After Cleanup)\n');

  // Step 1: Total visitors and sessions
  const totalSQL = `
    SELECT
      COUNT(DISTINCT visitor_id)::int as total_visitors,
      COUNT(DISTINCT session_id)::int as total_sessions,
      COUNT(*)::int as total_page_views
    FROM website_visitors;
  `;

  const totalResult = await runSQL(totalSQL);
  const [visitors, sessions, pageViews] = totalResult.result.rows[0];

  console.log(`Total Visitors:    ${visitors}`);
  console.log(`Total Sessions:    ${sessions}`);
  console.log(`Total Page Views:  ${pageViews}`);
  console.log(`Avg Pages/Visitor: ${(pageViews / visitors).toFixed(2)}\n`);

  // Step 2: Bounce rate (visitors with only 1 session)
  const bounceSQL = `
    SELECT COUNT(*)::int as bounced_visitors
    FROM (
      SELECT visitor_id, COUNT(DISTINCT session_id) as session_count
      FROM website_visitors
      GROUP BY visitor_id
      HAVING COUNT(DISTINCT session_id) = 1
    ) sub;
  `;

  const bounceResult = await runSQL(bounceSQL);
  const [bouncedVisitors] = bounceResult.result.rows[0];

  const bounceRate = (bouncedVisitors / visitors * 100).toFixed(1);

  console.log(`Visitors with 1 session:  ${bouncedVisitors}`);
  console.log(`Visitors with 2+ sessions: ${visitors - bouncedVisitors}`);
  console.log(`Bounce Rate: ${bounceRate}%\n`);

  // Step 3: Session-level bounce rate (sessions with 1 page view)
  const sessionBounceSQL = `
    SELECT COUNT(*)::int as bounced_sessions
    FROM (
      SELECT session_id, COUNT(*) as page_views
      FROM website_visitors
      GROUP BY session_id
      HAVING COUNT(*) = 1
    ) sub;
  `;

  const sessionBounceResult = await runSQL(sessionBounceSQL);
  const [bouncedSessions] = sessionBounceResult.result.rows[0];

  const sessionBounceRate = (bouncedSessions / sessions * 100).toFixed(1);

  console.log(`Sessions with 1 page view:  ${bouncedSessions}`);
  console.log(`Sessions with 2+ page views: ${sessions - bouncedSessions}`);
  console.log(`Session Bounce Rate: ${sessionBounceRate}%\n`);

  // Interpretation
  console.log('📈 Interpretation:\n');

  if (parseFloat(bounceRate) > 90) {
    console.log('⚠️  Bounce rate still very high (>90%). This may indicate:');
    console.log('   - Users landing and immediately leaving');
    console.log('   - Some asset requests may still be tracked');
    console.log('   - Need to investigate further\n');
  } else if (parseFloat(bounceRate) > 70) {
    console.log('✅ Bounce rate is normalizing (70-90%). This is typical for:');
    console.log('   - E-commerce sites (usually 60-80%)');
    console.log('   - Sites with external traffic sources\n');
  } else {
    console.log('🎉 Excellent bounce rate (<70%)! Your site is engaging visitors well.\n');
  }

  if (parseFloat(sessionBounceRate) > 80) {
    console.log('Note: High session bounce rate indicates many single-page sessions.');
    console.log('This is normal if users browse without clicking around much.\n');
  }
}

main().catch(console.error);
