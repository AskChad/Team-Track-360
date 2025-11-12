require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration 014...\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '014_update_rls_public_visibility.sql'),
      'utf-8'
    );

    const { error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration 014 completed successfully!');
    console.log('\nNew RLS policies:');
    console.log('  - Competitions: visible to ALL authenticated users');
    console.log('  - Locations: visible to ALL authenticated users');
    console.log('  - Events: visible to users in same organization');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runMigration();
