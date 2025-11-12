/**
 * Test file upload to storage and webhook
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  try {
    const filePath = '/mnt/c/Users/chad/Downloads/SCVWA_Folkstyle_Schedule.jpg';

    console.log('Reading JPG file...');
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✓ JPG loaded: ${Math.round(fileBuffer.length / 1024)}KB`);

    // Create unique filename
    const timestamp = Date.now();
    const uniqueFileName = `ai-imports/test-org/${timestamp}-SCVWA_Folkstyle_Schedule.jpg`;

    console.log('\nUploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp-uploads')
      .upload(uniqueFileName, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('✗ Upload error:', uploadError);
      process.exit(1);
    }

    console.log('✓ Upload successful');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('temp-uploads')
      .getPublicUrl(uniqueFileName);

    const publicUrl = urlData.publicUrl;
    console.log(`✓ Public URL: ${publicUrl}`);

    // Prepare webhook payload
    const webhookPayload = {
      fileUrl: publicUrl,
      fileName: 'SCVWA_Folkstyle_Schedule.jpg',
      organizationId: 'test-organization-id',
      entityType: 'competitions',
      timestamp: timestamp,
      fileSize: fileBuffer.length
    };

    console.log('\nSending to Make.com webhook...');
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

    const webhookUrl = 'https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1';
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log(`\n✓ Webhook response status: ${webhookResponse.status}`);

    const responseText = await webhookResponse.text();
    console.log('Response body:', responseText);

    if (!webhookResponse.ok) {
      console.error('✗ Webhook returned error status');
      process.exit(1);
    }

    console.log('\n✓ SUCCESS! PDF uploaded and webhook called');
    console.log(`\nPublic URL for testing: ${publicUrl}`);

  } catch (error) {
    console.error('✗ Fatal error:', error);
    process.exit(1);
  }
}

testUpload();
