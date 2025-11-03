/**
 * Organizations API Routes
 *
 * GET  /api/organizations - List organizations
 * POST /api/organizations - Create organization (platform admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/organizations
 * List all organizations (accessible to user)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // Check if platform admin
    const { data: platformAdmin } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role_type', ['platform_admin', 'super_admin'])
      .single();

    let organizations;

    if (platformAdmin) {
      // Platform admin sees all organizations
      const { data, error } = await supabaseAdmin
        .from('parent_organizations')
        .select(`
          *,
          organization_sports (
            sport_id,
            sports:sport_id (
              id,
              name,
              slug,
              icon_url
            )
          ),
          teams (
            id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      organizations = data;
    } else {
      // Regular users see only their organizations
      const { data: adminRoles } = await supabaseAdmin
        .from('admin_roles')
        .select('parent_organization_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .not('parent_organization_id', 'is', null);

      const orgIds = adminRoles?.map((r) => r.parent_organization_id) || [];

      if (orgIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { organizations: [], count: 0 },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('parent_organizations')
        .select(`
          *,
          organization_sports (
            sport_id,
            sports:sport_id (
              id,
              name,
              slug,
              icon_url
            )
          ),
          teams (
            id
          )
        `)
        .in('id', orgIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      organizations = data;
    }

    // Add team count to each org
    const orgsWithCounts = organizations?.map((org: any) => ({
      ...org,
      team_count: org.teams?.length || 0,
      sports: org.organization_sports?.map((os: any) => os.sports) || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        organizations: orgsWithCounts || [],
        count: orgsWithCounts?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Organizations GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create new organization (platform admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // Check if platform admin
    const { data: platformAdmin } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role_type', ['platform_admin', 'super_admin'])
      .single();

    if (!platformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Platform admin required.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate required fields
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, slug' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const { data: existing } = await supabaseAdmin
      .from('parent_organizations')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An organization with this slug already exists' },
        { status: 409 }
      );
    }

    // Create organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('parent_organizations')
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        description: body.description?.trim(),
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phone_number: body.phone_number,
        email: body.email,
        website_url: body.website_url,
        logo_url: body.logo_url,
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json(
        { success: false, error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add sports if provided
    if (body.sport_ids && Array.isArray(body.sport_ids) && body.sport_ids.length > 0) {
      const orgSports = body.sport_ids.map((sportId: string) => ({
        parent_organization_id: org.id,
        sport_id: sportId,
      }));

      await supabaseAdmin.from('organization_sports').insert(orgSports);
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'organization.created',
      entity_type: 'organization',
      entity_id: org.id,
      new_values: { name: org.name, slug: org.slug },
    });

    return NextResponse.json(
      {
        success: true,
        data: { organization: org },
        message: 'Organization created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Organizations POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
