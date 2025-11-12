/**
 * Test the PRODUCTION callback endpoint with real webhook data
 */

async function testProductionCallback() {
  const callbackUrl = 'https://track360.app/api/ai-import-callback';

  // Sample payload matching what Make.com should send
  const testPayload = {
    organizationId: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
    entityType: 'competitions',
    filePath: 'ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/1234567890-test.jpg',
    data: [
      {
        event_name: 'Production Test Tournament',
        date: '2025-12-20',
        style: 'Folkstyle',
        divisions: '8U, 10U, 12U, 14U',
        registration_weighin_time: '8:00 AM',
        venue_name: 'Production Test Arena',
        street_address: '456 Test St',
        city: 'San Jose',
        state: 'CA',
        zip: '95121',
        contact_name: 'Production Test',
        contact_phone: '555-9999',
        contact_email: 'prodtest@example.com'
      }
    ]
  };

  console.log('Testing PRODUCTION callback endpoint...\n');
  console.log('URL:', callbackUrl);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n');

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status, response.statusText);

    const text = await response.text();
    console.log('Response body:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✓ PRODUCTION callback works!');
      console.log('Result:', data);
    } else {
      console.log('\n❌ PRODUCTION callback returned error');
    }
  } catch (error) {
    console.error('\n❌ Error calling PRODUCTION callback:', error.message);
  }
}

testProductionCallback();
