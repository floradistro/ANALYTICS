#!/usr/bin/env node

/**
 * QR Code System Monitor
 * Monitors QR code scans in real-time
 */

const SUPABASE_URL = 'https://uaednwpxursknmwdeejn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg';

console.log('📱 QR Code System - Live Monitor');
console.log('Watching for new QR code scans...');
console.log('Press Ctrl+C to stop');
console.log('');

let checkCount = 0;
const maxChecks = 100; // Run for ~5 minutes

const checkQRScans = async () => {
  checkCount++;

  const sql = `
  SELECT
    qs.scanned_at,
    qc.code,
    qc.name,
    qc.type,
    qs.city,
    qs.region,
    qs.country,
    qs.latitude,
    qs.longitude,
    qs.geolocation_source,
    qs.geolocation_accuracy,
    qs.device_type,
    qs.is_first_scan,
    qs.utm_campaign
  FROM qr_scans qs
  JOIN qr_codes qc ON qc.id = qs.qr_code_id
  WHERE qs.scanned_at > NOW() - INTERVAL '2 minutes'
  ORDER BY qs.scanned_at DESC
  LIMIT 5;
  `;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/exec-ddl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    const data = await response.json();

    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Check #${checkCount}`);

    if (data.result && data.result.rows && data.result.rows.length > 0) {
      console.log('');
      console.log('🎉 ACTIVE QR SCANS DETECTED!');
      console.log('═══════════════════════════════════════');

      data.result.rows.forEach((row, i) => {
        const [
          scanned_at, code, name, type, city, region, country,
          lat, lng, geo_source, accuracy, device_type, is_first, campaign
        ] = row;

        const scanTime = new Date(scanned_at).toLocaleTimeString();

        console.log('');
        console.log(`Scan #${i + 1}:`);
        console.log(`  Code: ${code} (${type})`);
        console.log(`  Name: ${name || 'N/A'}`);
        console.log(`  Time: ${scanTime}`);
        console.log(`  Location: ${city || 'Unknown'}, ${region || ''} ${country || ''}`);

        if (lat && lng) {
          console.log(`  GPS: ${lat}, ${lng} (±${accuracy}m)`);
          console.log(`  Source: ${geo_source} ✅`);
        } else {
          console.log(`  GPS: Not available`);
        }

        console.log(`  Device: ${device_type || 'unknown'}`);
        console.log(`  First Scan: ${is_first ? 'YES 🆕' : 'No'}`);

        if (campaign) {
          console.log(`  Campaign: ${campaign}`);
        }
      });

      console.log('');
      console.log('═══════════════════════════════════════');
    } else {
      console.log('  No scans in last 2 minutes...');
    }

    console.log('');

    if (checkCount >= maxChecks) {
      console.log('Monitor timeout reached');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error checking scans:', error.message);
  }
};

// Initial check
checkQRScans();

// Check every 3 seconds
const interval = setInterval(checkQRScans, 3000);

// Graceful shutdown
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('');
  console.log('Monitor stopped');
  process.exit(0);
});

// Also check QR code stats
const checkStats = async () => {
  const sql = `
  SELECT
    COUNT(DISTINCT qc.id) as total_qr_codes,
    COUNT(qs.id) as total_scans,
    COUNT(DISTINCT qs.fingerprint_id) as unique_devices,
    COUNT(DISTINCT qs.city) as unique_cities,
    COUNT(*) FILTER (WHERE qs.geolocation_source = 'browser_gps') as gps_scans,
    MAX(qs.scanned_at) as last_scan
  FROM qr_codes qc
  LEFT JOIN qr_scans qs ON qs.qr_code_id = qc.id;
  `;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/exec-ddl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    const data = await response.json();

    if (data.result && data.result.rows && data.result.rows.length > 0) {
      const [total_qr, total_scans, devices, cities, gps, last_scan] = data.result.rows[0];

      console.log('📊 QR System Overview:');
      console.log(`  Total QR Codes: ${total_qr || 0}`);
      console.log(`  Total Scans: ${total_scans || 0}`);
      console.log(`  Unique Devices: ${devices || 0}`);
      console.log(`  Cities Reached: ${cities || 0}`);
      console.log(`  GPS Scans: ${gps || 0}`);

      if (last_scan) {
        console.log(`  Last Scan: ${new Date(last_scan).toLocaleString()}`);
      }

      console.log('');
    }
  } catch (error) {
    console.error('Error checking stats:', error.message);
  }
};

// Show stats every 30 seconds
setTimeout(() => {
  checkStats();
  setInterval(checkStats, 30000);
}, 5000);
