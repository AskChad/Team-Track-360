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
      console.log('Webhook response:', webhookData);

      return NextResponse.json({
        success: true,
        message: 'Image uploaded and processed successfully. Data imported.',
        data: {
          fileUrl: publicUrl,
          status: 'completed',
          imported: webhookData
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
