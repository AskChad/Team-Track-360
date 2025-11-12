/**
 * Add contact and divisions fields to competitions table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  try {
    console.log('Adding new fields to competitions table...\n');

    // Add contact fields and divisions
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add contact fields
        ALTER TABLE competitions
        ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
        ADD COLUMN IF NOT EXISTS contact_last_name TEXT,
        ADD COLUMN IF NOT EXISTS contact_email TEXT,
        ADD COLUMN IF NOT EXISTS contact_phone TEXT,
        ADD COLUMN IF NOT EXISTS divisions TEXT[];

        -- Drop age column if it exists (replacing with divisions)
        ALTER TABLE competitions
        DROP COLUMN IF EXISTS age;
      `
    });

    if (error) {
      console.error('Error updating schema:', error);
      process.exit(1);
    }

    console.log('✓ Successfully added fields to competitions table:');
    console.log('  - contact_first_name (TEXT)');
    console.log('  - contact_last_name (TEXT)');
    console.log('  - contact_email (TEXT)');
    console.log('  - contact_phone (TEXT)');
    console.log('  - divisions (TEXT[])');
    console.log('\n✓ Removed age column');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateSchema();
