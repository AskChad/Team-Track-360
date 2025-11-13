/**
 * Weight Class by ID API
 *
 * PUT /api/weight-classes/[id] - Update a weight class
 * DELETE /api/weight-classes/[id] - Delete a weight class
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

/**
 * PUT - Update a weight class
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, error: 'Only platform admins can update weight classes' },
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

    // Update weight class
    const { data: weightClass, error } = await supabaseAdmin
      .from('weight_classes')
      .update({
        ...(sport_id !== undefined && { sport_id }),
        ...(name !== undefined && { name }),
        ...(weight !== undefined && { weight: parseFloat(weight) }),
        ...(age_group !== undefined && { age_group }),
        ...(state !== undefined && { state }),
        ...(city !== undefined && { city }),
        ...(expiration_date !== undefined && { expiration_date }),
        ...(notes !== undefined && { notes }),
        ...(is_active !== undefined && { is_active }),
      })
      .eq('id', params.id)
      .select(\`
        *,
        sports:sport_id (
          id,
          name
        )
      \`)
      .single();

    if (error) {
      console.error('Weight class update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update weight class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weight class updated successfully',
      data: weightClass
    });

  } catch (error: any) {
    console.error('Weight class PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update weight class' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a weight class
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { success: false, error: 'Only platform admins can delete weight classes' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('weight_classes')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Weight class delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete weight class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weight class deleted successfully'
    });

  } catch (error: any) {
    console.error('Weight class DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete weight class' },
      { status: 500 }
    );
  }
}
