-- ====================================================================
-- CREATE PLATFORM ADMIN USER
-- ====================================================================
-- Run this in Supabase Dashboard SQL Editor
-- URL: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/sql/new
--
-- Email: chad@askchad.net
-- Password: qjt-gph9cwq2GUN5gve
-- Role: platform_admin
-- ====================================================================

-- Step 1: Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Create or update platform admin user
INSERT INTO users (
  email,
  password_hash,
  full_name,
  role,
  email_verified,
  created_at,
  updated_at
)
VALUES (
  'chad@askchad.net',
  crypt('qjt-gph9cwq2GUN5gve', gen_salt('bf', 12)),
  'Chad (Platform Admin)',
  'platform_admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email)
DO UPDATE SET
  password_hash = crypt('qjt-gph9cwq2GUN5gve', gen_salt('bf', 12)),
  role = 'platform_admin',
  full_name = 'Chad (Platform Admin)',
  email_verified = true,
  updated_at = NOW()
RETURNING id, email, role, full_name, created_at;

-- ====================================================================
-- Expected Result:
-- Should return one row with:
--   - id: UUID of the created user
--   - email: chad@askchad.net
--   - role: platform_admin
--   - full_name: Chad (Platform Admin)
--   - created_at: Timestamp
-- ====================================================================
