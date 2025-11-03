-- Team Track 360 - Initial Schema Migration
-- Date: November 2, 2025
-- Description: Creates all 81 tables for Team Track 360
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. CORE HIERARCHY (5 tables)
-- ==============================================

-- 1.1. sports
CREATE TABLE IF NOT EXISTS sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sports_active ON sports(is_active);
CREATE INDEX IF NOT EXISTS idx_sports_display_order ON sports(display_order);

-- 1.2. parent_organizations
CREATE TABLE IF NOT EXISTS parent_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
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
  ghl_location_id text,
  ghl_sync_enabled boolean NOT NULL DEFAULT false,

  -- Settings
  logo_url text,
  primary_color text,
  secondary_color text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_organizations_slug ON parent_organizations(slug);
CREATE INDEX IF NOT EXISTS idx_parent_organizations_active ON parent_organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_parent_organizations_ghl_location ON parent_organizations(ghl_location_id) WHERE ghl_location_id IS NOT NULL;

-- 1.3. organization_sports
CREATE TABLE IF NOT EXISTS organization_sports (
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (organization_id, sport_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_sports_org ON organization_sports(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_sports_sport ON organization_sports(sport_id);

-- 1.4. teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,

  name text NOT NULL,
  slug text NOT NULL,
  team_type text NOT NULL CHECK (team_type IN ('team', 'club')),
  school_level text CHECK (school_level IN ('high_school', 'jr_high', 'middle_school', 'elementary', 'college')),

  -- Contact Info
  address text,
  city text,
  state text,
  zip text,
  phone_number text,
  email text,

  -- Branding
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

CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_sport ON teams(sport_id);
CREATE INDEX IF NOT EXISTS idx_teams_type ON teams(team_type);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active) WHERE deleted_at IS NULL;

-- 1.5. seasons
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,

  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,

  -- Sport-Specific Settings
  weight_classes jsonb,
  age_brackets jsonb,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_seasons_organization ON seasons(organization_id);
CREATE INDEX IF NOT EXISTS idx_seasons_sport ON seasons(sport_id);
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);

-- ==============================================
-- 2. USERS & PERMISSIONS (7 tables)
-- ==============================================

-- 2.1. profiles
CREATE TABLE IF NOT EXISTS profiles (
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

  -- Platform Role
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

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_role ON profiles(platform_role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active) WHERE deleted_at IS NULL;

-- 2.2. user_types
CREATE TABLE IF NOT EXISTS user_types (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('athlete', 'coach', 'parent', 'donor', 'volunteer', 'official')),
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_user_types_user ON user_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_types_type ON user_types(type);

-- 2.3. admin_roles
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Scope
  role_type text NOT NULL CHECK (role_type IN ('org_admin', 'team_admin')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CHECK (
    (role_type = 'org_admin' AND team_id IS NULL) OR
    (role_type = 'team_admin' AND team_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_org ON admin_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_team ON admin_roles(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_roles_unique_org ON admin_roles(user_id, organization_id) WHERE role_type = 'org_admin';
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_roles_unique_team ON admin_roles(user_id, team_id) WHERE role_type = 'team_admin';

-- 2.4. roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,

  -- Scope
  scope_type text NOT NULL CHECK (scope_type IN ('system', 'organization', 'team')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  -- Permissions
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (name, scope_type, organization_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope_type, organization_id, team_id);

-- 2.5. role_assignments
CREATE TABLE IF NOT EXISTS role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Scope
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_ids uuid[] DEFAULT '{}'::uuid[],

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, role_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_org ON role_assignments(organization_id);

-- 2.6. families
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,

  -- Settings
  billing_type text NOT NULL DEFAULT 'family' CHECK (billing_type IN ('family', 'per_member')),
  payment_card_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.7. family_members
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role in family
  is_admin boolean NOT NULL DEFAULT false,
  relationship text,

  -- Privacy
  allow_family_admin_access boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_admin ON family_members(is_admin) WHERE is_admin = true;

-- ==============================================
-- 3. SPORT-SPECIFIC PROFILES (1+ tables)
-- ==============================================

-- 3.1. wrestling_athlete_profiles
CREATE TABLE IF NOT EXISTS wrestling_athlete_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Wrestling-Specific
  current_weight_class text,
  preferred_weight_class text,
  wrestling_style text CHECK (wrestling_style IN ('folkstyle', 'freestyle', 'greco-roman')),
  grade_level text,
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

  UNIQUE (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_wrestling_profiles_user ON wrestling_athlete_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_profiles_team ON wrestling_athlete_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_profiles_weight_class ON wrestling_athlete_profiles(current_weight_class);

-- ==============================================
-- 4. EVENTS & COMPETITIONS (7 tables)
-- ==============================================

-- 4.1. locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'USA',

  -- Venue Details
  venue_type text,
  capacity integer,
  facilities jsonb,

  -- Contact
  phone text,
  website_url text,

  -- Coordinates
  latitude numeric,
  longitude numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_city_state ON locations(city, state);

-- 4.2. competitions
CREATE TABLE IF NOT EXISTS competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,

  name text NOT NULL,
  description text,
  competition_type text CHECK (competition_type IN ('tournament', 'dual_meet', 'tri_meet', 'invitational', 'championship')),

  -- Default Location
  default_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,

  -- Recurring
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitions_organization ON competitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_competitions_sport ON competitions(sport_id);

-- 4.3. event_types
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,
  icon text,
  color text,

  -- Category
  category text NOT NULL CHECK (category IN ('competitive', 'meeting', 'practice', 'social', 'fundraiser', 'other')),

  -- Scope
  scope_type text NOT NULL DEFAULT 'system' CHECK (scope_type IN ('system', 'organization', 'team')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  -- System Adoption
  adopted_from_org_id uuid REFERENCES parent_organizations(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_event_types_scope ON event_types(scope_type, organization_id, team_id);

-- 4.4. events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES competitions(id) ON DELETE SET NULL,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,

  name text NOT NULL,
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
  weigh_in_time time,
  check_in_time time,
  registration_deadline timestamptz,

  -- Visibility
  is_public boolean NOT NULL DEFAULT false,
  show_results_public boolean NOT NULL DEFAULT false,

  -- Settings
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_competition ON events(competition_id);
CREATE INDEX IF NOT EXISTS idx_events_team ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_season ON events(season_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public) WHERE is_public = true;

-- 4.5. event_rsvps
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  response text NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  guests_count integer DEFAULT 0,
  notes text,

  -- Attendance
  attended boolean,
  attended_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_response ON event_rsvps(response);

-- 4.6. user_calendar_integrations
CREATE TABLE IF NOT EXISTS user_calendar_integrations (
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

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON user_calendar_integrations(user_id);

-- 4.7. event_reminders
CREATE TABLE IF NOT EXISTS event_reminders (
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

CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user ON event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_remind_at ON event_reminders(remind_at) WHERE status = 'pending';

-- ==============================================
-- 5. ROSTERS & STATS (5 tables)
-- ==============================================

-- 5.1. event_rosters
CREATE TABLE IF NOT EXISTS event_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  name text,
  roster_type text,

  -- Roster Size Limits
  max_athletes integer,
  max_per_weight_class integer,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_rosters_event ON event_rosters(event_id);

-- 5.2. wrestling_roster_members
CREATE TABLE IF NOT EXISTS wrestling_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES event_rosters(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL REFERENCES wrestling_athlete_profiles(id) ON DELETE CASCADE,

  -- Wrestling Specific
  weight_class text NOT NULL,
  seed integer,
  made_weight boolean,
  actual_weight numeric,

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scratched', 'injured', 'unavailable')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (roster_id, athlete_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_wrestling_roster_members_roster ON wrestling_roster_members(roster_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_roster_members_athlete ON wrestling_roster_members(athlete_profile_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_roster_members_weight_class ON wrestling_roster_members(weight_class);

-- 5.3. roster_change_log
CREATE TABLE IF NOT EXISTS roster_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES event_rosters(id) ON DELETE CASCADE,
  athlete_profile_id uuid NOT NULL,

  change_type text NOT NULL CHECK (change_type IN ('added', 'removed', 'weight_class_changed', 'status_changed')),
  reason text CHECK (reason IN ('no_show', 'illness', 'injury', 'previous_engagement', 'weight_issues', 'discipline', 'other')),
  notes text,

  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_change_log_roster ON roster_change_log(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_change_log_athlete ON roster_change_log(athlete_profile_id);

-- 5.4. wrestling_matches
CREATE TABLE IF NOT EXISTS wrestling_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Our Athlete
  athlete_profile_id uuid NOT NULL REFERENCES wrestling_athlete_profiles(id) ON DELETE CASCADE,
  weight_class text NOT NULL,

  -- Opponent
  opponent_athlete_id uuid REFERENCES wrestling_athlete_profiles(id) ON DELETE SET NULL,
  opponent_name text,
  opponent_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  opponent_team_name text,

  -- Match Details
  match_number integer,
  round text,
  bout_type text,

  -- Result
  result text NOT NULL CHECK (result IN ('win', 'loss', 'draw', 'forfeit', 'bye', 'disqualified')),
  win_method text CHECK (win_method IN ('fall', 'tech_fall', 'major_decision', 'decision', 'forfeit', 'injury_default', 'disqualification')),
  score_athlete integer,
  score_opponent integer,
  match_time text,

  -- Phase 2
  detailed_scoring jsonb,

  -- Verification
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrestling_matches_event ON wrestling_matches(event_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_matches_athlete ON wrestling_matches(athlete_profile_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_matches_opponent ON wrestling_matches(opponent_athlete_id);
CREATE INDEX IF NOT EXISTS idx_wrestling_matches_result ON wrestling_matches(result);

-- ==============================================
-- 6. COMPETITORS SYSTEM (4 tables)
-- ==============================================

-- 6.1. competitor_teams
CREATE TABLE IF NOT EXISTS competitor_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  city text,
  state text,
  zip text,
  sports text[],

  -- Claiming
  claimed boolean NOT NULL DEFAULT false,
  claimed_by_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  claimed_at timestamptz,

  -- De-duplication
  duplicate_of uuid REFERENCES competitor_teams(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_teams_name ON competitor_teams(name);
CREATE INDEX IF NOT EXISTS idx_competitor_teams_location ON competitor_teams(city, state);
CREATE INDEX IF NOT EXISTS idx_competitor_teams_claimed ON competitor_teams(claimed);

-- 6.2. competitor_athletes
CREATE TABLE IF NOT EXISTS competitor_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_team_id uuid NOT NULL REFERENCES competitor_teams(id) ON DELETE CASCADE,

  name text NOT NULL,
  sport text NOT NULL,
  weight_class text,

  -- Claiming
  claimed boolean NOT NULL DEFAULT false,
  claimed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,

  -- De-duplication
  duplicate_of uuid REFERENCES competitor_athletes(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_athletes_team ON competitor_athletes(competitor_team_id);
CREATE INDEX IF NOT EXISTS idx_competitor_athletes_name ON competitor_athletes(name);
CREATE INDEX IF NOT EXISTS idx_competitor_athletes_claimed ON competitor_athletes(claimed);

-- 6.3. competitor_claims
CREATE TABLE IF NOT EXISTS competitor_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  claim_type text NOT NULL CHECK (claim_type IN ('team', 'athlete')),
  competitor_id uuid NOT NULL,

  action text NOT NULL CHECK (action IN ('claim', 'unclaim', 'auto_link')),
  claimed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  linked_to_id uuid,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_claims_competitor ON competitor_claims(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_claims_type ON competitor_claims(claim_type);

-- 6.4. duplicate_detections
CREATE TABLE IF NOT EXISTS duplicate_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  detection_type text NOT NULL CHECK (detection_type IN ('team', 'athlete')),
  original_id uuid NOT NULL,
  potential_duplicate_id uuid NOT NULL,

  confidence_score numeric NOT NULL,
  matching_fields jsonb,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'dismissed', 'flagged')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_detections_status ON duplicate_detections(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_detections_confidence ON duplicate_detections(confidence_score);

-- ==============================================
-- 7. PAYMENT SYSTEM (8 tables)
-- ==============================================

-- 7.1. payment_gateways
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

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

CREATE INDEX IF NOT EXISTS idx_payment_gateways_owner ON payment_gateways(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON payment_gateways(provider);

-- 7.2. gateway_access
CREATE TABLE IF NOT EXISTS gateway_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES payment_gateways(id) ON DELETE CASCADE,

  -- Who gets access
  granted_to_type text NOT NULL CHECK (granted_to_type IN ('organization', 'team')),
  granted_to_id uuid NOT NULL,

  granted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_access_gateway ON gateway_access(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateway_access_granted_to ON gateway_access(granted_to_type, granted_to_id);

-- 7.3. fee_structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is charging
  charged_by_type text NOT NULL CHECK (charged_by_type IN ('platform', 'organization', 'team')),
  charged_by_id uuid NOT NULL,

  -- Who is being charged
  charged_to_type text NOT NULL CHECK (charged_to_type IN ('organization', 'team', 'user')),

  name text NOT NULL,
  description text,

  -- Fee Structure
  fee_type text NOT NULL CHECK (fee_type IN ('subscription', 'per_organization', 'per_user', 'one_time')),
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text CHECK (billing_interval IN ('monthly', 'yearly', 'one_time')),

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_charged_by ON fee_structures(charged_by_type, charged_by_id);

-- 7.4. products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator
  created_by_type text NOT NULL CHECK (created_by_type IN ('platform', 'organization', 'team')),
  created_by_id uuid NOT NULL,

  -- Visibility
  visibility_type text NOT NULL CHECK (visibility_type IN ('all_users', 'all_orgs', 'specific_orgs', 'specific_teams', 'team_members')),
  visible_to_org_ids uuid[],
  visible_to_team_ids uuid[],

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
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by_type, created_by_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_event ON products(event_id);

-- 7.5. invoices
CREATE TABLE IF NOT EXISTS invoices (
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

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status IN ('sent', 'partial', 'overdue');

-- 7.6. invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,

  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- 7.7. payment_plans
CREATE TABLE IF NOT EXISTS payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  total_installments integer NOT NULL,
  installment_amount numeric(10, 2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),

  first_payment_date date NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_invoice ON payment_plans(invoice_id);

-- 7.8. transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,

  -- Payer
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Payment Gateway
  gateway_id uuid REFERENCES payment_gateways(id) ON DELETE SET NULL,
  external_transaction_id text,

  -- Amount
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',

  -- Type
  transaction_type text NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'credit', 'fee')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Cascade Tracking
  cascade_chain jsonb,

  -- Metadata
  payment_method text,
  metadata jsonb,

  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON transactions(gateway_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_external ON transactions(external_transaction_id);

-- ==============================================
-- 8. EQUIPMENT MANAGEMENT (3 tables)
-- ==============================================

-- 8.1. equipment
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

  name text NOT NULL,
  equipment_type text,
  size text,
  serial_number text,

  -- Condition
  condition text CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor', 'damaged')),

  -- Purchase Info
  purchase_date date,
  purchase_cost numeric(10, 2),
  warranty_expires_at date,

  -- Checkout Rules
  can_checkout_to text[] DEFAULT ARRAY['athlete', 'coach'],

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_owner ON equipment(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type);

-- 8.2. equipment_checkouts
CREATE TABLE IF NOT EXISTS equipment_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  checked_out_at timestamptz NOT NULL DEFAULT now(),
  checked_out_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

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

CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_equipment ON equipment_checkouts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_user ON equipment_checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_due_date ON equipment_checkouts(due_date) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_checkouts_late ON equipment_checkouts(is_late) WHERE is_late = true AND returned_at IS NOT NULL;

-- 8.3. equipment_late_fees
CREATE TABLE IF NOT EXISTS equipment_late_fees (
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

CREATE INDEX IF NOT EXISTS idx_equipment_late_fees_checkout ON equipment_late_fees(checkout_id);
CREATE INDEX IF NOT EXISTS idx_equipment_late_fees_status ON equipment_late_fees(status);

-- Continue in next file due to size limit...
