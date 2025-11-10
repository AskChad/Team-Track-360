/**
 * Team Members API Routes
 *
 * GET    /api/teams/[id]/members - List team members
 * POST   /api/teams/[id]/members - Add team member
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/teams/[id]/members
 * List all members of a team
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
    const userId = payload.userId;

    // Get the team to check organization
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this team (member OR admin)
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single();

    // Check if user is admin
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === team.organization_id);
    const isTeamAdmin = adminRoles?.some(r => r.role_type === 'team_admin' && r.team_id === teamId);

    if (!membership && !isPlatformAdmin && !isOrgAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get all team members
    const { data: members, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        status,
        jersey_number,
        position,
        joined_at,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url,
          phone_number
        )
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        members: members || [],
        count: members?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Team members GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[id]/members
 * Add a member to a team
 */
export async function POST(
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

    // Get the team to check organization
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to add members
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be team admin or higher.' },
        { status: 403 }
      );
    }

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === team.organization_id);
    const isTeamAdmin = adminRoles.some(r => r.role_type === 'team_admin' && r.team_id === teamId);

    if (!isPlatformAdmin && !isOrgAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be team admin or higher.' },
        { status: 403 }
      );
    }

    // Validate required fields
    const { user_id: memberUserId, role } = body;

    if (!memberUserId || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, role' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', memberUserId)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id, status')
      .eq('user_id', memberUserId)
      .eq('team_id', teamId)
      .single();

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'User is already a member of this team' },
          { status: 409 }
        );
      } else {
        // Reactivate membership
        const { data: reactivated, error: reactivateError } = await supabaseAdmin
          .from('team_members')
          .update({
            status: 'active',
            role,
            jersey_number: body.jersey_number,
            position: body.position,
          })
          .eq('id', existingMember.id)
          .select()
          .single();

        if (reactivateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to reactivate membership' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { member: reactivated },
          message: 'Member reactivated successfully',
        });
      }
    }

    // Add new member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: memberUserId,
        role,
        status: 'active',
        jersey_number: body.jersey_number,
        position: body.position,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError || !member) {
      console.error('Member creation error:', memberError);
      return NextResponse.json(
        { success: false, error: 'Failed to add member' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'team.member_added',
      entity_type: 'team_member',
      entity_id: member.id,
      new_values: { team_id: teamId, user_id: memberUserId, role },
    });

    return NextResponse.json(
      {
        success: true,
        data: { member },
        message: 'Member added successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Team members POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
