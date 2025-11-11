-- Add header_image_url column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS header_image_url TEXT;

-- Create team-assets storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-assets', 'team-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to team-assets bucket
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-assets');

-- Allow authenticated users to upload to team-assets bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload team assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-assets');

-- Allow authenticated users to update their team assets
CREATE POLICY IF NOT EXISTS "Authenticated users can update team assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-assets');

-- Allow authenticated users to delete their team assets
CREATE POLICY IF NOT EXISTS "Authenticated users can delete team assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'team-assets');
