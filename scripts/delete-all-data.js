/**
 * Delete all locations, competitions, and events
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllData() {
  try {
    console.log('Starting deletion process...\n');

    // Delete events first (they reference competitions)
    console.log('Deleting all events...');
    const { error: eventsError, count: eventsCount } = await supabase
      .from('events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (eventsError) {
      console.error('Error deleting events:', eventsError);
    } else {
      console.log(`✓ Deleted all events`);
    }

    // Delete competitions
    console.log('\nDeleting all competitions...');
    const { error: competitionsError, count: competitionsCount } = await supabase
      .from('competitions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (competitionsError) {
      console.error('Error deleting competitions:', competitionsError);
    } else {
      console.log(`✓ Deleted all competitions`);
    }

    // Delete locations
    console.log('\nDeleting all locations...');
    const { error: locationsError, count: locationsCount } = await supabase
      .from('locations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (locationsError) {
      console.error('Error deleting locations:', locationsError);
    } else {
      console.log(`✓ Deleted all locations`);
    }

    console.log('\n✓ Deletion complete!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllData();
