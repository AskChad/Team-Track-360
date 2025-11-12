/**
 * Test Make.com webhook to see what it returns
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWebhook() {
  try {
    // Get one of the uploaded files from storage
    const filePath = 'ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/1762926597485-SCVWA_Folkstyle_Schedule.jpg';

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('temp-uploads')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('Testing webhook with file:', publicUrl);
    console.log('');

    // Send to webhook
    const webhookUrl = 'https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1';

    console.log('Sending request to Make.com webhook...');
    const startTime = Date.now();

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl: publicUrl,
        fileName: 'SCVWA_Folkstyle_Schedule.jpg',
        organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
        entityType: 'competitions',
        timestamp: Date.now(),
        fileSize: 678000
      })
    });

    const duration = Date.now() - startTime;
    console.log(`Response received in ${duration}ms`);
    console.log('Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('');

    // Get response text first
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    console.log('');

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('Parsed JSON:');
      console.log(JSON.stringify(jsonData, null, 2));

      if (Array.isArray(jsonData)) {
        console.log('\n✅ Webhook returned an array with', jsonData.length, 'items');
      } else {
        console.log('\n⚠️  Webhook returned an object, not an array');
      }
    } catch (e) {
      console.log('⚠️  Response is not valid JSON');
      if (responseText.toLowerCase().includes('accepted')) {
        console.log('❌ Webhook returned "Accepted" - this means asynchronous processing is configured');
        console.log('   You need to either:');
        console.log('   1. Configure Make.com to return data synchronously, OR');
        console.log('   2. Set up the async callback to /api/ai-import-callback');
      }
    }

  } catch (error) {
    console.error('Error testing webhook:', error);
    process.exit(1);
  }
}

testWebhook();
