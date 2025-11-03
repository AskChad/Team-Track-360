/**
 * Events API Routes
 *
 * GET  /api/events - List events for a team
 * POST /api/events - Create new event
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/events?team_id=xxx
 * List events for a specific team
 */
export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'team_id is required' },
        { status: 400 }
      );
    }

    // Check if user has access to this team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .single();

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`team_id.eq.${teamId},role_type.in.(platform_admin,super_admin)`)
      .single();

    if (!membership && !adminRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get events for the team
    const { data: events, error: eventsError } = await supabaseAdmin
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
          state
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
      .eq('team_id', teamId)
      .order('start_time', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        events: events || [],
        count: events?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Events GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();

    // Validate required fields
    const { team_id, title, event_type_id, start_time } = body;

    if (!team_id || !title || !event_type_id || !start_time) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: team_id, title, event_type_id, start_time',
        },
        { status: 400 }
      );
    }

    // Check if user is team admin or coach
    const { data: adminRole } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`team_id.eq.${team_id},role_type.in.(platform_admin,super_admin)`)
      .in('role_type', ['team_admin', 'org_admin', 'platform_admin', 'super_admin'])
      .single();

    if (!adminRole) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be team admin or higher.' },
        { status: 403 }
      );
    }

    // Create the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        team_id,
        title: title.trim(),
        description: body.description?.trim(),
        event_type_id,
        location_id: body.location_id,
        start_time,
        end_time: body.end_time,
        all_day: body.all_day || false,
        is_mandatory: body.is_mandatory || false,
        max_attendees: body.max_attendees,
        rsvp_deadline: body.rsvp_deadline,
        competition_id: body.competition_id,
        opponent_team_id: body.opponent_team_id,
        created_by_user_id: userId,
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error('Event creation error:', eventError);
      return NextResponse.json(
        { success: false, error: 'Failed to create event' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'event.created',
      entity_type: 'event',
      entity_id: event.id,
      new_values: { title: event.title, start_time: event.start_time },
    });

    return NextResponse.json(
      {
        success: true,
        data: { event },
        message: 'Event created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Events POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
