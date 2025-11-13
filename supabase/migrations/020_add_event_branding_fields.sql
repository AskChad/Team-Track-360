-- Migration: Add branding fields to events (logo, banner, colors)
-- Match the teams table structure for consistency

-- Add logo URL
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Add header/banner image URL
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS header_image_url text;

-- Add primary color for gradient
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS primary_color varchar(7);

-- Add secondary color for gradient
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS secondary_color varchar(7);

-- Add comments for documentation
COMMENT ON COLUMN events.logo_url IS 'URL to event logo image';
COMMENT ON COLUMN events.header_image_url IS 'URL to event header/banner image';
COMMENT ON COLUMN events.primary_color IS 'Primary color for event header gradient (hex format: #RRGGBB)';
COMMENT ON COLUMN events.secondary_color IS 'Secondary color for event header gradient (hex format: #RRGGBB)';
