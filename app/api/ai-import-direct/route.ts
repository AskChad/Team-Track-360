/**
 * Direct AI-Powered Data Import API
 *
 * Uses OpenAI Vision API directly (no webhook/Make.com)
 * Includes duplicate checking for competitions and locations
 *
 * POST /api/ai-import-direct - Upload file and process with OpenAI Vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';
import { getOrganizationOpenAIKey } from '@/lib/openai-utils';
import OpenAI from 'openai';

export const maxDuration = 300; // 5 minutes for OpenAI Vision API

const OPENAI_PROMPT = `You are a wrestling tournament data extraction assistant. Analyze this image and extract ALL tournament/competition information.

For EACH competition/tournament you find, extract:
- event_name: Full name of the tournament
- date: Date in YYYY-MM-DD format (if you see "12/14/24", convert to "2024-12-14")
- style: Wrestling style (Folkstyle, Freestyle, Greco-Roman)
- divisions_included: Comma-separated list (e.g., "Youth, Cadet, Junior")
- divisions_excluded: Any restrictions mentioned
- registration_weighin_time: Registration/weigh-in time
- registration_url: URL for registration if shown
- venue: Venue/location name
- venue_type: Type of venue - MUST be one of: "high_school", "middle_school", "elementary_school", "college", "arena", "gym", "community_center", "convention_center", "other"
- street_address: Street address
- city: City name
- state: State (2-letter code like CA, NY)
- zip: ZIP code
- contact_name: Contact person's full name
- contact_phone: Phone number
- contact_email: Email address

IMPORTANT for venue_type:
- If venue contains "High School" or "HS" → use "high_school"
- If venue contains "Middle School" or "MS" → use "middle_school"
- If venue contains "College" or "University" → use "college"
- If venue contains "Arena" or "Stadium" → use "arena"
- If venue contains "Gym" or "Athletic Club" → use "gym"
- If venue contains "Community Center" or "Rec Center" → use "community_center"
- Otherwise → use "other"

Return ONLY valid JSON array format:
[
  {
    "event_name": "Tournament Name",
    "date": "2024-12-14",
    "style": "Folkstyle",
    "venue_type": "high_school",
    ...
  }
]

If multiple competitions are shown, return an array with multiple objects. If no competition data found, return empty array [].`;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const orgAdminOrgIds = adminRoles
      ?.filter(r => r.role_type === 'org_admin')
      .map(r => r.organization_id) || [];

    if (!isPlatformAdmin && orgAdminOrgIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be org admin or platform admin.' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entity_type') as string;
    const organizationId = formData.get('organization_id') as string;
    const createEvents = formData.get('create_events') === 'true';
    const teamIdsJson = formData.get('team_ids') as string | null;
    let selectedTeamIds: string[] = [];

    // Parse team IDs if provided
    if (teamIdsJson) {
      try {
        selectedTeamIds = JSON.parse(teamIdsJson);
      } catch (e) {
        console.error('Failed to parse team_ids:', e);
      }
    }

    if (!file || !entityType || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'File, entity_type, and organization_id are required' },
        { status: 400 }
      );
    }

    // Validate entity type
    if (!['competitions'].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: 'Currently only "competitions" entity type is supported' },
        { status: 400 }
      );
    }

    // Check permissions for this organization
    if (!isPlatformAdmin && !orgAdminOrgIds.includes(organizationId)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to import data for this organization' },
        { status: 403 }
      );
    }

    // Get organization's OpenAI API key using utility function
    const apiKey = await getOrganizationOpenAIKey(organizationId);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Organization does not have an OpenAI API key configured. Please add one in organization settings.' },
        { status: 400 }
      );
    }

    // Initialize OpenAI with organization's key
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Check file size (limit to 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const fileSizeMB = file.size / 1024 / 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is 5MB.` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine image format
    const fileName = file.name.toLowerCase();
    let imageFormat = 'jpeg';
    if (fileName.endsWith('.png')) imageFormat = 'png';
    else if (fileName.endsWith('.gif')) imageFormat = 'gif';
    else if (fileName.endsWith('.webp')) imageFormat = 'webp';

    console.log(`Processing ${file.name} with OpenAI Vision...`);

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OPENAI_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/${imageFormat};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    console.log('OpenAI Response:', responseText);

    // Parse JSON response
    let competitionsData: any[];
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      competitionsData = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response. The image may not contain competition data.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(competitionsData) || competitionsData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No competition data found in the image' },
        { status: 400 }
      );
    }

    console.log(`Found ${competitionsData.length} competitions to process`);

    // Get Wrestling sport ID
    const { data: sports } = await supabaseAdmin
      .from('sports')
      .select('id')
      .eq('name', 'Wrestling')
      .single();

    const sportId = sports?.id;
    if (!sportId) {
      return NextResponse.json(
        { success: false, error: 'Wrestling sport not found in database' },
        { status: 500 }
      );
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let locationsCreated = 0;
    let eventsCreated = 0;
    const errors: string[] = [];
    const competitionIds: string[] = [];
    const competitionDataMap: Map<string, any> = new Map(); // Map competition ID to original data

    // Process each competition
    for (const comp of competitionsData) {
      try {
        // Process location first
        let locationId = null;
        if (comp.venue || comp.street_address || comp.city) {
          // Check for duplicate location (by name, city, state)
          // Only check if we have meaningful values (not null/empty)
          let duplicateQuery = supabaseAdmin
            .from('locations')
            .select('id')
            .eq('organization_id', organizationId)
            .limit(1);

          if (comp.venue) {
            duplicateQuery = duplicateQuery.eq('name', comp.venue);
          }
          if (comp.city) {
            duplicateQuery = duplicateQuery.eq('city', comp.city);
          }
          if (comp.state) {
            duplicateQuery = duplicateQuery.eq('state', comp.state);
          }

          const { data: existingLocation } = await duplicateQuery.maybeSingle();

          if (existingLocation) {
            console.log(`Location already exists: ${comp.venue} - using existing`);
            locationId = existingLocation.id;
          } else {
            // Create new location
            const { data: newLocation, error: locationError } = await supabaseAdmin
              .from('locations')
              .insert({
                organization_id: organizationId,
                name: comp.venue || 'Unknown Location',
                address: comp.street_address,
                city: comp.city,
                state: comp.state,
                zip: comp.zip,
                venue_type: comp.venue_type || null,
              })
              .select('id')
              .single();

            if (locationError) {
              console.error(`Error creating location ${comp.venue}:`, locationError);
              errors.push(`Location ${comp.venue}: ${locationError.message}`);
            } else if (newLocation) {
              locationId = newLocation.id;
              locationsCreated++;
              console.log(`Created location: ${comp.venue}`);
            }
          }
        }

        // Check for duplicate competition (by name and organization)
        const { data: existingComp } = await supabaseAdmin
          .from('competitions')
          .select('id')
          .eq('name', comp.event_name)
          .eq('organization_id', organizationId)
          .limit(1)
          .maybeSingle();

        if (existingComp) {
          console.log(`Competition already exists: ${comp.event_name} - updating`);

          // Update existing competition
          const { error: updateError } = await supabaseAdmin
            .from('competitions')
            .update({
              sport_id: sportId,
              description: descriptionParts.join('\n'),
              competition_type: 'tournament',
              default_location_id: locationId,
              contact_first_name: contactFirstName,
              contact_last_name: contactLastName,
              contact_email: comp.contact_email || null,
              contact_phone: comp.contact_phone || null,
              divisions: comp.divisions_included || null,
            })
            .eq('id', existingComp.id);

          if (updateError) {
            console.error(`Error updating competition ${comp.event_name}:`, updateError);
            errors.push(`${comp.event_name}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`Updated competition: ${comp.event_name}`);
            competitionIds.push(existingComp.id);
            competitionDataMap.set(existingComp.id, comp);
          }
          continue;
        }

        // Parse contact name
        const nameParts = comp.contact_name?.trim().split(' ') || [];
        const contactFirstName = nameParts[0] || null;
        const contactLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        // Build description with style, date, weigh-in, and registration info
        const descriptionParts = [];
        if (comp.style) descriptionParts.push(comp.style);
        if (comp.date) descriptionParts.push(`Date: ${comp.date}`);
        if (comp.registration_weighin_time) descriptionParts.push(`Weigh-in: ${comp.registration_weighin_time}`);
        if (comp.registration_url) descriptionParts.push(`Registration: ${comp.registration_url}`);
        if (comp.divisions_excluded) descriptionParts.push(`Excluded: ${comp.divisions_excluded}`);

        // Create competition with separate contact and divisions fields
        const { data: newCompetition, error: compError } = await supabaseAdmin
          .from('competitions')
          .insert({
            organization_id: organizationId,
            sport_id: sportId,
            name: comp.event_name,
            description: descriptionParts.join('\n'),
            competition_type: 'tournament',
            default_location_id: locationId,
            // Contact fields
            contact_first_name: contactFirstName,
            contact_last_name: contactLastName,
            contact_email: comp.contact_email || null,
            contact_phone: comp.contact_phone || null,
            // Divisions field
            divisions: comp.divisions_included || null,
          })
          .select('id')
          .single();

        if (compError) {
          console.error(`Error inserting competition ${comp.event_name}:`, compError);
          errors.push(`${comp.event_name}: ${compError.message}`);
        } else {
          insertedCount++;
          console.log(`Inserted competition: ${comp.event_name}`);
          if (newCompetition?.id) {
            competitionIds.push(newCompetition.id);
            competitionDataMap.set(newCompetition.id, comp); // Store original data with ID
          }
        }
      } catch (e: any) {
        console.error(`Error processing competition ${comp.event_name}:`, e);
        errors.push(`${comp.event_name}: ${e.message}`);
      }
    }

    // Create events if checkbox was checked
    // Events are created for selected teams (or all teams if no selection provided)
    if (createEvents && competitionIds.length > 0) {
      console.log(`Creating events for ${competitionIds.length} competitions...`);

      let teamsToCreateEventsFor: { id: string }[] = [];

      // If specific teams were selected, use those
      if (selectedTeamIds.length > 0) {
        console.log(`Using ${selectedTeamIds.length} selected teams for event creation`);
        teamsToCreateEventsFor = selectedTeamIds.map(id => ({ id }));
      } else {
        // Otherwise, get all active teams in the organization
        const { data: orgTeams, error: teamsError } = await supabaseAdmin
          .from('teams')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
          errors.push(`Failed to fetch teams: ${teamsError.message}`);
        } else if (!orgTeams || orgTeams.length === 0) {
          console.log('No active teams found in organization - skipping event creation');
          errors.push('No active teams found - events not created. Please create at least one team first.');
        } else {
          console.log(`Found ${orgTeams.length} active teams for event creation`);
          teamsToCreateEventsFor = orgTeams;
        }
      }

      if (teamsToCreateEventsFor.length > 0) {
        // Get or create a season for this organization and sport
        const currentYear = new Date().getFullYear();
        const { data: season, error: seasonFetchError } = await supabaseAdmin
          .from('seasons')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('sport_id', sportId)
          .eq('name', `${currentYear} Season`)
          .maybeSingle();

        let seasonId = season?.id;

        if (seasonFetchError) {
          console.error('Error fetching season:', seasonFetchError);
          errors.push(`Failed to fetch season: ${seasonFetchError.message}`);
        } else if (!seasonId) {
          // Create season
          console.log(`Creating ${currentYear} Season for organization...`);
          const { data: newSeason, error: seasonCreateError } = await supabaseAdmin
            .from('seasons')
            .insert({
              organization_id: organizationId,
              sport_id: sportId,
              name: `${currentYear} Season`,
              start_date: `${currentYear}-01-01`,
              end_date: `${currentYear}-12-31`,
            })
            .select('id')
            .single();

          if (seasonCreateError) {
            console.error('Error creating season:', seasonCreateError);
            errors.push(`Failed to create season: ${seasonCreateError.message}`);
          } else {
            seasonId = newSeason?.id;
            console.log(`Created season with ID: ${seasonId}`);
          }
        } else {
          console.log(`Using existing season: ${seasonId}`);
        }

        if (seasonId) {
          // Create events for each team
          for (const competitionId of competitionIds) {
            const comp = competitionDataMap.get(competitionId);

            if (!comp) {
              console.log(`Skipping event creation - competition data not found for ID ${competitionId}`);
              continue;
            }

            if (!comp.date) {
              console.log(`Skipping event creation for ${comp.event_name} - no date`);
              continue;
            }

            // Create event for each selected team
            for (const team of teamsToCreateEventsFor) {
              try {
                // Check for duplicate event (same competition + team)
                const { data: existingEvent } = await supabaseAdmin
                  .from('events')
                  .select('id')
                  .eq('competition_id', competitionId)
                  .eq('team_id', team.id)
                  .limit(1)
                  .maybeSingle();

                if (existingEvent) {
                  console.log(`Event already exists for ${comp.event_name} + team ${team.id} - skipping`);
                  continue;
                }

                const { error: eventError } = await supabaseAdmin
                  .from('events')
                  .insert({
                    team_id: team.id,
                    season_id: seasonId,
                    competition_id: competitionId,
                    name: comp.event_name,
                    description: `${comp.style || ''} ${comp.divisions_included || ''}`.trim(),
                    event_date: comp.date,
                    status: 'scheduled',
                    is_public: false,
                    show_results_public: false,
                  });

                if (eventError) {
                  console.error(`Error creating event for ${comp.event_name}:`, eventError);
                  errors.push(`Event for ${comp.event_name}: ${eventError.message}`);
                } else {
                  eventsCreated++;
                  console.log(`Created event for team ${team.id}: ${comp.event_name}`);
                }
              } catch (e: any) {
                console.error(`Error creating event for ${comp.event_name}:`, e);
                errors.push(`Event for ${comp.event_name}: ${e.message}`);
              }
            }
          }
        }
      }
    }

    const messageParts = [`Processed ${competitionsData.length} competitions:`];
    if (insertedCount > 0) messageParts.push(`${insertedCount} created`);
    if (updatedCount > 0) messageParts.push(`${updatedCount} updated`);
    if (createEvents && eventsCreated > 0) messageParts.push(`${eventsCreated} events created`);

    const message = messageParts.join(', ');

    return NextResponse.json({
      success: true,
      message,
      data: {
        total: competitionsData.length,
        inserted: insertedCount,
        updated: updatedCount,
        locationsCreated,
        eventsCreated,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

  } catch (error: any) {
    console.error('AI Import Direct error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
