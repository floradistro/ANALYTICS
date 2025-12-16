const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
const vendorId = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'

// Simulate exact queries from the page
console.log('=== Testing exact queries from operations page ===\n')

// 1. Daily audit summaries
console.log('1. Testing daily_audit_summary query...')
const auditsRes = await fetch(`${supabaseUrl}/rest/v1/daily_audit_summary?select=*,location:locations!location_id(name)&vendor_id=eq.${vendorId}&audit_date=gte.2025-12-09&order=audit_date.desc`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const auditsData = await auditsRes.json()
console.log('Status:', auditsRes.status)
console.log('Data:', JSON.stringify(auditsData, null, 2))

// 2. Inventory adjustments
console.log('\n2. Testing inventory_adjustments query...')
const adjRes = await fetch(`${supabaseUrl}/rest/v1/inventory_adjustments?select=id,product_id,location_id,quantity_before,quantity_after,quantity_change,reason,notes,created_by,created_at&vendor_id=eq.${vendorId}&order=created_at.desc&limit=100`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const adjData = await adjRes.json()
console.log('Status:', adjRes.status)
console.log('Count:', adjData.length || 'error')
if (adjRes.status !== 200) {
  console.log('Error:', JSON.stringify(adjData, null, 2))
}

// 3. Safe balances
console.log('\n3. Testing pos_safe_balances query...')
const safesRes = await fetch(`${supabaseUrl}/rest/v1/pos_safe_balances?select=*,location:locations!location_id(name)&vendor_id=eq.${vendorId}`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const safesData = await safesRes.json()
console.log('Status:', safesRes.status)
console.log('Data:', JSON.stringify(safesData, null, 2))

// 4. Safe transactions
console.log('\n4. Testing pos_safe_transactions query...')
const txnRes = await fetch(`${supabaseUrl}/rest/v1/pos_safe_transactions?select=*,location:locations!location_id(name)&vendor_id=eq.${vendorId}&order=created_at.desc&limit=100`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const txnData = await txnRes.json()
console.log('Status:', txnRes.status)
console.log('Count:', Array.isArray(txnData) ? txnData.length : 'error')
if (txnRes.status !== 200) {
  console.log('Error:', JSON.stringify(txnData, null, 2))
}

// 5. Locations count
console.log('\n5. Testing locations count query...')
const locRes = await fetch(`${supabaseUrl}/rest/v1/locations?select=id&vendor_id=eq.${vendorId}&status=eq.active`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Prefer': 'count=exact'
  }
})
const locData = await locRes.json()
const count = locRes.headers.get('content-range')
console.log('Status:', locRes.status)
console.log('Count header:', count)
console.log('Data length:', locData.length)
