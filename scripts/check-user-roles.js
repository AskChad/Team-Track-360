const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRoles() {
  const { data: roles } = await supabase.from('admin_roles').select('*');
  console.log('Admin Roles:', JSON.stringify(roles, null, 2));
  
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, platform_role');
  console.log('\nProfiles:', JSON.stringify(profiles, null, 2));
}

checkRoles();
