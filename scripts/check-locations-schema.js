require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .limit(1);
  
  if (locations && locations.length > 0) {
    console.log('Locations table columns:');
    console.log(JSON.stringify(locations[0], null, 2));
  }
}

checkSchema();
