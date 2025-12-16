const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

const sql = `
-- Drop the foreign key constraint on changed_by
-- This allows us to store user IDs even if they don't exist in the users table yet
ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;

-- Optionally, we can add it back but with ON DELETE SET NULL to be safer
-- ALTER TABLE order_status_history
-- ADD CONSTRAINT order_status_history_changed_by_fkey
-- FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
`

console.log('Removing foreign key constraint on changed_by column...\n')

try {
  const response = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    },
    body: JSON.stringify({ sql })
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('❌ Failed:', data.error)
    process.exit(1)
  }

  console.log('✅ Foreign key constraint removed successfully!')
  console.log('✅ POS should now be able to create orders')

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
