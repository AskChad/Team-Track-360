-- Migration: Add contact info and divisions fields to competitions table
-- This allows storing extracted contact and division data separately

-- Add contact information fields
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS contact_first_name text,
  ADD COLUMN IF NOT EXISTS contact_last_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Add divisions field
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS divisions text;

-- Add comments for documentation
COMMENT ON COLUMN competitions.contact_first_name IS 'Primary contact first name for the competition';
COMMENT ON COLUMN competitions.contact_last_name IS 'Primary contact last name for the competition';
COMMENT ON COLUMN competitions.contact_email IS 'Primary contact email for the competition';
COMMENT ON COLUMN competitions.contact_phone IS 'Primary contact phone number for the competition';
COMMENT ON COLUMN competitions.divisions IS 'Divisions included in the competition (e.g., Youth, Cadet, Junior)';
