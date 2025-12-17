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
  console.log('📊 E-Commerce Conversion Funnel Analysis\n');

  // Get date range
  const rangeSQL = `
    SELECT
      MIN(timestamp)::text as first_event,
      MAX(timestamp)::text as last_event,
      COUNT(DISTINCT DATE(timestamp))::int as days
    FROM analytics_events;
  `;

  const rangeResult = await runSQL(rangeSQL);
  const [firstEvent, lastEvent, days] = rangeResult.result.rows[0];

  if (!firstEvent) {
    console.log('⚠️  No events found in analytics_events table\n');
    return;
  }

  console.log(`Date Range: ${new Date(firstEvent).toLocaleDateString()} - ${new Date(lastEvent).toLocaleDateString()} (${days} days)\n`);

  // Calculate funnel stages
  const funnelSQL = `
    SELECT
      (SELECT COUNT(DISTINCT visitor_id)::int FROM analytics_events WHERE event_name = 'view_product') as viewed_product,
      (SELECT COUNT(DISTINCT visitor_id)::int FROM analytics_events WHERE event_name = 'add_to_cart') as added_to_cart,
      (SELECT COUNT(DISTINCT visitor_id)::int FROM analytics_events WHERE event_name IN ('begin_checkout', 'checkout_started')) as began_checkout,
      (SELECT COUNT(DISTINCT visitor_id)::int FROM analytics_events WHERE event_name = 'checkout_success') as completed_checkout,
      (SELECT COUNT(DISTINCT visitor_id)::int FROM analytics_events WHERE event_name = 'purchase') as purchased;
  `;

  const funnelResult = await runSQL(funnelSQL);
  const [viewedProduct, addedToCart, beganCheckout, completedCheckout, purchased] = funnelResult.result.rows[0];

  // Calculate conversion rates
  const addToCartRate = viewedProduct > 0 ? (addedToCart / viewedProduct * 100) : 0;
  const checkoutRate = addedToCart > 0 ? (beganCheckout / addedToCart * 100) : 0;
  const purchaseRate = beganCheckout > 0 ? (purchased / beganCheckout * 100) : 0;
  const overallConversion = viewedProduct > 0 ? (purchased / viewedProduct * 100) : 0;

  // Print funnel
  console.log('🛒 Conversion Funnel:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`1. Viewed Product        ${viewedProduct.toLocaleString().padStart(8)}`);
  console.log(`   ↓ ${addToCartRate.toFixed(1)}%`);
  console.log(`2. Added to Cart         ${addedToCart.toLocaleString().padStart(8)}`);
  console.log(`   ↓ ${checkoutRate.toFixed(1)}%`);
  console.log(`3. Began Checkout        ${beganCheckout.toLocaleString().padStart(8)}`);
  console.log(`   ↓ ${purchaseRate.toFixed(1)}%`);
  console.log(`4. Purchased             ${purchased.toLocaleString().padStart(8)}`);
  console.log('─────────────────────────────────────────────────────');
  console.log(`Overall Conversion:      ${overallConversion.toFixed(2)}%\n`);

  // Get revenue data
  const revenueSQL = `
    SELECT
      COUNT(*)::int as purchase_events,
      SUM(revenue)::float as total_revenue,
      AVG(revenue)::float as avg_order_value
    FROM analytics_events
    WHERE event_name = 'purchase' AND revenue > 0;
  `;

  const revenueResult = await runSQL(revenueSQL);
  const [purchaseEvents, totalRevenue, avgOrderValue] = revenueResult.result.rows[0];

  if (purchaseEvents > 0) {
    console.log('💰 Revenue Metrics:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total Purchases:         ${purchaseEvents.toLocaleString()}`);
    if (totalRevenue && totalRevenue > 0) {
      console.log(`Total Revenue:           $${Number(totalRevenue).toFixed(2)}`);
      console.log(`Avg Order Value:         $${Number(avgOrderValue).toFixed(2)}\n`);
    } else {
      console.log(`Total Revenue:           $0.00 (revenue not tracked)`);
      console.log(`Avg Order Value:         $0.00 (revenue not tracked)\n`);
    }
  }

  // Identify drop-off points
  console.log('📉 Drop-off Analysis:');
  console.log('─────────────────────────────────────────────────────');

  const dropoffs = [
    { stage: 'View → Add to Cart', lost: viewedProduct - addedToCart, rate: 100 - addToCartRate },
    { stage: 'Add to Cart → Checkout', lost: addedToCart - beganCheckout, rate: 100 - checkoutRate },
    { stage: 'Checkout → Purchase', lost: beganCheckout - purchased, rate: 100 - purchaseRate }
  ];

  dropoffs.sort((a, b) => b.lost - a.lost);

  dropoffs.forEach((dropoff, i) => {
    const emoji = i === 0 ? '🔴' : i === 1 ? '🟡' : '🟢';
    console.log(`${emoji} ${dropoff.stage.padEnd(25)} Lost: ${dropoff.lost.toLocaleString().padStart(6)} (${dropoff.rate.toFixed(1)}%)`);
  });

  console.log('\n');

  // Checkout error analysis
  const errorSQL = `
    SELECT
      event_name,
      COUNT(*)::int as count
    FROM analytics_events
    WHERE event_name LIKE '%error%'
    GROUP BY event_name
    ORDER BY count DESC;
  `;

  const errorResult = await runSQL(errorSQL);

  if (errorResult.result.rows.length > 0) {
    console.log('⚠️  Checkout Errors:');
    console.log('─────────────────────────────────────────────────────');
    errorResult.result.rows.forEach(([eventName, count]) => {
      console.log(`   ${eventName.padEnd(35)} ${count.toLocaleString().padStart(6)}`);
    });
    console.log('\n');
  }

  // Benchmarking
  console.log('📊 Industry Benchmarks:');
  console.log('─────────────────────────────────────────────────────');
  console.log('View → Add to Cart:      2-5% (yours: ' + addToCartRate.toFixed(1) + '%)');
  console.log('Add to Cart → Checkout:  40-60% (yours: ' + checkoutRate.toFixed(1) + '%)');
  console.log('Checkout → Purchase:     60-80% (yours: ' + purchaseRate.toFixed(1) + '%)');
  console.log('Overall Conversion:      1-3% (yours: ' + overallConversion.toFixed(2) + '%)');
  console.log('\n');

  // Recommendations
  console.log('💡 Recommendations:');
  console.log('─────────────────────────────────────────────────────');

  if (addToCartRate < 2) {
    console.log('🔴 Add to Cart rate is low (<2%)');
    console.log('   → Improve product descriptions and images');
    console.log('   → Add customer reviews and ratings');
    console.log('   → Test pricing strategies\n');
  }

  if (checkoutRate < 40) {
    console.log('🔴 Checkout rate is low (<40%)');
    console.log('   → Simplify checkout process');
    console.log('   → Offer guest checkout');
    console.log('   → Display security badges\n');
  }

  if (purchaseRate < 60) {
    console.log('🔴 Purchase completion rate is low (<60%)');
    console.log('   → Check for payment errors');
    console.log('   → Reduce form fields');
    console.log('   → Add progress indicators\n');
  }

  if (errorResult.result.rows.length > 0) {
    console.log('⚠️  You have checkout errors - investigate and fix');
    console.log('   → Run: node check-events.js for details\n');
  }

  console.log('✅ Analysis complete!\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
