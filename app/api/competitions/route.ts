/**
 * Competitions API Routes
 *
 * GET /api/competitions - List all competitions
 * POST /api/competitions - Create new competition
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
    const organizationId = searchParams.get('organization_id');
    const sportId = searchParams.get('sport_id');

    // Build query - RLS policies handle access control
    let query = supabaseAdmin
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
          city,
          state
        )
      `)
      .order('name');

    // Apply filters if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (sportId) {
      query = query.eq('sport_id', sportId);
    }

    const { data: competitions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch competitions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: competitions,
    });
  } catch (error: any) {
    console.error('Competitions GET error:', error);
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
      organization_id,
      sport_id,
      name,
      description,
      competition_type,
      default_location_id,
      is_recurring,
      recurrence_rule,
    } = body;

    // Validate required fields
    if (!organization_id || !sport_id || !name) {
      return NextResponse.json(
        { success: false, error: 'Organization, sport, and name are required' },
        { status: 400 }
      );
    }

    // Check if user has permission (platform_admin OR org_admin for this organization)
    const { data: adminRoles } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type, organization_id')
      .eq('user_id', user.userId);

    const isPlatformAdmin = adminRoles?.some(r => ['platform_admin', 'super_admin'].includes(r.role_type));
    const isOrgAdmin = adminRoles?.some(r => r.role_type === 'org_admin' && r.organization_id === organization_id);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Must be platform admin or organization admin.' },
        { status: 403 }
      );
    }

    // Create competition
    const { data: competition, error } = await supabase
      .from('competitions')
      .insert({
        organization_id,
        sport_id,
        name,
        description,
        competition_type,
        default_location_id,
        is_recurring: is_recurring || false,
        recurrence_rule,
      })
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
        { success: false, error: 'Failed to create competition' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: competition,
    });
  } catch (error: any) {
    console.error('Competitions POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
