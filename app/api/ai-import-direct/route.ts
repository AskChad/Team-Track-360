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
import { decrypt } from '@/lib/encryption';
import OpenAI from 'openai';

export const maxDuration = 60;

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

    // Get organization's OpenAI API key
    const { data: org, error: orgError } = await supabaseAdmin
      .from('parent_organizations')
      .select('openai_api_key_encrypted')
      .eq('id', organizationId)
      .single();

    if (orgError || !org?.openai_api_key_encrypted) {
      return NextResponse.json(
        { success: false, error: 'Organization does not have an OpenAI API key configured. Please add one in organization settings.' },
        { status: 400 }
      );
    }

    // Decrypt the API key
    const decryptedKey = decrypt(org.openai_api_key_encrypted);

    // Initialize OpenAI with organization's key
    const openai = new OpenAI({
      apiKey: decryptedKey,
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
    let skippedCount = 0;
    let locationsCreated = 0;
    let eventsCreated = 0;
    const errors: string[] = [];
    const competitionIds: string[] = [];

    // Process each competition
    for (const comp of competitionsData) {
      try {
        // Process location first
        let locationId = null;
        if (comp.venue || comp.street_address || comp.city) {
          // Check for duplicate location (by name, city, state)
          const { data: existingLocation } = await supabaseAdmin
            .from('locations')
            .select('id')
            .eq('name', comp.venue || '')
            .eq('city', comp.city || '')
            .eq('state', comp.state || '')
            .limit(1)
            .maybeSingle();

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

            if (!locationError && newLocation) {
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
          console.log(`Competition already exists: ${comp.event_name} - skipping`);
          skippedCount++;
          continue;
        }

        // Parse contact name
        const nameParts = comp.contact_name?.trim().split(' ') || [];
        const contactFirstName = nameParts[0] || null;
        const contactLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

        // Create competition
        const { data: newCompetition, error: compError } = await supabaseAdmin
          .from('competitions')
          .insert({
            organization_id: organizationId,
            sport_id: sportId,
            name: comp.event_name,
            description: `${comp.style || ''} ${comp.divisions_included || ''}`.trim(),
            competition_type: 'tournament',
            start_date: comp.date,
            end_date: comp.date,
            default_location_id: locationId,
            registration_url: comp.registration_url,
            contact_first_name: contactFirstName,
            contact_last_name: contactLastName,
            contact_phone: comp.contact_phone,
            contact_email: comp.contact_email,
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
          }
        }
      } catch (e: any) {
        console.error(`Error processing competition ${comp.event_name}:`, e);
        errors.push(`${comp.event_name}: ${e.message}`);
      }
    }

    // Create events if checkbox was checked
    // Events are created at organization level (all teams in org can see them)
    if (createEvents && competitionIds.length > 0) {
      console.log(`Creating events for ${competitionIds.length} competitions...`);

      // Get all teams in this organization
      const { data: orgTeams } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (!orgTeams || orgTeams.length === 0) {
        console.log('No active teams found in organization - skipping event creation');
      } else {
        // Get or create a season for this organization
        const currentYear = new Date().getFullYear();
        const { data: season } = await supabaseAdmin
          .from('seasons')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', `${currentYear} Season`)
          .maybeSingle();

        let seasonId = season?.id;

        if (!seasonId) {
          // Create season
          const { data: newSeason } = await supabaseAdmin
            .from('seasons')
            .insert({
              organization_id: organizationId,
              name: `${currentYear} Season`,
              start_date: `${currentYear}-01-01`,
              end_date: `${currentYear}-12-31`,
            })
            .select('id')
            .single();
          seasonId = newSeason?.id;
        }

        if (seasonId) {
          // Create events for each team
          for (let i = 0; i < competitionIds.length; i++) {
            const competitionId = competitionIds[i];
            const comp = competitionsData[i];

            if (!comp.date) {
              console.log(`Skipping event creation for ${comp.event_name} - no date`);
              continue;
            }

            // Create event for each team in the organization
            for (const team of orgTeams) {
              try {
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

    const message = createEvents
      ? `Processed ${competitionsData.length} competitions: ${insertedCount} inserted, ${skippedCount} skipped. Created ${eventsCreated} events.`
      : `Processed ${competitionsData.length} competitions: ${insertedCount} inserted, ${skippedCount} skipped (duplicates)`;

    return NextResponse.json({
      success: true,
      message,
      data: {
        total: competitionsData.length,
        inserted: insertedCount,
        skipped: skippedCount,
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
