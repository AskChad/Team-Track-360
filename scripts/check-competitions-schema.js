/**
 * Check competitions table schema
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    // Try to select with is_public field
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Competition table columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Table is empty');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
