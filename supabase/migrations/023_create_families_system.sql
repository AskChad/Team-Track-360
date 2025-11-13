-- Migration: Create families system for managing related users
-- Family admins can manage accounts and access athlete data for family members

-- ==============================================
-- Families Table
-- ==============================================
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Family details
  name text NOT NULL, -- e.g., "Smith Family"

  -- Contact/Address (shared family info)
  address text,
  city text,
  state text,
  zip text,
  phone_number text,

  -- Created by (original family admin)
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);

COMMENT ON TABLE families IS 'Groups related users (parents, athletes, siblings) into family units';
COMMENT ON COLUMN families.name IS 'Family name for display (e.g., "Smith Family")';

-- ==============================================
-- Family Members Junction Table
-- ==============================================
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role within family
  relationship text, -- e.g., "parent", "athlete", "sibling", "guardian"

  -- Admin flag
  is_admin boolean NOT NULL DEFAULT false,

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),

  -- Invitations
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- User can only be in family once
  UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_admin ON family_members(is_admin) WHERE is_admin = true;

COMMENT ON TABLE family_members IS 'Associates users with families. is_admin=true gives full access to manage family members';
COMMENT ON COLUMN family_members.is_admin IS 'Family admins can manage accounts, passwords, and access athlete data for all family members';
COMMENT ON COLUMN family_members.relationship IS 'Relationship to family (parent, athlete, sibling, guardian, etc)';

-- ==============================================
-- Add "Family Admin" role to member_roles
-- ==============================================
INSERT INTO member_roles (name, slug, description, sport_id, category, can_compete, can_receive_updates, display_order)
VALUES
  ('Family Admin', 'family-admin', 'Family administrator who can manage accounts for family members', NULL, 'family', false, true, 32)
ON CONFLICT (slug, sport_id) DO NOTHING;

-- ==============================================
-- Helper Functions
-- ==============================================

-- Function to check if a user is a family admin for another user
CREATE OR REPLACE FUNCTION is_family_admin(admin_user_id uuid, target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM family_members fm1
    INNER JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = admin_user_id
      AND fm1.is_admin = true
      AND fm1.status = 'active'
      AND fm2.user_id = target_user_id
      AND fm2.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_family_admin IS 'Check if admin_user_id is a family admin for target_user_id';

-- Function to get all users that a family admin can manage
CREATE OR REPLACE FUNCTION get_manageable_users(admin_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  family_id uuid,
  relationship text,
  full_name text,
  email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fm.user_id,
    fm.family_id,
    fm.relationship,
    p.full_name,
    p.email
  FROM family_members fm
  INNER JOIN family_members admin_fm ON fm.family_id = admin_fm.family_id
  INNER JOIN profiles p ON fm.user_id = p.id
  WHERE admin_fm.user_id = admin_user_id
    AND admin_fm.is_admin = true
    AND admin_fm.status = 'active'
    AND fm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_manageable_users IS 'Returns all users that the specified family admin can manage';
