const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
const vendorId = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'

console.log('=== Testing daily_audit_summary with location join ===')
const auditsTest = await fetch(`${supabaseUrl}/rest/v1/daily_audit_summary?select=*,location:locations!location_id(name)&vendor_id=eq.${vendorId}&order=audit_date.desc&limit=5`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const auditsData = await auditsTest.json()
console.log('Audits with location:', JSON.stringify(auditsData, null, 2))

console.log('\n=== Testing inventory_adjustments (for product audits) ===')
const productAuditsTest = await fetch(`${supabaseUrl}/rest/v1/inventory_adjustments?select=id,product_id,location_id,quantity_before,quantity_after,quantity_change,reason,notes,created_by,created_at&vendor_id=eq.${vendorId}&order=created_at.desc&limit=10`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const productAuditsData = await productAuditsTest.json()
console.log('Product adjustments:', JSON.stringify(productAuditsData, null, 2))

console.log('\n=== Checking if pos_safe_balances table exists ===')
const checkSafes = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%safe%' OR table_name LIKE '%cash%' OR table_name LIKE '%drawer%')
      ORDER BY table_name;
    `
  })
})
const safeTables = await checkSafes.json()
console.log('Safe/Cash tables:', JSON.stringify(safeTables.result?.rows || [], null, 2))

console.log('\n=== Testing locations count ===')
const locationsTest = await fetch(`${supabaseUrl}/rest/v1/locations?select=id&vendor_id=eq.${vendorId}&status=eq.active`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Prefer': 'count=exact'
  }
})
const locationsCount = locationsTest.headers.get('content-range')
console.log('Locations count:', locationsCount)
