const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

console.log('=== Creating/updating daily_audit_summary view ===')

const migration = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      -- Drop the existing view if it exists
      DROP VIEW IF EXISTS daily_audit_summary CASCADE;

      -- Create the new view based on inventory_adjustments
      CREATE VIEW daily_audit_summary AS
      SELECT
        ia.vendor_id,
        ia.location_id,
        COALESCE(ia.audit_date, ia.created_at::date) as audit_date,
        COUNT(*) as adjustment_count,
        SUM(
          CASE
            WHEN ia.quantity_change < 0 THEN ia.quantity_change
            ELSE 0
          END
        ) as total_shrinkage,
        SUM(
          CASE
            WHEN ia.quantity_change > 0 THEN ia.quantity_change
            ELSE 0
          END
        ) as total_additions,
        SUM(ia.quantity_change) as net_change,
        array_agg(DISTINCT COALESCE(ia.reason, 'Unknown')) as reasons,
        MIN(ia.created_at) as first_adjustment,
        MAX(ia.created_at) as last_adjustment
      FROM inventory_adjustments ia
      GROUP BY
        ia.vendor_id,
        ia.location_id,
        COALESCE(ia.audit_date, ia.created_at::date);
    `
  })
})

const result = await migration.json()

if (result.error) {
  console.error('Migration failed:', result.error)
} else {
  console.log('Migration successful!')
}

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
        COUNT(DISTINCT location_id) as locations,
        SUM(adjustment_count) as total_adjustments,
        SUM(total_shrinkage) as total_shrinkage,
        SUM(total_additions) as total_additions,
        SUM(net_change) as net_change
      FROM daily_audit_summary
      GROUP BY audit_date
      ORDER BY audit_date DESC
      LIMIT 7;
    `
  })
})

const testResult = await testView.json()
console.log('Last 7 days summary:')
console.log(JSON.stringify(testResult.result?.rows || [], null, 2))

// Get sample detailed data
const detailTest = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT
        das.*,
        l.name as location_name
      FROM daily_audit_summary das
      LEFT JOIN locations l ON das.location_id = l.id
      ORDER BY das.audit_date DESC, das.location_id
      LIMIT 10;
    `
  })
})

const detailResult = await detailTest.json()
console.log('\nDetailed view with location names:')
console.log(JSON.stringify(detailResult.result?.rows || [], null, 2))
