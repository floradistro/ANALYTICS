const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

// Test direct query on inventory_adjustments
console.log('=== Testing direct query on inventory_adjustments ===')

const directQuery = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
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
        location_id,
        COALESCE(audit_date, created_at::date) as audit_date,
        COUNT(*) as adjustment_count,
        SUM(
          CASE
            WHEN quantity_change < 0 THEN quantity_change
            ELSE 0
          END
        ) as total_shrinkage,
        SUM(
          CASE
            WHEN quantity_change > 0 THEN quantity_change
            ELSE 0
          END
        ) as total_additions,
        SUM(quantity_change) as net_change,
        array_agg(DISTINCT COALESCE(reason, 'Unknown')) as reasons,
        MIN(created_at) as first_adjustment,
        MAX(created_at) as last_adjustment
      FROM inventory_adjustments
      WHERE vendor_id = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'
      GROUP BY
        vendor_id,
        location_id,
        COALESCE(audit_date, created_at::date)
      ORDER BY audit_date DESC
      LIMIT 10;
    `
  })
})

const direct = await directQuery.json()
console.log('Direct query result:')
console.log(JSON.stringify(direct.result?.rows || [], null, 2))

// Also test by selecting from the view with a where clause
console.log('\n=== Testing view with WHERE clause ===')

const viewQuery = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT *
      FROM daily_audit_summary
      WHERE vendor_id = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'
      ORDER BY audit_date DESC
      LIMIT 10;
    `
  })
})

const viewResult = await viewQuery.json()
console.log('View query result:')
console.log(JSON.stringify(viewResult.result?.rows || [], null, 2))
