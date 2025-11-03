-- Team Track 360 - Initial Schema Migration (Part 2)
-- Date: November 2, 2025
-- Description: Continues from 001_initial_schema.sql - Remaining tables (Documents through Analytics)
-- Migration: 002_initial_schema_part2

-- ==============================================
-- 9. DOCUMENTS & MEDIA (6 tables)
-- ==============================================

-- 9.1. document_types
CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL UNIQUE,
  description text,
  category text CHECK (category IN ('medical', 'legal', 'administrative', 'other')),

  requires_approval boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9.2. documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team', 'user', 'event')),
  owner_id uuid NOT NULL,

  -- Document Info
  name text NOT NULL,
  description text,
  document_type_id uuid REFERENCES document_types(id) ON DELETE SET NULL,

  -- File
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,

  -- Sport-Specific
  sport_id uuid REFERENCES sports(id) ON DELETE SET NULL,

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

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_sport ON documents(sport_id);
CREATE INDEX IF NOT EXISTS idx_documents_approval ON documents(requires_approval, approved) WHERE requires_approval = true;

-- 9.3. document_permissions
CREATE TABLE IF NOT EXISTS document_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Who has access
  access_type text NOT NULL CHECK (access_type IN ('user', 'role', 'team', 'organization', 'public')),
  access_id uuid,

  permission_level text NOT NULL CHECK (permission_level IN ('view', 'download', 'edit', 'delete')),

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (document_id, access_type, access_id)
);

CREATE INDEX IF NOT EXISTS idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_access ON document_permissions(access_type, access_id);

