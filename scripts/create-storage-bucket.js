/**
 * Create temp-uploads storage bucket in Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  try {
    console.log('Checking if temp-uploads bucket exists...');

    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketExists = buckets.some(b => b.name === 'temp-uploads');

    if (bucketExists) {
      console.log('✓ temp-uploads bucket already exists');
      return;
    }

    console.log('Creating temp-uploads bucket...');

    // Create the bucket with public access
    const { data, error } = await supabase.storage.createBucket('temp-uploads', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        // PDF
        'application/pdf',
        // Text files
        'text/plain',
        'text/csv',
        'text/rtf',
        'application/rtf',
        'text/markdown',
        'text/x-markdown',
        // JSON
        'application/json',
        // Images - all common formats
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        'image/x-icon'
      ]
    });

    if (error) {
      console.error('Error creating bucket:', error);
      process.exit(1);
    }

    console.log('✓ temp-uploads bucket created successfully');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

createBucket();
