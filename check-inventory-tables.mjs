const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

// Check inventory table structure
const checkInventory = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
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
        AND table_name = 'inventory'
      ORDER BY ordinal_position;
    `
  })
})

const inventory = await checkInventory.json()
console.log('Inventory table structure:', JSON.stringify(inventory.result?.rows || [], null, 2))

// Check inventory_adjustments table structure
const checkAdjustments = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
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
        AND table_name = 'inventory_adjustments'
      ORDER BY ordinal_position;
    `
  })
})

const adjustments = await checkAdjustments.json()
console.log('\nInventory adjustments table structure:', JSON.stringify(adjustments.result?.rows || [], null, 2))

// Get sample inventory_adjustments data
const sampleAdjustments = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT *
      FROM inventory_adjustments
      ORDER BY created_at DESC
      LIMIT 5;
    `
  })
})

const sample = await sampleAdjustments.json()
console.log('\nSample inventory adjustments:', JSON.stringify(sample.result?.rows || [], null, 2))

// Count total adjustments by date
const countByDate = await fetch(`${supabaseUrl}/functions/v1/exec-ddl`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    sql: `
      SELECT
        created_at::date as audit_date,
        location_id,
        COUNT(*) as adjustment_count
      FROM inventory_adjustments
      GROUP BY created_at::date, location_id
      ORDER BY audit_date DESC, location_id
      LIMIT 10;
    `
  })
})

const countData = await countByDate.json()
console.log('\nAdjustments by date and location:', JSON.stringify(countData.result?.rows || [], null, 2))
