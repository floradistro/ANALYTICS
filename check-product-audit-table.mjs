const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
const vendorId = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'

console.log('=== Checking product_audit table ===\n')

// Get sample data
const auditRes = await fetch(`${supabaseUrl}/rest/v1/product_audit?select=*&vendor_id=eq.${vendorId}&limit=5&order=created_at.desc`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const auditData = await auditRes.json()
console.log('Sample product audits:', JSON.stringify(auditData, null, 2))

// Get count by date
console.log('\n=== Checking audits by date ===')
const todayRes = await fetch(`${supabaseUrl}/rest/v1/product_audit?select=product_id,location_id,audit_date&vendor_id=eq.${vendorId}&audit_date=eq.2025-12-16`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const todayData = await todayRes.json()
console.log('Audits today:', todayData.length)
console.log('Sample:', JSON.stringify(todayData.slice(0, 3), null, 2))
