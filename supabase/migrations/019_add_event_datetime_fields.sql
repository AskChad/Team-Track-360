-- Migration: Add proper datetime fields for events
-- Add arrival_time, start_datetime, and end_datetime for better event scheduling

-- Add arrival_time (when participants should arrive before the event starts)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS arrival_time timestamptz;

-- Add start_datetime (full date and time when event starts)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS start_datetime timestamptz;

-- Add end_datetime (full date and time when event ends - for multi-day events)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_datetime timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN events.arrival_time IS 'When participants should arrive (before event starts)';
COMMENT ON COLUMN events.start_datetime IS 'Full start date and time of the event';
COMMENT ON COLUMN events.end_datetime IS 'Full end date and time of the event (for multi-day events)';

-- Update existing events to populate start_datetime from event_date + start_time
-- Only update if start_datetime is null
UPDATE events
SET start_datetime = (event_date + COALESCE(start_time, '00:00:00'::time))::timestamptz
WHERE start_datetime IS NULL AND event_date IS NOT NULL;

-- Create index for querying by start_datetime
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_end_datetime ON events(end_datetime);
