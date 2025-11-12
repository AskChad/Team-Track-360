/**
 * Check and fix temp-uploads bucket permissions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
  try {
    console.log('Checking temp-uploads bucket configuration...\n');

    // Try to get bucket info
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }

    const tempUploads = buckets.find(b => b.name === 'temp-uploads');

    if (!tempUploads) {
      console.log('❌ temp-uploads bucket does not exist!');
      console.log('\nCreating bucket...');

      const { data: newBucket, error: createError } = await supabase.storage.createBucket('temp-uploads', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
      } else {
        console.log('✓ Created temp-uploads bucket as PUBLIC');
      }
    } else {
      console.log(`Bucket: temp-uploads`);
      console.log(`Public: ${tempUploads.public}`);
      console.log(`ID: ${tempUploads.id}`);

      if (!tempUploads.public) {
        console.log('\n❌ Bucket is NOT public!');
        console.log('You need to make it public in Supabase dashboard:');
        console.log('1. Go to https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/storage/buckets');
        console.log('2. Click on temp-uploads bucket');
        console.log('3. Click "Edit bucket"');
        console.log('4. Toggle "Public bucket" to ON');
        console.log('5. Save changes');
      } else {
        console.log('✓ Bucket is public');
      }
    }

    // Test file upload and access
    console.log('\nTesting file upload and public access...');

    const testContent = 'test file content';
    const testPath = 'test/test.txt';

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp-uploads')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading test file:', uploadError);
      return;
    }

    console.log('✓ Test file uploaded');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('temp-uploads')
      .getPublicUrl(testPath);

    const publicUrl = urlData.publicUrl;
    console.log(`Public URL: ${publicUrl}`);

    // Try to fetch it
    console.log('Testing public access...');
    const response = await fetch(publicUrl);

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const content = await response.text();
      console.log('✓ File is publicly accessible');
      console.log(`Content: ${content}`);
    } else {
      console.log(`❌ Cannot access file: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }

    // Clean up test file
    await supabase.storage
      .from('temp-uploads')
      .remove([testPath]);

    console.log('✓ Test file deleted');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBucket();
