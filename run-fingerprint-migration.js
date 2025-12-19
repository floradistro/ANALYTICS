#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  console.log('\n🚀 Running Browser Fingerprinting Migration\n');
  console.log('='.repeat(70));

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations', 'add-fingerprinting.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('\n📄 Migration file loaded');
  console.log(`   Path: ${migrationPath}`);
  console.log(`   Size: ${migrationSQL.length} bytes\n`);

  try {
    console.log('🔄 Executing full migration...\n');
    await runSQL(migrationSQL);
    console.log('✅ Migration executed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️  Trying individual statements...\n');

    // If full migration fails, try running CREATE TABLE statements individually
    const createTableStatements = [
      `CREATE TABLE IF NOT EXISTS device_fingerprints (
        id SERIAL PRIMARY KEY,
        fingerprint_id TEXT NOT NULL UNIQUE,
        vendor_id UUID NOT NULL,
        canvas_fingerprint TEXT,
        webgl_fingerprint TEXT,
        audio_fingerprint TEXT,
        screen_resolution TEXT,
        fonts TEXT[],
        plugins TEXT[],
        timezone TEXT,
        language TEXT,
        platform TEXT,
        hardware_concurrency INT,
        device_memory INT,
        color_depth INT,
        pixel_ratio DECIMAL,
        touch_support BOOLEAN,
        cookie_enabled BOOLEAN,
        do_not_track TEXT,
        confidence_score INT,
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW(),
        total_visits INT DEFAULT 1,
        linked_visitor_ids TEXT[],
        is_suspicious BOOLEAN DEFAULT FALSE,
        suspicious_reason TEXT,
        is_blocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint_id ON device_fingerprints(fingerprint_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fingerprints_vendor_id ON device_fingerprints(vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fingerprints_suspicious ON device_fingerprints(is_suspicious)`,
      `ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS fingerprint_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint_id ON website_visitors(fingerprint_id)`,
      `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS fingerprint_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_events_fingerprint_id ON analytics_events(fingerprint_id)`,
      `CREATE TABLE IF NOT EXISTS abandoned_carts (
        id SERIAL PRIMARY KEY,
        vendor_id UUID NOT NULL,
        visitor_id TEXT NOT NULL,
        fingerprint_id TEXT,
        cart_items JSONB NOT NULL,
        cart_total DECIMAL NOT NULL,
        item_count INT NOT NULL,
        email TEXT,
        phone TEXT,
        name TEXT,
        abandoned_at TIMESTAMP DEFAULT NOW(),
        last_reminded_at TIMESTAMP,
        reminder_count INT DEFAULT 0,
        recovered BOOLEAN DEFAULT FALSE,
        recovered_at TIMESTAMP,
        recovery_order_id TEXT,
        checkout_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_abandoned_carts_vendor_id ON abandoned_carts(vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_abandoned_carts_visitor_id ON abandoned_carts(visitor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_abandoned_carts_fingerprint_id ON abandoned_carts(fingerprint_id)`,
      `CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email)`,
      `CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovered ON abandoned_carts(recovered)`,
      `CREATE TABLE IF NOT EXISTS fingerprint_customer_links (
        id SERIAL PRIMARY KEY,
        fingerprint_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        vendor_id UUID NOT NULL,
        link_source TEXT,
        confidence TEXT,
        first_linked TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(fingerprint_id, customer_id, vendor_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fp_customer_links_fp ON fingerprint_customer_links(fingerprint_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fp_customer_links_customer ON fingerprint_customer_links(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fp_customer_links_vendor ON fingerprint_customer_links(vendor_id)`,
    ];

    let successCount = 0;
    for (let i = 0; i < createTableStatements.length; i++) {
      try {
        const preview = createTableStatements[i].substring(0, 60).replace(/\s+/g, ' ');
        console.log(`[${i + 1}/${createTableStatements.length}] ${preview}...`);
        await runSQL(createTableStatements[i]);
        console.log('   ✅ Success');
        successCount++;
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
      }
    }

    console.log(`\n✅ ${successCount}/${createTableStatements.length} statements executed successfully`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📋 Tables and columns:`);
  console.log(`   - device_fingerprints (table)`);
  console.log(`   - abandoned_carts (table)`);
  console.log(`   - fingerprint_customer_links (table)`);
  console.log(`   - website_visitors.fingerprint_id (column)`);
  console.log(`   - analytics_events.fingerprint_id (column)`);
  console.log('\n');
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
