/**
 * Team Detail API Routes
 *
 * GET    /api/teams/[id] - Get team details
 * PUT    /api/teams/[id] - Update team
 * DELETE /api/teams/[id] - Delete team
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/teams/[id]
 * Get team details
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

    const teamId = params.id;

    // Get team with related data
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select(`
        *,
        sports:sport_id (
          id,
          name,
          slug,
          icon_url
        ),
        parent_organizations:organization_id (
          id,
          name,
          slug,
          logo_url,
          website_url
        ),
        team_members (
          id,
          user_id,
          role,
          status,
          joined_at,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this team
    const userId = payload.userId;
    const isMember = team.team_members?.some(
      (m: any) => m.user_id === userId && m.status === 'active'
    );

    // Check if user is admin
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === team.organization_id);
    const isTeamAdmin = adminRoles?.some(r => r.role_type === 'team_admin' && r.team_id === teamId);

    if (!isMember && !isPlatformAdmin && !isOrgAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { team },
    });
  } catch (error: any) {
    console.error('Team GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/teams/[id]
 * Update team
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
    const teamId = params.id;
    const body = await req.json();

    // Get current team
    const { data: currentTeam, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !currentTeam) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this team
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check permissions: platform admin, org admin for this org, or team admin for this team
    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === currentTeam.organization_id);
    const isTeamAdmin = adminRoles.some(r => r.role_type === 'team_admin' && r.team_id === teamId);

    if (!isPlatformAdmin && !isOrgAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin, organization admin, or team admin.' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    const allowedFields = [
      'name',
      'description',
      'logo_url',
      'banner_url',
      'primary_color',
      'secondary_color',
      'address',
      'city',
      'state',
      'zip',
      'phone_number',
      'email',
      'website_url',
      'is_active',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update team
    const { data: team, error: updateError } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError || !team) {
      console.error('Team update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update team' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'team.updated',
      entity_type: 'team',
      entity_id: teamId,
      old_values: currentTeam,
      new_values: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { team },
      message: 'Team updated successfully',
    });
  } catch (error: any) {
    console.error('Team PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[id]
 * Delete team (soft delete by setting is_active = false)
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
    const teamId = params.id;

    // Get current team
    const { data: currentTeam } = await supabaseAdmin
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .single();

    if (!currentTeam) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this team
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    // Only org admin or platform admin can delete teams
    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === currentTeam.organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    // Soft delete (set is_active = false)
    const { error: deleteError } = await supabaseAdmin
      .from('teams')
      .update({ is_active: false })
      .eq('id', teamId);

    if (deleteError) {
      console.error('Team delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete team' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'team.deleted',
      entity_type: 'team',
      entity_id: teamId,
    });

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error: any) {
    console.error('Team DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
