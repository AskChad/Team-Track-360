/**
 * Weight Classes API
 *
 * GET /api/weight-classes - List all weight classes
 * POST /api/weight-classes - Create a new weight class
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, AuthError } from '@/lib/auth';

/**
 * GET - List all weight classes
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get all weight classes with sport info
    const { data: weightClasses, error } = await supabaseAdmin
      .from('weight_classes')
      .select(`
        *,
        sports:sport_id (
          id,
          name
        )
      `)
      .order('weight', { ascending: true });

    if (error) {
      console.error('Weight classes fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch weight classes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: weightClasses || []
    });

  } catch (error: any) {
    console.error('Weight classes GET error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch weight classes' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new weight class
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is platform admin
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r =>
      ['platform_admin', 'super_admin'].includes(r.role_type)
    );

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only platform admins can create weight classes' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      sport_id,
      name,
      weight,
      age_group,
      state,
      city,
      expiration_date,
      notes,
      is_active
    } = body;

    // Validate required fields
    if (!sport_id || !name || weight === undefined || weight === null) {
      return NextResponse.json(
        { success: false, error: 'sport_id, name, and weight are required' },
        { status: 400 }
      );
    }

    // Create weight class
    const { data: weightClass, error } = await supabaseAdmin
      .from('weight_classes')
      .insert({
        sport_id,
        name,
        weight: parseFloat(weight),
        age_group: age_group || null,
        state: state || null,
        city: city || null,
        expiration_date: expiration_date || null,
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        sports:sport_id (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Weight class creation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create weight class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weight class created successfully',
      data: weightClass
    });

  } catch (error: any) {
    console.error('Weight classes POST error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create weight class' },
      { status: 500 }
    );
  }
}
