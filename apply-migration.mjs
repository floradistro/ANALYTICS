import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const sql = readFileSync('supabase/migrations/20251216_order_status_history_simple.sql', 'utf8')

console.log('Applying migration to fix POS order creation error...')

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).select()

if (error) {
  console.error('Migration failed:', error)

  // Try direct SQL execution via REST API
  console.log('\nTrying alternative method...')
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    console.error('Alternative method also failed. Status:', response.status)
    console.error('You need to run this migration manually in Supabase SQL Editor.')
    console.log('\nSQL to run:')
    console.log(sql)
  } else {
    console.log('Migration applied successfully via alternative method!')
  }
} else {
  console.log('Migration applied successfully!')
  console.log('POS should now work correctly.')
}
