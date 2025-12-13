// Inspect what's actually in the legacy data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
);

async function inspect() {
  console.log('🔍 DETAILED INSPECTION\n');

  // Get full legacy configs
  console.log('1. Full legacy terminal configs:');
  const { data: legacy } = await supabase
    .from('dejavoo_terminal_configs')
    .select('*');

  console.log(JSON.stringify(legacy, null, 2));

  // Get the register using legacy link
  console.log('\n\n2. Register using dejavoo_config_id:');
  const { data: reg } = await supabase
    .from('pos_registers')
    .select('*')
    .eq('id', '3b15a36d-377e-48e3-9c46-60a41903e773');

  // Hmm, this queries by register id but the dejavoo_config_id is the legacy config id
  // Let me get the right register
  const { data: regByConfig } = await supabase
    .from('pos_registers')
    .select('*')
    .eq('dejavoo_config_id', '3b15a36d-377e-48e3-9c46-60a41903e773');

  console.log(JSON.stringify(regByConfig, null, 2));

  // Get processors for that location
  console.log('\n\n3. Payment processors at same location:');
  if (regByConfig && regByConfig[0]) {
    const { data: procs } = await supabase
      .from('payment_processors')
      .select('*')
      .eq('location_id', regByConfig[0].location_id);

    console.log(JSON.stringify(procs, null, 2));
  }
}

inspect().catch(console.error);
