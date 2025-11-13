-- Migration: Create member_roles table for flexible role management
-- Supports both generic roles (all sports) and sport-specific roles

-- Create member_roles table
CREATE TABLE IF NOT EXISTS member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Role details
  name text NOT NULL,
  slug text NOT NULL,
  description text,

  -- Sport association (NULL = generic role for all sports)
  sport_id uuid REFERENCES sports(id) ON DELETE CASCADE,

  -- Role category
  category text NOT NULL CHECK (category IN ('athlete', 'coach', 'staff', 'family', 'supporter', 'other')),

  -- Permissions/Features
  can_compete boolean NOT NULL DEFAULT false, -- Can be added to event rosters
  can_receive_updates boolean NOT NULL DEFAULT true, -- Gets team notifications

  -- Display
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: role name must be unique per sport (or globally if NULL)
  UNIQUE NULLS NOT DISTINCT (slug, sport_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_roles_sport ON member_roles(sport_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_category ON member_roles(category);
CREATE INDEX IF NOT EXISTS idx_member_roles_active ON member_roles(is_active);

-- Add comments
COMMENT ON TABLE member_roles IS 'Defines available roles for team members. sport_id NULL = generic role for all sports';
COMMENT ON COLUMN member_roles.sport_id IS 'NULL means role is available for all sports. Non-null means sport-specific role.';
COMMENT ON COLUMN member_roles.can_compete IS 'Whether members with this role can be added to event rosters/lineups';
COMMENT ON COLUMN member_roles.can_receive_updates IS 'Whether members with this role receive team notifications and updates';

-- Seed generic roles (available for all sports)
INSERT INTO member_roles (name, slug, description, sport_id, category, can_compete, display_order) VALUES
  -- Athletes
  ('Athlete', 'athlete', 'Team athlete/player who competes in events', NULL, 'athlete', true, 1),
  ('Junior Varsity Athlete', 'jv-athlete', 'Junior Varsity team athlete', NULL, 'athlete', true, 2),
  ('Varsity Athlete', 'varsity-athlete', 'Varsity team athlete', NULL, 'athlete', true, 3),

  -- Coaches
  ('Head Coach', 'head-coach', 'Primary team coach', NULL, 'coach', false, 10),
  ('Assistant Coach', 'assistant-coach', 'Assistant/Associate coach', NULL, 'coach', false, 11),
  ('Volunteer Coach', 'volunteer-coach', 'Volunteer assistant coach', NULL, 'coach', false, 12),

  -- Staff
  ('Team Manager', 'team-manager', 'Team manager handling logistics', NULL, 'staff', false, 20),
  ('Athletic Trainer', 'athletic-trainer', 'Athletic trainer/medical staff', NULL, 'staff', false, 21),
  ('Equipment Manager', 'equipment-manager', 'Manages team equipment', NULL, 'staff', false, 22),
  ('Team Photographer', 'team-photographer', 'Official team photographer', NULL, 'staff', false, 23),

  -- Family
  ('Parent/Guardian', 'parent', 'Parent or legal guardian of athlete', NULL, 'family', false, 30),
  ('Family Member', 'family-member', 'Other family member (sibling, grandparent, etc)', NULL, 'family', false, 31),

  -- Supporters
  ('Team Supporter', 'supporter', 'Team supporter/fan', NULL, 'supporter', false, 40),
  ('Booster Club Member', 'booster', 'Member of team booster/fundraising club', NULL, 'supporter', false, 41),
  ('Alumni', 'alumni', 'Former team member/alumnus', NULL, 'supporter', false, 42)
ON CONFLICT (slug, sport_id) DO NOTHING;

-- Add role_id column to team_members (keeping old role column temporarily for migration)
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES member_roles(id) ON DELETE RESTRICT;

-- Create index on role_id
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role_id);

-- Migrate existing data from text role to role_id
-- Map old hardcoded roles to new role slugs
UPDATE team_members
SET role_id = (
  SELECT id FROM member_roles
  WHERE slug = CASE team_members.role
    WHEN 'athlete' THEN 'athlete'
    WHEN 'coach' THEN 'head-coach'
    WHEN 'assistant_coach' THEN 'assistant-coach'
    WHEN 'parent' THEN 'parent'
    WHEN 'staff' THEN 'team-manager'
    WHEN 'volunteer' THEN 'volunteer-coach'
    ELSE 'team-supporter'
  END
  AND sport_id IS NULL
  LIMIT 1
)
WHERE role_id IS NULL;

-- Now we can drop the old role column and make role_id required
-- But let's keep it for now to ensure data integrity during migration
-- ALTER TABLE team_members DROP COLUMN role;
-- ALTER TABLE team_members ALTER COLUMN role_id SET NOT NULL;

-- For now, we'll add a comment noting this should be cleaned up later
COMMENT ON COLUMN team_members.role IS 'DEPRECATED: Use role_id instead. Will be removed in future migration.';
