#!/usr/bin/env node

/**
 * QR Code Tracking Migration Runner
 * Adds comprehensive QR code tracking tables and views
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://uaednwpxursknmwdeejn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg';

async function runMigration() {
  console.log('🔵 QR Code Tracking Migration');
  console.log('');

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations', 'add-qr-code-tracking.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded');
  console.log('   Tables: qr_codes, qr_scans');
  console.log('   Views: qr_campaign_stats, qr_scan_heatmap, qr_performance_summary, qr_top_performers');
  console.log('   Triggers: update_qr_stats, check_first_scan');
  console.log('');

  try {
    console.log('🚀 Executing migration...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/exec-ddl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Migration failed: ${error}`);
    }

    const result = await response.json();

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 QR Code System Ready:');
    console.log('');
    console.log('Tables Created:');
    console.log('  ✓ qr_codes - QR code registry with metadata');
    console.log('  ✓ qr_scans - Individual scan events with analytics');
    console.log('');
    console.log('Views Created:');
    console.log('  ✓ qr_campaign_stats - Campaign performance');
    console.log('  ✓ qr_scan_heatmap - Geographic distribution');
    console.log('  ✓ qr_performance_summary - Comprehensive metrics');
    console.log('  ✓ qr_top_performers - Top QR codes by scans');
    console.log('');
    console.log('Features:');
    console.log('  ✓ Geolocation tracking (GPS + IP)');
    console.log('  ✓ Device fingerprinting');
    console.log('  ✓ Conversion tracking');
    console.log('  ✓ Campaign analytics');
    console.log('  ✓ Landing page customization');
    console.log('  ✓ Auto-updating stats');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Create API endpoints (/api/qr/*)');
    console.log('  2. Build landing page system (/qr/[code])');
    console.log('  3. Add QR dashboard UI');
    console.log('  4. Test end-to-end tracking');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
