# Team Track 360 - Database Setup Documentation

## Date: November 9, 2025

## Admin Roles Table Creation

The `admin_roles` table was created successfully in the Supabase database (ID: iccmkpmujtmvtfpvoxli).

### Table Schema

```sql
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_type text NOT NULL CHECK (role_type IN ('org_admin', 'team_admin', 'platform_admin', 'super_admin')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CHECK (
    (role_type = 'org_admin' AND organization_id IS NOT NULL AND team_id IS NULL) OR
    (role_type = 'team_admin' AND organization_id IS NOT NULL AND team_id IS NOT NULL) OR
    (role_type IN ('platform_admin', 'super_admin') AND organization_id IS NULL AND team_id IS NULL)
  )
);
```

### Indexes Created

1. `idx_admin_roles_user` - Index on user_id
2. `idx_admin_roles_org` - Index on organization_id
3. `idx_admin_roles_team` - Index on team_id
4. `idx_admin_roles_unique_org` - Unique index on (user_id, organization_id) for org_admin
5. `idx_admin_roles_unique_team` - Unique index on (user_id, team_id) for team_admin

### Platform Admins Created

Two platform administrator accounts were created:

1. **chad@lukens.net** (User ID: e4347a18-ccd1-4ec5-ac81-5243dbb80922)
   - Role: platform_admin
   - Can create organizations, teams, and all resources

2. **chad@askchad.net** (User ID: 34b1a44c-9475-459a-a4c5-ddef4c15b369)
   - Role: platform_admin
   - Can create organizations, teams, and all resources

## Access Control Summary

The application now has complete role-based access control:

### UI Level
- Create buttons only show for users with appropriate permissions
- Platform admins can create all resources
- Org admins can create teams, locations, competitions, events, rosters, athletes
- Team admins can create events, rosters, athletes

### API Level
- All POST endpoints verify user permissions
- Returns 403 Forbidden for unauthorized requests
- Platform admins bypass organization/team-specific restrictions

## Next Steps

1. **Login**: Use either chad@lukens.net or chad@askchad.net to log in
2. **Create Organizations**: The "Create Organization" button should now be visible
3. **Test Access Control**: Verify that different role levels see appropriate create buttons
4. **Create Team Hierarchy**: Organizations → Teams → Athletes/Events/Rosters

## Verification

To verify the setup worked:
1. Log out if currently logged in
2. Log in with chad@lukens.net
3. Navigate to the Organizations page
4. The "+ Create Organization" button should be visible in the header
5. Click it to create your first organization
