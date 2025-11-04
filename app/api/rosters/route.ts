/**
 * Event Rosters API Routes
 *
 * GET /api/rosters - List all rosters
 * POST /api/rosters - Create new roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
