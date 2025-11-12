/**
 * Locations API Routes
 *
 * GET /api/locations - List all locations
 * POST /api/locations - Create new location
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get locations - use supabaseAdmin to bypass RLS
    const { data: locations, error } = await supabaseAdmin
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    console.error('Locations GET error:', error);
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
      name,
      address,
      city,
      state,
      zip,
      country,
      venue_type,
      capacity,
      facilities,
      phone,
      website_url,
      latitude,
      longitude,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      );
    }

    // Check if user is platform admin (locations are global resources)
    const { data: platformAdmin } = await supabaseAdmin
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', user.userId)
      .in('role_type', ['platform_admin', 'super_admin'])
      .single();

    if (!platformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Platform admin required to create locations.' },
        { status: 403 }
      );
    }

    // Create location - use supabaseAdmin to bypass RLS
    const { data: location, error } = await supabaseAdmin
      .from('locations')
      .insert({
        name,
        address,
        city,
        state,
        zip,
        country: country || 'USA',
        venue_type,
        capacity,
        facilities,
        phone,
        website_url,
        latitude,
        longitude,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    console.error('Locations POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
