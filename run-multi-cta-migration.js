#!/usr/bin/env node

const fs = require('fs');

const SUPABASE_URL = 'https://uaednwpxursknmwdeejn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg';

console.log('Running Multi-CTA Migration...');

const sql = fs.readFileSync('migrations/add-multi-cta-support.sql', 'utf8');

fetch(`${SUPABASE_URL}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_KEY}`
  },
  body: JSON.stringify({ sql })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.error('Migration failed:', data.error);
    process.exit(1);
  }
  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('Created:');
  console.log('  - qr_code_ctas table (for multiple CTAs per QR)');
  console.log('  - qr_cta_clicks table (GPS-tracked CTA clicks)');
  console.log('  - Performance views & analytics');
  console.log('  - Smart filtering functions');
  console.log('');
  console.log('Your QR system now supports:');
  console.log('  ✓ Multiple CTAs per QR code');
  console.log('  ✓ GPS tracking for each CTA click');
  console.log('  ✓ Geo-targeting & scheduling');
  console.log('  ✓ Auto-ordering by performance');
  console.log('  ✓ Rich media & compliance features');
})
.catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});
