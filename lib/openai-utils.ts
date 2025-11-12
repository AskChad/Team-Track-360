/**
 * OpenAI Utilities
 *
 * Convenience wrappers for OpenAI-specific credential access
 * Uses the universal credentials system under the hood
 */

import { getOrganizationCredential, hasOrganizationCredential, CredentialType } from '@/lib/credentials';

/**
 * Get and decrypt an organization's OpenAI API key
 *
 * @param organizationId - The organization ID
 * @returns The decrypted OpenAI API key, or null if not found
 * @throws Error if database query fails
 */
export async function getOrganizationOpenAIKey(organizationId: string): Promise<string | null> {
  return getOrganizationCredential(organizationId, CredentialType.OPENAI_API_KEY);
}

/**
 * Check if an organization has an OpenAI API key configured
 *
 * @param organizationId - The organization ID
 * @returns true if key exists, false otherwise
 */
export async function organizationHasOpenAIKey(organizationId: string): Promise<boolean> {
  return hasOrganizationCredential(organizationId, CredentialType.OPENAI_API_KEY);
}
