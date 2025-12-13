// Verify it's safe to delete legacy tables
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
);

async function checkSafety() {
  console.log('🔍 SAFETY CHECK BEFORE DELETING LEGACY TABLES\n');
  console.log('═'.repeat(60) + '\n');

  // Check 1: Is dejavoo_terminal_configs empty?
  console.log('1. Checking dejavoo_terminal_configs table...');
  const { data: terminalConfigs, error: tcError } = await supabase
    .from('dejavoo_terminal_configs')
    .select('id, merchant_id, location_id')
    .limit(10);

  if (tcError) {
    console.log('   ❌ Error querying table:', tcError.message);
  } else {
    console.log(`   Found ${terminalConfigs?.length || 0} rows`);
    if (terminalConfigs?.length > 0) {
      console.log('   ⚠️  WARNING: Table has data!');
      console.log('   Data:', JSON.stringify(terminalConfigs, null, 2));
    } else {
      console.log('   ✅ Table is EMPTY - safe to delete\n');
    }
  }

  // Check 2: Are any registers using dejavoo_config_id?
  console.log('2. Checking pos_registers.dejavoo_config_id usage...');
  const { data: registersWithDejavoo, error: regError } = await supabase
    .from('pos_registers')
    .select('id, register_name, dejavoo_config_id, payment_processor_id')
    .not('dejavoo_config_id', 'is', null)
    .limit(10);

  if (regError) {
    console.log('   ❌ Error:', regError.message);
  } else {
    console.log(`   Found ${registersWithDejavoo?.length || 0} registers with dejavoo_config_id set`);
    if (registersWithDejavoo?.length > 0) {
      console.log('   ⚠️  WARNING: Some registers use dejavoo_config_id!');
      console.log('   Data:', JSON.stringify(registersWithDejavoo, null, 2));
    } else {
      console.log('   ✅ No registers use dejavoo_config_id - safe to delete column\n');
    }
  }

  // Check 3: Are registers using payment_processor_id instead?
  console.log('3. Checking pos_registers.payment_processor_id usage...');
  const { data: registersWithProcessor, error: procError } = await supabase
    .from('pos_registers')
    .select('id, register_name, payment_processor_id')
    .not('payment_processor_id', 'is', null)
    .limit(10);

  if (procError) {
    console.log('   ❌ Error:', procError.message);
  } else {
    console.log(`   Found ${registersWithProcessor?.length || 0} registers with payment_processor_id set`);
    if (registersWithProcessor?.length > 0) {
      console.log('   ✅ Registers ARE using payment_processor_id (the correct field)\n');
    } else {
      console.log('   ℹ️  No registers linked to processors yet\n');
    }
  }

  // Check 4: How many payment_processors exist for Dejavoo?
  console.log('4. Checking payment_processors (Dejavoo)...');
  const { data: processors, error: ppError } = await supabase
    .from('payment_processors')
    .select('id, processor_name, dejavoo_merchant_id, location_id')
    .eq('processor_type', 'dejavoo')
    .limit(20);

  if (ppError) {
    console.log('   ❌ Error:', ppError.message);
  } else {
    console.log(`   Found ${processors?.length || 0} Dejavoo processors in payment_processors`);
    console.log('   ✅ This is your source of truth\n');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('\n📋 SUMMARY:\n');

  const terminalConfigsEmpty = !terminalConfigs || terminalConfigs.length === 0;
  const noDejavooConfigUsage = !registersWithDejavoo || registersWithDejavoo.length === 0;

  if (terminalConfigsEmpty && noDejavooConfigUsage) {
    console.log('✅ SAFE TO DELETE:');
    console.log('   - dejavoo_terminal_configs table (empty)');
    console.log('   - pos_registers.dejavoo_config_id column (unused)');
    console.log('\n✅ KEEP:');
    console.log('   - payment_processors table (has your Dejavoo configs)');
    console.log('   - pos_registers.payment_processor_id column (correct link)');
  } else {
    console.log('⚠️  DO NOT DELETE YET - data migration needed first!');
  }
}

checkSafety().catch(console.error);