-- 9.4. document_approval_queue
CREATE TABLE IF NOT EXISTS document_approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  pending_for uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,

  reviewed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_approval_queue_pending_for ON document_approval_queue(pending_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_document_approval_queue_document ON document_approval_queue(document_id);

-- 9.5. media_library
CREATE TABLE IF NOT EXISTS media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

  -- File Info
  name text NOT NULL,
  description text,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video', 'logo', 'document', 'other')),

  -- File
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,

  -- Image/Video Metadata
  width integer,
  height integer,
  duration integer,

  -- Tags
  tags text[],

  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_library_owner ON media_library(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_media_library_type ON media_library(media_type);
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON media_library USING GIN(tags);

-- 9.6. media_access_control
CREATE TABLE IF NOT EXISTS media_access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,

  granted_to_type text NOT NULL CHECK (granted_to_type IN ('organization', 'team')),
  granted_to_id uuid NOT NULL,

  granted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (media_id, granted_to_type, granted_to_id)
);

CREATE INDEX IF NOT EXISTS idx_media_access_control_media ON media_access_control(media_id);
CREATE INDEX IF NOT EXISTS idx_media_access_control_granted_to ON media_access_control(granted_to_type, granted_to_id);

-- ==============================================
-- 10. WEBHOOKS & SYSTEM EVENTS (6 tables)
-- ==============================================

-- 10.1. system_events
CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_name text NOT NULL UNIQUE,
  event_category text NOT NULL CHECK (event_category IN ('user', 'payment', 'event', 'match', 'roster', 'document', 'equipment')),
  description text,

  -- Payload Schema
  payload_schema jsonb,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_category ON system_events(event_category);

-- 10.2. webhook_endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,

  -- Provider
  provider text NOT NULL CHECK (provider IN ('gohighlevel', 'custom')),

  -- Webhook Key
  webhook_key text NOT NULL UNIQUE,

  -- Configuration
  target_table text,
  field_mappings jsonb,

  -- Security
  api_key text,
  allowed_ips text[],
  hmac_secret text,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_key ON webhook_endpoints(webhook_key);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_provider ON webhook_endpoints(provider);

-- 10.3. test_webhook_payloads
CREATE TABLE IF NOT EXISTS test_webhook_payloads (
  session_id text PRIMARY KEY,
  payload jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_test_webhook_payloads_expires ON test_webhook_payloads(expires_at);

-- 10.4. webhook_triggers
CREATE TABLE IF NOT EXISTS webhook_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_event_id uuid NOT NULL REFERENCES system_events(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,

  -- Target
  target_url text NOT NULL,
  http_method text NOT NULL DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),

  -- Headers
  headers jsonb,

  -- Payload Template
  payload_template jsonb,

  -- Scope
  scope_type text NOT NULL CHECK (scope_type IN ('platform', 'organization', 'team')),
  organization_id uuid REFERENCES parent_organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  -- Retry
  retry_on_failure boolean NOT NULL DEFAULT true,
  max_retries integer DEFAULT 3,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_triggers_event ON webhook_triggers(system_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_triggers_scope ON webhook_triggers(scope_type, organization_id, team_id);

-- 10.5. webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_trigger_id uuid NOT NULL REFERENCES webhook_triggers(id) ON DELETE CASCADE,

  -- Request
  request_url text NOT NULL,
  request_method text NOT NULL,
  request_headers jsonb,
  request_body jsonb,

  -- Response
  response_status integer,
  response_body text,
  response_time_ms integer,

  -- Result
  success boolean NOT NULL,
  error_message text,
  retry_count integer DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_trigger ON webhook_logs(webhook_trigger_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- 10.6. ghl_workflow_mappings
CREATE TABLE IF NOT EXISTS ghl_workflow_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_event_id uuid NOT NULL REFERENCES system_events(id) ON DELETE CASCADE,

  -- GHL Workflow
  ghl_workflow_id text NOT NULL,
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  -- Mapping
  contact_id_field text,
  custom_values jsonb,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghl_workflow_mappings_event ON ghl_workflow_mappings(system_event_id);
CREATE INDEX IF NOT EXISTS idx_ghl_workflow_mappings_org ON ghl_workflow_mappings(organization_id);

-- ==============================================
-- 11. GHL INTEGRATION (5 tables)
-- ==============================================

-- 11.1. ghl_oauth_connections
CREATE TABLE IF NOT EXISTS ghl_oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- OAuth Tokens (Agency Level)
  access_token_encrypted text NOT NULL,
  access_token_iv text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  refresh_token_iv text NOT NULL,
  token_expires_at timestamptz NOT NULL,

  -- Scopes
  scopes text[] NOT NULL,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  last_refreshed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11.2. user_ghl_contacts
CREATE TABLE IF NOT EXISTS user_ghl_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  ghl_location_id text NOT NULL,
  ghl_contact_id text NOT NULL,

  -- Sync Status
  last_synced_at timestamptz,
  sync_status text CHECK (sync_status IN ('synced', 'pending', 'failed')),
  sync_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, organization_id, ghl_location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ghl_contacts_user ON user_ghl_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ghl_contacts_org ON user_ghl_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_ghl_contacts_ghl_contact ON user_ghl_contacts(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_user_ghl_contacts_sync_status ON user_ghl_contacts(sync_status);

-- 11.3. ghl_user_mappings
CREATE TABLE IF NOT EXISTS ghl_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  ghl_user_id text NOT NULL,
  ghl_location_id text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_ghl_user_mappings_user ON ghl_user_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_ghl_user_mappings_org ON ghl_user_mappings(organization_id);

-- 11.4. ghl_sync_log
CREATE TABLE IF NOT EXISTS ghl_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  sync_type text NOT NULL CHECK (sync_type IN ('org_to_location', 'user_to_contact', 'user_to_user', 'event_to_workflow')),

  -- Source (Team Track)
  source_type text NOT NULL,
  source_id uuid NOT NULL,

  -- Target (GHL)
  ghl_location_id text,
  ghl_contact_id text,
  ghl_user_id text,

  -- Result
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  synced_fields text[],
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_sync_type ON ghl_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_source ON ghl_sync_log(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_status ON ghl_sync_log(status);

-- 11.5. ghl_custom_field_mappings
CREATE TABLE IF NOT EXISTS ghl_custom_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  -- Team Track Field
  tt_entity text NOT NULL,
  tt_field text NOT NULL,

  -- GHL Custom Field
  ghl_custom_field_id text NOT NULL,
  ghl_custom_field_key text NOT NULL,

  -- Transformation
  transform_function text,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, tt_entity, tt_field)
);

CREATE INDEX IF NOT EXISTS idx_ghl_custom_field_mappings_org ON ghl_custom_field_mappings(organization_id);

-- ==============================================
-- 12. WRESTLING PLATFORM INTEGRATION (3 tables)
-- ==============================================

-- 12.1. trackwrestling_imports
CREATE TABLE IF NOT EXISTS trackwrestling_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  -- Import Metadata
  import_name text NOT NULL,
  tournament_id text,
  tournament_name text,

  -- Raw Data
  raw_data jsonb NOT NULL,

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'imported', 'failed')),

  -- Mapped Event
  mapped_to_event_id uuid REFERENCES events(id) ON DELETE SET NULL,

  imported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imported_at timestamptz NOT NULL DEFAULT now(),

  -- Cleanup
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_trackwrestling_imports_org ON trackwrestling_imports(organization_id);
CREATE INDEX IF NOT EXISTS idx_trackwrestling_imports_status ON trackwrestling_imports(status);
CREATE INDEX IF NOT EXISTS idx_trackwrestling_imports_expires ON trackwrestling_imports(expires_at);

-- 12.2. bouttime_imports
CREATE TABLE IF NOT EXISTS bouttime_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  import_name text NOT NULL,
  raw_data jsonb NOT NULL,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'imported', 'failed')),
  mapped_to_event_id uuid REFERENCES events(id) ON DELETE SET NULL,

  imported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imported_at timestamptz NOT NULL DEFAULT now(),

  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_bouttime_imports_org ON bouttime_imports(organization_id);
