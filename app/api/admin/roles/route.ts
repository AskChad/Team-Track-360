/**
 * Admin Roles Management API
 *
 * GET /api/admin/roles - Get all admin role assignments (platform admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Check if user is platform admin
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Platform admin only.' },
        { status: 403 }
      );
    }

    // Fetch all admin roles with related data
    const { data: roles, error } = await supabaseAdmin
      .from('admin_roles')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        ),
        parent_organizations:organization_id (
          name
        ),
        teams:team_id (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch admin roles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    console.error('Admin roles GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
