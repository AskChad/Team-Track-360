/**
 * Athletes API Routes
 *
 * GET /api/athletes - List all wrestling athletes
 * POST /api/athletes - Create new athlete profile
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
    const teamId = searchParams.get('team_id');
    const weightClass = searchParams.get('weight_class');
    const isActive = searchParams.get('is_active');

    let query = supabase
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
          avatar_url
        ),
        teams (
          id,
          name
        )
      `)
      .order('profiles(last_name)');

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    if (weightClass) {
      query = query.eq('current_weight_class', weightClass);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: athletes, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch athletes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: athletes,
    });
  } catch (error: any) {
    console.error('Athletes GET error:', error);
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
      // Profile fields
      email,
      first_name,
      last_name,
      date_of_birth,
      phone,
      address,
      city,
      state,
      zip,
      // Athlete fields
      team_id,
      current_weight_class,
      preferred_weight_class,
      wrestling_style,
      grade_level,
      years_experience,
      medical_clearance_date,
      medical_clearance_expires_at,
    } = body;

    // Validate required fields
    if (!email || !first_name || !last_name || !team_id) {
      return NextResponse.json(
        { success: false, error: 'Email, first name, last name, and team are required' },
        { status: 400 }
      );
    }

    // Check if user has permission (platform_admin OR team_admin for this team)
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, team_id, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isTeamAdmin = adminRoles?.some(r => r.role_type === 'team_admin' && r.team_id === team_id);

    if (!isPlatformAdmin && !isTeamAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin or team admin for this team.' },
        { status: 403 }
      );
    }

    // Create user profile first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        email,
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        date_of_birth,
        phone,
        address,
        city,
        state,
        zip,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to create athlete profile' },
        { status: 500 }
      );
    }

    // Mark user as athlete type
    await supabase
      .from('user_types')
      .insert({
        user_id: profile.id,
        type: 'athlete',
      });

    // Create wrestling athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('wrestling_athlete_profiles')
      .insert({
        user_id: profile.id,
        team_id,
        current_weight_class,
        preferred_weight_class,
        wrestling_style,
        grade_level,
        years_experience,
        medical_clearance_date,
        medical_clearance_expires_at,
      })
      .select(`
        *,
        profiles (
          id,
          email,
          first_name,
          last_name,
          full_name,
          date_of_birth,
          phone
        ),
        teams (
          id,
          name
        )
      `)
      .single();

    if (athleteError) {
      console.error('Athlete profile creation error:', athleteError);
      // Cleanup: delete the profile we just created
      await supabase.from('profiles').delete().eq('id', profile.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create wrestling athlete profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: athlete,
    });
  } catch (error: any) {
    console.error('Athletes POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
