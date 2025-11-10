/**
 * Sports API Routes
 *
 * GET /api/sports - List all sports
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const { data: sports, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sports,
    });
  } catch (error: any) {
    console.error('Sports GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
