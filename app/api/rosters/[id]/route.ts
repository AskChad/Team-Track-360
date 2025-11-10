/**
 * Event Roster Detail API Routes
 *
 * GET /api/rosters/[id] - Get roster details with members
 * PUT /api/rosters/[id] - Update roster
 * DELETE /api/rosters/[id] - Delete roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get roster details with event and team info for authorization
    const { data: roster, error: rosterError } = await supabaseAdmin
      .from('event_rosters')
      .select(`
        *,
        events (
          id,
          name,
          event_type,
          start_date,
          end_date,
          team_id,
          teams:team_id (
            organization_id
          ),
          locations (
            id,
            name,
            city,
            state
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (rosterError || !roster) {
      return NextResponse.json(
        { success: false, error: 'Roster not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this roster
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id, team_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === roster.events?.teams?.organization_id);
    const isTeamAdmin = adminRoles?.some(r => r.role_type === 'team_admin' && r.team_id === roster.events?.team_id);

    if (!isPlatformAdmin && !isOrgAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get roster members
    const { data: members, error: membersError } = await supabase
      .from('wrestling_roster_members')
      .select(`
        *,
        wrestling_athlete_profiles (
          id,
          athlete_profiles (
            id,
            first_name,
            last_name,
            profiles (
              email
            )
          )
        )
      `)
      .eq('roster_id', params.id)
      .order('weight_class');

    if (membersError) {
      console.error('Members error:', membersError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...roster,
        members: members || [],
      },
    });
  } catch (error: any) {
    console.error('Roster GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const body = await req.json();

    // Get the roster's event and team info for authorization
    const { data: currentRoster, error: fetchError } = await supabaseAdmin
      .from('event_rosters')
      .select(`
        event_id,
        events:event_id (
          team_id,
          teams:team_id (
            organization_id
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !currentRoster) {
      return NextResponse.json(
        { success: false, error: 'Roster not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this roster
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id, team_id')
      .eq('user_id', user.userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === currentRoster.events?.teams?.organization_id);
    const isTeamAdmin = adminRoles.some(r => r.role_type === 'team_admin' && r.team_id === currentRoster.events?.team_id);

    if (!isPlatformAdmin && !isOrgAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin, organization admin, or team admin.' },
        { status: 403 }
      );
    }

    const { data: roster, error } = await supabaseAdmin
      .from('event_rosters')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select(`
        *,
        events (
          id,
          name,
          event_type,
          start_date,
          end_date
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update roster' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: roster,
    });
  } catch (error: any) {
    console.error('Roster PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get the roster's event and team info for authorization
    const { data: currentRoster } = await supabaseAdmin
      .from('event_rosters')
      .select(`
        event_id,
        events:event_id (
          team_id,
          teams:team_id (
            organization_id
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (!currentRoster) {
      return NextResponse.json(
        { success: false, error: 'Roster not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this roster (org admin or platform admin only)
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === currentRoster.events?.teams?.organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    // Delete the roster
    const { error } = await supabaseAdmin
      .from('event_rosters')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete roster' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: params.id },
    });
  } catch (error: any) {
    console.error('Roster DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
