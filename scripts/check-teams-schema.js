/**
 * Check teams table schema
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamsSchema() {
  try {
    // Get a sample team to see what columns exist
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying teams:', error);
      return;
    }

    console.log('Teams table columns:');
    if (teams && teams.length > 0) {
      console.log(JSON.stringify(teams[0], null, 2));
    } else {
      console.log('No teams found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTeamsSchema();
