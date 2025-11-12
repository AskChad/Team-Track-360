/**
 * Check competitions and events in database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    const orgId = '917fd5d9-ef2d-45bf-b81d-4f48064d495d';

    console.log('Checking database records for organization:', orgId);
    console.log('');

    // Check competitions
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (compError) {
      console.error('Error fetching competitions:', compError);
    } else {
      console.log(`Found ${competitions?.length || 0} competitions:`);
      if (competitions && competitions.length > 0) {
        competitions.forEach(comp => {
          console.log(`  - ${comp.name} (created: ${comp.created_at})`);
        });
      }
    }
    console.log('');

    // Check events
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('*, competitions(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (eventError) {
      console.error('Error fetching events:', eventError);
    } else {
      console.log(`Found ${events?.length || 0} recent events:`);
      if (events && events.length > 0) {
        events.forEach(event => {
          console.log(`  - ${event.name} (${event.event_date}) - created: ${event.created_at}`);
        });
      }
    }
    console.log('');

    // Check locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (locError) {
      console.error('Error fetching locations:', locError);
    } else {
      console.log(`Found ${locations?.length || 0} recent locations:`);
      if (locations && locations.length > 0) {
        locations.forEach(loc => {
          console.log(`  - ${loc.name} (${loc.city}, ${loc.state}) - created: ${loc.created_at}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();
