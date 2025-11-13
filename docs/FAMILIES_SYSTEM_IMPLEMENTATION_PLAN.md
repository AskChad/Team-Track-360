# Families System Implementation Plan

## Overview
Implement UI and API for the families system that allows family admins to manage accounts, passwords, and access athlete data for all family members.

## Database Schema (Already Created)
- `families` - Family groups with contact info
- `family_members` - Junction table with `is_admin` flag
- `member_roles` - Includes "Family Admin" role
- Helper functions: `is_family_admin()`, `get_manageable_users()`

---

## 1. API Endpoints to Create

### `/app/api/families/route.ts`
**GET** - List families for current user
- Returns families where user is a member
- Include member count and admin status

**POST** - Create new family
- Creates family record
- Adds creator as first family member with `is_admin = true`
- Assigns "Family Admin" role to creator in team_members if needed

### `/app/api/families/[id]/route.ts`
**GET** - Get family details
- Returns family info
- Lists all family members with profiles
- Shows admin status for each member

**PUT** - Update family details
- Only family admins can update
- Updates name, address, city, state, zip, phone_number

**DELETE** - Delete family
- Only family admins can delete
- Cascades to family_members

### `/app/api/families/[id]/members/route.ts`
**GET** - List family members
- Returns all members with profile data
- Shows relationship and admin status

**POST** - Add family member
- Only family admins can add
- Creates family_members record
- Optional: Send invitation email
- Sets status to 'pending' if invited, 'active' if added directly

### `/app/api/families/[id]/members/[userId]/route.ts`
**PUT** - Update family member
- Update relationship, is_admin, status
- Only family admins can promote/demote admins
- Track who made the change

**DELETE** - Remove family member
- Only family admins can remove
- Cannot remove last admin (validation)

### `/app/api/families/[id]/members/[userId]/account/route.ts`
**PUT** - Update member account (family admin feature)
- Family admins can update email, password, profile info
- Uses `is_family_admin()` function for authorization
- Logs account changes for security

---

## 2. Pages to Create

### `/app/families/page.tsx`
**Family Dashboard**
- List of families user belongs to
- Show role in each family (Admin, Member)
- "Create Family" button
- Click family to view details

### `/app/families/[id]/page.tsx`
**Family Details Page**
- Family info header with edit button (admins only)
- Contact information display
- List of family members with:
  - Profile photo
  - Name
  - Email
  - Relationship
  - Admin badge if applicable
  - Actions menu (admins only):
    - Edit member
    - Manage account
    - Remove from family
- "Add Family Member" button (admins only)
- "Leave Family" button (non-admins)

### `/app/families/[id]/members/[userId]/manage/page.tsx`
**Manage Member Account (Family Admin Feature)**
- Only accessible by family admins
- Form to update member's:
  - Email
  - Password (with confirmation)
  - Full name
  - Phone number
  - Profile photo
- "Save Changes" button
- Security note: "Changes will be logged for security"
- Breadcrumb navigation

### `/app/dashboard/page.tsx` (Enhancement)
**Add Family Widget**
- Show user's families
- Quick access to family management
- Show if user is family admin

---

## 3. Components to Create

### `/components/FamilyCard.tsx`
- Display family summary
- Show member count
- Admin badge if user is admin
- Click to navigate to family details

### `/components/FamilyMemberCard.tsx`
- Display member profile
- Show relationship and role
- Actions dropdown for admins
- Status indicator (active, pending, inactive)

### `/components/CreateFamilyModal.tsx`
- Form to create new family
- Fields: name, address, city, state, zip, phone
- Auto-adds creator as admin

### `/components/AddFamilyMemberModal.tsx`
- Search/select user from system
- Or enter email to invite
- Set relationship (parent, athlete, sibling, guardian, other)
- Option to make admin

### `/components/EditFamilyModal.tsx`
- Edit family contact info
- Only for family admins

### `/components/ManageAccountForm.tsx`
- Form for family admins to manage member accounts
- Email, password, profile fields
- Security warnings
- Change logging

---

## 4. Key User Flows

### Flow 1: Create Family
1. User clicks "Create Family" from families page
2. Modal opens with family info form
3. User fills name and contact info
4. Submit creates family and adds user as admin
5. Redirect to family details page

### Flow 2: Add Family Member
1. Family admin clicks "Add Member" button
2. Modal opens with user search/invite form
3. Admin searches for existing user or enters email
4. Sets relationship (parent, athlete, etc.)
5. Optionally makes them admin
6. Submit adds member with appropriate status
7. Member list refreshes

