-- Migration: Add weight classes table for sport-specific weight class management
-- This table stores weight classes that can vary by sport, organization, state, and time period

CREATE TABLE IF NOT EXISTS weight_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Weight class details
  name VARCHAR(100) NOT NULL, -- e.g., "106 lbs", "Lightweight", "Bantamweight"
  weight DECIMAL(5,2) NOT NULL, -- Numeric weight value (e.g., 106.00)
  age_group VARCHAR(50), -- e.g., "Youth", "High School", "College", "U15", "U18"

  -- Geographic and temporal scope
  state VARCHAR(2), -- US State code (e.g., "CA", "TX") - for state-specific regulations
  city VARCHAR(100), -- City name - for city-specific regulations
  expiration_date DATE, -- When this weight class configuration expires

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT, -- Additional information about this weight class
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_weight_class UNIQUE(sport_id, organization_id, name, age_group, state, expiration_date)
);

-- Add indexes for common queries
CREATE INDEX idx_weight_classes_sport ON weight_classes(sport_id);
CREATE INDEX idx_weight_classes_organization ON weight_classes(organization_id);
CREATE INDEX idx_weight_classes_active ON weight_classes(is_active);
CREATE INDEX idx_weight_classes_expiration ON weight_classes(expiration_date);
CREATE INDEX idx_weight_classes_state ON weight_classes(state);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at_weight_classes
  BEFORE UPDATE ON weight_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE weight_classes ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can see all weight classes
CREATE POLICY "Platform admins can view all weight classes"
  ON weight_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('platform_admin', 'super_admin')
    )
  );

-- Policy: Org admins can see their organization's weight classes
CREATE POLICY "Org admins can view their org weight classes"
  ON weight_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type = 'org_admin'
      AND ar.organization_id = weight_classes.organization_id
    )
  );

-- Policy: Platform admins can create weight classes
CREATE POLICY "Platform admins can create weight classes"
  ON weight_classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('platform_admin', 'super_admin')
    )
  );

-- Policy: Org admins can create weight classes for their org
CREATE POLICY "Org admins can create weight classes for their org"
  ON weight_classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type = 'org_admin'
      AND ar.organization_id = weight_classes.organization_id
    )
  );

-- Policy: Platform admins can update weight classes
CREATE POLICY "Platform admins can update weight classes"
  ON weight_classes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('platform_admin', 'super_admin')
    )
  );

-- Policy: Org admins can update their org's weight classes
CREATE POLICY "Org admins can update their org weight classes"
  ON weight_classes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type = 'org_admin'
      AND ar.organization_id = weight_classes.organization_id
    )
  );

-- Policy: Platform admins can delete weight classes
CREATE POLICY "Platform admins can delete weight classes"
  ON weight_classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type IN ('platform_admin', 'super_admin')
    )
  );

-- Policy: Org admins can delete their org's weight classes
CREATE POLICY "Org admins can delete their org weight classes"
  ON weight_classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role_type = 'org_admin'
      AND ar.organization_id = weight_classes.organization_id
    )
  );

-- Add comment
COMMENT ON TABLE weight_classes IS 'Sport-specific weight classes that can vary by organization, state, age group, and time period';
