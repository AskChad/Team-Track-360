/**
 * Check for recently created data in the database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentData() {
  try {
    console.log('Checking for recently created data...\n');

    // Check all locations with timestamps
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name, city, state, created_at, organization_id')
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`Locations: ${locations?.length || 0} total records`);
    if (locations && locations.length > 0) {
      locations.forEach(loc => {
        console.log(`  - ${loc.name} (${loc.city}, ${loc.state}) - Created: ${loc.created_at} - Org: ${loc.organization_id}`);
      });
    }

    // Check all competitions with timestamps
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('id, name, competition_type, created_at, organization_id')
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`\nCompetitions: ${competitions?.length || 0} total records`);
    if (competitions && competitions.length > 0) {
      competitions.forEach(comp => {
        console.log(`  - ${comp.name} (${comp.competition_type}) - Created: ${comp.created_at} - Org: ${comp.organization_id}`);
      });
    }

    // Check all events with timestamps
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date, status, created_at, team_id')
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`\nEvents: ${events?.length || 0} total records`);
    if (events && events.length > 0) {
      events.forEach(evt => {
        console.log(`  - ${evt.name} on ${evt.event_date} (${evt.status}) - Created: ${evt.created_at} - Team: ${evt.team_id}`);
      });
    }

    // Check sports
    const { data: sports } = await supabase
      .from('sports')
      .select('id, name');

    console.log(`\nSports: ${sports?.length || 0} records`);
    if (sports && sports.length > 0) {
      sports.forEach(sport => {
        console.log(`  - ${sport.name} (${sport.id})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentData();
