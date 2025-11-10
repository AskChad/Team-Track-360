-- Team Track 360 - Add Team Members Table
-- Date: November 9, 2025
-- Description: Creates the team_members table for many-to-many relationship between users and teams
-- Migration: 006_add_team_members_table

-- ==============================================
-- Team Members Table
-- ==============================================
-- This table allows users (athletes, coaches, parents, staff) to be members of multiple teams
-- Separate from admin_roles (who can manage teams) and roster_members (competition rosters)

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Member role within the team (not administrative permissions)
  role text NOT NULL CHECK (role IN ('athlete', 'coach', 'assistant_coach', 'parent', 'staff', 'volunteer')),

  -- Membership status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),

  -- Additional metadata
  jersey_number text,  -- For athletes
  notes text,

  -- Timestamps
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE (user_id, team_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Add comment for documentation
COMMENT ON TABLE team_members IS 'Many-to-many relationship between users and teams. Tracks general team membership separate from admin roles and competition rosters.';
