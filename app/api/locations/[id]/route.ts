/**
 * Location Detail API Routes
 *
 * GET /api/locations/[id] - Get location details (all authenticated users)
 * PUT /api/locations/[id] - Update location (platform admin only)
 * DELETE /api/locations/[id] - Delete location (platform admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const { data: location, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // All authenticated users can view locations (needed for creating events/competitions)
    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Location GET error:', error);
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

    // Only platform admins can update locations
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only platform admins can update locations.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Update location
    const { data: location, error } = await supabaseAdmin
      .from('locations')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Location PUT error:', error);
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

    // Only platform admins can delete locations
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only platform admins can delete locations.' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('locations')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: params.id },
    });
  } catch (error: any) {
    console.error('Location DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
