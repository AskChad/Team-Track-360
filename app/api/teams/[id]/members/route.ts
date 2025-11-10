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

    // Check if user has access to this team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single();

    if (!membership) {
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

    // Check if user is team admin
    const { data: adminRole } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .or(`team_id.eq.${teamId},role_type.in.(platform_admin,super_admin)`)
      .in('role_type', ['team_admin', 'org_admin', 'platform_admin', 'super_admin'])
      .single();

    if (!adminRole) {
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
