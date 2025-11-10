-- Team Track 360 - Add Platform Admin Role Support
-- Date: November 9, 2025
-- Description: Updates admin_roles table to support platform_admin and super_admin roles
-- Migration: 009_add_platform_admin_role

-- ==============================================
-- Update admin_roles table constraints
-- ==============================================

-- Drop the old constraint
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_type_check;
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_check;

-- Add new constraint that allows platform_admin and super_admin
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_role_type_check
  CHECK (role_type IN ('org_admin', 'team_admin', 'platform_admin', 'super_admin'));

-- Drop old check constraint
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_check1;

-- Add new check constraint that handles all role types
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_scope_check CHECK (
  -- org_admin: must have organization_id, no team_id
  (role_type = 'org_admin' AND organization_id IS NOT NULL AND team_id IS NULL) OR
  -- team_admin: must have both organization_id and team_id
  (role_type = 'team_admin' AND organization_id IS NOT NULL AND team_id IS NOT NULL) OR
  -- platform_admin and super_admin: both organization_id and team_id must be NULL
  (role_type IN ('platform_admin', 'super_admin') AND organization_id IS NULL AND team_id IS NULL)
);

-- Add comment
COMMENT ON TABLE admin_roles IS 'Administrative roles for users. Supports org_admin (organization-level), team_admin (team-level), platform_admin and super_admin (system-wide).';