CREATE INDEX IF NOT EXISTS idx_bouttime_imports_status ON bouttime_imports(status);

-- 12.3. tournament_import_mappings
CREATE TABLE IF NOT EXISTS tournament_import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL,
  import_type text NOT NULL CHECK (import_type IN ('trackwrestling', 'bouttime')),

  -- Field Mapping
  source_field text NOT NULL,
  target_field text NOT NULL,
  target_table text NOT NULL,

  -- Transformation
  transform_function text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_import_mappings_import ON tournament_import_mappings(import_id, import_type);

-- ==============================================
-- 13. WEBSITES & CMS (10 tables)
-- ==============================================

-- 13.1. website_templates
CREATE TABLE IF NOT EXISTS website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL UNIQUE,
  description text,
  template_type text NOT NULL CHECK (template_type IN ('platform_custom', 'organization', 'team')),

  -- Design
  primary_color text,
  secondary_color text,
  font_family text,
  header_layout text,
  footer_layout text,

  -- Layout Configuration
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Preview
  thumbnail_url text,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13.2. websites
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

  -- Basic Info
  name text NOT NULL,
  slug text NOT NULL,

  -- Template
  template_id uuid REFERENCES website_templates(id) ON DELETE SET NULL,
  inherit_from_org boolean DEFAULT true,

  -- SEO
  meta_title text,
  meta_description text,
  meta_keywords text[],

  -- GEO
  geo_enabled boolean NOT NULL DEFAULT true,
  geo_settings jsonb,

  -- Custom Tracking
  custom_tracking_codes jsonb,

  -- Status
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (owner_type, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_websites_owner ON websites(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_websites_slug ON websites(slug);
CREATE INDEX IF NOT EXISTS idx_websites_template ON websites(template_id);

-- 13.3. website_pages
CREATE TABLE IF NOT EXISTS website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  title text NOT NULL,
  slug text NOT NULL,
  page_type text NOT NULL CHECK (page_type IN ('home', 'about', 'roster', 'calendar', 'results', 'sponsors', 'donations', 'fan_page', 'custom')),

  -- Content
  content jsonb,

  -- Visibility
  is_public boolean NOT NULL DEFAULT true,
  requires_login boolean NOT NULL DEFAULT false,

  -- SEO
  meta_title text,
  meta_description text,

  -- Display Order
  display_order integer NOT NULL DEFAULT 0,

  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (website_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_website_pages_website ON website_pages(website_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_type ON website_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_website_pages_published ON website_pages(is_published) WHERE is_published = true;

-- 13.4. website_domains
CREATE TABLE IF NOT EXISTS website_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  domain_type text NOT NULL CHECK (domain_type IN ('custom', 'subdomain', 'wildcard')),
  domain text NOT NULL UNIQUE,

  -- SSL
  ssl_enabled boolean NOT NULL DEFAULT true,
  ssl_cert_status text CHECK (ssl_cert_status IN ('pending', 'active', 'expired', 'failed')),

  -- DNS Status
  dns_status text CHECK (dns_status IN ('pending', 'active', 'failed')),
  dns_records_configured boolean NOT NULL DEFAULT false,

  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_domains_website ON website_domains(website_id);
CREATE INDEX IF NOT EXISTS idx_website_domains_domain ON website_domains(domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_domains_primary ON website_domains(website_id) WHERE is_primary = true;

-- 13.5. website_forms
CREATE TABLE IF NOT EXISTS website_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  name text NOT NULL,
  form_type text NOT NULL CHECK (form_type IN ('registration', 'contact', 'donation', 'fan_page', 'custom')),

  -- Form Schema
  schema jsonb NOT NULL,

  -- Settings
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Auto-Assignment
  auto_assign_to_org uuid REFERENCES parent_organizations(id) ON DELETE SET NULL,
  auto_assign_to_team uuid REFERENCES teams(id) ON DELETE SET NULL,

  -- GHL Integration
  ghl_sync_enabled boolean NOT NULL DEFAULT true,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_forms_website ON website_forms(website_id);
CREATE INDEX IF NOT EXISTS idx_website_forms_type ON website_forms(form_type);

-- 13.6. form_submissions
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES website_forms(id) ON DELETE CASCADE,

  -- Submitted Data
  data jsonb NOT NULL,

  -- Metadata
  ip_address text,
  user_agent text,
  referrer text,

  -- GEO Data
  geo_country_name text,
  geo_country_code2 text,
  geo_state_prov text,
  geo_city text,
  geo_zipcode text,
  geo_latitude numeric,
  geo_longitude numeric,
  geo_timezone text,
  geo_isp text,
  geo_organization text,
  geo_continent_name text,
  geo_continent_code text,
  geo_currency_code text,
  geo_currency_name text,
  geo_calling_code text,
  geo_languages text,
  geo_data jsonb,

  -- User Creation
  created_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- GHL Sync
  ghl_sync_status text CHECK (ghl_sync_status IN ('pending', 'synced', 'failed')),
  ghl_contact_id text,
  ghl_synced_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user ON form_submissions(created_user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_ghl_sync ON form_submissions(ghl_sync_status);

-- 13.7. website_nav_items
CREATE TABLE IF NOT EXISTS website_nav_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  label text NOT NULL,
  url text,
  page_id uuid REFERENCES website_pages(id) ON DELETE CASCADE,

  parent_id uuid REFERENCES website_nav_items(id) ON DELETE CASCADE,

  icon text,
  display_order integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_nav_items_website ON website_nav_items(website_id);
CREATE INDEX IF NOT EXISTS idx_website_nav_items_parent ON website_nav_items(parent_id);

-- 13.8. webmaster_roles
CREATE TABLE IF NOT EXISTS webmaster_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  granted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, website_id)
);

CREATE INDEX IF NOT EXISTS idx_webmaster_roles_user ON webmaster_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_webmaster_roles_website ON webmaster_roles(website_id);

-- 13.9. website_sponsors
CREATE TABLE IF NOT EXISTS website_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,

  sponsor_tier text CHECK (sponsor_tier IN ('platinum', 'gold', 'silver', 'bronze', 'standard')),
  display_order integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_sponsors_website ON website_sponsors(website_id);
CREATE INDEX IF NOT EXISTS idx_website_sponsors_tier ON website_sponsors(sponsor_tier);

-- 13.10. website_analytics_settings
CREATE TABLE IF NOT EXISTS website_analytics_settings (
  website_id uuid PRIMARY KEY REFERENCES websites(id) ON DELETE CASCADE,

  -- Tracking
  ip_tracking_enabled boolean NOT NULL DEFAULT true,
  geo_tracking_enabled boolean NOT NULL DEFAULT true,

  -- Integrations
  google_analytics_id text,
  google_tag_manager_id text,
  facebook_pixel_id text,

  -- Built-in Analytics
  built_in_analytics_enabled boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================
-- 14. FORMS & ANALYTICS (6 tables)
-- ==============================================

-- 14.1. leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  -- User Info
  email text,
  first_name text,
  last_name text,
  phone text,

  -- Tracking
  tracking_id uuid NOT NULL,
  ip_address text NOT NULL,
  user_agent text,
  referrer text,

  -- Visit Info
  visit_count integer DEFAULT 1,
  first_visit_at timestamptz NOT NULL,
  last_visit_at timestamptz NOT NULL,

  -- GEO Data
  geo_country_name text,
  geo_country_code2 text,
  geo_state_prov text,
  geo_city text,
  geo_zipcode text,
  geo_latitude numeric,
  geo_longitude numeric,
  geo_timezone text,
  geo_isp text,
  geo_organization text,
  geo_continent_name text,
  geo_continent_code text,
  geo_currency_code text,
  geo_currency_name text,
  geo_calling_code text,
  geo_languages text,
  geo_data jsonb,

  -- Form Submission
  form_submission_id uuid REFERENCES form_submissions(id) ON DELETE SET NULL,

  -- Created User
  created_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- GHL Sync
  ghl_sync_status text CHECK (ghl_sync_status IN ('pending', 'synced', 'failed')),
  ghl_contact_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_website ON leads(website_id);
CREATE INDEX IF NOT EXISTS idx_leads_tracking_id ON leads(tracking_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_ip ON leads(ip_address);
CREATE INDEX IF NOT EXISTS idx_leads_geo_location ON leads(geo_city, geo_state_prov, geo_country_code2);

-- 14.2. website_page_views
CREATE TABLE IF NOT EXISTS website_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  page_id uuid REFERENCES website_pages(id) ON DELETE SET NULL,

  -- Visitor
  tracking_id uuid,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,

  -- Page
  page_url text NOT NULL,
  page_title text,

  -- Session
  session_id uuid,
  session_duration integer,

  -- Referrer
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_page_views_website ON website_page_views(website_id);
CREATE INDEX IF NOT EXISTS idx_website_page_views_page ON website_page_views(page_id);
CREATE INDEX IF NOT EXISTS idx_website_page_views_tracking ON website_page_views(tracking_id);
CREATE INDEX IF NOT EXISTS idx_website_page_views_session ON website_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_website_page_views_viewed_at ON website_page_views(viewed_at);

-- 14.3. website_events_tracking
CREATE TABLE IF NOT EXISTS website_events_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  -- Event
  event_name text NOT NULL,
  event_category text,
  event_value numeric,

  -- Visitor
  tracking_id uuid,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,

  -- Context
  page_url text,
  element_id text,
  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_events_tracking_website ON website_events_tracking(website_id);
CREATE INDEX IF NOT EXISTS idx_website_events_tracking_event_name ON website_events_tracking(event_name);
CREATE INDEX IF NOT EXISTS idx_website_events_tracking_tracking ON website_events_tracking(tracking_id);

-- 14.4. website_analytics_summary
CREATE TABLE IF NOT EXISTS website_analytics_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  date date NOT NULL,

  -- Metrics
  unique_visitors integer NOT NULL DEFAULT 0,
  total_page_views integer NOT NULL DEFAULT 0,
  total_sessions integer NOT NULL DEFAULT 0,
  avg_session_duration numeric,
  bounce_rate numeric,
  conversion_rate numeric,

  -- Top Pages
  top_pages jsonb,

  -- Top Referrers
  top_referrers jsonb,

  -- GEO Data
  top_countries jsonb,
  top_cities jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (website_id, date)
);

CREATE INDEX IF NOT EXISTS idx_website_analytics_summary_website_date ON website_analytics_summary(website_id, date);

-- 14.5. activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text,

  -- Action
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,

  -- Changes
  old_values jsonb,
  new_values jsonb,

  -- Metadata
  user_agent text,
  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- Total tables created: 81
-- Migration files: 001_initial_schema.sql + 002_initial_schema_part2.sql
