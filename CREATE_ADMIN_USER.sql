-- ====================================================================
-- CREATE PLATFORM ADMIN USER - chad@askchad.net
-- ====================================================================
-- Run this in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/sql/new
-- ====================================================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create platform admin user
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generate UUID
  new_user_id := gen_random_uuid();

  -- Insert/Update in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    role,
    aud
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'chad@askchad.net',
    crypt('qjt-gph9cwq2GUN5gve', gen_salt('bf', 12)),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('full_name', 'Chad (Platform Admin)'),
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO UPDATE
  SET
    encrypted_password = crypt('qjt-gph9cwq2GUN5gve', gen_salt('bf', 12)),
    updated_at = NOW()
  RETURNING id INTO new_user_id;

  -- If conflict occurred, get existing user ID
  IF new_user_id IS NULL THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'chad@askchad.net';
  END IF;

  -- Insert/Update profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    platform_role,
    email_verified,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    'chad@askchad.net',
    'Chad (Platform Admin)',
    'platform_admin',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    platform_role = 'platform_admin',
    full_name = 'Chad (Platform Admin)',
    email_verified = true,
    updated_at = NOW();

  RAISE NOTICE '✅ Platform admin created! User ID: %', new_user_id;
END $$;

-- Verify the user was created
SELECT
  p.id,
  p.email,
  p.full_name,
  p.platform_role,
  p.email_verified
FROM profiles p
WHERE p.email = 'chad@askchad.net';
