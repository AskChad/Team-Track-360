-- Update RLS policies for public visibility
-- Competitions and locations visible to all users
-- Events visible to users in same organization

-- ==================================================================
-- DROP OLD POLICIES
-- ==================================================================

-- Drop old location policies
DROP POLICY IF EXISTS "locations_read" ON locations;
DROP POLICY IF EXISTS "locations_admin" ON locations;

-- Drop old competition policies  
DROP POLICY IF EXISTS "competitions_read" ON competitions;
DROP POLICY IF EXISTS "competitions_admin" ON competitions;

-- Drop old event policies
DROP POLICY IF EXISTS "events_read" ON events;
DROP POLICY IF EXISTS "events_admin" ON events;

-- ==================================================================
-- LOCATIONS - All authenticated users can read
-- ==================================================================

-- All authenticated users can view all locations
CREATE POLICY "locations_select_all" ON locations FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete locations
CREATE POLICY "locations_modify_admin" ON locations FOR ALL
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- ==================================================================
-- COMPETITIONS - All authenticated users can read
-- ==================================================================

-- All authenticated users can view all competitions
CREATE POLICY "competitions_select_all" ON competitions FOR SELECT
  TO authenticated
  USING (true);

-- Only platform/org admins can create/update/delete competitions
CREATE POLICY "competitions_insert_admin" ON competitions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), organization_id)
  );

CREATE POLICY "competitions_update_admin" ON competitions FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), organization_id)
  );

CREATE POLICY "competitions_delete_admin" ON competitions FOR DELETE
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), organization_id)
  );

-- ==================================================================
-- EVENTS - Users in same organization can read
-- ==================================================================

-- Users can view events in their organization
CREATE POLICY "events_select_org" ON events FOR SELECT
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND organization_id = ANY(get_user_org_ids(auth.uid()))) OR
    (team_id IS NOT NULL AND team_id = ANY(get_user_team_ids(auth.uid())))
  );

-- Admins can create events
CREATE POLICY "events_insert_admin" ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- Admins can update events
CREATE POLICY "events_update_admin" ON events FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- Admins can delete events
CREATE POLICY "events_delete_admin" ON events FOR DELETE
  TO authenticated
  USING (
    is_platform_admin(auth.uid()) OR
    (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );
