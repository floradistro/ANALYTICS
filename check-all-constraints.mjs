const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

const sql = `
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'order_status_history';
`

console.log('Checking all constraints on order_status_history...\n')

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
    console.error('Error:', data.error)
    process.exit(1)
  }

  console.log('All constraints:')
  console.log(JSON.stringify(data.result.rows, null, 2))

} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
