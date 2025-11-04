/**
 * Athlete Detail API Routes
 *
 * GET /api/athletes/[id] - Get athlete details
 * PUT /api/athletes/[id] - Update athlete
 * DELETE /api/athletes/[id] - Delete athlete
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

    const { data: athlete, error } = await supabase
      .from('wrestling_athlete_profiles')
      .select(`
        *,
        profiles (
          id,
          email,
          first_name,
          last_name,
          full_name,
          date_of_birth,
          phone,
          address,
          city,
          state,
          zip,
          avatar_url,
          bio
        ),
        teams (
          id,
          name,
          sport_id,
          parent_organizations (
            id,
            name
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: athlete,
    });
  } catch (error: any) {
    console.error('Athlete GET error:', error);
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

    // Get the athlete's user_id
    const { data: currentAthlete, error: fetchError } = await supabase
      .from('wrestling_athlete_profiles')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !currentAthlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found' },
        { status: 404 }
      );
    }

    // Separate profile fields from athlete fields
    const profileFields: any = {};
    const athleteFields: any = {};

    // Profile fields
    if (body.email !== undefined) profileFields.email = body.email;
    if (body.first_name !== undefined) profileFields.first_name = body.first_name;
    if (body.last_name !== undefined) profileFields.last_name = body.last_name;
    if (body.date_of_birth !== undefined) profileFields.date_of_birth = body.date_of_birth;
    if (body.phone !== undefined) profileFields.phone = body.phone;
    if (body.address !== undefined) profileFields.address = body.address;
    if (body.city !== undefined) profileFields.city = body.city;
    if (body.state !== undefined) profileFields.state = body.state;
    if (body.zip !== undefined) profileFields.zip = body.zip;
    if (body.avatar_url !== undefined) profileFields.avatar_url = body.avatar_url;
    if (body.bio !== undefined) profileFields.bio = body.bio;

    // Update full_name if first_name or last_name changed
    if (body.first_name || body.last_name) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentAthlete.user_id)
        .single();

      const firstName = body.first_name || currentProfile?.first_name || '';
      const lastName = body.last_name || currentProfile?.last_name || '';
      profileFields.full_name = `${firstName} ${lastName}`;
    }

    // Athlete fields
    if (body.team_id !== undefined) athleteFields.team_id = body.team_id;
    if (body.current_weight_class !== undefined) athleteFields.current_weight_class = body.current_weight_class;
    if (body.preferred_weight_class !== undefined) athleteFields.preferred_weight_class = body.preferred_weight_class;
    if (body.wrestling_style !== undefined) athleteFields.wrestling_style = body.wrestling_style;
    if (body.grade_level !== undefined) athleteFields.grade_level = body.grade_level;
    if (body.years_experience !== undefined) athleteFields.years_experience = body.years_experience;
    if (body.medical_clearance_date !== undefined) athleteFields.medical_clearance_date = body.medical_clearance_date;
    if (body.medical_clearance_expires_at !== undefined) athleteFields.medical_clearance_expires_at = body.medical_clearance_expires_at;
    if (body.is_active !== undefined) athleteFields.is_active = body.is_active;

    // Update profile if there are profile fields to update
    if (Object.keys(profileFields).length > 0) {
      profileFields.updated_at = new Date().toISOString();
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileFields)
        .eq('id', currentAthlete.user_id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        return NextResponse.json(
          { success: false, error: 'Failed to update athlete profile' },
          { status: 500 }
        );
      }
    }

    // Update athlete profile
    athleteFields.updated_at = new Date().toISOString();
    const { data: athlete, error: athleteError } = await supabase
      .from('wrestling_athlete_profiles')
      .update(athleteFields)
      .eq('id', params.id)
      .select(`
        *,
        profiles (
          id,
          email,
          first_name,
          last_name,
          full_name,
          date_of_birth,
          phone,
          address,
          city,
          state,
          zip
        ),
        teams (
          id,
          name
        )
      `)
      .single();

    if (athleteError) {
      console.error('Athlete update error:', athleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to update athlete' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: athlete,
    });
  } catch (error: any) {
    console.error('Athlete PUT error:', error);
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

    // Delete the athlete profile (cascade will handle user_types)
    const { error } = await supabase
      .from('wrestling_athlete_profiles')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete athlete' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: params.id },
    });
  } catch (error: any) {
    console.error('Athlete DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
