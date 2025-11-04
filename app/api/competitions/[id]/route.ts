/**
 * Competition Detail API Routes
 *
 * GET /api/competitions/[id] - Get competition details
 * PUT /api/competitions/[id] - Update competition
 * DELETE /api/competitions/[id] - Delete competition
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

    const { error } = await supabase
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
