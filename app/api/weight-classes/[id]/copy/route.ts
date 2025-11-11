/**
 * Copy Weight Class API Route
 *
 * POST /api/weight-classes/[id]/copy - Create a copy of an existing weight class
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get the original weight class
    const { data: originalWeightClass, error: fetchError } = await supabaseAdmin
      .from('weight_classes')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !originalWeightClass) {
      return NextResponse.json(
        { success: false, error: 'Weight class not found' },
        { status: 404 }
      );
    }

    // Check if user has admin permission
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    const hasAdminAccess = adminRoles?.some(r =>
      ['org_admin', 'platform_admin', 'super_admin'].includes(r.role_type)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body for any overrides
    const body = await req.json().catch(() => ({}));
    const {
      name,
      expiration_date,
      age_group,
      state,
      city,
    } = body;

    // Create a copy with "(Copy)" appended to the name
    const { data: copiedWeightClass, error: createError } = await supabaseAdmin
      .from('weight_classes')
      .insert({
        sport_id: originalWeightClass.sport_id,
        name: name || `${originalWeightClass.name} (Copy)`,
        weight: originalWeightClass.weight,
        age_group: age_group !== undefined ? age_group : originalWeightClass.age_group,
        state: state !== undefined ? state : originalWeightClass.state,
        city: city !== undefined ? city : originalWeightClass.city,
        expiration_date: expiration_date !== undefined ? expiration_date : originalWeightClass.expiration_date,
        notes: originalWeightClass.notes,
        is_active: true, // New copies are always active
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

    if (createError) {
      console.error('Weight class copy error:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to copy weight class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: copiedWeightClass,
      message: 'Weight class copied successfully',
    });
  } catch (error: any) {
    console.error('Weight class COPY error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
