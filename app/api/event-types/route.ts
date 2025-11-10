/**
 * Event Types API Routes
 *
 * GET /api/event-types - List all event types
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const { data: eventTypes, error } = await supabase
      .from('event_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch event types' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: eventTypes,
    });
  } catch (error: any) {
    console.error('Event Types GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
