// Migration script: Safely migrate legacy terminal configs before cleanup
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
);

async function migrate() {
  console.log('🔄 MIGRATION: Legacy Terminal Configs → Payment Processors\n');
  console.log('═'.repeat(70) + '\n');

  // Step 1: Get all data from dejavoo_terminal_configs
  console.log('STEP 1: Fetching legacy terminal configs...');
  const { data: legacyConfigs, error: legacyError } = await supabase
    .from('dejavoo_terminal_configs')
    .select('*');

  if (legacyError) {
    console.log('   ❌ Error fetching legacy configs:', legacyError.message);
    return;
  }

  console.log(`   Found ${legacyConfigs?.length || 0} legacy configs\n`);

  if (legacyConfigs && legacyConfigs.length > 0) {
    console.log('   Legacy configs:');
    legacyConfigs.forEach(c => {
      console.log(`   - ID: ${c.id}`);
      console.log(`     Merchant: ${c.merchant_id}, Location: ${c.location_id}`);
      console.log(`     Dejavoo MID: ${c.dejavoo_merchant_id || 'N/A'}`);
    });
    console.log('');
  }

  // Step 2: Get existing payment_processors to check for duplicates
  console.log('STEP 2: Checking existing payment_processors...');
  const { data: existingProcessors, error: procError } = await supabase
    .from('payment_processors')
    .select('*')
    .eq('processor_type', 'dejavoo');

  if (procError) {
    console.log('   ❌ Error fetching processors:', procError.message);
    return;
  }

  console.log(`   Found ${existingProcessors?.length || 0} existing Dejavoo processors\n`);

  // Step 3: For each legacy config, check if it already exists in payment_processors
  console.log('STEP 3: Analyzing migration needs...\n');

  for (const legacy of (legacyConfigs || [])) {
    console.log(`   Checking legacy config ${legacy.id}...`);

    // Check if this exact config already exists (by dejavoo_merchant_id + location)
    const existing = existingProcessors?.find(p =>
      p.location_id === legacy.location_id &&
      p.dejavoo_merchant_id === legacy.dejavoo_merchant_id
    );

    if (existing) {
      console.log(`   ✅ Already exists in payment_processors (ID: ${existing.id})`);

      // If there are registers using dejavoo_config_id pointing to this legacy config,
      // update them to use payment_processor_id instead
      const { data: linkedRegisters } = await supabase
        .from('pos_registers')
        .select('id, register_name')
        .eq('dejavoo_config_id', legacy.id);

      if (linkedRegisters && linkedRegisters.length > 0) {
        console.log(`   📝 Found ${linkedRegisters.length} register(s) using old link - updating...`);

        for (const reg of linkedRegisters) {
          const { error: updateError } = await supabase
            .from('pos_registers')
            .update({
              payment_processor_id: existing.id,
              dejavoo_config_id: null
            })
            .eq('id', reg.id);

          if (updateError) {
            console.log(`   ❌ Failed to update register ${reg.register_name}: ${updateError.message}`);
          } else {
            console.log(`   ✅ Updated register "${reg.register_name}" to use payment_processor_id`);
          }
        }
      }
    } else {
      console.log(`   ⚠️  No matching processor found - would need to create one`);
      console.log(`      (Location: ${legacy.location_id}, Dejavoo MID: ${legacy.dejavoo_merchant_id})`);

      // Create the processor in payment_processors
      const { data: newProc, error: createError } = await supabase
        .from('payment_processors')
        .insert({
          vendor_id: legacy.merchant_id,  // merchant_id in legacy is vendor_id
          location_id: legacy.location_id,
          processor_type: 'dejavoo',
          processor_name: legacy.terminal_name || 'Migrated Terminal',
          is_active: true,
          is_default: false,
          environment: 'production',
          dejavoo_merchant_id: legacy.dejavoo_merchant_id,
          dejavoo_authkey: legacy.auth_key,
          dejavoo_v_number: legacy.v_number,
          dejavoo_tpn: legacy.tpn,
          dejavoo_store_number: legacy.store_number,
          dejavoo_register_id: legacy.register_id,
        })
        .select()
        .single();

      if (createError) {
        console.log(`   ❌ Failed to create processor: ${createError.message}`);
      } else {
        console.log(`   ✅ Created new processor (ID: ${newProc.id})`);

        // Update any registers using the old config
        const { data: linkedRegisters } = await supabase
          .from('pos_registers')
          .select('id, register_name')
          .eq('dejavoo_config_id', legacy.id);

        if (linkedRegisters && linkedRegisters.length > 0) {
          for (const reg of linkedRegisters) {
            const { error: updateError } = await supabase
              .from('pos_registers')
              .update({
                payment_processor_id: newProc.id,
                dejavoo_config_id: null
              })
              .eq('id', reg.id);

            if (updateError) {
              console.log(`   ❌ Failed to update register ${reg.register_name}: ${updateError.message}`);
            } else {
              console.log(`   ✅ Updated register "${reg.register_name}" to use new processor`);
            }
          }
        }
      }
    }
    console.log('');
  }

  // Step 4: Final verification
  console.log('═'.repeat(70));
  console.log('\nSTEP 4: Final Verification...\n');

  const { data: remainingLegacyLinks } = await supabase
    .from('pos_registers')
    .select('id, register_name, dejavoo_config_id')
    .not('dejavoo_config_id', 'is', null);

  if (remainingLegacyLinks && remainingLegacyLinks.length > 0) {
    console.log('⚠️  WARNING: Some registers still use dejavoo_config_id:');
    remainingLegacyLinks.forEach(r => {
      console.log(`   - ${r.register_name} (${r.dejavoo_config_id})`);
    });
  } else {
    console.log('✅ No registers use dejavoo_config_id anymore');
  }

  const { data: newLinks } = await supabase
    .from('pos_registers')
    .select('id, register_name, payment_processor_id')
    .not('payment_processor_id', 'is', null);

  console.log(`✅ ${newLinks?.length || 0} registers now use payment_processor_id\n`);

  // Summary
  console.log('═'.repeat(70));
  console.log('\n📋 MIGRATION COMPLETE\n');

  if (!remainingLegacyLinks || remainingLegacyLinks.length === 0) {
    console.log('✅ SAFE TO DELETE:');
    console.log('   - dejavoo_terminal_configs table');
    console.log('   - pos_registers.dejavoo_config_id column');
    console.log('\nRun the Supabase migration to clean up.');
  } else {
    console.log('⚠️  MANUAL INTERVENTION NEEDED for remaining legacy links');
  }
}

migrate().catch(console.error);
