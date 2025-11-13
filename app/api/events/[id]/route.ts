/**
 * Event Detail API Routes
 *
 * GET    /api/events/[id] - Get event details
 * PUT    /api/events/[id] - Update event
 * DELETE /api/events/[id] - Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/events/[id]
 * Get event details
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

    const eventId = params.id;
    const userId = payload.userId;

    // Get event with related data
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        event_types:event_type_id (
          id,
          name,
          color,
          icon
        ),
        locations:location_id (
          id,
          name,
          address,
          city,
          state,
          zip
        ),
        teams:team_id (
          id,
          name,
          organization_id
        ),
        competitions:competition_id (
          id,
          name
        ),
        event_rsvps (
          id,
          user_id,
          response,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event fetch error:', eventError);
      console.error('Event ID:', eventId);
      console.error('Event data:', event);
      return NextResponse.json(
        { success: false, error: 'Event not found', details: eventError?.message || 'No event data returned' },
        { status: 404 }
      );
    }

    // Check if user has access to this event
    // Check admin roles
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === (event.teams as any)?.organization_id);
    const isTeamAdmin = adminRoles?.some(r => r.role_type === 'team_admin' && r.team_id === event.team_id);

    // Check team membership (allow any team member to view their team's events)
    const { data: teamMembership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', event.team_id)
      .eq('status', 'active')
      .single();

    const isTeamMember = !!teamMembership;

    if (!isPlatformAdmin && !isOrgAdmin && !isTeamAdmin && !isTeamMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You must be a member of this team to view this event.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { event },
    });
  } catch (error: any) {
    console.error('Event GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id]
 * Update event
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
    const eventId = params.id;
    const body = await req.json();

    // Get current event
    const { data: currentEvent, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*, teams:team_id(organization_id)')
      .eq('id', eventId)
      .single();

    if (eventError || !currentEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this event
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

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === (currentEvent.teams as any)?.organization_id);
    const isTeamAdmin = adminRoles.some(r => r.role_type === 'team_admin' && r.team_id === currentEvent.team_id);

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
      'event_type_id',
      'event_date',
      'start_time',
      'end_time',
      'arrival_time',
      'start_datetime',
      'end_datetime',
      'location_id',
      'status',
      'weigh_in_time',
      'check_in_time',
      'registration_deadline',
      'is_public',
      'show_results_public',
      'competition_id',
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

    // Update event
    const { data: event, error: updateError } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError || !event) {
      console.error('Event update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update event' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'event.updated',
      entity_type: 'event',
      entity_id: eventId,
      old_values: currentEvent,
      new_values: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { event },
      message: 'Event updated successfully',
    });
  } catch (error: any) {
    console.error('Event PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete event (soft delete)
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
    const eventId = params.id;

    // Get current event
    const { data: currentEvent } = await supabaseAdmin
      .from('events')
      .select('team_id, teams:team_id(organization_id)')
      .eq('id', eventId)
      .single();

    if (!currentEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this event
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    // Only org admin or platform admin can delete events
    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === (currentEvent.teams as any)?.organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    // Hard delete the event
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Event delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'event.deleted',
      entity_type: 'event',
      entity_id: eventId,
    });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    console.error('Event DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
