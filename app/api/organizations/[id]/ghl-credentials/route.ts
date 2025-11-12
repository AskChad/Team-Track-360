/**
 * GoHighLevel (GHL) Credentials Management for Organizations
 *
 * POST /api/organizations/[id]/ghl-credentials - Save/update GHL credentials
 * GET /api/organizations/[id]/ghl-credentials - Check which GHL credentials are configured
 * DELETE /api/organizations/[id]/ghl-credentials - Remove GHL credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';

/**
 * GET - Check which GHL credentials are configured
 * Returns status but not the actual credentials for security
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === params.id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get organization's GHL credential status
    const { data: org, error: orgError } = await supabaseAdmin
      .from('parent_organizations')
      .select(`
        ghl_client_id_encrypted,
        ghl_client_id_updated_at,
        ghl_client_secret_encrypted,
        ghl_client_secret_updated_at,
        ghl_api_key_encrypted,
        ghl_api_key_updated_at
      `)
      .eq('id', params.id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        has_client_id: !!org.ghl_client_id_encrypted,
        has_client_secret: !!org.ghl_client_secret_encrypted,
        has_api_key: !!org.ghl_api_key_encrypted,
        client_id_updated_at: org.ghl_client_id_updated_at,
        client_secret_updated_at: org.ghl_client_secret_updated_at,
        api_key_updated_at: org.ghl_api_key_updated_at
      }
    });

  } catch (error: any) {
    console.error('GHL credentials GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check GHL credentials status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save/update GHL credentials (encrypted)
 * Accepts: client_id, client_secret, and/or api_key
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === params.id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { client_id, client_secret, api_key } = body;

    // At least one credential must be provided
    if (!client_id && !client_secret && !api_key) {
      return NextResponse.json(
        { success: false, error: 'At least one GHL credential is required' },
        { status: 400 }
      );
    }

    // Build update object with only provided credentials
    const updateData: any = {};
    const now = new Date().toISOString();

    if (client_id) {
      if (typeof client_id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Client ID must be a string' },
          { status: 400 }
        );
      }
      updateData.ghl_client_id_encrypted = encrypt(client_id);
      updateData.ghl_client_id_updated_at = now;
    }

    if (client_secret) {
      if (typeof client_secret !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Client Secret must be a string' },
          { status: 400 }
        );
      }
      updateData.ghl_client_secret_encrypted = encrypt(client_secret);
      updateData.ghl_client_secret_updated_at = now;
    }

    if (api_key) {
      if (typeof api_key !== 'string') {
        return NextResponse.json(
          { success: false, error: 'API Key must be a string' },
          { status: 400 }
        );
      }
      updateData.ghl_api_key_encrypted = encrypt(api_key);
      updateData.ghl_api_key_updated_at = now;
    }

    // Save to database
    const { error: updateError } = await supabaseAdmin
      .from('parent_organizations')
      .update(updateData)
      .eq('id', params.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save GHL credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'GHL credentials saved successfully'
    });

  } catch (error: any) {
    console.error('GHL credentials POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save GHL credentials' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove GHL credentials
 * Query params can specify which to remove: ?type=client_id,client_secret,api_key
 * If no type specified, removes all GHL credentials
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is org admin or platform admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === params.id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get which types to remove from query params
    const url = new URL(req.url);
    const typesParam = url.searchParams.get('type');
    const types = typesParam ? typesParam.split(',') : ['client_id', 'client_secret', 'api_key'];

    // Build update object
    const updateData: any = {};

    if (types.includes('client_id')) {
      updateData.ghl_client_id_encrypted = null;
      updateData.ghl_client_id_updated_at = null;
    }

    if (types.includes('client_secret')) {
      updateData.ghl_client_secret_encrypted = null;
      updateData.ghl_client_secret_updated_at = null;
    }

    if (types.includes('api_key')) {
      updateData.ghl_api_key_encrypted = null;
      updateData.ghl_api_key_updated_at = null;
    }

    // Remove the credentials
    const { error: updateError } = await supabaseAdmin
      .from('parent_organizations')
      .update(updateData)
      .eq('id', params.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove GHL credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'GHL credentials removed successfully'
    });

  } catch (error: any) {
    console.error('GHL credentials DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove GHL credentials' },
      { status: 500 }
    );
  }
}
