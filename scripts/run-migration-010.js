/**
 * Run migration 010 using Supabase API
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running migration 010_add_team_header_image.sql\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '010_add_team_header_image.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Migration SQL:');
    console.log('---');
    console.log(sql);
    console.log('---\n');

    // Step 1: Add column to teams table
    console.log('Step 1: Adding header_image_url column to teams table...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE teams ADD COLUMN IF NOT EXISTS header_image_url TEXT;'
    });

    if (alterError) {
      console.error('Error adding column:', alterError);
    } else {
      console.log('✅ Column added successfully\n');
    }

    // Step 2: Create storage bucket
    console.log('Step 2: Creating team-assets storage bucket...');
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('team-assets', {
      public: true,
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError) {
      if (bucketError.message?.includes('already exists')) {
        console.log('ℹ️  Bucket already exists\n');
      } else {
        console.error('Error creating bucket:', bucketError);
      }
    } else {
      console.log('✅ Bucket created successfully\n');
    }

    // Step 3: Verify the changes
    console.log('Step 3: Verifying changes...\n');

    // Check buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    }

    // Check teams table
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, header_image_url')
      .limit(1);

    if (teamsError) {
      console.error('Error querying teams:', teamsError);
    } else {
      console.log('✅ Teams table has header_image_url column');
      if (teams && teams.length > 0) {
        console.log('Sample team:', teams[0]);
      }
    }

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
