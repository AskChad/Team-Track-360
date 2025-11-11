-- Migration: Add OpenAI API key storage to organizations table
-- Allows organizations to configure their own OpenAI key for AI-powered imports

-- Add encrypted OpenAI API key field
ALTER TABLE organizations
  ADD COLUMN openai_api_key_encrypted TEXT;

-- Add column for when the key was last updated
ALTER TABLE organizations
  ADD COLUMN openai_api_key_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN organizations.openai_api_key_encrypted IS 'Encrypted OpenAI API key for AI-powered data imports. Should be encrypted at application level before storage.';
