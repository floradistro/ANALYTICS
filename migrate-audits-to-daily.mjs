const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

// First, let's check what audit tables exist and their structure
console.log('=== Checking existing audit tables ===')

const checkTables = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('product_audit', 'daily_audit_summary', 'inventory_audits')
      ORDER BY table_name, ordinal_position;
    `
  })
})

const tables = await checkTables.json()
console.log('Tables structure:', JSON.stringify(tables.result?.rows || [], null, 2))

// Check if daily_audit_summary exists and has data
const checkDaily = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `SELECT COUNT(*) as count FROM daily_audit_summary;`
  })
})

const dailyCount = await checkDaily.json()
console.log('\nDaily audit summary count:', dailyCount.result?.rows?.[0])

// Check product_audit table for sample data
const checkProductAudits = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT
        vendor_id,
        changed_at::date as audit_date,
        COUNT(*) as adjustment_count
      FROM product_audit
      WHERE field_name = 'quantity'
      GROUP BY vendor_id, changed_at::date
      ORDER BY audit_date DESC
      LIMIT 10;
    `
  })
})

const productAuditsSample = await checkProductAudits.json()
console.log('\nSample product audits by date:', JSON.stringify(productAuditsSample.result?.rows || [], null, 2))

// Now create the migration to populate daily_audit_summary from product_audit history
console.log('\n=== Creating migration to populate daily_audit_summary ===')

const migration = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      -- First, let's see if we need to create the view or if it exists
      DO $$
      BEGIN
        -- Drop and recreate the daily_audit_summary view
        DROP VIEW IF EXISTS daily_audit_summary CASCADE;

        CREATE VIEW daily_audit_summary AS
        WITH daily_adjustments AS (
          SELECT
            vendor_id,
            location_id,
            changed_at::date as audit_date,
            changed_by,
            field_name,
            old_value,
            new_value,
            changed_at
          FROM product_audit
          WHERE field_name = 'quantity'
        ),
        daily_metrics AS (
          SELECT
            vendor_id,
            location_id,
            audit_date,
            COUNT(*) as adjustment_count,
            SUM(
              CASE
                WHEN (new_value::numeric - old_value::numeric) < 0
                THEN (new_value::numeric - old_value::numeric)
                ELSE 0
              END
            ) as total_shrinkage,
            SUM(
              CASE
                WHEN (new_value::numeric - old_value::numeric) > 0
                THEN (new_value::numeric - old_value::numeric)
                ELSE 0
              END
            ) as total_additions,
            SUM(new_value::numeric - old_value::numeric) as net_change,
            array_agg(DISTINCT
              COALESCE(
                (SELECT value FROM jsonb_each_text(metadata) WHERE key = 'reason' LIMIT 1),
                'Unknown'
              )
            ) as reasons,
            MIN(changed_at) as first_adjustment,
            MAX(changed_at) as last_adjustment
          FROM daily_adjustments da
          LEFT JOIN product_audit pa ON
            da.vendor_id = pa.vendor_id
            AND da.location_id = pa.location_id
            AND da.audit_date = pa.changed_at::date
            AND da.changed_at = pa.changed_at
          GROUP BY
            da.vendor_id,
            da.location_id,
            da.audit_date
        )
        SELECT * FROM daily_metrics;

        RAISE NOTICE 'daily_audit_summary view created successfully';
      END $$;
    `
  })
})

const result = await migration.json()
console.log('Migration result:', JSON.stringify(result, null, 2))

// Test the new view
console.log('\n=== Testing new view ===')

const testView = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT
        audit_date,
        COUNT(*) as locations,
        SUM(adjustment_count) as total_adjustments,
        SUM(total_shrinkage) as total_shrinkage,
        SUM(total_additions) as total_additions
      FROM daily_audit_summary
      GROUP BY audit_date
      ORDER BY audit_date DESC
      LIMIT 7;
    `
  })
})

const testResult = await testView.json()
console.log('Last 7 days summary:', JSON.stringify(testResult.result?.rows || [], null, 2))
