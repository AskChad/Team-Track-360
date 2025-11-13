-- Migration: Remove duplicate events
-- Removes duplicate events by name, keeping only the oldest one
-- This fixes issues from AI import running multiple times

WITH ranked_events AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY created_at ASC
    ) as rn
  FROM events
)
DELETE FROM events
WHERE id IN (
  SELECT id FROM ranked_events WHERE rn > 1
);

COMMENT ON TABLE events IS 'Events for teams (competitions, practices, meetings). Duplicate events have been cleaned up.';
