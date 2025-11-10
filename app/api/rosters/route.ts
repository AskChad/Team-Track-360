/**
 * Event Rosters API Routes
 *
 * GET /api/rosters - List all rosters
 * POST /api/rosters - Create new roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('event_id');

    let query = supabase
      .from('event_rosters')
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
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: rosters, error } = await query;

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
