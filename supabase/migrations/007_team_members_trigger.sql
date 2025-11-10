-- Team Track 360 - Add Team Members Trigger
-- Date: November 9, 2025
-- Description: Adds updated_at trigger for team_members table
-- Migration: 007_team_members_trigger

-- ==============================================
-- Updated At Trigger for team_members
-- ==============================================

CREATE TRIGGER set_updated_at_team_members
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
