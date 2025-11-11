-- Migration: Make weight classes sport-specific only (not organization-specific)
-- Weight classes are standardized by sport, state, age group, and time period
-- They are shared across all organizations

-- Drop existing constraint
ALTER TABLE weight_classes
  DROP CONSTRAINT IF EXISTS unique_weight_class;

-- Make organization_id optional
ALTER TABLE weight_classes
  ALTER COLUMN organization_id DROP NOT NULL;

-- Add new unique constraint without organization_id
ALTER TABLE weight_classes
  ADD CONSTRAINT unique_weight_class_by_sport
  UNIQUE(sport_id, name, age_group, state, expiration_date);

-- Drop organization-based index
DROP INDEX IF EXISTS idx_weight_classes_organization;

-- Update RLS policies - remove org-specific policies, keep platform admin access
DROP POLICY IF EXISTS "Org admins can view their org weight classes" ON weight_classes;
DROP POLICY IF EXISTS "Org admins can create weight classes for their org" ON weight_classes;
DROP POLICY IF EXISTS "Org admins can update their org weight classes" ON weight_classes;
DROP POLICY IF EXISTS "Org admins can delete their org weight classes" ON weight_classes;

-- Add new policies for org admins (can access all weight classes)
CREATE POLICY "Org admins can view all weight classes"
  ON weight_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('org_admin', 'platform_admin', 'super_admin')
    )
  );

CREATE POLICY "Org admins can create weight classes"
  ON weight_classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('org_admin', 'platform_admin', 'super_admin')
    )
  );

CREATE POLICY "Org admins can update weight classes"
  ON weight_classes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('org_admin', 'platform_admin', 'super_admin')
    )
  );

CREATE POLICY "Org admins can delete weight classes"
  ON weight_classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('org_admin', 'platform_admin', 'super_admin')
    )
  );

COMMENT ON TABLE weight_classes IS 'Sport-specific weight classes shared across all organizations. Can vary by state, age group, and time period.';
