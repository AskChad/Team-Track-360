/**
 * Test different field names for the webhook
 */

async function testWebhook() {
  const webhookUrl = 'https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1';
  const imageUrl = 'https://iccmkpmujtmvtfpvoxli.supabase.co/storage/v1/object/public/temp-uploads/ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/1762926597485-SCVWA_Folkstyle_Schedule.jpg';

  console.log('Testing webhook with image URL:', imageUrl);
  console.log('');

  // Test 1: Current format with fileUrl
  console.log('Test 1: Sending with "fileUrl" field...');
  try {
    const response1 = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl: imageUrl,
        fileName: 'test.jpg',
        organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
        entityType: 'competitions'
      })
    });
    const text1 = await response1.text();
    console.log('Response:', text1);
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.log('');

  // Test 2: Try with imageUrl
  console.log('Test 2: Sending with "imageUrl" field...');
  try {
    const response2 = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: imageUrl,
        fileName: 'test.jpg',
        organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
        entityType: 'competitions'
      })
    });
    const text2 = await response2.text();
    console.log('Response:', text2);
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.log('');

  // Test 3: Try with url
  console.log('Test 3: Sending with "url" field...');
  try {
    const response3 = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        fileName: 'test.jpg',
        organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
        entityType: 'competitions'
      })
    });
    const text3 = await response3.text();
    console.log('Response:', text3);
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.log('');

  // Test 4: Try with image
  console.log('Test 4: Sending with "image" field...');
  try {
    const response4 = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageUrl,
        fileName: 'test.jpg',
        organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
        entityType: 'competitions'
      })
    });
    const text4 = await response4.text();
    console.log('Response:', text4);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testWebhook();
