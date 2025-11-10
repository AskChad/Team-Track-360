/**
 * Competition Detail API Routes
 *
 * GET /api/competitions/[id] - Get competition details
 * PUT /api/competitions/[id] - Update competition
 * DELETE /api/competitions/[id] - Delete competition
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

    const { data: competition, error } = await supabase
      .from('competitions')
      .select(`
        *,
        parent_organizations (
          id,
          name
        ),
        sports (
          id,
          name
        ),
        locations (
          id,
          name,
          address,
          city,
          state,
          zip
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this competition
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === competition.organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: competition,
    });
  } catch (error: any) {
    console.error('Competition GET error:', error);
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

    // Get the competition's organization for authorization
    const { data: currentCompetition, error: fetchError } = await supabaseAdmin
      .from('competitions')
      .select('organization_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !currentCompetition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this competition
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === currentCompetition.organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin or organization admin.' },
        { status: 403 }
      );
    }

    const { data: competition, error } = await supabase
      .from('competitions')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select(`
        *,
        parent_organizations (
          id,
          name
        ),
        sports (
          id,
          name
        ),
        locations (
          id,
          name,
          city,
          state
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update competition' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: competition,
    });
  } catch (error: any) {
    console.error('Competition PUT error:', error);
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

    // Get the competition's organization for authorization
    const { data: currentCompetition } = await supabaseAdmin
      .from('competitions')
      .select('organization_id')
      .eq('id', params.id)
      .single();

    if (!currentCompetition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this competition (org admin or platform admin only)
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    const isPlatformAdmin = adminRoles.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles.some(r => r.role_type === 'org_admin' && r.organization_id === currentCompetition.organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be organization admin or platform admin.' },
        { status: 403 }
      );
    }

    // Delete the competition
    const { error } = await supabaseAdmin
      .from('competitions')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete competition' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: params.id },
    });
  } catch (error: any) {
    console.error('Competition DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
