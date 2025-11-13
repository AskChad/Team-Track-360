-- Migration: Add sport_id to event_types to make event types sport-specific
-- This allows different sports to have their own event types (e.g., wrestling has "Dual Meet", football has "Game")

-- Add sport_id column to event_types
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS sport_id uuid REFERENCES sports(id) ON DELETE CASCADE;

-- Add index for sport_id lookups
CREATE INDEX IF NOT EXISTS idx_event_types_sport ON event_types(sport_id);

-- Add comment for documentation
COMMENT ON COLUMN event_types.sport_id IS 'Sport this event type belongs to (e.g., wrestling, football). NULL means event type applies to all sports.';

-- Update existing event types to be generic (NULL sport_id means available for all sports)
-- Or you can set specific sports for existing types if you know them
