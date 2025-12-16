const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

// Check products table structure
const checkProducts = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
      ORDER BY ordinal_position;
    `
  })
})

const products = await checkProducts.json()
console.log('Products table structure:', JSON.stringify(products.result?.rows || [], null, 2))

// Check for any inventory or stock tables
const checkInventory = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
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
        AND (table_name LIKE '%inventory%' OR table_name LIKE '%stock%' OR table_name LIKE '%location%')
      ORDER BY table_name;
    `
  })
})

const inventory = await checkInventory.json()
console.log('\nInventory/Stock/Location tables:', JSON.stringify(inventory.result?.rows || [], null, 2))

// Sample product_audit with metadata
const checkAudits = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT
        id,
        product_id,
        vendor_id,
        changed_at,
        field_name,
        old_value,
        new_value,
        metadata
      FROM product_audit
      WHERE field_name = 'quantity'
      LIMIT 5;
    `
  })
})

const audits = await checkAudits.json()
console.log('\nSample product audits:', JSON.stringify(audits.result?.rows || [], null, 2))
