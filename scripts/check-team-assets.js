/**
 * Check files in team-assets storage and teams table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamAssets() {
  try {
    console.log('=== Checking team-assets storage bucket ===\n');

    // List all files in team-assets bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name).join(', '));
      console.log('');
    }

    // List files in the teams folder
    const { data: files, error } = await supabase.storage
      .from('team-assets')
      .list('teams', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing files in team-assets/teams:', error);
    } else {
      console.log(`Found ${files?.length || 0} files in team-assets/teams/\n`);

      if (files && files.length > 0) {
        files.forEach(file => {
          const size = file.metadata?.size ? Math.round(file.metadata.size / 1024) : '?';
          console.log(`  - ${file.name} (${size}KB) - ${file.created_at}`);
        });
      }
    }

    console.log('\n=== Checking teams table ===\n');

    // Query teams table for header images
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, header_image_url')
      .order('created_at', { ascending: false });

    if (teamsError) {
      console.error('Error querying teams:', teamsError);
    } else {
      console.log(`Found ${teams?.length || 0} teams in database:\n`);

      if (teams && teams.length > 0) {
        teams.forEach(team => {
          console.log(`Team: ${team.name}`);
          console.log(`  ID: ${team.id}`);
          console.log(`  Header Image: ${team.header_image_url || '(none)'}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTeamAssets();
