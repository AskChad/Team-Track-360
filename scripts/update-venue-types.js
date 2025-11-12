/**
 * Update venue_type for existing locations based on their names
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function detectVenueType(venueName) {
  if (!venueName) return null;

  const nameLower = venueName.toLowerCase();

  if (nameLower.includes('high school') || nameLower.includes('hs ')) {
    return 'high_school';
  }
  if (nameLower.includes('middle school') || nameLower.includes('ms ')) {
    return 'middle_school';
  }
  if (nameLower.includes('elementary')) {
    return 'elementary_school';
  }
  if (nameLower.includes('college') || nameLower.includes('university')) {
    return 'college';
  }
  if (nameLower.includes('arena') || nameLower.includes('stadium')) {
    return 'arena';
  }
  if (nameLower.includes('gym') || nameLower.includes('fitness') || nameLower.includes('athletic club')) {
    return 'gym';
  }
  if (nameLower.includes('community center') || nameLower.includes('rec center')) {
    return 'community_center';
  }
  if (nameLower.includes('convention center') || nameLower.includes('expo')) {
    return 'convention_center';
  }

  return 'other';
}

async function updateVenueTypes() {
  try {
    console.log('Fetching locations with NULL venue_type...\n');

    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, venue_type')
      .is('venue_type', null);

    if (error) {
      console.error('Error fetching locations:', error);
      return;
    }

    console.log(`Found ${locations.length} locations to update\n`);

    let updated = 0;
    for (const location of locations) {
      const venueType = detectVenueType(location.name);
      
      if (venueType) {
        const { error: updateError } = await supabase
          .from('locations')
          .update({ venue_type: venueType })
          .eq('id', location.id);

        if (updateError) {
          console.error(`Error updating ${location.name}:`, updateError);
        } else {
          console.log(`✓ Updated: ${location.name} → ${venueType}`);
          updated++;
        }
      }
    }

    console.log(`\n✅ Updated ${updated} locations`);

    // Show summary
    console.log('\n=== Venue Type Summary ===');
    const { data: summary } = await supabase
      .from('locations')
      .select('venue_type');

    const counts = {};
    summary.forEach(loc => {
      const type = loc.venue_type || 'NULL';
      counts[type] = (counts[type] || 0) + 1;
    });

    Object.entries(counts).sort().forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

updateVenueTypes();
