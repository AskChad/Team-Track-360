/**
 * Check recent competitions to verify imports
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentCompetitions() {
  try {
    const orgId = '917fd5d9-ef2d-45bf-b81d-4f48064d495d';

    console.log('Checking recent competitions for org:', orgId);
    console.log('');

    // Get competitions from last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: competitions, error } = await supabase
      .from('competitions')
      .select(`
        id,
        name,
        description,
        competition_type,
        created_at,
        locations (
          name,
          address,
          city,
          state
        )
      `)
      .eq('organization_id', orgId)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching competitions:', error);
      return;
    }

    console.log(`Found ${competitions?.length || 0} competitions created in last 24 hours:\n`);

    for (const comp of competitions || []) {
      console.log('─────────────────────────────────────');
      console.log('Name:', comp.name);
      console.log('Type:', comp.competition_type);
      console.log('Created:', new Date(comp.created_at).toLocaleString());
      console.log('Location:', comp.locations ?
        `${comp.locations.name} - ${comp.locations.city}, ${comp.locations.state}` :
        'No location');
      console.log('Description:', comp.description?.substring(0, 100) || 'None');
      console.log('ID:', comp.id);
      console.log('');
    }

    // Also check events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date, created_at, competitions (name)')
      .eq('competitions.organization_id', orgId)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!eventsError) {
      console.log(`Found ${events?.length || 0} events created in last 24 hours`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentCompetitions();
