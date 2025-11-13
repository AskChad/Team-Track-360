-- Migration: Fix divisions column type (change from array to text)
-- The divisions column may have been created as array type, causing "malformed array literal" errors
-- This migration drops and recreates it as text

-- Drop the divisions column if it exists
ALTER TABLE competitions
  DROP COLUMN IF EXISTS divisions;

-- Re-add it as text (not array)
ALTER TABLE competitions
  ADD COLUMN divisions text;

-- Add comment for documentation
COMMENT ON COLUMN competitions.divisions IS 'Divisions included in the competition (e.g., Youth, Cadet, Junior) - stored as text';
