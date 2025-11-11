/**
 * Individual Weight Class API Routes
 *
 * GET /api/weight-classes/[id] - Get single weight class
 * PUT /api/weight-classes/[id] - Update weight class
 * DELETE /api/weight-classes/[id] - Delete weight class
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get user's admin roles
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const orgAdminOrgIds = adminRoles?.filter(r => r.role_type === 'org_admin').map(r => r.organization_id) || [];

    // Fetch the weight class
    const { data: weightClass, error } = await supabaseAdmin
      .from('weight_classes')
      .select(`
        *,
        sports (
          id,
          name
        ),
        organizations (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !weightClass) {
      return NextResponse.json(
        { success: false, error: 'Weight class not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!isPlatformAdmin && !orgAdminOrgIds.includes(weightClass.organization_id)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: weightClass,
    });
  } catch (error: any) {
    console.error('Weight class GET error:', error);
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
    const {
      sport_id,
      organization_id,
      name,
      weight,
      age_group,
      state,
      city,
      expiration_date,
      notes,
      is_active,
    } = body;

    // Get existing weight class to check permissions
    const { data: existingWeightClass, error: fetchError } = await supabaseAdmin
      .from('weight_classes')
      .select('organization_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingWeightClass) {
      return NextResponse.json(
        { success: false, error: 'Weight class not found' },
        { status: 404 }
      );
    }

    // Check if user has permission
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === existingWeightClass.organization_id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update weight class
    const updateData: any = {};
    if (sport_id !== undefined) updateData.sport_id = sport_id;
    if (organization_id !== undefined) updateData.organization_id = organization_id;
    if (name !== undefined) updateData.name = name;
    if (weight !== undefined) updateData.weight = parseFloat(weight);
    if (age_group !== undefined) updateData.age_group = age_group;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (expiration_date !== undefined) updateData.expiration_date = expiration_date;
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: weightClass, error } = await supabaseAdmin
      .from('weight_classes')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        sports (
          id,
          name
        ),
        organizations (
          id,
          name
        )
      `)
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
      data: weightClass,
    });
  } catch (error: any) {
    console.error('Weight class PUT error:', error);
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

    // Get existing weight class to check permissions
    const { data: existingWeightClass, error: fetchError } = await supabaseAdmin
      .from('weight_classes')
      .select('organization_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingWeightClass) {
      return NextResponse.json(
        { success: false, error: 'Weight class not found' },
        { status: 404 }
      );
    }

    // Check if user has permission
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r =>
      r.role_type === 'org_admin' && r.organization_id === existingWeightClass.organization_id
    );

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Delete weight class
    const { error } = await supabaseAdmin
      .from('weight_classes')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Weight class deletion error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete weight class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weight class deleted successfully',
    });
  } catch (error: any) {
    console.error('Weight class DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
