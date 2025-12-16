import { readFileSync } from 'fs'

const sql = readFileSync('supabase/migrations/20251216_order_status_history_simple.sql', 'utf8')

const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

console.log('Applying migration to fix POS order creation error...\n')

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
    console.error('❌ Migration failed:', data.error)
    console.error('\nResponse status:', response.status)
    process.exit(1)
  }

  console.log('✅ Migration applied successfully!')
  console.log('✅ POS order creation should now work correctly')
  console.log('\nThe order_status_history table now has the changed_by_user_id column.')

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
