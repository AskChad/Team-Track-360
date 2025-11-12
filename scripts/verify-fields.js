/**
 * Verify new fields exist in competitions table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFields() {
  try {
    console.log('Checking competitions table structure...\n');

    const { data, error } = await supabase
      .from('competitions')
      .select('id, name, contact_first_name, contact_last_name, contact_email, contact_phone, divisions')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('\n❌ Fields not added yet. Please run SQL in Supabase dashboard.');
      }
    } else {
      console.log('✓ All fields exist in competitions table!');
      console.log('\nFields verified:');
      console.log('  - contact_first_name');
      console.log('  - contact_last_name');
      console.log('  - contact_email');
      console.log('  - contact_phone');
      console.log('  - divisions');

      if (data && data.length > 0) {
        console.log('\nSample record:', data[0]);
      } else {
        console.log('\nNo records found (table is empty)');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyFields();
