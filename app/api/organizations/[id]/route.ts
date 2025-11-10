/**
 * Organization Detail API Routes
 *
 * GET    /api/organizations/[id] - Get organization details
 * PUT    /api/organizations/[id] - Update organization
 * DELETE /api/organizations/[id] - Delete organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/organizations/[id]
 * Get organization details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const orgId = params.id;
    const userId = payload.userId;

    // Get organization with related data
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('parent_organizations')
      .select(`
        *,
        organization_sports (
          sport_id,
          sports:sport_id (
            id,
            name,
            slug,
            icon_url
          )
        ),
        teams (
          id,
          name,
          slug,
          sport_id,
          is_active,
          sports:sport_id (
            id,
            name
          )
        )
      `)
      .eq('id', orgId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === orgId);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Format sports
    const sports = organization.organization_sports?.map((os: any) => os.sports) || [];

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          ...organization,
          sports,
          team_count: organization.teams?.length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Organization GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/[id]
 * Update organization
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const orgId = params.id;
    const body = await req.json();

    // Check if organization exists
    const { data: currentOrg, error: orgError } = await supabaseAdmin
      .from('parent_organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError || !currentOrg) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === orgId);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin or organization admin.' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    const allowedFields = [
      'name',
      'slug',
      'description',
      'address',
      'city',
      'state',
      'zip',
      'phone_number',
      'email',
      'website_url',
      'logo_url',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Check if slug is being changed and if it's unique
    if (updateData.slug && updateData.slug !== currentOrg.slug) {
      const { data: existingOrg } = await supabaseAdmin
        .from('parent_organizations')
        .select('id')
        .eq('slug', updateData.slug.toLowerCase())
        .neq('id', orgId)
        .single();

      if (existingOrg) {
        return NextResponse.json(
          { success: false, error: 'An organization with this slug already exists' },
          { status: 409 }
        );
      }

      updateData.slug = updateData.slug.toLowerCase();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update organization
    const { data: organization, error: updateError } = await supabaseAdmin
      .from('parent_organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single();

    if (updateError || !organization) {
      console.error('Organization update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    // Update sports if provided
    if (body.sport_ids && Array.isArray(body.sport_ids)) {
      // Delete existing sports
      await supabaseAdmin
        .from('organization_sports')
        .delete()
        .eq('organization_id', orgId);

      // Add new sports
      if (body.sport_ids.length > 0) {
        const orgSports = body.sport_ids.map((sportId: string) => ({
          organization_id: orgId,
          sport_id: sportId,
        }));

        await supabaseAdmin.from('organization_sports').insert(orgSports);
      }
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'organization.updated',
      entity_type: 'organization',
      entity_id: orgId,
      old_values: currentOrg,
      new_values: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { organization },
      message: 'Organization updated successfully',
    });
  } catch (error: any) {
    console.error('Organization PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete organization (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const orgId = params.id;

    // Check if organization exists
    const { data: organization } = await supabaseAdmin
      .from('parent_organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Only platform admin can delete organizations
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only platform admins can delete organizations.' },
        { status: 403 }
      );
    }

    // Check if organization has teams
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (teams && teams.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete organization with active teams. Please deactivate or delete teams first.' },
        { status: 400 }
      );
    }

    // Delete the organization
    const { error: deleteError } = await supabaseAdmin
      .from('parent_organizations')
      .delete()
      .eq('id', orgId);

    if (deleteError) {
      console.error('Organization delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete organization' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'organization.deleted',
      entity_type: 'organization',
      entity_id: orgId,
    });

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error: any) {
    console.error('Organization DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
