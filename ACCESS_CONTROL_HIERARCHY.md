# Team Track 360 - Access Control Hierarchy

## Role Hierarchy

### 1. Platform Admin / Super Admin
**Can Create:**
- ✅ Organizations
- ✅ Teams (any organization)
- ✅ Locations (any organization)
- ✅ Competitions (any organization)
- ✅ Events (any team)
- ✅ Rosters (any team)
- ✅ Athletes (any team)

### 2. Organization Admin (org_admin)
**Can Create (within their organization):**
- ❌ Organizations (cannot create)
- ✅ Teams
- ✅ Locations
- ✅ Competitions
- ✅ Events
- ✅ Rosters
- ✅ Athletes

### 3. Team Admin (team_admin)
**Can Create (within their team):**
- ❌ Organizations (cannot create)
- ❌ Teams (cannot create)
- ❌ Locations (cannot create - org-level resource)
- ❌ Competitions (cannot create - org-level)
- ✅ Events (for their team)
- ✅ Rosters (for their team)
- ✅ Athletes (for their team)

### 4. Regular Team Members
**Can Create:**
- ❌ Nothing - View only

## Implementation Strategy

### UI-Level Checks (Hide/Show Create Buttons):

1. **Organizations Page**
   ```
   Show Create if: user.platform_role === 'platform_admin'
   ```

2. **Teams Page**
   ```
   Show Create if:
   - Platform admin OR
   - User has organizations (implies org_admin)
   ```

3. **Locations & Competitions Pages**
   ```
   Show Create if:
   - Platform admin OR
   - User has organizations (implies org_admin)
   ```

4. **Events, Rosters, Athletes Pages**
   ```
   Show Create if:
   - Platform admin OR
   - User has any teams (implies team_admin or higher)
   ```

### API-Level Enforcement:
**All create endpoints already enforce proper restrictions** - API calls will return 403 Forbidden if user lacks permission.

## Current Status:
- ✅ Organizations - Already restricted to platform admin
- 🔄 Teams - Needs role check added
- 🔄 Locations - Needs role check added
- 🔄 Competitions - Needs role check added
- 🔄 Events - Needs role check added
- 🔄 Rosters - Needs role check added
- 🔄 Athletes - Needs role check added
