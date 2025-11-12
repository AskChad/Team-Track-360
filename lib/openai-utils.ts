/**
 * OpenAI Utilities
 *
 * Centralized utilities for working with organization OpenAI API keys
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { decrypt } from '@/lib/encryption';

/**
 * Get and decrypt an organization's OpenAI API key
 *
 * @param organizationId - The organization ID
 * @returns The decrypted OpenAI API key, or null if not found
 * @throws Error if database query fails
 */
export async function getOrganizationOpenAIKey(organizationId: string): Promise<string | null> {
  const { data: org, error } = await supabaseAdmin
    .from('parent_organizations')
    .select('openai_api_key_encrypted')
    .eq('id', organizationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organization: ${error.message}`);
  }

  if (!org?.openai_api_key_encrypted) {
    return null;
  }

  try {
    return decrypt(org.openai_api_key_encrypted);
  } catch (err) {
    throw new Error('Failed to decrypt OpenAI API key');
  }
}

/**
 * Check if an organization has an OpenAI API key configured
 *
 * @param organizationId - The organization ID
 * @returns true if key exists, false otherwise
 */
export async function organizationHasOpenAIKey(organizationId: string): Promise<boolean> {
  const { data: org } = await supabaseAdmin
    .from('parent_organizations')
    .select('openai_api_key_encrypted')
    .eq('id', organizationId)
    .single();

  return !!org?.openai_api_key_encrypted;
}
