/**
 * Test the callback endpoint with sample data
 */

require('dotenv').config({ path: '.env.local' });

async function testCallback() {
  const callbackUrl = 'http://localhost:3000/api/ai-import-callback';

  const testPayload = {
    organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
    entityType: 'competitions',
    filePath: 'ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/test-file.jpg',
    data: [
      {
        event_name: 'Test Tournament',
        date: '2025-12-15',
        style: 'Folkstyle',
        divisions: '8U, 10U, 12U',
        registration_weighin_time: '7:00 AM',
        venue_name: 'Test Arena',
        street_address: '123 Main St',
        city: 'San Jose',
        state: 'CA',
        zip: '95121',
        contact_name: 'John Doe',
        contact_phone: '555-1234',
        contact_email: 'test@example.com'
      }
    ]
  };

  console.log('Testing callback endpoint...\n');
  console.log('URL:', callbackUrl);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('\nResponse data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✓ Callback endpoint works correctly!');
    } else {
      console.log('\n❌ Callback endpoint returned error');
    }
  } catch (error) {
    console.error('\n❌ Error calling callback:', error.message);
  }
}

testCallback();
