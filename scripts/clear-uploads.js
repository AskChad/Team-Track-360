/**
 * Clear all uploaded files from temp-uploads bucket
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearUploads() {
  try {
    console.log('Fetching all files in temp-uploads bucket...\n');

    // List all directories in ai-imports
    const { data: dirs, error: dirError } = await supabase.storage
      .from('temp-uploads')
      .list('ai-imports', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (dirError) {
      console.error('Error listing directories:', dirError);
      return;
    }

    console.log(`Found ${dirs?.length || 0} directories\n`);

    let totalDeleted = 0;

    // For each directory, list and delete files
    for (const dir of dirs || []) {
      console.log(`Checking ${dir.name}/...`);

      const { data: files, error: fileError } = await supabase.storage
        .from('temp-uploads')
        .list(`ai-imports/${dir.name}`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (fileError) {
        console.error(`Error listing files in ${dir.name}:`, fileError);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`  No files in ${dir.name}`);
        continue;
      }

      console.log(`  Found ${files.length} files`);

      // Build paths for deletion
      const filePaths = files.map(file => `ai-imports/${dir.name}/${file.name}`);

      // Delete files
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from('temp-uploads')
        .remove(filePaths);

      if (deleteError) {
        console.error(`  Error deleting files:`, deleteError);
      } else {
        console.log(`  ✓ Deleted ${filePaths.length} files`);
        totalDeleted += filePaths.length;
      }
    }

    console.log(`\n✓ Total files deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearUploads();
