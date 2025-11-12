/**
 * Universal Credentials Utility
 *
 * Centralized system for retrieving encrypted organization credentials
 * for any third-party integration (OpenAI, Stripe, Google, etc.)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { decrypt } from '@/lib/encryption';

/**
 * Supported credential types
 * Add new integrations here as needed
 */
export const CredentialType = {
  OPENAI_API_KEY: 'openai_api_key_encrypted',
  STRIPE_SECRET_KEY: 'stripe_secret_key_encrypted',
  STRIPE_PUBLISHABLE_KEY: 'stripe_publishable_key_encrypted',
  GOOGLE_CLIENT_ID: 'google_client_id_encrypted',
  GOOGLE_CLIENT_SECRET: 'google_client_secret_encrypted',
  ZOOM_CLIENT_ID: 'zoom_client_id_encrypted',
  ZOOM_CLIENT_SECRET: 'zoom_client_secret_encrypted',
  TWILIO_ACCOUNT_SID: 'twilio_account_sid_encrypted',
  TWILIO_AUTH_TOKEN: 'twilio_auth_token_encrypted',
  SENDGRID_API_KEY: 'sendgrid_api_key_encrypted',
  SLACK_WEBHOOK_URL: 'slack_webhook_url_encrypted',
  GHL_CLIENT_ID: 'ghl_client_id_encrypted',
  GHL_CLIENT_SECRET: 'ghl_client_secret_encrypted',
  GHL_API_KEY: 'ghl_api_key_encrypted',
  // Add more as needed...
} as const;

export type CredentialTypeKey = keyof typeof CredentialType;
export type CredentialTypeValue = typeof CredentialType[CredentialTypeKey];

/**
 * Get and decrypt an organization's credential
 *
 * @param organizationId - The organization ID
 * @param credentialType - The type of credential to retrieve (use CredentialType constants)
 * @returns The decrypted credential, or null if not found
 * @throws Error if database query fails or decryption fails
 *
 * @example
 * // Get OpenAI key
 * const apiKey = await getOrganizationCredential(orgId, CredentialType.OPENAI_API_KEY);
 *
 * @example
 * // Get Stripe keys
 * const stripeSecret = await getOrganizationCredential(orgId, CredentialType.STRIPE_SECRET_KEY);
 */
export async function getOrganizationCredential(
  organizationId: string,
  credentialType: CredentialTypeValue
): Promise<string | null> {
  const { data: org, error } = await supabaseAdmin
    .from('parent_organizations')
    .select(credentialType)
    .eq('id', organizationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organization credentials: ${error.message}`);
  }

  const encryptedValue = org?.[credentialType];

  if (!encryptedValue) {
    return null;
  }

  try {
    return decrypt(encryptedValue);
  } catch (err) {
    throw new Error(`Failed to decrypt credential: ${credentialType}`);
  }
}

/**
 * Get multiple credentials at once
 *
 * @param organizationId - The organization ID
 * @param credentialTypes - Array of credential types to retrieve
 * @returns Object with credential type as key and decrypted value (or null) as value
 *
 * @example
 * const { openai, stripe } = await getOrganizationCredentials(orgId, [
 *   CredentialType.OPENAI_API_KEY,
 *   CredentialType.STRIPE_SECRET_KEY
 * ]);
 */
export async function getOrganizationCredentials(
  organizationId: string,
  credentialTypes: CredentialTypeValue[]
): Promise<Record<string, string | null>> {
  const { data: org, error } = await supabaseAdmin
    .from('parent_organizations')
    .select(credentialTypes.join(','))
    .eq('id', organizationId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch organization credentials: ${error.message}`);
  }

  const result: Record<string, string | null> = {};

  for (const credType of credentialTypes) {
    const encryptedValue = org?.[credType];
    if (encryptedValue) {
      try {
        result[credType] = decrypt(encryptedValue);
      } catch (err) {
        result[credType] = null;
      }
    } else {
      result[credType] = null;
    }
  }

  return result;
}

/**
 * Check if an organization has a credential configured
 *
 * @param organizationId - The organization ID
 * @param credentialType - The type of credential to check
 * @returns true if credential exists, false otherwise
 *
 * @example
 * if (await hasOrganizationCredential(orgId, CredentialType.OPENAI_API_KEY)) {
 *   // Organization has OpenAI configured
 * }
 */
export async function hasOrganizationCredential(
  organizationId: string,
  credentialType: CredentialTypeValue
): Promise<boolean> {
  const { data: org } = await supabaseAdmin
    .from('parent_organizations')
    .select(credentialType)
    .eq('id', organizationId)
    .single();

  return !!org?.[credentialType];
}

/**
 * Check which credentials an organization has configured
 *
 * @param organizationId - The organization ID
 * @param credentialTypes - Array of credential types to check
 * @returns Object with credential type as key and boolean as value
 *
 * @example
 * const configured = await checkOrganizationCredentials(orgId, [
 *   CredentialType.OPENAI_API_KEY,
 *   CredentialType.STRIPE_SECRET_KEY,
 *   CredentialType.GOOGLE_CLIENT_ID
 * ]);
 * // Returns: { openai_api_key_encrypted: true, stripe_secret_key_encrypted: false, ... }
 */
export async function checkOrganizationCredentials(
  organizationId: string,
  credentialTypes: CredentialTypeValue[]
): Promise<Record<string, boolean>> {
  const { data: org } = await supabaseAdmin
    .from('parent_organizations')
    .select(credentialTypes.join(','))
    .eq('id', organizationId)
    .single();

  const result: Record<string, boolean> = {};

  for (const credType of credentialTypes) {
    result[credType] = !!org?.[credType];
  }

  return result;
}
