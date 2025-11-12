/**
 * Check files in temp-uploads storage
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  try {
    console.log('Checking temp-uploads storage bucket...\n');

    // List files in the bucket
    const { data: files, error } = await supabase.storage
      .from('temp-uploads')
      .list('ai-imports', {
        limit: 50,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      return;
    }

    console.log(`Found ${files?.length || 0} directories/files in ai-imports/\n`);

    if (files && files.length > 0) {
      for (const file of files) {
        console.log(`Checking ${file.name}/`);
        const { data: subFiles } = await supabase.storage
          .from('temp-uploads')
          .list(`ai-imports/${file.name}`, {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (subFiles && subFiles.length > 0) {
          subFiles.forEach(subFile => {
            const size = subFile.metadata?.size ? Math.round(subFile.metadata.size / 1024) : '?';
            console.log(`  - ${subFile.name} (${size}KB) - ${subFile.created_at}`);
          });
        } else {
          console.log(`  (no files)`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStorage();
