require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKey() {
  const { data: orgs } = await supabase
    .from('parent_organizations')
    .select('id, name, openai_api_key');

  console.log('Organizations and OpenAI Keys:\n');
  orgs.forEach(org => {
    console.log(org.name + ' (' + org.id + ')');
    const hasKey = org.openai_api_key ? 'SET' : 'NOT SET';
    console.log('  OpenAI Key: ' + hasKey);
    console.log('');
  });
}

checkKey();
