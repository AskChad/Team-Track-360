-- Team Track 360 - Team Members RLS and Fix Helper Functions
-- Date: November 9, 2025
-- Description: Adds RLS policies for team_members table and fixes helper functions to remove non-existent is_active field
-- Migration: 008_team_members_rls_and_fix_helpers

-- ==============================================
-- Fix Helper Functions (remove is_active field)
-- ==============================================

-- Fix: Function to check if user is platform admin (remove is_active check)
CREATE OR REPLACE FUNCTION is_platform_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
    AND role_type IN ('platform_admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Function to check if user is org admin (remove is_active check)
CREATE OR REPLACE FUNCTION is_org_admin(user_id uuid, org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
    AND organization_id = $2
    AND role_type IN ('org_admin', 'platform_admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Function to check if user is team admin (remove is_active check)
CREATE OR REPLACE FUNCTION is_team_admin(user_id uuid, team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = $1
    AND admin_roles.team_id = $2
    AND role_type IN ('team_admin', 'org_admin', 'platform_admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Function to get user's org IDs (remove is_active check)
CREATE OR REPLACE FUNCTION get_user_org_ids(user_id uuid)
RETURNS TABLE(org_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT organization_id FROM admin_roles
  WHERE admin_roles.user_id = $1
  UNION
  SELECT DISTINCT t.organization_id FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = $1 AND tm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Function to get user's team IDs (remove is_active check)
CREATE OR REPLACE FUNCTION get_user_team_ids(user_id uuid)
RETURNS TABLE(team_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT admin_roles.team_id FROM admin_roles
  WHERE admin_roles.user_id = $1 AND admin_roles.team_id IS NOT NULL
  UNION
  SELECT DISTINCT team_members.team_id FROM team_members
  WHERE team_members.user_id = $1 AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add: Function to check if user is member of team (now that table exists)
CREATE OR REPLACE FUNCTION is_team_member(user_id uuid, team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.user_id = $1
    AND team_members.team_id = $2
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- Team Members RLS Policies
-- ==============================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Users can view team members if they are:
-- 1. A member of that team themselves
-- 2. An admin of that team
-- 3. An org admin of the team's organization
-- 4. A platform admin
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_team_member(auth.uid(), team_id) OR
    is_team_admin(auth.uid(), team_id) OR
    is_platform_admin(auth.uid())
  );

-- Team admins, org admins, and platform admins can insert team members
CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT
  WITH CHECK (
    is_team_admin(auth.uid(), team_id) OR
    is_platform_admin(auth.uid())
  );

-- Team admins, org admins, and platform admins can update team members
CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE
  USING (
    is_team_admin(auth.uid(), team_id) OR
    is_platform_admin(auth.uid())
  );

-- Team admins, org admins, and platform admins can delete team members
CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE
  USING (
    is_team_admin(auth.uid(), team_id) OR
    is_platform_admin(auth.uid())
  );
