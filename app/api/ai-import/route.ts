/**
 * AI-Powered Data Import API
 *
 * POST /api/ai-import - Upload file and import data using external processing
 *
 * Supports: athletes, locations, competitions, weight_classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

// Extend timeout for large file processing (max 60 seconds)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Wrap everything to ensure we always return valid JSON
  try {
    return await handleUpload(req);
  } catch (error: any) {
    console.error('Fatal error in ai-import:', error);
    return NextResponse.json(
      { success: false, error: `Fatal error: ${error.message || 'Unknown error occurred'}` },
      { status: 500 }
    );
  }
}

async function handleUpload(req: NextRequest) {
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

    if (!file || !entityType || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'File, entity_type, and organization_id are required' },
        { status: 400 }
      );
    }

    // Validate entity type
    if (!['athletes', 'locations', 'competitions', 'weight_classes'].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity_type. Must be athletes, locations, competitions, or weight_classes' },
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

    // Check file size (limit to 5MB to prevent timeouts)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 5MB.` },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse file content based on file type
    const fileName = file.name.toLowerCase();

    // Validate file type - only accept images
    const supportedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const isImageSupported = supportedImageExtensions.some(ext => fileName.endsWith(ext));

    if (!isImageSupported) {
      return NextResponse.json(
        { success: false, error: `Only image files are supported. Please upload: ${supportedImageExtensions.join(', ')}. If you have a PDF, please export it as a JPG/PNG first.` },
        { status: 400 }
      );
    }

    // Determine content type
    let contentType = 'image/jpeg';
    if (fileName.endsWith('.png')) contentType = 'image/png';
    else if (fileName.endsWith('.gif')) contentType = 'image/gif';
    else if (fileName.endsWith('.webp')) contentType = 'image/webp';
    else if (fileName.endsWith('.bmp')) contentType = 'image/bmp';
    else if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) contentType = 'image/tiff';

    // Upload to storage and send to Make.com webhook for processing
    console.log(`Uploading image to storage for external processing...`);

    try {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const uniqueFileName = `ai-imports/${organizationId}/${timestamp}-${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('temp-uploads')
        .upload(uniqueFileName, buffer, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json(
          { success: false, error: `Failed to upload image: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('temp-uploads')
        .getPublicUrl(uniqueFileName);

      const publicUrl = urlData.publicUrl;
      console.log(`Image uploaded to: ${publicUrl}`);

      // Send to Make.com webhook
      const webhookUrl = 'https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1';
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: publicUrl,
          fileName: file.name,
          organizationId: organizationId,
          entityType: entityType,
          timestamp: timestamp,
          fileSize: file.size
        })
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Webhook returned status ${webhookResponse.status}: ${errorText}`);
      }

      // Try to parse as JSON, fall back to text
      const responseContentType = webhookResponse.headers.get('content-type');
      let webhookData: any;

      try {
        const responseText = await webhookResponse.text();

        if ((responseContentType?.includes('application/json') && responseText.trim().startsWith('{')) || responseText.trim().startsWith('[')) {
          webhookData = JSON.parse(responseText);
        } else {
          webhookData = { message: responseText };
        }
      } catch (e) {
        webhookData = { message: 'Accepted' };
      }

      console.log('Image sent to Make.com webhook successfully');
      console.log('Webhook response type:', typeof webhookData);
      console.log('Webhook response is Array:', Array.isArray(webhookData));
      console.log('Webhook response:', JSON.stringify(webhookData, null, 2));

      // Insert data into database if webhook returned structured data
      let insertedCount = 0;
      let eventsCreated = 0;
      if (Array.isArray(webhookData) && webhookData.length > 0) {
        console.log(`Processing ${webhookData.length} items from webhook...`);

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

        // Get sport_id for wrestling (assuming Folkstyle/wrestling)
        const { data: sports } = await supabaseAdmin
          .from('sports')
          .select('id')
          .eq('name', 'Wrestling')
          .single();

        const sportId = sports?.id;
        if (!sportId) {
          console.warn('Wrestling sport not found, skipping import');
          return NextResponse.json({
            success: false,
            error: 'Wrestling sport not found in database. Please create it first.'
          }, { status: 400 });
        }

        // Get all teams for this organization
        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (!teams || teams.length === 0) {
          console.warn('No teams found for organization');
          return NextResponse.json({
            success: false,
            error: 'No teams found for this organization. Please create teams first.'
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
                    // Create a season for current year
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
                    // Parse weigh-in time if provided
                    let weighInTime = null;
                    if (item.registration_weigh_in_time) {
                      // Try to extract time from strings like "7:00 AM" or "7:30 AM"
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
      }

      // Clean up: Delete the uploaded file from storage
      try {
        const { error: deleteError } = await supabaseAdmin.storage
          .from('temp-uploads')
          .remove([uniqueFileName]);

        if (deleteError) {
          console.error('Error deleting uploaded file:', deleteError);
        } else {
          console.log(`Deleted uploaded file: ${uniqueFileName}`);
        }
      } catch (deleteErr) {
        console.error('Failed to delete file:', deleteErr);
        // Don't fail the request if cleanup fails
      }

      return NextResponse.json({
        success: true,
        message: `Image uploaded and processed successfully. ${insertedCount} competitions and ${eventsCreated} events imported.`,
        data: {
          fileUrl: publicUrl,
          status: 'completed',
          imported: webhookData,
          insertedCount,
          eventsCreated
        }
      });
    } catch (webhookError: any) {
      console.error('Webhook error:', webhookError);
      return NextResponse.json(
        { success: false, error: `Failed to process image: ${webhookError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('AI Import error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Import failed. Please check server logs for details.' },
      { status: 500 }
    );
  }
}