### Flow 3: Family Admin Manages Member Account
1. Family admin clicks "Manage Account" on member card
2. Navigate to manage account page
3. Form shows current member info
4. Admin updates email, password, or profile fields
5. Submit updates member's auth.users and profiles records
6. Change is logged in audit table
7. Success message and return to family details

### Flow 4: Promote Member to Admin
1. Family admin clicks "Edit" on member card
2. Toggle "Family Admin" switch
3. Confirm promotion in modal
4. Updates family_members.is_admin = true
5. Member now has admin capabilities

### Flow 5: View Athlete Data as Family Admin
1. Family admin navigates to team roster
2. Can view full details for family member athletes
3. Can view stats, events, performance data
4. Uses `is_family_admin()` for authorization
5. Same access level as the athlete themselves

---

## 5. Authorization & Security

### Authorization Rules
- Family admins can:
  - View all family member details
  - Add/remove family members
  - Update family information
  - Manage accounts (email, password) for all family members
  - View athlete data for family member athletes
  - Promote/demote other admins

- Regular family members can:
  - View family information
  - View other family members
  - Leave family (if not last admin)

### Security Considerations
1. **Audit Logging**: Log all account changes made by family admins
2. **Last Admin Protection**: Cannot remove/demote last family admin
3. **Authorization Checks**: Use `is_family_admin()` function in all admin APIs
4. **Password Changes**: Require current user authentication even for admins
5. **Email Verification**: Send confirmation email when email is changed
6. **Activity Notifications**: Notify family members of account changes

### RLS Policies to Add
```sql
-- Families table
- Users can view families they belong to
- Family admins can update their families
- Only family admins can delete families

-- Family_members table
- Users can view members of their families
- Family admins can insert/update/delete members
- Cannot remove last admin

-- Profiles table (enhance)
- Family admins can view/update profiles of family members
```

---

## 6. Database Functions to Create

### `can_remove_family_member(family_id, user_id)`
Checks if member can be removed (not last admin)

### `get_family_athletes(family_id)`
Returns all athletes in a family for stats/events access

### `log_family_account_change(admin_id, target_user_id, change_type, details)`
Logs account changes for audit trail

### `get_family_activity_log(family_id)`
Returns recent activity for a family

---

## 7. UI/UX Enhancements

### Design Patterns
- Use existing team management UI as template
- Consistent card-based layouts
- Clear admin vs member distinction
- Intuitive navigation with breadcrumbs

### User Feedback
- Toast notifications for all actions
- Confirmation modals for destructive actions
- Loading states during API calls
- Success/error messages

### Responsive Design
- Mobile-friendly family management
- Touch-friendly action buttons
- Collapsible sections for mobile

---

## 8. Integration Points

### Teams Integration
- Show family associations on team member profiles
- Allow team managers to see family admin contacts
- Family admins auto-receive team updates if assigned role

### Events Integration
- Family admins can view event details for family athletes
- Can check in athletes at events
- View results and statistics

### Notifications Integration
- Family admins receive notifications about family athletes
- Email notifications for family invitations
- SMS notifications for important updates (optional)

---

## 9. Testing Checklist

### Unit Tests
- [ ] Family CRUD API endpoints
- [ ] Family member CRUD API endpoints
- [ ] Authorization helper functions
- [ ] Account management functions

### Integration Tests
- [ ] Create family flow
- [ ] Add/remove members
- [ ] Promote/demote admins
- [ ] Manage member accounts
- [ ] View athlete data as family admin

### Security Tests
- [ ] Non-admins cannot manage family
- [ ] Cannot remove last admin
- [ ] Account changes are logged
- [ ] Authorization checks work correctly

---

## 10. Implementation Phases

### Phase 1: Core Family Management (MVP)
- Create families API and UI
- Add/remove family members
- Basic family details page
- Admin assignment

### Phase 2: Account Management
- Family admin account management APIs
- Manage member account page
- Audit logging
- Email/password updates

### Phase 3: Integration
- Integrate with teams
- Integrate with events
- Show family info on profiles
- Activity feeds

### Phase 4: Advanced Features
- Family invitations via email
- Activity notifications
- Family calendar view
- Family photo gallery
- Bulk member import

---

## 11. Future Enhancements

### Communication Features
- Family group messaging
- Family announcements
- Shared calendar

### Document Sharing
- Medical forms
- Consent forms
- Emergency contacts
- Insurance information

### Financial Management
- Track family dues/fees
- Payment history
- Shared fundraising goals

### Analytics
- Family engagement metrics
- Athlete progress across family
- Multi-athlete comparisons

---

## Notes

- Start with Phase 1 (Core Family Management)
- Use existing team management UI patterns
- Focus on security and audit logging
- Keep UX simple and intuitive
- Test thoroughly with real family scenarios
