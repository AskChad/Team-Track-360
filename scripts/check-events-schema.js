require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // First create a test event to see what columns exist
  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: '917fd5d9-ef2d-45bf-b81d-4f48064d495d',
      name: 'TEST EVENT',
      event_type: 'tournament',
      start_time: '2025-12-01',
      end_time: '2025-12-01',
    })
    .select('*')
    .single();

  if (error) {
    console.log('Error creating test event:', error.message);
    console.log('Details:', error);
  } else {
    console.log('Events table columns:');
    console.log(Object.keys(data));
    
    // Delete test event
    await supabase.from('events').delete().eq('id', data.id);
    console.log('\nTest event deleted');
  }
}

checkSchema();
