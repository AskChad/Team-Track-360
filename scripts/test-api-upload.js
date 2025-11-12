/**
 * Test AI import API with actual organization
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function testAPIUpload() {
  try {
    const filePath = '/mnt/c/Users/chad/Downloads/SCVWA_Folkstyle_Schedule.jpg';

    console.log('Reading JPG file...');
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✓ JPG loaded: ${Math.round(fileBuffer.length / 1024)}KB`);

    // Create FormData
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('file', fileBuffer, {
      filename: 'SCVWA_Folkstyle_Schedule.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('entity_type', 'competitions');
    formData.append('organization_id', '917fd5d9-ef2d-45bf-b81d-4f48064d495d'); // Real org ID

    console.log('\nCalling API endpoint...');
    const response = await fetch('http://localhost:3000/api/ai-import', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzNGIxYTQ0Yy05NDc1LTQ1OWEtYTRjNS1kZGVmNGMxNWIzNjkiLCJlbWFpbCI6ImNoYWRAYXNrY2hhZC5uZXQiLCJyb2xlIjoicGxhdGZvcm1fYWRtaW4iLCJpYXQiOjE3NjI5MjY0NDV9.cnZQdpoWBfOu3-hcsLsR59HPvDbP_l4umPD7iqqV4gM',
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log(`\nAPI Response: ${response.status} ${response.statusText}`);

    const responseData = await response.json();
    console.log('\nResponse data:', JSON.stringify(responseData, null, 2));

    if (responseData.success) {
      console.log('\n✓ SUCCESS!');
      console.log(`Inserted: ${responseData.data?.insertedCount || 0} competitions`);
      console.log(`Created: ${responseData.data?.eventsCreated || 0} events`);
    } else {
      console.log('\n✗ FAILED:', responseData.error);
    }

  } catch (error) {
    console.error('✗ Fatal error:', error);
    process.exit(1);
  }
}

testAPIUpload();
