/**
 * Supabase Client - Regular Client for Authenticated Users
 *
 * This client respects Row Level Security (RLS) policies.
 * Use this for all user-facing operations.
 *
 * Based on Attack Kit Section 7: Database Standards
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local');
}

/**
 * Regular Supabase client for authenticated operations
 * - Respects RLS policies
 * - Uses auth context (auth.uid() available in policies)
 * - Safe for client-side use
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated() {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Helper to get current user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Helper to get current user's profile
 */
export async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}
