/**
 * AI Import Callback API
 *
 * POST /api/ai-import-callback - Receive processed data from Make.com webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  console.log('=== CALLBACK ENDPOINT HIT ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  try {
    const body = await req.json();

    // DETAILED LOGGING - Log entire payload
    console.log('=== CALLBACK RECEIVED FROM MAKE.COM ===');
    console.log('Full body:', JSON.stringify(body, null, 2));
    console.log('Body keys:', Object.keys(body));
    console.log('Body type:', typeof body);
    console.log('Is Array:', Array.isArray(body));
    console.log('===================================');

    const { organizationId, entityType, data: webhookData, filePath } = body;

    console.log('Extracted values:');
    console.log('- organizationId:', organizationId);
    console.log('- entityType:', entityType);
    console.log('- filePath:', filePath);
    console.log('- webhookData type:', typeof webhookData);
    console.log('- webhookData isArray:', Array.isArray(webhookData));
    console.log('- webhookData length:', webhookData?.length);
    console.log('- webhookData first item:', webhookData?.[0] ? JSON.stringify(webhookData[0], null, 2) : 'none');

    if (!organizationId || !entityType || !webhookData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: organizationId, entityType, or data' },
        { status: 400 }
      );
    }

    // Process the data based on entity type
    if (entityType === 'competitions' && Array.isArray(webhookData)) {
      let insertedCount = 0;
      let eventsCreated = 0;

      // Normalize field names from webhook response
      const normalizedData = webhookData.map(item => ({
        name: item.event_name || item.name,
        date: item.date,
        style: item.style,
        divisions: typeof item.divisions === 'string' ? item.divisions.split(',').map((d: string) => d.trim()) : item.divisions,
        restrictions: item.restrictions,
        registration_weigh_in_time: item.registration_weighin_time || item.registration_weigh_in_time,
        registration_url: item.registration_url,
        venue_name: item.venue_name,
        address: item.street_address || item.address,
        city: item.city,
        state: item.state,
        zip: item.zip,
        contact_name: item.contact_name,
        contact_phone: item.contact_phone,
        contact_email: item.contact_email
      }));

      // Get sport_id for wrestling
      const { data: sports } = await supabaseAdmin
        .from('sports')
        .select('id')
        .eq('name', 'Wrestling')
        .single();

      const sportId = sports?.id;
      if (!sportId) {
        return NextResponse.json({
          success: false,
          error: 'Wrestling sport not found in database.'
        }, { status: 400 });
      }

      // Get all teams for this organization
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id, name')
        .eq('organization_id', organizationId);

      if (!teams || teams.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No teams found for this organization.'
        }, { status: 400 });
      }

      // Get competitive event type
      const { data: eventType } = await supabaseAdmin
        .from('event_types')
        .select('id')
        .eq('category', 'competitive')
        .limit(1)
        .single();

      for (const item of normalizedData) {
        try {
          // Create location if venue details provided
          let locationId = null;
          if (item.venue_name || item.address) {
            const { data: location, error: locationError } = await supabaseAdmin
              .from('locations')
              .insert({
                name: item.venue_name || 'Unknown Venue',
                address: item.address,
                city: item.city,
                state: item.state,
                zip: item.zip,
                phone: item.contact_phone
              })
              .select('id')
              .single();

            if (!locationError && location) {
              locationId = location.id;
            } else if (locationError) {
              console.error('Location insert error:', locationError);
            }
          }

          // Insert competition
          const { data: competition, error: compError } = await supabaseAdmin
            .from('competitions')
            .insert({
              organization_id: organizationId,
              sport_id: sportId,
              name: item.name || 'Unnamed Competition',
              description: [
                item.style && `Style: ${item.style}`,
                item.divisions && item.divisions.length > 0 && `Divisions: ${item.divisions.join(', ')}`,
                item.registration_weigh_in_time && `Registration/Weigh-in: ${item.registration_weigh_in_time}`,
                item.contact_name && `Contact: ${item.contact_name}`,
                item.contact_email && `Email: ${item.contact_email}`,
                item.contact_phone && `Phone: ${item.contact_phone}`
              ].filter(Boolean).join('\n'),
              competition_type: 'tournament',
              default_location_id: locationId
            })
            .select('id')
            .single();

          if (compError) {
            console.error('Error inserting competition:', compError);
            continue;
          }

          insertedCount++;
          const competitionId = competition.id;

          // Create events for each team
          if (item.date && competitionId) {
            for (const team of teams) {
              try {
                // Get or create active season for this team
                const currentYear = new Date().getFullYear();
                let { data: season } = await supabaseAdmin
                  .from('seasons')
                  .select('id')
                  .eq('team_id', team.id)
                  .eq('year', currentYear)
                  .single();

                if (!season) {
                  const { data: newSeason } = await supabaseAdmin
                    .from('seasons')
                    .insert({
                      team_id: team.id,
                      year: currentYear,
                      name: `${currentYear} Season`,
                      start_date: `${currentYear}-01-01`,
                      end_date: `${currentYear}-12-31`
                    })
                    .select('id')
                    .single();

                  season = newSeason;
                }

                if (season) {
                  // Parse weigh-in time
                  let weighInTime = null;
                  if (item.registration_weigh_in_time) {
                    const timeMatch = item.registration_weigh_in_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (timeMatch) {
                      let hours = parseInt(timeMatch[1]);
                      const minutes = timeMatch[2];
                      const period = timeMatch[3].toUpperCase();

                      if (period === 'PM' && hours !== 12) hours += 12;
                      if (period === 'AM' && hours === 12) hours = 0;

                      weighInTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
                    }
                  }

                  // Create event
                  const { error: eventError } = await supabaseAdmin
                    .from('events')
                    .insert({
                      competition_id: competitionId,
                      team_id: team.id,
                      season_id: season.id,
                      name: item.name || 'Unnamed Competition',
                      description: item.style ? `${item.style} Tournament` : 'Tournament',
                      event_type_id: eventType?.id,
                      event_date: item.date,
                      location_id: locationId,
                      weigh_in_time: weighInTime,
                      is_public: true,
                      status: 'scheduled'
                    });

                  if (!eventError) {
                    eventsCreated++;
                  } else {
                    console.error('Error creating event for team:', team.name, eventError);
                  }
                }
              } catch (teamError: any) {
                console.error(`Error creating event for team ${team.name}:`, teamError);
              }
            }
          }
        } catch (itemError: any) {
          console.error('Error processing item:', itemError);
        }
      }

      console.log(`Successfully inserted ${insertedCount} competitions and ${eventsCreated} events`);

      // Clean up: Delete the uploaded file from storage if filePath was provided
      if (filePath) {
        try {
          const { error: deleteError } = await supabaseAdmin.storage
            .from('temp-uploads')
            .remove([filePath]);

          if (deleteError) {
            console.error('Error deleting uploaded file:', deleteError);
          } else {
            console.log(`Deleted uploaded file: ${filePath}`);
          }
        } catch (deleteErr) {
          console.error('Failed to delete file:', deleteErr);
          // Don't fail the request if cleanup fails
        }
      }

      return NextResponse.json({
        success: true,
        message: `Imported ${insertedCount} competitions and ${eventsCreated} events`,
        data: {
          insertedCount,
          eventsCreated
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unsupported entity type or invalid data format'
    }, { status: 400 });

  } catch (error: any) {
    console.error('AI Import Callback error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process callback' },
      { status: 500 }
    );
  }
}
