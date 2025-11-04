/**
 * Roster Member Detail API Routes
 *
 * PUT /api/rosters/[id]/members/[memberId] - Update roster member
 * DELETE /api/rosters/[id]/members/[memberId] - Remove member from roster
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    const body = await req.json();

    // Track changes for logging
    const { data: currentMember } = await supabase
      .from('wrestling_roster_members')
      .select('weight_class, status, athlete_profile_id')
      .eq('id', params.memberId)
      .single();

    // Update member
    const { data: member, error } = await supabase
      .from('wrestling_roster_members')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.memberId)
      .eq('roster_id', params.id)
      .select(`
        *,
        wrestling_athlete_profiles (
          id,
          athlete_profiles (
            id,
            first_name,
            last_name,
            profiles (
              email
            )
          )
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update roster member' },
        { status: 500 }
      );
    }

    // Log changes
    if (currentMember) {
      if (body.weight_class && body.weight_class !== currentMember.weight_class) {
        await supabase
          .from('roster_change_log')
          .insert({
            roster_id: params.id,
            athlete_profile_id: currentMember.athlete_profile_id,
            change_type: 'weight_class_changed',
            notes: `Changed from ${currentMember.weight_class} to ${body.weight_class}`,
            changed_by: user.id,
          });
      }

      if (body.status && body.status !== currentMember.status) {
        await supabase
          .from('roster_change_log')
          .insert({
            roster_id: params.id,
            athlete_profile_id: currentMember.athlete_profile_id,
            change_type: 'status_changed',
            reason: body.reason,
            notes: `Changed from ${currentMember.status} to ${body.status}`,
            changed_by: user.id,
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    console.error('Roster Member PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = requireAuth(authHeader);

    // Get member info before deleting for logging
    const { data: member } = await supabase
      .from('wrestling_roster_members')
      .select('athlete_profile_id')
      .eq('id', params.memberId)
      .single();

    const { error } = await supabase
      .from('wrestling_roster_members')
      .delete()
      .eq('id', params.memberId)
      .eq('roster_id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to remove roster member' },
        { status: 500 }
      );
    }

    // Log the removal
    if (member) {
      await supabase
        .from('roster_change_log')
        .insert({
          roster_id: params.id,
          athlete_profile_id: member.athlete_profile_id,
          change_type: 'removed',
          changed_by: user.id,
        });
    }

    return NextResponse.json({
      success: true,
      data: { id: params.memberId },
    });
  } catch (error: any) {
    console.error('Roster Member DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
