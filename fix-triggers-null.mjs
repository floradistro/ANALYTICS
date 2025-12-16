const supabaseUrl = 'https://uaednwpxursknmwdeejn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

const sql = `
-- Fix the trigger functions to allow NULL values for changed_by
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, created_at)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.updated_by_user_id, NEW.employee_id, NEW.created_by_user_id),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Try to find a valid user ID from the order fields
  user_id := COALESCE(NEW.updated_by_user_id, NEW.employee_id, NEW.created_by_user_id);

  -- Only insert if we have a valid user_id (to satisfy foreign key)
  -- If no user_id, skip the history record for now
  IF user_id IS NOT NULL THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, created_at)
    VALUES (NEW.id, NULL, NEW.status, user_id, NEW.created_at);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

console.log('Fixing triggers to handle NULL user IDs properly...\n')

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

  console.log('✅ Triggers updated successfully!')
  console.log('✅ Triggers will now skip history if no valid user ID is found')
  console.log('✅ POS should work now')

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
