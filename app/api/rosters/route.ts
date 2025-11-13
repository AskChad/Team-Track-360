/**
 * Event Rosters API Routes
 *
 * GET /api/rosters - List all rosters
 * POST /api/rosters - Create new roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, AuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');

    // Get user's admin roles
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id, team_id')
      .eq('user_id', user.userId);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rosters' },
        { status: 500 }
      );
    }

    // Check user's role level
    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const orgAdminOrgIds = adminRoles?.filter(r => r.role_type === 'org_admin').map(r => r.organization_id) || [];
    const teamAdminTeamIds = adminRoles?.filter(r => r.role_type === 'team_admin').map(r => r.team_id) || [];

    // Get accessible event IDs based on role
    let accessibleEventIds: string[] = [];

    if (isPlatformAdmin) {
      // Platform admin sees all rosters
      if (eventId) {
        accessibleEventIds = [eventId];
      } else {
        // Get all event IDs
        const { data: allEvents } = await supabaseAdmin
          .from('events')
          .select('id');
        accessibleEventIds = allEvents?.map(e => e.id) || [];
      }
    } else if (orgAdminOrgIds.length > 0 || teamAdminTeamIds.length > 0) {
      // Get all teams user has access to
      let accessibleTeamIds: string[] = [];

      if (orgAdminOrgIds.length > 0) {
        // Get teams in their organizations
        const { data: orgTeams } = await supabaseAdmin
          .from('teams')
          .select('id')
          .in('organization_id', orgAdminOrgIds);
        accessibleTeamIds = orgTeams?.map(t => t.id) || [];
      }

      if (teamAdminTeamIds.length > 0) {
        // Add their specific teams
        accessibleTeamIds = [...new Set([...accessibleTeamIds, ...teamAdminTeamIds])];
      }

      if (accessibleTeamIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      // Get events for accessible teams
      const { data: teamEvents } = await supabaseAdmin
        .from('events')
        .select('id')
        .in('team_id', accessibleTeamIds);
      accessibleEventIds = teamEvents?.map(e => e.id) || [];

      // If filtering by specific event, verify access
      if (eventId) {
        if (!accessibleEventIds.includes(eventId)) {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }
        accessibleEventIds = [eventId];
      }
    } else {
      // No admin roles - no access
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    if (accessibleEventIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Query rosters for accessible events
    const { data: rosters, error } = await supabaseAdmin
      .from('event_rosters')
      .select(`
        *,
        events (
          id,
          title,
          start_time,
          end_time,
          team_id,
          teams:team_id (
            id,
            name,
            organization_id
          )
        )
      `)
      .in('event_id', accessibleEventIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rosters' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rosters,
    });
  } catch (error: any) {
    console.error('Rosters GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const body = await req.json();
    const {
      event_id,
      name,
      roster_type,
      max_athletes,
      max_per_weight_class,
    } = body;

    // Validate required fields
    if (!event_id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Get event to check team
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('team_id')
      .eq('id', event_id)
      .single();

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user has permission (platform_admin OR team_admin for this team)
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isTeamAdmin = adminRoles?.some(r => r.role_type === 'team_admin' && r.team_id === event.team_id);

    if (!isPlatformAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin or team admin for this team.' },
        { status: 403 }
      );
    }

    // Create roster
    const { data: roster, error } = await supabase
      .from('event_rosters')
      .insert({
        event_id,
        name,
        roster_type,
        max_athletes,
        max_per_weight_class,
      })
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
        { success: false, error: 'Failed to create roster' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: roster,
    });
  } catch (error: any) {
    console.error('Rosters POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
