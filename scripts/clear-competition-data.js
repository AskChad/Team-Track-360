/**
 * Clear all competitions, events, and locations
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearData() {
  try {
    console.log('=Ñ  Clearing all competition data...\n');

    // Delete events first (has foreign keys to competitions)
    console.log('Deleting events...');
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (eventsError) {
      console.error('Error deleting events:', eventsError);
    } else {
      console.log(' Events cleared');
    }

    // Delete competitions
    console.log('Deleting competitions...');
    const { error: compsError } = await supabase
      .from('competitions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (compsError) {
      console.error('Error deleting competitions:', compsError);
    } else {
      console.log(' Competitions cleared');
    }

    // Delete locations
    console.log('Deleting locations...');
    const { error: locsError } = await supabase
      .from('locations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (locsError) {
      console.error('Error deleting locations:', locsError);
    } else {
      console.log(' Locations cleared');
    }

    // Verify deletion
    console.log('\n=== Verifying deletion ===\n');

    const { data: competitions } = await supabase.from('competitions').select('id');
    const { data: events } = await supabase.from('events').select('id');
    const { data: locations } = await supabase.from('locations').select('id');

    console.log(`Competitions remaining: ${competitions ? competitions.length : 0}`);
    console.log(`Events remaining: ${events ? events.length : 0}`);
    console.log(`Locations remaining: ${locations ? locations.length : 0}`);

    console.log('\n All data cleared! Ready for fresh upload.\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearData();
