/**
 * Roster Members API Routes
 *
 * GET /api/rosters/[id]/members - List roster members
 * POST /api/rosters/[id]/members - Add member to roster
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

    const { data: members, error } = await supabase
      .from('wrestling_roster_members')
      .select(`
        *,
        wrestling_athlete_profiles (
          id,
          athlete_profiles (
            id,
            first_name,
            last_name,
            date_of_birth,
            profiles (
              email
            )
          )
        )
      `)
      .eq('roster_id', params.id)
      .order('weight_class');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch roster members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error: any) {
    console.error('Roster Members GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const body = await req.json();
    const {
      athlete_profile_id,
      weight_class,
      seed,
      made_weight,
      actual_weight,
      status,
    } = body;

    // Validate required fields
    if (!athlete_profile_id || !weight_class) {
      return NextResponse.json(
        { success: false, error: 'Athlete profile ID and weight class are required' },
        { status: 400 }
      );
    }

    // Add member to roster
    const { data: member, error } = await supabase
      .from('wrestling_roster_members')
      .insert({
        roster_id: params.id,
        athlete_profile_id,
        weight_class,
        seed,
        made_weight,
        actual_weight,
        status: status || 'active',
      })
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
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add member to roster' },
        { status: 500 }
      );
    }

    // Log the roster change
    await supabase
      .from('roster_change_log')
      .insert({
        roster_id: params.id,
        athlete_profile_id,
        change_type: 'added',
        changed_by: user.id,
      });

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    console.error('Roster Members POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
