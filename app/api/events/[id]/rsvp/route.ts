/**
 * Event RSVP API Routes
 *
 * POST /api/events/[id]/rsvp - Submit/update RSVP
 * GET  /api/events/[id]/rsvp - Get event RSVPs
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/events/[id]/rsvp
 * Get all RSVPs for an event
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

    // Get event RSVPs
    const { data: rsvps, error } = await supabaseAdmin
      .from('event_rsvps')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching RSVPs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch RSVPs' },
        { status: 500 }
      );
    }

    // Count by response type
    const counts = {
      yes: rsvps?.filter((r) => r.response === 'yes').length || 0,
      no: rsvps?.filter((r) => r.response === 'no').length || 0,
      maybe: rsvps?.filter((r) => r.response === 'maybe').length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        rsvps: rsvps || [],
        counts,
        total: rsvps?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Event RSVP GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/rsvp
 * Submit or update RSVP
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
    const eventId = params.id;
    const body = await req.json();

    // Validate response
    const { response, guests_count, notes } = body;

    if (!response || !['yes', 'no', 'maybe'].includes(response)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response. Must be: yes, no, or maybe' },
        { status: 400 }
      );
    }

    // Check if event exists and get details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, team_id, max_attendees')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user is member of team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', event.team_id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You must be a team member to RSVP' },
        { status: 403 }
      );
    }

    // Check max attendees if saying yes
    if (response === 'yes' && event.max_attendees) {
      const { data: yesRsvps } = await supabaseAdmin
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('response', 'yes');

      if (yesRsvps && yesRsvps.length >= event.max_attendees) {
        return NextResponse.json(
          { success: false, error: 'Event is at maximum capacity' },
          { status: 400 }
        );
      }
    }

    // Check if RSVP already exists
    const { data: existingRsvp } = await supabaseAdmin
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    let rsvp;

    if (existingRsvp) {
      // Update existing RSVP
      const { data, error } = await supabaseAdmin
        .from('event_rsvps')
        .update({
          response,
          guests_count: guests_count || 0,
          notes: notes?.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRsvp.id)
        .select()
        .single();

      if (error) {
        console.error('RSVP update error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update RSVP' },
          { status: 500 }
        );
      }

      rsvp = data;
    } else {
      // Create new RSVP
      const { data, error } = await supabaseAdmin
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          user_id: userId,
          response,
          guests_count: guests_count || 0,
          notes: notes?.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('RSVP creation error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to submit RSVP' },
          { status: 500 }
        );
      }

      rsvp = data;
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'event.rsvp_submitted',
      entity_type: 'event_rsvp',
      entity_id: rsvp.id,
      new_values: { event_id: eventId, response },
    });

    return NextResponse.json({
      success: true,
      data: { rsvp },
      message: 'RSVP submitted successfully',
    });
  } catch (error: any) {
    console.error('Event RSVP POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
