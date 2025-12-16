const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

const sql = `
-- Fix the trigger functions to use 'changed_by' instead of 'changed_by_user_id'
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, created_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by_user_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, created_at)
  VALUES (NEW.id, NULL, NEW.status, COALESCE(NEW.updated_by_user_id, NEW.employee_id, NEW.created_by_user_id), NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

console.log('Fixing trigger functions to use correct column name...\n')

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

  console.log('✅ Triggers fixed successfully!')
  console.log('✅ POS order creation should now work')

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
