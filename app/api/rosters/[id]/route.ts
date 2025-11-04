/**
 * Event Roster Detail API Routes
 *
 * GET /api/rosters/[id] - Get roster details with members
 * PUT /api/rosters/[id] - Update roster
 * DELETE /api/rosters/[id] - Delete roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get roster details
    const { data: roster, error: rosterError } = await supabase
      .from('event_rosters')
      .select(`
        *,
        events (
          id,
          name,
          event_type,
          start_date,
          end_date,
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

    const { data: roster, error } = await supabase
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

    const { error } = await supabase
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
