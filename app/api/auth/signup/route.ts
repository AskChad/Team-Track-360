/**
 * Signup API Route
 *
 * POST /api/auth/signup
 * Body: { email: string, password: string, full_name: string }
 *
 * Based on: Attack Kit Section 6 - Authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateToken, validatePasswordStrength } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json();

    // Validate input
    if (!email || !password || !full_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, password, and full name are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: passwordValidation.error,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists',
        },
        { status: 409 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email (change in production)
    });

    if (authError || !authData.user) {
      console.error('Supabase Auth error:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create account. Please try again.',
        },
        { status: 500 }
      );
    }

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        full_name: full_name.trim(),
        platform_role: 'user',
        is_active: true,
      })
      .select()
      .single();

    if (profileError || !profile) {
      console.error('Profile creation error:', profileError);
      // Rollback: Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create profile. Please try again.',
        },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: profile.id,
      email: profile.email,
      role: profile.platform_role,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user: {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            platform_role: profile.platform_role,
            timezone: profile.timezone,
          },
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
