/**
 * Organization Sports API Route
 *
 * GET /api/organizations/[id]/sports - Get all sports for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/organizations/[id]/sports
 * Get all sports associated with an organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const orgId = params.id;

    // Get all sports for this organization via organization_sports join table
    const { data: orgSports, error: orgSportsError } = await supabaseAdmin
      .from('organization_sports')
      .select(`
        sport_id,
        sports:sport_id (
          id,
          name
        )
      `)
      .eq('organization_id', orgId);

    if (orgSportsError) {
      console.error('Error fetching organization sports:', orgSportsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch organization sports' },
        { status: 500 }
      );
    }

    // Extract sports from join table result
    const sports = orgSports?.map((os: any) => os.sports).filter((s: any) => s) || [];

    return NextResponse.json({
      success: true,
      data: sports,
    });

  } catch (error: any) {
    console.error('Organization sports API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
