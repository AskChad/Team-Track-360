/**
 * Check data in locations, competitions, and events tables
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  try {
    console.log('Checking database tables...\n');

    // Check locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name, city, state')
      .limit(10);

    console.log(`Locations: ${locations?.length || 0} records`);
    if (locations && locations.length > 0) {
      console.log('Sample locations:');
      locations.forEach(loc => {
        console.log(`  - ${loc.name} (${loc.city}, ${loc.state})`);
      });
    }

    // Check competitions
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('id, name, competition_type')
      .limit(10);

    console.log(`\nCompetitions: ${competitions?.length || 0} records`);
    if (competitions && competitions.length > 0) {
      console.log('Sample competitions:');
      competitions.forEach(comp => {
        console.log(`  - ${comp.name} (${comp.competition_type})`);
      });
    }

    // Check events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date, status')
      .limit(10);

    console.log(`\nEvents: ${events?.length || 0} records`);
    if (events && events.length > 0) {
      console.log('Sample events:');
      events.forEach(evt => {
        console.log(`  - ${evt.name} on ${evt.event_date} (${evt.status})`);
      });
    }

    // Check teams and organizations
    const { data: orgs } = await supabase
      .from('parent_organizations')
      .select('id, name');

    console.log(`\nOrganizations: ${orgs?.length || 0} records`);
    if (orgs && orgs.length > 0) {
      console.log('Organizations:');
      orgs.forEach(org => {
        console.log(`  - ${org.name} (${org.id})`);
      });
    }

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, organization_id');

    console.log(`\nTeams: ${teams?.length || 0} records`);
    if (teams && teams.length > 0) {
      console.log('Sample teams:');
      teams.forEach(team => {
        console.log(`  - ${team.name} (org: ${team.organization_id})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
