/**
 * Test API Route
 *
 * Verify that the API is working and environment variables are properly configured.
 *
 * GET /api/test
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const checks = {
    api: true,
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    database_url: !!process.env.DATABASE_URL,
    jwt_secret: !!process.env.JWT_SECRET,
    jwt_secret_length: process.env.JWT_SECRET?.length || 0,
    encryption_key: !!process.env.ENCRYPTION_KEY,
    encryption_key_length: process.env.ENCRYPTION_KEY?.length || 0,
    node_env: process.env.NODE_ENV,
  };

  const allGood =
    checks.supabase_url &&
    checks.supabase_anon_key &&
    checks.supabase_service_role &&
    checks.database_url &&
    checks.jwt_secret &&
    checks.jwt_secret_length >= 64 &&
    checks.encryption_key &&
    checks.encryption_key_length >= 64;

  return NextResponse.json({
    success: allGood,
    message: allGood
      ? 'All environment variables configured correctly'
      : 'Some environment variables are missing or invalid',
    checks,
    warnings: [
      !checks.jwt_secret && 'JWT_SECRET is not set',
      checks.jwt_secret && checks.jwt_secret_length < 64 && 'JWT_SECRET is too short (minimum 64 characters)',
      !checks.encryption_key && 'ENCRYPTION_KEY is not set',
      checks.encryption_key && checks.encryption_key_length < 64 && 'ENCRYPTION_KEY is too short (minimum 64 characters)',
      !checks.supabase_url && 'NEXT_PUBLIC_SUPABASE_URL is not set',
      !checks.supabase_anon_key && 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
      !checks.supabase_service_role && 'SUPABASE_SERVICE_ROLE_KEY is not set',
      !checks.database_url && 'DATABASE_URL is not set',
    ].filter(Boolean),
    timestamp: new Date().toISOString(),
  });
}
