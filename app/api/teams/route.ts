/**
 * Teams API Routes
 *
 * GET    /api/teams - List user's teams
 * POST   /api/teams - Create new team
 *
 * Based on: Attack Kit Section 8 - API Standards
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/teams
 * List all teams the user has access to
 * Optional query param: organization_id - filter by organization
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
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
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');

    // Get user's admin roles
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id, team_id')
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    // Check user's role level
    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const orgAdminOrgIds = adminRoles?.filter(r => r.role_type === 'org_admin').map(r => r.organization_id) || [];
    const teamAdminTeamIds = adminRoles?.filter(r => r.role_type === 'team_admin').map(r => r.team_id) || [];

    let query = supabaseAdmin
      .from('teams')
      .select(`
        id,
        name,
        slug,
        organization_id,
        sport_id,
        logo_url,
        primary_color,
        secondary_color,
        is_active,
        created_at,
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
          logo_url
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (isPlatformAdmin) {
      // Platform admin sees all teams
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
    } else if (orgAdminOrgIds.length > 0) {
      // Org admin sees teams in their organizations
      if (organizationId) {
        // Filter to specific org if they have access
        if (orgAdminOrgIds.includes(organizationId)) {
          query = query.eq('organization_id', organizationId);
        } else {
          // They don't have access to this org
          return NextResponse.json({
            success: true,
            data: { teams: [], count: 0 },
          });
        }
      } else {
        // Show all teams in their organizations
        query = query.in('organization_id', orgAdminOrgIds);
      }
    } else if (teamAdminTeamIds.length > 0) {
      // Team admin sees only their specific teams
      if (organizationId) {
        // Filter to teams in the specified org that they have access to
        query = query.eq('organization_id', organizationId).in('id', teamAdminTeamIds);
      } else {
        query = query.in('id', teamAdminTeamIds);
      }
    } else {
      // No admin roles - no access to teams
      return NextResponse.json({
        success: true,
        data: { teams: [], count: 0 },
      });
    }

    const { data: teams, error: teamsError } = await query;

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        teams: teams || [],
        count: teams?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Teams GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams
 * Create a new team
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
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
    const body = await req.json();

    // Validate required fields
    const { name, slug, organization_id, sport_id, description, team_type } = body;

    if (!name || !slug || !organization_id || !sport_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, slug, organization_id, sport_id',
        },
        { status: 400 }
      );
    }

    // Check if user is platform admin OR org admin for this organization
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .or(`role_type.in.(platform_admin,super_admin),and(role_type.eq.org_admin,organization_id.eq.${organization_id})`);

    const hasPermission = adminRoles && adminRoles.length > 0;

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions. Must be platform admin or organization admin.',
        },
        { status: 403 }
      );
    }

    // Check if slug is unique within the organization
    const { data: existingTeam } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .eq('organization_id', organization_id)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { success: false, error: 'A team with this slug already exists in this organization' },
        { status: 409 }
      );
    }

    // Create the team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        team_type: team_type || 'team',
        organization_id,
        sport_id,
        primary_color: body.primary_color || '#3B82F6',
        secondary_color: body.secondary_color || '#1E40AF',
        is_active: true,
      })
      .select()
      .single();

    if (teamError || !team) {
      console.error('Team creation error:', teamError);
      return NextResponse.json(
        { success: false, error: 'Failed to create team' },
        { status: 500 }
      );
    }

    // Add the creator as a team admin
    const { error: memberError } = await supabaseAdmin
      .from('admin_roles')
      .insert({
        user_id: userId,
        role_type: 'team_admin',
        team_id: team.id,
        organization_id,
      });

    if (memberError) {
      console.error('Error adding team admin role:', memberError);
      // Don't fail the request, just log the error
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'team.created',
      entity_type: 'team',
      entity_id: team.id,
      new_values: { name: team.name, slug: team.slug },
    });

    return NextResponse.json(
      {
        success: true,
        data: { team },
        message: 'Team created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Teams POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
