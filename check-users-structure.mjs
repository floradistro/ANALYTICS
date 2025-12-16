const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
const vendorId = 'cd2e1122-d511-4edb-be5d-98ef274b4baf'

console.log('=== Checking users table structure ===\n')

// Get all users for this vendor
const usersRes = await fetch(`${supabaseUrl}/rest/v1/users?select=*&vendor_id=eq.${vendorId}&limit=5`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const usersData = await usersRes.json()
console.log('Sample users:', JSON.stringify(usersData, null, 2))

// Check auth.users (Supabase auth table)
console.log('\n=== Checking auth.users (Supabase Auth) ===')
const authRes = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT id, email, raw_user_meta_data
      FROM auth.users
      WHERE id = 'f11eafac-78d9-4536-92e0-265546a8bf44'
      LIMIT 1;
    `
  })
})
const authData = await authRes.json()
console.log('Auth user:', JSON.stringify(authData.result?.rows || [], null, 2))
