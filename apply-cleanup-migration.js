// Apply the cleanup migration via Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
);

async function applyMigration() {
  console.log('🔧 APPLYING SCHEMA CLEANUP MIGRATION\n');
  console.log('═'.repeat(60) + '\n');

  // Step 1: Drop FK constraint
  console.log('STEP 1: Dropping foreign key constraint...');
  const { error: fkError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE pos_registers DROP CONSTRAINT IF EXISTS pos_registers_dejavoo_config_id_fkey'
  });

  // Note: exec_sql might not exist, try direct approach
  // Using raw query via postgres function if available

  // Let's try a different approach - just verify the current state
  console.log('   Checking current schema state...\n');

  // Check if column exists
  const { data: columns } = await supabase
    .from('pos_registers')
    .select('*')
    .limit(1);

  if (columns && columns[0]) {
    const hasDejavooConfig = 'dejavoo_config_id' in columns[0];
    console.log(`   dejavoo_config_id column exists: ${hasDejavooConfig}`);

    if (hasDejavooConfig) {
      console.log('\n   ⚠️  Column still exists in schema.');
      console.log('   The migration needs to be applied via Supabase Dashboard or CLI.\n');
      console.log('   Go to: https://supabase.com/dashboard → SQL Editor');
      console.log('   Or run: npx supabase db push\n');
    }
  }

  // Check if legacy table exists
  const { data: legacyData, error: legacyError } = await supabase
    .from('dejavoo_terminal_configs')
    .select('id')
    .limit(1);

  if (!legacyError) {
    console.log('   dejavoo_terminal_configs table exists: true');
    console.log('   (Contains historical terminal hardware config data)\n');
  } else if (legacyError.code === '42P01') {
    console.log('   dejavoo_terminal_configs table exists: false (already dropped)');
  }

  console.log('═'.repeat(60));
  console.log('\n📋 MIGRATION SQL (run in Supabase Dashboard SQL Editor):\n');
  console.log(`
-- ============================================================================
-- CLEANUP: Remove legacy dejavoo_terminal_configs table and related columns
-- ============================================================================

-- Step 1: Drop the foreign key constraint from pos_registers
ALTER TABLE pos_registers
DROP CONSTRAINT IF EXISTS pos_registers_dejavoo_config_id_fkey;

-- Step 2: Drop the unused dejavoo_config_id column from pos_registers
ALTER TABLE pos_registers
DROP COLUMN IF EXISTS dejavoo_config_id;

-- Step 3: Drop the legacy dejavoo_terminal_configs table entirely
DROP TABLE IF EXISTS dejavoo_terminal_configs;

-- Add documentation comment
COMMENT ON TABLE payment_processors IS 'Single source of truth for all payment processor configs including Dejavoo terminals. Registers link via payment_processor_id.';
  `);
}

applyMigration().catch(console.error);
