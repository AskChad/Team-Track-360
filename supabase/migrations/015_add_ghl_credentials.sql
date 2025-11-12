-- Migration: Add GoHighLevel (GHL) Private Integration Credentials
-- This adds support for storing encrypted GHL credentials per organization

-- Add GoHighLevel credential columns to parent_organizations table
ALTER TABLE parent_organizations
  ADD COLUMN IF NOT EXISTS ghl_client_id_encrypted text,
  ADD COLUMN IF NOT EXISTS ghl_client_id_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ghl_client_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS ghl_client_secret_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ghl_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS ghl_api_key_updated_at timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN parent_organizations.ghl_client_id_encrypted IS 'Encrypted GoHighLevel OAuth Client ID for private integration';
COMMENT ON COLUMN parent_organizations.ghl_client_secret_encrypted IS 'Encrypted GoHighLevel OAuth Client Secret for private integration';
COMMENT ON COLUMN parent_organizations.ghl_api_key_encrypted IS 'Encrypted GoHighLevel API Key for REST API access';

-- Create indexes for faster lookups (sparse indexes only for non-null values)
CREATE INDEX IF NOT EXISTS idx_parent_organizations_ghl_client_id
  ON parent_organizations(id)
  WHERE ghl_client_id_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parent_organizations_ghl_api_key
  ON parent_organizations(id)
  WHERE ghl_api_key_encrypted IS NOT NULL;
