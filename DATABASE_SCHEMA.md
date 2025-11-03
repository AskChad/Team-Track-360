# Team Track 360 - Comprehensive Database Schema

**Date:** November 2, 2025
**Status:** In Progress - Schema Design
**Database:** PostgreSQL (Supabase)
**Based on:** Requirements Q1-Q19 + Attack Kit Standards

---

## Table of Contents

1. [Core Hierarchy](#1-core-hierarchy)
2. [Users & Permissions](#2-users--permissions)
3. [Sport-Specific Profiles](#3-sport-specific-profiles)
4. [Events & Competitions](#4-events--competitions)
5. [Rosters & Stats](#5-rosters--stats)
6. [Competitors System](#6-competitors-system)
7. [Payment System](#7-payment-system)
8. [Equipment Management](#8-equipment-management)
9. [Documents & Media](#9-documents--media)
10. [Webhooks & System Events](#10-webhooks--system-events)
11. [GHL Integration](#11-ghl-integration)
12. [Wrestling Platform Integration](#12-wrestling-platform-integration)
13. [Websites & CMS](#13-websites--cms)
14. [Forms & Analytics](#14-forms--analytics)

---

## Design Principles

1. **UUID Primary Keys** - All tables use UUIDs
2. **Timestamps** - All tables have `created_at` and `updated_at` (auto-update trigger)
3. **Snake Case** - All table and column names
4. **RLS Enabled** - Row Level Security on all tables
5. **Soft Deletes** - Critical tables have `deleted_at` for soft deletes
6. **Audit Trail** - System events tracked in `activity_log`
7. **Sport Modular** - Sport-specific tables use pattern `{sport}_*`
8. **Hierarchical Access** - Platform → Org → Team permission inheritance

---

## 1. Core Hierarchy

### 1.1. `sports`

Core sports supported by the platform.

```sql
CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,  -- 'Wrestling', 'Swimming', 'Boxing', etc.
  slug text NOT NULL UNIQUE,  -- 'wrestling', 'swimming', 'boxing'
  description text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sports_active ON sports(is_active);
CREATE INDEX idx_sports_display_order ON sports(display_order);
```

**Seed Data (Phase 1):**
- Wrestling (active)
- Swimming (inactive - Phase 2)
- Boxing (inactive - Phase 2)

---

### 1.2. `parent_organizations`

Top-level organizations. Can manage multiple teams across multiple sports.

```sql
CREATE TABLE parent_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,  -- URL-friendly identifier
  description text,

  -- Contact Info
  address text,
  city text,
  state text,
  zip text,
  phone_number text,
  email text,
  website_url text,

  -- GHL Integration
  ghl_location_id text,  -- Nullable: 1:1 now, many:1 future
  ghl_sync_enabled boolean NOT NULL DEFAULT false,

  -- Settings
  logo_url text,
  primary_color text,  -- Hex color for branding
  secondary_color text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Flexible settings

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parent_organizations_slug ON parent_organizations(slug);
CREATE INDEX idx_parent_organizations_active ON parent_organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_parent_organizations_ghl_location ON parent_organizations(ghl_location_id) WHERE ghl_location_id IS NOT NULL;
```

**Notes:**
- `ghl_location_id` is nullable to support future many-to-one GHL mapping
- `settings` JSONB allows flexible org-specific configurations
- Soft delete with `deleted_at`

---

### 1.3. `organization_sports`

Many-to-many: Organizations can support multiple sports.

```sql
CREATE TABLE organization_sports (
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (organization_id, sport_id)
);

CREATE INDEX idx_organization_sports_org ON organization_sports(organization_id);
CREATE INDEX idx_organization_sports_sport ON organization_sports(sport_id);
```

---

### 1.4. `teams`

Teams or Clubs. Each team belongs to ONE organization and supports ONE sport.

```sql
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,

  name text NOT NULL,
  slug text NOT NULL,  -- Unique within organization
  team_type text NOT NULL CHECK (team_type IN ('team', 'club')),  -- 'team' = scholastic, 'club' = non-scholastic
  school_level text CHECK (school_level IN ('high_school', 'jr_high', 'middle_school', 'elementary', 'college')),  -- Only for team_type='team'

  -- Contact Info
  address text,
  city text,
  state text,
  zip text,
  phone_number text,
  email text,

  -- Branding (inherits from org by default)
  logo_url text,
  primary_color text,
  secondary_color text,

  -- Settings
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_teams_organization ON teams(organization_id);
CREATE INDEX idx_teams_sport ON teams(sport_id);
CREATE INDEX idx_teams_type ON teams(team_type);
CREATE INDEX idx_teams_active ON teams(is_active) WHERE deleted_at IS NULL;
```

**Notes:**
- `team_type`: 'team' for scholastic (high school, etc.), 'club' for non-scholastic
- `school_level`: Only applicable when `team_type='team'`
- Slug unique within organization (allows "Eagles" for multiple orgs)

---

### 1.5. `seasons`

Sport-specific, organization-specific calendar periods.

```sql
CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,

  name text NOT NULL,  -- 'Fall 2025', 'Spring 2026', '2025-2026 Season'
  start_date date NOT NULL,
  end_date date NOT NULL,

  -- Sport-Specific Settings
  weight_classes jsonb,  -- For wrestling: [{"name": "106", "min": 0, "max": 106}, ...]
  age_brackets jsonb,  -- For age-based sports: [{"name": "U12", "min_age": 0, "max_age": 12}, ...]

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (end_date > start_date)
);

CREATE INDEX idx_seasons_organization ON seasons(organization_id);
CREATE INDEX idx_seasons_sport ON seasons(sport_id);
CREATE INDEX idx_seasons_active ON seasons(is_active);
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);
```

**Notes:**
- Weight classes and age brackets are season-specific
- Allows "copy from previous season" feature
- JSONB for flexibility (can override per event)

---

## 2. Users & Permissions

### 2.1. `profiles`

Base user data. Links to Supabase Auth.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Info
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,

  -- Address
  address text,
  city text,
  state text,
  zip text,

  -- Platform Role (hierarchical, exclusive)
  platform_role text NOT NULL DEFAULT 'user' CHECK (platform_role IN ('super_admin', 'platform_admin', 'user')),

  -- Profile
  avatar_url text,
  bio text,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  email_verified boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_platform_role ON profiles(platform_role);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE deleted_at IS NULL;
```

**Notes:**
- `id` references `auth.users` (Supabase Auth)
- `platform_role` is hierarchical and exclusive:
  - `super_admin` > `platform_admin` > `user`
  - Users cannot have multiple platform roles

---

### 2.2. `user_types`

Many-to-many: Users can have multiple non-admin types simultaneously.

```sql
CREATE TABLE user_types (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('athlete', 'coach', 'parent', 'donor', 'volunteer', 'official')),
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, type)
);

CREATE INDEX idx_user_types_user ON user_types(user_id);
CREATE INDEX idx_user_types_type ON user_types(type);
```

**Notes:**
- Users can be athlete + coach + parent + donor simultaneously
- Separate from admin roles (which are hierarchical)

---

### 2.3. `admin_roles`

Hierarchical admin roles (organization and team level).

```sql
CREATE TABLE admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Scope
  role_type text NOT NULL CHECK (role_type IN ('org_admin', 'team_admin')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,  -- Required for both
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,  -- Only for team_admin

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CHECK (
    (role_type = 'org_admin' AND team_id IS NULL) OR
    (role_type = 'team_admin' AND team_id IS NOT NULL)
  )
);

CREATE INDEX idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_org ON admin_roles(organization_id);
CREATE INDEX idx_admin_roles_team ON admin_roles(team_id);
CREATE UNIQUE INDEX idx_admin_roles_unique_org ON admin_roles(user_id, organization_id) WHERE role_type = 'org_admin';
CREATE UNIQUE INDEX idx_admin_roles_unique_team ON admin_roles(user_id, team_id) WHERE role_type = 'team_admin';
```

**Notes:**
- Users can be Org Admin for multiple orgs
- Users can be Team Admin for multiple teams
- But CANNOT be both Platform Admin AND Org Admin (platform roles are exclusive)
- Org Admin automatically sees all teams in their org

---

### 2.4. `roles`

Customizable permission sets for non-hierarchical roles.

```sql
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,

  -- Scope
  scope_type text NOT NULL CHECK (scope_type IN ('system', 'organization', 'team')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,  -- Null for system-level
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,  -- Null for system/org-level

  -- Permissions
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,  -- Array of permission strings

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (name, scope_type, organization_id, team_id)
);

CREATE INDEX idx_roles_scope ON roles(scope_type, organization_id, team_id);
```

**Examples:**
- System-level: "Communication Admin", "Data Admin", "Event Admin", "Webmaster"
- Org-level: Custom roles per organization
- Team-level: Custom roles per team

---

### 2.5. `role_assignments`

Assign non-hierarchical roles to users with scope.

```sql
CREATE TABLE role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Scope (determines which orgs/teams this assignment applies to)
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,  -- Null = all orgs
  team_ids uuid[] DEFAULT '{}'::uuid[],  -- Empty array = all teams in org, specific UUIDs = only those teams

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, role_id, organization_id)
);

CREATE INDEX idx_role_assignments_user ON role_assignments(user_id);
CREATE INDEX idx_role_assignments_role ON role_assignments(role_id);
CREATE INDEX idx_role_assignments_org ON role_assignments(organization_id);
```

**Examples:**
- Event Admin for all teams in Org A
- Event Admin for Team 1 and Team 3 only
- Data Admin for all orgs (platform-wide)

---

### 2.6. `families`

Family groups for managing related users.

```sql
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,  -- "Smith Family"

  -- Settings
  billing_type text NOT NULL DEFAULT 'family' CHECK (billing_type IN ('family', 'per_member')),
  payment_card_id text,  -- Reference to payment method

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

### 2.7. `family_members`

Users belong to families. Users can be in multiple families.

```sql
CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role in family
  is_admin boolean NOT NULL DEFAULT false,  -- Family Admin
  relationship text,  -- 'parent', 'grandparent', 'sibling', 'athlete', etc. (optional metadata)

  -- Privacy
  allow_family_admin_access boolean NOT NULL DEFAULT true,  -- Athletes can opt-out

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (family_id, user_id)
);

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_admin ON family_members(is_admin) WHERE is_admin = true;
```

**Notes:**
- Users can be in multiple families (divorced parents scenario)
- Family Admin has proxy permissions for all family members (unless opted out)
- `allow_family_admin_access`: Athletes can disable family admin access

---

## 3. Sport-Specific Profiles

### 3.1. `wrestling_athlete_profiles`

Wrestling-specific athlete profile. One athlete can have ONE wrestling profile per team.

```sql
CREATE TABLE wrestling_athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Wrestling-Specific
  current_weight_class text,  -- "106", "113", etc.
  preferred_weight_class text,
  wrestling_style text CHECK (wrestling_style IN ('folkstyle', 'freestyle', 'greco-roman')),
  grade_level text,  -- '9th', '10th', '11th', '12th', 'college_freshman', etc.
  years_experience integer,

  -- Medical
  medical_clearance_date date,
  medical_clearance_expires_at date,

  -- Settings
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Status
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, team_id)  -- One wrestling profile per team
);

CREATE INDEX idx_wrestling_profiles_user ON wrestling_athlete_profiles(user_id);
CREATE INDEX idx_wrestling_profiles_team ON wrestling_athlete_profiles(team_id);
CREATE INDEX idx_wrestling_profiles_weight_class ON wrestling_athlete_profiles(current_weight_class);
```

**Notes:**
- Athlete can have multiple wrestling profiles (one per team)
- Example: John Smith → Wrestling Profile for Team A + Wrestling Profile for Team B (club)
- Medical clearance tracking

---

### 3.2. `swimming_athlete_profiles` (Phase 2)

```sql
-- Future: Swimming-specific athlete profile
-- CREATE TABLE swimming_athlete_profiles (...)
```

---

## 4. Events & Competitions

### 4.1. `competitions`

Historical competition tracking (template/series). Allows querying all instances of "State Championships" across years.

```sql
CREATE TABLE competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,

  name text NOT NULL,  -- "State Championships", "Regional Duals"
  description text,
  competition_type text CHECK (competition_type IN ('tournament', 'dual_meet', 'tri_meet', 'invitational', 'championship')),

  -- Default Location (can be overridden per event)
  default_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,

  -- Recurring
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,  -- RRULE format

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitions_organization ON competitions(organization_id);
CREATE INDEX idx_competitions_sport ON competitions(sport_id);
```

**Notes:**
- Competition = template (e.g., "State Championships")
- Events = team-specific instances of a competition
- Enables historical tracking: "Show all State Championships results from 2010-2025"

---

### 4.2. `locations`

Physical locations for events.

```sql
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'USA',

  -- Venue Details
  venue_type text,  -- 'school', 'arena', 'convention_center', 'outdoor', 'other'
  capacity integer,
  facilities jsonb,  -- ['mat_1', 'mat_2', 'concessions', 'locker_rooms']

  -- Contact
  phone text,
  website_url text,

  -- Coordinates
  latitude numeric,
  longitude numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_city_state ON locations(city, state);
```

---

### 4.3. `events`

Team-specific instances of competitions.

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES competitions(id) ON DELETE SET NULL,  -- Null if standalone event
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,

  name text NOT NULL,  -- "State Championships 2025", "vs. Eagles Dual Meet"
  description text,

  -- Event Type
  event_type_id uuid REFERENCES event_types(id) ON DELETE SET NULL,

  -- Scheduling
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,

  -- Status
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),

  -- Logistics
  weigh_in_time time,  -- For wrestling
  check_in_time time,
  registration_deadline timestamptz,

  -- Visibility
  is_public boolean NOT NULL DEFAULT false,  -- Public calendar
  show_results_public boolean NOT NULL DEFAULT false,  -- Public match results (by weight class only)

  -- Settings
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_competition ON events(competition_id);
CREATE INDEX idx_events_team ON events(team_id);
CREATE INDEX idx_events_season ON events(season_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_public ON events(is_public) WHERE is_public = true;
```

**Notes:**
- Each team creates their own event instance
- Same `competition_id` links events for historical queries
- Team Admin can toggle `show_results_public` (overrides Org Admin setting)

---

### 4.4. `event_types`

Customizable event types with hierarchical visibility.

```sql
CREATE TABLE event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,
  icon text,  -- Icon name or emoji
  color text,  -- Hex color

  -- Category
  category text NOT NULL CHECK (category IN ('competitive', 'meeting', 'practice', 'social', 'fundraiser', 'other')),

  -- Scope (determines visibility)
  scope_type text NOT NULL DEFAULT 'system' CHECK (scope_type IN ('system', 'organization', 'team')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  -- System Adoption
  adopted_from_org_id uuid REFERENCES parent_organizations(id) ON DELETE SET NULL,  -- Platform Admin can adopt org custom types
  adopted_from_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (
    (scope_type = 'system' AND organization_id IS NULL AND team_id IS NULL) OR
    (scope_type = 'organization' AND organization_id IS NOT NULL AND team_id IS NULL) OR
    (scope_type = 'team' AND team_id IS NOT NULL)
  )
);

CREATE INDEX idx_event_types_scope ON event_types(scope_type, organization_id, team_id);
```

**Seed Data (System Level):**
- Competitive: Tournament, Dual Meet
- Meetings: Parent Meeting, Board Meeting, Coaches Meeting
- Practice: Practice
- Social: Weigh-in, Banquet
- Fundraiser: Fundraiser

---

### 4.5. `event_rsvps`

RSVP tracking for non-competitive events.

```sql
CREATE TABLE event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  response text NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  guests_count integer DEFAULT 0,
  notes text,

  -- Attendance (marked during/after event)
  attended boolean,
  attended_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX idx_event_rsvps_response ON event_rsvps(response);
```

---

### 4.6. `user_calendar_integrations`

Google Calendar sync for users.

```sql
CREATE TABLE user_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  provider text NOT NULL CHECK (provider IN ('google', 'apple', 'outlook')),
  provider_calendar_id text NOT NULL,
  access_token_encrypted text NOT NULL,
  access_token_iv text NOT NULL,
  refresh_token_encrypted text,
  refresh_token_iv text,
  token_expires_at timestamptz,

  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, provider)
);

CREATE INDEX idx_calendar_integrations_user ON user_calendar_integrations(user_id);
```

---

### 4.7. `event_reminders`

Configurable reminder system.

```sql
CREATE TABLE event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push')),
  remind_at timestamptz NOT NULL,

  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX idx_event_reminders_user ON event_reminders(user_id);
CREATE INDEX idx_event_reminders_remind_at ON event_reminders(remind_at) WHERE status = 'pending';
```

---

## 5. Rosters & Stats

### 5.1. `event_rosters`

Roster for each event. Team submits athletes for this specific event.

```sql
CREATE TABLE event_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  name text,  -- "Varsity Roster", "JV Roster"
  roster_type text,  -- 'varsity', 'jv', 'freshman', etc.

  -- Roster Size Limits (event-specific, not org policy)
  max_athletes integer,
  max_per_weight_class integer,  -- Wrestling specific

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_rosters_event ON event_rosters(event_id);
```

**Notes:**
- Roster size limits are **event-specific**, not organization policy
- Example: JV dual allows 2 per weight class, Varsity tournament allows 1

---

### 5.2. `wrestling_roster_members`

Wrestling-specific roster assignments.

```sql
CREATE TABLE wrestling_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES event_rosters(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL REFERENCES wrestling_athlete_profiles(id) ON DELETE CASCADE,

  -- Wrestling Specific
  weight_class text NOT NULL,
  seed integer,  -- Seeding for tournaments
  made_weight boolean,
  actual_weight numeric,

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scratched', 'injured', 'unavailable')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (roster_id, athlete_profile_id)
);

CREATE INDEX idx_wrestling_roster_members_roster ON wrestling_roster_members(roster_id);
CREATE INDEX idx_wrestling_roster_members_athlete ON wrestling_roster_members(athlete_profile_id);
CREATE INDEX idx_wrestling_roster_members_weight_class ON wrestling_roster_members(weight_class);
```

---

### 5.3. `roster_change_log`

Track roster changes with reasons.

```sql
CREATE TABLE roster_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES event_rosters(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL,  -- Generic reference (could be wrestling, swimming, etc.)

  change_type text NOT NULL CHECK (change_type IN ('added', 'removed', 'weight_class_changed', 'status_changed')),
  reason text CHECK (reason IN ('no_show', 'illness', 'injury', 'previous_engagement', 'weight_issues', 'discipline', 'other')),
  notes text,

  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roster_change_log_roster ON roster_change_log(roster_id);
CREATE INDEX idx_roster_change_log_athlete ON roster_change_log(athlete_profile_id);
```

---

### 5.4. `wrestling_matches`

Match results (these ARE the stats).

```sql
CREATE TABLE wrestling_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Our Athlete
  athlete_profile_id uuid NOT NULL REFERENCES wrestling_athlete_profiles(id) ON DELETE CASCADE,
  weight_class text NOT NULL,

  -- Opponent (may not be in system)
  opponent_athlete_id uuid REFERENCES wrestling_athlete_profiles(id) ON DELETE SET NULL,  -- If in system
  opponent_name text,  -- Text entry if not in system
  opponent_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,  -- If team is in system
  opponent_team_name text,  -- Text entry if not in system

  -- Match Details
  match_number integer,  -- Order in event
  round text,  -- 'preliminary', 'quarterfinal', 'semifinal', 'final', 'consolation'
  bout_type text,  -- 'regulation', 'sudden_victory', 'ultimate_tiebreaker'

  -- Result
  result text NOT NULL CHECK (result IN ('win', 'loss', 'draw', 'forfeit', 'bye', 'disqualified')),
  win_method text CHECK (win_method IN ('fall', 'tech_fall', 'major_decision', 'decision', 'forfeit', 'injury_default', 'disqualification')),
  score_athlete integer,
  score_opponent integer,
  match_time text,  -- "5:23" or "2:15" for fall time

  -- Phase 2: Detailed scoring (period by period)
  detailed_scoring jsonb,

  -- Verification
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wrestling_matches_event ON wrestling_matches(event_id);
CREATE INDEX idx_wrestling_matches_athlete ON wrestling_matches(athlete_profile_id);
CREATE INDEX idx_wrestling_matches_opponent ON wrestling_matches(opponent_athlete_id);
CREATE INDEX idx_wrestling_matches_result ON wrestling_matches(result);
```

**Notes:**
- Match result IS the stat (no separate stats aggregation)
- Team stats = calculated real-time from match results
- Opponent can be text entry if not in system
- Phase 1: End result only; Phase 2: Period-by-period scoring

---

### 5.5. `swimming_races` (Phase 2 - Future)

```sql
-- Future: Swimming race results
-- CREATE TABLE swimming_races (...)
```

---

## 6. Competitors System

### 6.1. `competitor_teams`

Unclaimed teams (like Google My Business for schools).

```sql
CREATE TABLE competitor_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  city text,
  state text,
  zip text,
  sports text[],  -- Array of sport slugs: ['wrestling', 'swimming']

  -- Claiming
  claimed boolean NOT NULL DEFAULT false,
  claimed_by_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  claimed_at timestamptz,

  -- De-duplication
  duplicate_of uuid REFERENCES competitor_teams(id) ON DELETE CASCADE,  -- If merged

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_teams_name ON competitor_teams(name);
CREATE INDEX idx_competitor_teams_location ON competitor_teams(city, state);
CREATE INDEX idx_competitor_teams_claimed ON competitor_teams(claimed);
```

**Notes:**
- Anyone can create competitor teams (for match results against non-users)
- AI-powered duplicate detection
- Teams can "claim" their competitor team profile
- Auto-link when team joins system

---

### 6.2. `competitor_athletes`

Unclaimed athletes from non-user teams.

```sql
CREATE TABLE competitor_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_team_id uuid NOT NULL REFERENCES competitor_teams(id) ON DELETE CASCADE,

  name text NOT NULL,
  sport text NOT NULL,  -- 'wrestling', 'swimming', etc.
  weight_class text,  -- For wrestling

  -- Claiming
  claimed boolean NOT NULL DEFAULT false,
  claimed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,

  -- De-duplication
  duplicate_of uuid REFERENCES competitor_athletes(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_athletes_team ON competitor_athletes(competitor_team_id);
CREATE INDEX idx_competitor_athletes_name ON competitor_athletes(name);
CREATE INDEX idx_competitor_athletes_claimed ON competitor_athletes(claimed);
```

---

### 6.3. `competitor_claims`

Audit trail for claim/unclaim actions.

```sql
CREATE TABLE competitor_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  claim_type text NOT NULL CHECK (claim_type IN ('team', 'athlete')),
  competitor_id uuid NOT NULL,  -- ID from competitor_teams or competitor_athletes

  action text NOT NULL CHECK (action IN ('claim', 'unclaim', 'auto_link')),
  claimed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- Who performed the action
  linked_to_id uuid,  -- team_id or profile_id

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_claims_competitor ON competitor_claims(competitor_id);
CREATE INDEX idx_competitor_claims_type ON competitor_claims(claim_type);
```

---

### 6.4. `duplicate_detections`

AI-powered duplicate detection queue.

```sql
CREATE TABLE duplicate_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  detection_type text NOT NULL CHECK (detection_type IN ('team', 'athlete')),
  original_id uuid NOT NULL,
  potential_duplicate_id uuid NOT NULL,

  confidence_score numeric NOT NULL,  -- 0.0 to 1.0
  matching_fields jsonb,  -- {'name': 0.95, 'location': 0.88}

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'dismissed', 'flagged')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_duplicate_detections_status ON duplicate_detections(status);
CREATE INDEX idx_duplicate_detections_confidence ON duplicate_detections(confidence_score);
```

**Notes:**
- AI checks new competitor entries for duplicates
- Auto-merge if confidence > 0.95
- Flag for review if 0.70 < confidence < 0.95
- Admins can approve or undo

---

## 7. Payment System

### 7.1. `payment_gateways`

Payment gateway configurations per org/team.

```sql
CREATE TABLE payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,  -- platform_id (null for platform), organization_id, or team_id

  -- Gateway
  provider text NOT NULL CHECK (provider IN ('stripe', 'paypal', 'authorize_net', 'square')),

  -- Credentials (encrypted)
  api_key_encrypted text NOT NULL,
  api_key_iv text NOT NULL,
  api_secret_encrypted text,
  api_secret_iv text,

  -- Settings
  webhook_secret text,
  test_mode boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_gateways_owner ON payment_gateways(owner_type, owner_id);
CREATE INDEX idx_payment_gateways_provider ON payment_gateways(provider);
```

---

### 7.2. `gateway_access`

Cascade permissions for payment gateway access.

```sql
CREATE TABLE gateway_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES payment_gateways(id) ON DELETE CASCADE,

  -- Who gets access
  granted_to_type text NOT NULL CHECK (granted_to_type IN ('organization', 'team')),
  granted_to_id uuid NOT NULL,

  granted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_access_gateway ON gateway_access(gateway_id);
CREATE INDEX idx_gateway_access_granted_to ON gateway_access(granted_to_type, granted_to_id);
```

**Rules:**
- Platform Admin can grant access to Orgs or Teams
- Org Admin can grant access to Teams ONLY if Org uses their own gateway (not Platform's)

---

### 7.3. `fee_structures`

Cascading fee structures (subscription + per-org fee + per-user fee).

```sql
CREATE TABLE fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is charging
  charged_by_type text NOT NULL CHECK (charged_by_type IN ('platform', 'organization', 'team')),
  charged_by_id uuid NOT NULL,

  -- Who is being charged
  charged_to_type text NOT NULL CHECK (charged_to_type IN ('organization', 'team', 'user')),

  name text NOT NULL,  -- "Monthly Subscription", "Per User Fee"
  description text,

  -- Fee Structure
  fee_type text NOT NULL CHECK (fee_type IN ('subscription', 'per_organization', 'per_user', 'one_time')),
  amount numeric(10, 2) NOT NULL,  -- Can be 0
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text CHECK (billing_interval IN ('monthly', 'yearly', 'one_time')),

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_structures_charged_by ON fee_structures(charged_by_type, charged_by_id);
```

**Examples:**
- Platform charges Orgs: $100/month subscription + $10/org + $2/user
- Org charges Teams: $50/month subscription + $5/team + $1/user
- Team charges Users: $25/month subscription

---

### 7.4. `products`

Products for sale (events, equipment, registrations, etc.) with hierarchical creation.

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator (determines who can buy)
  created_by_type text NOT NULL CHECK (created_by_type IN ('platform', 'organization', 'team')),
  created_by_id uuid NOT NULL,

  -- Visibility
  visibility_type text NOT NULL CHECK (visibility_type IN ('all_users', 'all_orgs', 'specific_orgs', 'specific_teams', 'team_members')),
  visible_to_org_ids uuid[],  -- Specific orgs (if visibility_type = 'specific_orgs')
  visible_to_team_ids uuid[],  -- Specific teams (if visibility_type = 'specific_teams')

  name text NOT NULL,
  description text,
  product_type text NOT NULL CHECK (product_type IN ('event_registration', 'equipment', 'merchandise', 'donation', 'membership', 'other')),

  -- Pricing
  price numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',

  -- Inventory
  has_inventory boolean NOT NULL DEFAULT false,
  inventory_count integer,

  -- Linked Resources
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,  -- If product_type = 'event_registration'

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_created_by ON products(created_by_type, created_by_id);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_event ON products(event_id);
```

---

### 7.5. `invoices`

Invoices for users.

```sql
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  invoice_number text NOT NULL UNIQUE,

  -- Billing
  subtotal numeric(10, 2) NOT NULL,
  tax numeric(10, 2) DEFAULT 0,
  total numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',

  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded')),
  due_date date,

  -- Payment
  paid_amount numeric(10, 2) DEFAULT 0,
  paid_at timestamptz,
  payment_method text,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('sent', 'partial', 'overdue');
```

---

### 7.6. `invoice_items`

Line items for invoices.

```sql
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,

  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
```

---

### 7.7. `payment_plans`

Installment payment plans.

```sql
CREATE TABLE payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  total_installments integer NOT NULL,
  installment_amount numeric(10, 2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),

  first_payment_date date NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_plans_invoice ON payment_plans(invoice_id);
```

---

### 7.8. `transactions`

All payment transactions with cascade chain tracking.

```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,

  -- Payer
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Payment Gateway
  gateway_id uuid REFERENCES payment_gateways(id) ON DELETE SET NULL,
  external_transaction_id text,  -- Stripe charge ID, PayPal transaction ID, etc.

  -- Amount
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',

  -- Type
  transaction_type text NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'credit', 'fee')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Cascade Tracking (who gets what)
  cascade_chain jsonb,  -- [{"level": "team", "id": "uuid", "amount": 100}, {"level": "org", "amount": 25}, ...]

  -- Metadata
  payment_method text,  -- 'card', 'ach', 'cash', 'check'
  metadata jsonb,

  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_transactions_gateway ON transactions(gateway_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_external ON transactions(external_transaction_id);
```

**Cascade Chain Example:**
```json
[
  {"level": "team", "id": "team-uuid", "amount": 100.00},
  {"level": "organization", "id": "org-uuid", "amount": 25.00},
  {"level": "platform", "amount": 10.00}
]
```

---

## 8. Equipment Management

### 8.1. `equipment`

Equipment inventory with hierarchical ownership.

```sql
CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

  name text NOT NULL,
  equipment_type text,  -- 'mat', 'headgear', 'uniform', 'scale', etc.
  size text,
  serial_number text,

  -- Condition
  condition text CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor', 'damaged')),

  -- Purchase Info
  purchase_date date,
  purchase_cost numeric(10, 2),
  warranty_expires_at date,

  -- Checkout Rules
  can_checkout_to text[] DEFAULT ARRAY['athlete', 'coach'],  -- Who can check out

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_owner ON equipment(owner_type, owner_id);
CREATE INDEX idx_equipment_type ON equipment(equipment_type);
```

---

### 8.2. `equipment_checkouts`

Track equipment checkout/return.

```sql
CREATE TABLE equipment_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  checked_out_at timestamptz NOT NULL DEFAULT now(),
  checked_out_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Admin who approved

  due_date date NOT NULL,

  returned_at timestamptz,
  returned_condition text CHECK (returned_condition IN ('new', 'excellent', 'good', 'fair', 'poor', 'damaged')),
  notes text,

  -- Late Fee
  is_late boolean GENERATED ALWAYS AS (returned_at IS NOT NULL AND returned_at::date > due_date) STORED,
  late_fee_amount numeric(10, 2),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_checkouts_equipment ON equipment_checkouts(equipment_id);
CREATE INDEX idx_equipment_checkouts_user ON equipment_checkouts(user_id);
CREATE INDEX idx_equipment_checkouts_due_date ON equipment_checkouts(due_date) WHERE returned_at IS NULL;
CREATE INDEX idx_equipment_checkouts_late ON equipment_checkouts(is_late) WHERE is_late = true AND returned_at IS NOT NULL;
```

---

### 8.3. `equipment_late_fees`

Late fee tracking.

```sql
CREATE TABLE equipment_late_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES equipment_checkouts(id) ON DELETE CASCADE,

  amount numeric(10, 2) NOT NULL,
  days_late integer NOT NULL,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),

  paid_at timestamptz,
  waived_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  waived_at timestamptz,
  waived_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_late_fees_checkout ON equipment_late_fees(checkout_id);
CREATE INDEX idx_equipment_late_fees_status ON equipment_late_fees(status);
```

---

## 9. Documents & Media

### 9.1. `documents`

Document storage with hierarchical access.

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team', 'user', 'event')),
  owner_id uuid NOT NULL,

  -- Document Info
  name text NOT NULL,
  description text,
  document_type_id uuid REFERENCES document_types(id) ON DELETE SET NULL,

  -- File
  file_url text NOT NULL,  -- Supabase Storage path
  file_name text NOT NULL,
  file_size bigint NOT NULL,  -- Bytes
  mime_type text NOT NULL,

  -- Sport-Specific
  sport_id uuid REFERENCES sports(id) ON DELETE SET NULL,  -- Medical forms per sport

  -- Approval
  requires_approval boolean NOT NULL DEFAULT false,
  approved boolean,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,

  -- Uploaded by
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_sport ON documents(sport_id);
CREATE INDEX idx_documents_approval ON documents(requires_approval, approved) WHERE requires_approval = true;
```

---

### 9.2. `document_types`

Predefined document types.

```sql
CREATE TABLE document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL UNIQUE,  -- 'Medical Form', 'Liability Waiver', 'Roster', etc.
  description text,
  category text CHECK (category IN ('medical', 'legal', 'administrative', 'other')),

  requires_approval boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Seed Data:**
- Roster (system-generated)
- Medical Form (per athlete per sport)
- Liability Waiver (per athlete per sport)
- Meeting Minutes (tied to event)

---

### 9.3. `document_permissions`

Per-document permission overrides.

```sql
CREATE TABLE document_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Who has access
  access_type text NOT NULL CHECK (access_type IN ('user', 'role', 'team', 'organization', 'public')),
  access_id uuid,  -- user_id, role_id, team_id, org_id (null for public)

  permission_level text NOT NULL CHECK (permission_level IN ('view', 'download', 'edit', 'delete')),

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (document_id, access_type, access_id)
);

CREATE INDEX idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_document_permissions_access ON document_permissions(access_type, access_id);
```

---

### 9.4. `document_approval_queue`

Approval queue for coaches uploading team docs.

```sql
CREATE TABLE document_approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  pending_for uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Team Admin who needs to approve

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,

  reviewed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_approval_queue_pending_for ON document_approval_queue(pending_for) WHERE status = 'pending';
CREATE INDEX idx_document_approval_queue_document ON document_approval_queue(document_id);
```

---

### 9.5. `media_library`

Media files (photos, videos, logos) with hierarchical access.

```sql
CREATE TABLE media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

  -- File Info
  name text NOT NULL,
  description text,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video', 'logo', 'document', 'other')),

  -- File
  file_url text NOT NULL,  -- Supabase Storage path
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,

  -- Image/Video Metadata
  width integer,
  height integer,
  duration integer,  -- For videos (seconds)

  -- Tags
  tags text[],

  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_library_owner ON media_library(owner_type, owner_id);
CREATE INDEX idx_media_library_type ON media_library(media_type);
CREATE INDEX idx_media_library_tags ON media_library USING GIN(tags);
```

**Access Rules:**
- Teams: View their images + org images + platform images (if granted)
- Teams: Delete their images only
- Orgs: View their images + platform images
- Orgs: Delete their images only
- Platform: View all, delete all

---

### 9.6. `media_access_control`

Platform Admins manually grant platform image access to orgs/teams.

```sql
CREATE TABLE media_access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,

  granted_to_type text NOT NULL CHECK (granted_to_type IN ('organization', 'team')),
  granted_to_id uuid NOT NULL,

  granted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (media_id, granted_to_type, granted_to_id)
);

CREATE INDEX idx_media_access_control_media ON media_access_control(media_id);
CREATE INDEX idx_media_access_control_granted_to ON media_access_control(granted_to_type, granted_to_id);
```

---

## Status Update

**Tables Designed:** 50 of ~70+
**Progress:** Core Hierarchy + Users + Events + Rosters + Competitors + Payment + Equipment + Documents complete
**Next:** Webhooks & System Events

---

**Document Status:** In Progress
**Last Updated:** November 2, 2025
**Next Section:** Webhooks & System Events
