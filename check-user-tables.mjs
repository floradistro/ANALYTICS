const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
const userId = 'f11eafac-78d9-4536-92e0-265546a8bf44'

console.log('=== Checking for user in different tables ===\n')

// Check users table
console.log('1. Checking users table...')
const usersRes = await fetch(`${supabaseUrl}/rest/v1/users?select=*&id=eq.${userId}`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const usersData = await usersRes.json()
console.log('Users table:', JSON.stringify(usersData, null, 2))

// Check vendor_users table
console.log('\n2. Checking vendor_users table...')
const vendorUsersRes = await fetch(`${supabaseUrl}/rest/v1/vendor_users?select=*&id=eq.${userId}`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const vendorUsersData = await vendorUsersRes.json()
console.log('Vendor users table:', JSON.stringify(vendorUsersData, null, 2))

// Check staff table
console.log('\n3. Checking staff table...')
const staffRes = await fetch(`${supabaseUrl}/rest/v1/staff?select=*&id=eq.${userId}`, {
  headers: {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
})
const staffData = await staffRes.json()
console.log('Staff table:', JSON.stringify(staffData, null, 2))

// List all tables with "user" or "staff" in the name
console.log('\n4. Looking for user/staff related tables...')
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
        AND (table_name LIKE '%user%' OR table_name LIKE '%staff%')
      ORDER BY table_name;
    `
  })
})
const tablesData = await tablesRes.json()
console.log('User/Staff tables:', JSON.stringify(tablesData.result?.rows || [], null, 2))
