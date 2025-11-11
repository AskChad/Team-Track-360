/**
 * AI-Powered Data Import API
 *
 * POST /api/ai-import - Upload file and import data using OpenAI
 *
 * Supports: athletes, locations, competitions, weight_classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';

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

    // Get organization's OpenAI API key
    const { data: org, error: orgError } = await supabaseAdmin
      .from('parent_organizations')
      .select('openai_api_key_encrypted')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!org.openai_api_key_encrypted) {
      return NextResponse.json(
        { success: false, error: 'Organization does not have an OpenAI API key configured. Please configure it in organization settings.' },
        { status: 400 }
      );
    }

    // Decrypt the API key
    let openaiApiKey: string;
    try {
      openaiApiKey = decrypt(org.openai_api_key_encrypted);
    } catch (error: any) {
      console.error('Decryption error:', error.message, error.stack);
      return NextResponse.json(
        { success: false, error: `Failed to decrypt OpenAI API key: ${error.message}` },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Check file size (limit to 5MB to prevent timeouts)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 5MB. Please split your file into smaller parts or extract just the pages you need.` },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse file content based on file type
    let fileContent: string;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
      console.log(`Parsing PDF file (${Math.round(file.size / 1024)}KB)...`);
      try {
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        fileContent = textResult.text;
        console.log(`PDF parsed: ${textResult.total} pages, ${fileContent.length} characters`);

        // Warn if file is very large
        if (fileContent.length > 500000) {
          console.warn(`Large file detected: ${fileContent.length} characters - may take 30-60 seconds to process`);
        }
      } catch (pdfError: any) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { success: false, error: `Failed to parse PDF: ${pdfError.message}` },
          { status: 400 }
        );
      }
    } else {
      // For text files (CSV, JSON, TXT, etc.)
      fileContent = buffer.toString('utf-8');
    }

    // Function to estimate tokens (rough estimate: 1 token ≈ 4 characters)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);

    // Function to chunk text to fit within token limits
    const chunkText = (text: string, maxTokens: number = 100000): string[] => {
      const maxChars = maxTokens * 4; // Conservative estimate
      const chunks: string[] = [];

      if (text.length <= maxChars) {
        return [text];
      }

      // Split by lines to avoid breaking in the middle of data
      const lines = text.split('\n');
      let currentChunk = '';

      for (const line of lines) {
        if ((currentChunk + line).length > maxChars && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = line + '\n';
        } else {
          currentChunk += line + '\n';
        }
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      return chunks;
    };

    // Get field schemas for the entity type
    const schemas = {
      athletes: {
        required: ['first_name', 'last_name', 'email', 'team_id'],
        optional: ['date_of_birth', 'phone', 'address', 'city', 'state', 'zip', 'current_weight_class', 'preferred_weight_class', 'wrestling_style', 'grade_level', 'years_experience'],
        description: 'Wrestling athlete profiles with personal info and wrestling-specific data'
      },
      locations: {
        required: ['name'],
        optional: ['address', 'city', 'state', 'zip', 'venue_type', 'capacity', 'phone', 'website_url', 'notes'],
        description: 'Venue/location information for events and competitions'
      },
      competitions: {
        required: ['name'],
        optional: ['description', 'competition_type', 'location_name', 'location_address', 'location_city', 'location_state', 'location_zip', 'event_date', 'start_time', 'end_time', 'is_recurring', 'recurrence_rule'],
        description: 'Competition/tournament information. If location details (name, address) are provided, a location will be auto-created. If date/time is provided, an event will be auto-created.'
      },
      weight_classes: {
        required: ['sport_id', 'name', 'weight'],
        optional: ['age_group', 'state', 'city', 'expiration_date', 'notes'],
        description: 'Weight class definitions for sports'
      }
    };

    const schema = schemas[entityType as keyof typeof schemas];

    // Chunk the file content if it's too large
    const contentChunks = chunkText(fileContent, 80000); // Reduced from 100k for faster processing
    const estimatedTokens = estimateTokens(fileContent);

    console.log(`Processing file: ${file.name}, Estimated tokens: ${estimatedTokens}, Chunks: ${contentChunks.length}`);

    // Limit to first 3 chunks to prevent timeout (can process ~300k tokens in 60 seconds)
    const chunksToProcess = contentChunks.slice(0, 3);

    if (contentChunks.length > 3) {
      console.warn(`File has ${contentChunks.length} chunks but limiting to first 3 to prevent timeout`);
    }

    // Process each chunk and collect all records
    const allRecords: any[] = [];

    for (let i = 0; i < chunksToProcess.length; i++) {
      const chunk = chunksToProcess[i];
      const chunkNum = i + 1;

      console.log(`Processing chunk ${chunkNum}/${chunksToProcess.length} of ${contentChunks.length} total (${estimateTokens(chunk)} tokens)...`);

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a data extraction assistant. Extract structured data from the provided file content and format it as JSON.

Entity type: ${entityType}
Description: ${schema.description}

Required fields: ${schema.required.join(', ')}
Optional fields: ${schema.optional.join(', ')}

Instructions:
1. Extract as many ${entityType} records as you can find in the file${contentChunks.length > 1 ? ` (this is chunk ${chunkNum} of ${chunksToProcess.length}, showing first ${chunksToProcess.length} of ${contentChunks.length} total chunks)` : ''}
2. Map data to the specified fields as accurately as possible
3. For any data that doesn't fit the schema, include it in a "notes" field
4. Return a JSON array of objects, where each object represents one ${entityType} record
5. If you cannot extract certain required fields, set them to null and add explanation in notes
6. Be flexible with field names - map variations to the closest matching field

Return ONLY valid JSON in this format:
{
  "records": [
    {
      "field_name": "value",
      "notes": "Any additional info that didn't fit standard fields"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Parse this ${file.name} file and extract ${entityType} data:\n\n${chunk}`
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content;
        if (responseText) {
          const parsed = JSON.parse(responseText);
          const chunkRecords = parsed.records || [];
          allRecords.push(...chunkRecords);
          console.log(`Chunk ${chunkNum} extracted ${chunkRecords.length} records`);
        }
      } catch (chunkError: any) {
        console.error(`Error processing chunk ${chunkNum}:`, chunkError.message);
        // Continue processing other chunks even if one fails
      }
    }

    const records = allRecords;

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No records could be extracted from the file' },
        { status: 400 }
      );
    }

    // Insert records into database
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        if (entityType === 'athletes') {
          // First create profile
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              email: record.email,
              first_name: record.first_name,
              last_name: record.last_name,
              full_name: `${record.first_name} ${record.last_name}`,
              date_of_birth: record.date_of_birth,
              phone: record.phone,
              address: record.address,
              city: record.city,
              state: record.state,
              zip: record.zip,
            })
            .select()
            .single();

          if (profileError) throw profileError;

          // Mark as athlete
          await supabaseAdmin.from('user_types').insert({
            user_id: profile.id,
            type: 'athlete'
          });

          // Create athlete profile
          const { error: athleteError } = await supabaseAdmin
            .from('wrestling_athlete_profiles')
            .insert({
              user_id: profile.id,
              team_id: record.team_id,
              current_weight_class: record.current_weight_class,
              preferred_weight_class: record.preferred_weight_class,
              wrestling_style: record.wrestling_style,
              grade_level: record.grade_level,
              years_experience: record.years_experience ? parseInt(record.years_experience) : null,
              notes: record.notes
            });

          if (athleteError) throw athleteError;

        } else if (entityType === 'locations') {
          const { error } = await supabaseAdmin
            .from('locations')
            .insert({
              name: record.name,
              address: record.address,
              city: record.city,
              state: record.state,
              zip: record.zip,
              venue_type: record.venue_type,
              capacity: record.capacity ? parseInt(record.capacity) : null,
              phone: record.phone,
              website_url: record.website_url,
              notes: record.notes
            });

          if (error) throw error;

        } else if (entityType === 'competitions') {
          let locationId = null;
          let createdLocation = null;

          // Check if location data exists - if so, create location first
          if (record.location_name || record.location_address) {
            const { data: location, error: locationError } = await supabaseAdmin
              .from('locations')
              .insert({
                name: record.location_name || `${record.name} Venue`,
                address: record.location_address,
                city: record.location_city,
                state: record.location_state,
                zip: record.location_zip,
                notes: `Auto-created from competition import: ${record.name}`
              })
              .select()
              .single();

            if (locationError) throw new Error(`Failed to create location: ${locationError.message}`);
            locationId = location.id;
            createdLocation = location.name;
          }

          // Get default wrestling sport ID (or first sport)
          const { data: sports } = await supabaseAdmin
            .from('sports')
            .select('id')
            .or('name.ilike.%wrestling%,name.ilike.%grappling%')
            .limit(1);

          const sportId = record.sport_id || sports?.[0]?.id;

          if (!sportId) {
            throw new Error('Could not determine sport_id for competition');
          }

          // Create competition
          const { data: competition, error: competitionError } = await supabaseAdmin
            .from('competitions')
            .insert({
              organization_id: organizationId,
              sport_id: sportId,
              name: record.name,
              description: record.description,
              competition_type: record.competition_type || 'tournament',
              default_location_id: locationId,
              is_recurring: record.is_recurring || false,
              recurrence_rule: record.recurrence_rule,
              notes: record.notes || (createdLocation ? `Location: ${createdLocation}` : null)
            })
            .select()
            .single();

          if (competitionError) throw new Error(`Failed to create competition: ${competitionError.message}`);

          // If date information exists, create an event
          if (record.event_date) {
            // Get default event type
            const { data: eventTypes } = await supabaseAdmin
              .from('event_types')
              .select('id')
              .or('name.ilike.%competition%,name.ilike.%tournament%')
              .limit(1);

            const eventTypeId = eventTypes?.[0]?.id;

            if (eventTypeId) {
              const { error: eventError } = await supabaseAdmin
                .from('events')
                .insert({
                  organization_id: organizationId,
                  competition_id: competition.id,
                  name: record.name,
                  event_type_id: eventTypeId,
                  event_date: record.event_date,
                  start_time: record.start_time || '09:00:00',
                  end_time: record.end_time || '17:00:00',
                  location_id: locationId,
                  description: record.description,
                  notes: `Auto-created from competition import`
                });

              if (eventError) {
                // Don't fail the whole import if event creation fails
                console.error('Failed to create event:', eventError);
              }
            }
          }

        } else if (entityType === 'weight_classes') {
          const { error } = await supabaseAdmin
            .from('weight_classes')
            .insert({
              sport_id: record.sport_id,
              name: record.name,
              weight: parseFloat(record.weight),
              age_group: record.age_group,
              state: record.state,
              city: record.city,
              expiration_date: record.expiration_date,
              notes: record.notes,
              created_by: user.userId
            });

          if (error) throw error;
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }

    // Build response message
    let message = `Imported ${results.success} of ${records.length} records`;
    if (contentChunks.length > chunksToProcess.length) {
      message += `. Note: File was very large - processed first ${chunksToProcess.length} of ${contentChunks.length} sections. Consider splitting the file for complete import.`;
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        total: records.length,
        successful: results.success,
        failed: results.failed,
        errors: results.errors,
        chunksProcessed: chunksToProcess.length,
        totalChunks: contentChunks.length
      }
    });

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
