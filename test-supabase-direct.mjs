const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

// Test using Supabase REST API
console.log('=== Testing inventory_adjustments via REST API ===')

const adjustments = await fetch(`${supabaseUrl}/rest/v1/inventory_adjustments?select=*&vendor_id=eq.cd2e1122-d511-4edb-be5d-98ef274b4baf&order=created_at.desc&limit=5`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})

const adjustmentsData = await adjustments.json()
console.log('Inventory adjustments:')
console.log(JSON.stringify(adjustmentsData, null, 2))

// Test daily_audit_summary view
console.log('\n=== Testing daily_audit_summary via REST API ===')

const dailyView = await fetch(`${supabaseUrl}/rest/v1/daily_audit_summary?select=*&vendor_id=eq.cd2e1122-d511-4edb-be5d-98ef274b4baf&order=audit_date.desc&limit=10`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})

const dailyData = await dailyView.json()
console.log('Daily audit summary:')
console.log(JSON.stringify(dailyData, null, 2))
