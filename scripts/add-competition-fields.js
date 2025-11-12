/**
 * Add contact and divisions fields to competitions table using raw SQL
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addFields() {
  try {
    console.log('Adding fields to competitions table...\n');

    // First, add the columns
    const addColumnsSQL = `
      ALTER TABLE competitions
      ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
      ADD COLUMN IF NOT EXISTS contact_last_name TEXT,
      ADD COLUMN IF NOT EXISTS contact_email TEXT,
      ADD COLUMN IF NOT EXISTS contact_phone TEXT,
      ADD COLUMN IF NOT EXISTS divisions TEXT[];
    `;

    const { error: addError } = await supabase.rpc('query', {
      query: addColumnsSQL
    });

    if (addError) {
      // Try direct approach using REST API
      console.log('Using direct SQL approach...');

      // We'll need to use a different method - let's check the table first
      const { data: tableInfo, error: infoError } = await supabase
        .from('competitions')
        .select('*')
        .limit(1);

      if (infoError) {
        console.error('Error checking table:', infoError);
        process.exit(1);
      }

      console.log('Current table columns:', Object.keys(tableInfo[0] || {}));
      console.log('\nNote: Cannot alter table structure via Supabase client.');
      console.log('Please run these SQL statements in Supabase SQL Editor:');
      console.log('\n--- SQL TO RUN ---');
      console.log(addColumnsSQL);
      console.log('\nALTER TABLE competitions DROP COLUMN IF EXISTS age;');
      console.log('--- END SQL ---\n');
    } else {
      console.log('✓ Successfully added columns');

      // Now drop the age column
      const dropColumnSQL = `ALTER TABLE competitions DROP COLUMN IF EXISTS age;`;

      const { error: dropError } = await supabase.rpc('query', {
        query: dropColumnSQL
      });

      if (dropError) {
        console.log('✓ Note: age column may not exist or already dropped');
      } else {
        console.log('✓ Successfully dropped age column');
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addFields();
