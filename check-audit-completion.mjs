const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
const vendorId = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'
const locationId = '8cb9154e-c89c-4f5e-b751-74820e348b8a'
const today = '2025-12-16'

console.log('=== Checking Audit Completion Rate ===\n')

// 1. Get total active products at this location
console.log('1. Counting total active products at location...')
const inventoryRes = await fetch(`${supabaseUrl}/rest/v1/inventory?select=product_id&vendor_id=eq.${vendorId}&location_id=eq.${locationId}`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const inventoryData = await inventoryRes.json()
console.log('Total products in inventory:', inventoryData.length)

// 2. Get unique products audited today
console.log('\n2. Counting products audited today...')
const adjustmentsRes = await fetch(`${supabaseUrl}/rest/v1/inventory_adjustments?select=product_id&vendor_id=eq.${vendorId}&location_id=eq.${locationId}&created_at=gte.${today}T00:00:00&created_at=lte.${today}T23:59:59`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const adjustmentsData = await adjustmentsRes.json()
const uniqueProductsAudited = [...new Set(adjustmentsData.map(a => a.product_id))]
console.log('Products audited today:', uniqueProductsAudited.length)
console.log('Completion rate:', ((uniqueProductsAudited.length / inventoryData.length) * 100).toFixed(1) + '%')

// 3. Check if there's a different table for audit completion tracking
console.log('\n3. Looking for audit-related tables...')
const tablesRes = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
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
        AND table_name LIKE '%audit%'
      ORDER BY table_name;
    `
  })
})
const tablesData = await tablesRes.json()
console.log('Audit tables:', JSON.stringify(tablesData.result?.rows || [], null, 2))
