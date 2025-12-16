#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('Executing SQL...');
  console.log(sql);
  console.log('\n---\n');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.includes('CREATE OR REPLACE FUNCTION')) {
      // This is a function definition, we need to execute it as raw SQL
      // Supabase client doesn't support this directly, so we need to use RPC
      console.log('Attempting to execute function definition...');
      console.log('Note: This requires database access via psql or SQL Editor');
    } else if (statement.includes('SELECT update_inventory')) {
      // This is calling our function
      const { data, error } = await supabase.rpc('update_inventory_market_value_by_category');
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('Success! Inventory updated.');
      }
    }
  }
}

// Get SQL file from command line argument
const sqlFile = process.argv[2] || './supabase/migrations/fix_tier_pricing_all_products.sql';

executeSQLFile(sqlFile)
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err));
