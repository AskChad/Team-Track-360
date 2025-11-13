-- Migration: Add organization_id to locations table
-- This allows locations to be scoped to specific organizations

-- Add organization_id column
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_locations_organization_id
  ON locations(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN locations.organization_id IS 'Links location to a specific organization. Null means location is shared/public.';
