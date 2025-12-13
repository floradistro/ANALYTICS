// Final cleanup: Clear redundant links and verify before dropping
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
);

async function cleanup() {
  console.log('🧹 FINAL CLEANUP\n');
  console.log('═'.repeat(60) + '\n');

  // Step 1: Find all registers with dejavoo_config_id set
  console.log('STEP 1: Finding registers with legacy dejavoo_config_id...');
  const { data: registers, error: regError } = await supabase
    .from('pos_registers')
    .select('id, register_name, payment_processor_id, dejavoo_config_id')
    .not('dejavoo_config_id', 'is', null);

  if (regError) {
    console.log('   ❌ Error:', regError.message);
    return;
  }

  console.log(`   Found ${registers?.length || 0} register(s) with dejavoo_config_id\n`);

  // Step 2: For each, verify they also have payment_processor_id, then clear dejavoo_config_id
  console.log('STEP 2: Clearing redundant dejavoo_config_id references...\n');

  for (const reg of (registers || [])) {
    console.log(`   Register: "${reg.register_name}"`);
    console.log(`     payment_processor_id: ${reg.payment_processor_id || 'NULL'}`);
    console.log(`     dejavoo_config_id: ${reg.dejavoo_config_id}`);

    if (reg.payment_processor_id) {
      console.log('     → Already has payment_processor_id, clearing dejavoo_config_id...');

      const { error: updateError } = await supabase
        .from('pos_registers')
        .update({ dejavoo_config_id: null })
        .eq('id', reg.id);

      if (updateError) {
        console.log(`     ❌ Failed: ${updateError.message}`);
      } else {
        console.log('     ✅ Cleared successfully');
      }
    } else {
      console.log('     ⚠️  No payment_processor_id - need manual review');
    }
    console.log('');
  }

  // Step 3: Verify no registers use dejavoo_config_id anymore
  console.log('STEP 3: Verifying cleanup...');
  const { data: remaining } = await supabase
    .from('pos_registers')
    .select('id, register_name')
    .not('dejavoo_config_id', 'is', null);

  if (remaining && remaining.length > 0) {
    console.log(`   ⚠️  Still ${remaining.length} register(s) with dejavoo_config_id`);
  } else {
    console.log('   ✅ No registers use dejavoo_config_id anymore\n');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('\n📋 READY FOR SCHEMA CLEANUP\n');
  console.log('Run the following SQL migration to complete cleanup:');
  console.log('');
  console.log('  -- Drop FK constraint');
  console.log('  ALTER TABLE pos_registers');
  console.log('  DROP CONSTRAINT IF EXISTS pos_registers_dejavoo_config_id_fkey;');
  console.log('');
  console.log('  -- Drop column');
  console.log('  ALTER TABLE pos_registers');
  console.log('  DROP COLUMN IF EXISTS dejavoo_config_id;');
  console.log('');
  console.log('  -- Drop legacy table');
  console.log('  DROP TABLE IF EXISTS dejavoo_terminal_configs;');
}

cleanup().catch(console.error);
