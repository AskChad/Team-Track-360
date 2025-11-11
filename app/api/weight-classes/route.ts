/**
 * Weight Classes API Routes
 *
 * GET /api/weight-classes - List weight classes (filtered by org for org admins)
 * POST /api/weight-classes - Create new weight class (org admins and platform admins)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get('sport_id');
    const isActive = searchParams.get('is_active');

    // Get user's admin roles
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch weight classes' },
        { status: 500 }
      );
    }

    // Check user has admin access (org admin or platform admin)
    const hasAdminAccess = adminRoles?.some(r =>
      ['org_admin', 'platform_admin', 'super_admin'].includes(r.role_type)
    );

    if (!hasAdminAccess) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions. Must be org admin or platform admin.',
      }, { status: 403 });
    }

    // Build query - all admins see all weight classes (sport-specific, not org-specific)
    let query = supabaseAdmin
      .from('weight_classes')
      .select(`
        *,
        sports (
          id,
          name
        )
      `)
      .order('sport_id')
      .order('weight');

    // Apply filters
    if (sportId) {
      query = query.eq('sport_id', sportId);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: weightClasses, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch weight classes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        weight_classes: weightClasses,
        count: weightClasses?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Weight classes GET error:', error);
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
      sport_id,
      name,
      weight,
      age_group,
      state,
      city,
      expiration_date,
      notes,
    } = body;

    // Validate required fields
    if (!sport_id || !name || !weight) {
      return NextResponse.json(
        { success: false, error: 'Sport, name, and weight are required' },
        { status: 400 }
      );
    }

    // Check if user has admin permission (org_admin or platform_admin)
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    const hasAdminAccess = adminRoles?.some(r =>
      ['org_admin', 'platform_admin', 'super_admin'].includes(r.role_type)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be org admin or platform admin.' },
        { status: 403 }
      );
    }

    // Create weight class
    const { data: weightClass, error } = await supabaseAdmin
      .from('weight_classes')
      .insert({
        sport_id,
        name,
        weight: parseFloat(weight),
        age_group,
        state,
        city,
        expiration_date,
        notes,
        created_by: user.userId,
      })
      .select(`
        *,
        sports (
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
      data: weightClass,
    });
  } catch (error: any) {
    console.error('Weight classes POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
