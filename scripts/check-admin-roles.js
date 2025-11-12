/**
 * Check admin roles in database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminRoles() {
  try {
    // Check admin roles
    const { data: adminRoles, error } = await supabase
      .from('admin_roles')
      .select('*');

    console.log(`Admin Roles: ${adminRoles?.length || 0} records\n`);
    if (adminRoles && adminRoles.length > 0) {
      adminRoles.forEach(role => {
        console.log(`User: ${role.user_id}`);
        console.log(`  Role: ${role.role_type}`);
        console.log(`  Org: ${role.organization_id || 'N/A'}`);
        console.log(`  Team: ${role.team_id || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No admin roles found!');
    }

    // Check profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    console.log(`\nProfiles: ${profiles?.length || 0} records\n`);
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.full_name || 'No name'}) - ID: ${profile.id}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdminRoles();
