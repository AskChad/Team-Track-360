# Team Track 360 - Database Schema (Part 2 - Continuation)

**This document continues from DATABASE_SCHEMA.md**

---

## 10. Webhooks & System Events

### 10.1. `system_events`

System event types that can trigger webhooks/workflows.

```sql
CREATE TABLE system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_name text NOT NULL UNIQUE,  -- 'user_registered', 'payment_received', 'match_result_entered', etc.
  event_category text NOT NULL CHECK (event_category IN ('user', 'payment', 'event', 'match', 'roster', 'document', 'equipment')),
  description text,

  -- Payload Schema
  payload_schema jsonb,  -- JSON Schema defining expected payload

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_events_category ON system_events(event_category);
```

**Seed Data:**
- `user_registered` (User)
- `payment_received` (Payment)
- `late_equipment_fee_accrued` (Equipment)
- `match_result_entered` (Match)
- `event_created` (Event)
- `roster_changed` (Roster)
- `document_uploaded` (Document)

---

### 10.2. `webhook_endpoints`

Incoming webhook configurations (modular webhook builder).

```sql
CREATE TABLE webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,

  -- Provider
  provider text NOT NULL CHECK (provider IN ('gohighlevel', 'custom')),

  -- Webhook Key (in URL: /api/webhooks/receive/{webhook_key})
  webhook_key text NOT NULL UNIQUE,

  -- Configuration
  target_table text,  -- Which table to insert data into
  field_mappings jsonb,  -- [{"dbField": "first_name", "jsonPath": "$.contact.firstName"}, ...]

  -- Security
  api_key text,
  allowed_ips text[],
  hmac_secret text,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_key ON webhook_endpoints(webhook_key);
CREATE INDEX idx_webhook_endpoints_provider ON webhook_endpoints(provider);
```

**Field Mappings Example:**
```json
[
  {"dbField": "first_name", "jsonPath": "$.contact.firstName"},
  {"dbField": "last_name", "jsonPath": "$.contact.lastName"},
  {"dbField": "email", "jsonPath": "$.contact.email"},
  {"dbField": "ghl_contact_id", "jsonPath": "$.contact.id"}
]
```

---

### 10.3. `test_webhook_payloads`

Captured test payloads for webhook configuration.

```sql
CREATE TABLE test_webhook_payloads (
  session_id text PRIMARY KEY,
  payload jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX idx_test_webhook_payloads_expires ON test_webhook_payloads(expires_at);
```

**Notes:**
- Session-based storage
- Auto-expires after 15 minutes
- Used for "Click to Capture Test Payload" feature

---

###10.4. `webhook_triggers`

Outgoing webhooks (Team Track → External Systems like GHL).

```sql
CREATE TABLE webhook_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_event_id uuid NOT NULL REFERENCES system_events(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,

  -- Target
  target_url text NOT NULL,
  http_method text NOT NULL DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),

  -- Headers
  headers jsonb,  -- {"Authorization": "Bearer token", "Content-Type": "application/json"}

  -- Payload Template
  payload_template jsonb,  -- Template with placeholders: {"firstName": "{{user.first_name}}", ...}

  -- Scope (which orgs/teams trigger this)
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

CREATE INDEX idx_webhook_triggers_event ON webhook_triggers(system_event_id);
CREATE INDEX idx_webhook_triggers_scope ON webhook_triggers(scope_type, organization_id, team_id);
```

---

### 10.5. `webhook_logs`

Webhook delivery logs (outgoing).

```sql
CREATE TABLE webhook_logs (
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

CREATE INDEX idx_webhook_logs_trigger ON webhook_logs(webhook_trigger_id);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
```

---

### 10.6. `ghl_workflow_mappings`

Map system events to GHL workflows.

```sql
CREATE TABLE ghl_workflow_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_event_id uuid NOT NULL REFERENCES system_events(id) ON DELETE CASCADE,

  -- GHL Workflow
  ghl_workflow_id text NOT NULL,  -- GHL Workflow ID
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  -- Mapping
  contact_id_field text,  -- Which field contains the GHL contact ID to add to workflow
  custom_values jsonb,  -- Additional custom values to pass: {"eventName": "{{event.name}}", ...}

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ghl_workflow_mappings_event ON ghl_workflow_mappings(system_event_id);
CREATE INDEX idx_ghl_workflow_mappings_org ON ghl_workflow_mappings(organization_id);
```

---

## 11. GHL Integration

### 11.1. `ghl_oauth_connections`

GHL OAuth connections (Agency level).

```sql
CREATE TABLE ghl_oauth_connections (
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
```

**Notes:**
- One agency-level OAuth connection for the platform
- Tokens exchanged for location tokens on-demand
- Never cache location tokens (24-hour expiry)

---

### 11.2. `user_ghl_contacts`

Map users to GHL contact IDs (multiple contact IDs per user per org).

```sql
CREATE TABLE user_ghl_contacts (
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

CREATE INDEX idx_user_ghl_contacts_user ON user_ghl_contacts(user_id);
CREATE INDEX idx_user_ghl_contacts_org ON user_ghl_contacts(organization_id);
CREATE INDEX idx_user_ghl_contacts_ghl_contact ON user_ghl_contacts(ghl_contact_id);
CREATE INDEX idx_user_ghl_contacts_sync_status ON user_ghl_contacts(sync_status);
```

**Notes:**
- Users affiliated with multiple orgs get separate contact IDs per org
- Example: John Smith (Club wrestler Org A + High school wrestler Org B) = 2 contact IDs

---

### 11.3. `ghl_user_mappings`

Map Team Track admins to GHL users.

```sql
CREATE TABLE ghl_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  ghl_user_id text NOT NULL,
  ghl_location_id text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, organization_id)
);

CREATE INDEX idx_ghl_user_mappings_user ON ghl_user_mappings(user_id);
CREATE INDEX idx_ghl_user_mappings_org ON ghl_user_mappings(organization_id);
```

**Notes:**
- Only for Platform/Org/Team Admins
- Allows admins to login to GHL to manage external communications

---

### 11.4. `ghl_sync_log`

Audit trail for GHL sync operations.

```sql
CREATE TABLE ghl_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  sync_type text NOT NULL CHECK (sync_type IN ('org_to_location', 'user_to_contact', 'user_to_user', 'event_to_workflow')),

  -- Source (Team Track)
  source_type text NOT NULL,  -- 'organization', 'user', 'event', etc.
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

CREATE INDEX idx_ghl_sync_log_sync_type ON ghl_sync_log(sync_type);
CREATE INDEX idx_ghl_sync_log_source ON ghl_sync_log(source_type, source_id);
CREATE INDEX idx_ghl_sync_log_status ON ghl_sync_log(status);
```

---

### 11.5. `ghl_custom_field_mappings`

Map Team Track fields to GHL custom fields.

```sql
CREATE TABLE ghl_custom_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  -- Team Track Field
  tt_entity text NOT NULL,  -- 'user', 'athlete_profile', etc.
  tt_field text NOT NULL,  -- 'weight_class', 'grade_level', etc.

  -- GHL Custom Field
  ghl_custom_field_id text NOT NULL,
  ghl_custom_field_key text NOT NULL,

  -- Transformation
  transform_function text,  -- 'uppercase', 'lowercase', 'format_phone', etc.

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, tt_entity, tt_field)
);

CREATE INDEX idx_ghl_custom_field_mappings_org ON ghl_custom_field_mappings(organization_id);
```

---

## 12. Wrestling Platform Integration

### 12.1. `trackwrestling_imports`

Temporary holding table for TrackWrestling tournament data.

```sql
CREATE TABLE trackwrestling_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES parent_organizations(id) ON DELETE CASCADE,

  -- Import Metadata
  import_name text NOT NULL,
  tournament_id text,  -- TrackWrestling tournament ID
  tournament_name text,

  -- Raw Data
  raw_data jsonb NOT NULL,  -- Full API/scraped response

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'imported', 'failed')),

  -- Mapped Event (after user maps)
  mapped_to_event_id uuid REFERENCES events(id) ON DELETE SET NULL,

  imported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imported_at timestamptz NOT NULL DEFAULT now(),

  -- Cleanup
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_trackwrestling_imports_org ON trackwrestling_imports(organization_id);
CREATE INDEX idx_trackwrestling_imports_status ON trackwrestling_imports(status);
CREATE INDEX idx_trackwrestling_imports_expires ON trackwrestling_imports(expires_at);
```

---

### 12.2. `bouttime_imports`

Temporary holding table for BoutTime data.

```sql
CREATE TABLE bouttime_imports (
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

CREATE INDEX idx_bouttime_imports_org ON bouttime_imports(organization_id);
CREATE INDEX idx_bouttime_imports_status ON bouttime_imports(status);
```

---

### 12.3. `tournament_import_mappings`

User-defined field mappings for tournament imports.

```sql
CREATE TABLE tournament_import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL,  -- trackwrestling_imports.id or bouttime_imports.id
  import_type text NOT NULL CHECK (import_type IN ('trackwrestling', 'bouttime')),

  -- Field Mapping
  source_field text NOT NULL,  -- JSON path in raw_data
  target_field text NOT NULL,  -- Team Track field
  target_table text NOT NULL,  -- 'events', 'wrestling_matches', 'wrestling_roster_members', etc.

  -- Transformation
  transform_function text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournament_import_mappings_import ON tournament_import_mappings(import_id, import_type);
```

**Notes:**
- User reviews imported data
- Maps fields via UI (drag-and-drop or form)
- Finalizes import to create events/matches

---

## 13. Websites & CMS

### 13.1. `websites`

Websites for platform, orgs, and teams.

```sql
CREATE TABLE websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_type text NOT NULL CHECK (owner_type IN ('platform', 'organization', 'team')),
  owner_id uuid NOT NULL,

  -- Basic Info
  name text NOT NULL,
  slug text NOT NULL,

  -- Template
  template_id uuid REFERENCES website_templates(id) ON DELETE SET NULL,
  inherit_from_org boolean DEFAULT true,  -- Teams inherit org design

  -- SEO
  meta_title text,
  meta_description text,
  meta_keywords text[],

  -- GEO (Generative Engine Optimization)
  geo_enabled boolean NOT NULL DEFAULT true,
  geo_settings jsonb,

  -- Custom Tracking
  custom_tracking_codes jsonb,  -- {"google_analytics": "G-XXXXXX", "facebook_pixel": "123456", ...}

  -- Status
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (owner_type, owner_id)
);

CREATE INDEX idx_websites_owner ON websites(owner_type, owner_id);
CREATE INDEX idx_websites_slug ON websites(slug);
CREATE INDEX idx_websites_template ON websites(template_id);
```

---

### 13.2. `website_templates`

Templates for org and team websites.

```sql
CREATE TABLE website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL UNIQUE,
  description text,
  template_type text NOT NULL CHECK (template_type IN ('platform_custom', 'organization', 'team')),

  -- Design
  primary_color text,
  secondary_color text,
  font_family text,
  header_layout text,  -- 'classic', 'centered', 'minimal'
  footer_layout text,

  -- Layout Configuration
  layout_config jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Preview
  thumbnail_url text,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Seed Data:**
- Platform Custom (non-templated, for Team Track 360 marketing)
- Organization Template 1
- Team Template 1

---

### 13.3. `website_pages`

Dynamic pages for each website.

```sql
CREATE TABLE website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  title text NOT NULL,
  slug text NOT NULL,
  page_type text NOT NULL CHECK (page_type IN ('home', 'about', 'roster', 'calendar', 'results', 'sponsors', 'donations', 'fan_page', 'custom')),

  -- Content
  content jsonb,  -- Rich content blocks: [{"type": "text", "content": "..."}, {"type": "image", "url": "..."}, ...]

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

CREATE INDEX idx_website_pages_website ON website_pages(website_id);
CREATE INDEX idx_website_pages_type ON website_pages(page_type);
CREATE INDEX idx_website_pages_published ON website_pages(is_published) WHERE is_published = true;
```

---

### 13.4. `website_domains`

Custom domains and subdomains.

```sql
CREATE TABLE website_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  domain_type text NOT NULL CHECK (domain_type IN ('custom', 'subdomain', 'wildcard')),
  domain text NOT NULL UNIQUE,  -- 'springfieldwrestling.com', 'springfield.teamtrack360.com', '*.teamtrack360.com'

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

CREATE INDEX idx_website_domains_website ON website_domains(website_id);
CREATE INDEX idx_website_domains_domain ON website_domains(domain);
CREATE UNIQUE INDEX idx_website_domains_primary ON website_domains(website_id) WHERE is_primary = true;
```

---

### 13.5. `website_forms`

Forms on websites (registration, contact, donation, fan pages).

```sql
CREATE TABLE website_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  name text NOT NULL,
  form_type text NOT NULL CHECK (form_type IN ('registration', 'contact', 'donation', 'fan_page', 'custom')),

  -- Form Schema (from Form Builder)
  schema jsonb NOT NULL,  -- FormSchema with elements

  -- Settings
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,  -- submitButtonText, successMessage, redirectUrl, etc.

  -- Auto-Assignment (for registration forms)
  auto_assign_to_org uuid REFERENCES parent_organizations(id) ON DELETE SET NULL,
  auto_assign_to_team uuid REFERENCES teams(id) ON DELETE SET NULL,

  -- GHL Integration
  ghl_sync_enabled boolean NOT NULL DEFAULT true,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_forms_website ON website_forms(website_id);
CREATE INDEX idx_website_forms_type ON website_forms(form_type);
```

**Notes:**
- Automatically assign users to org/team based on which website form they filled out
- Trigger GHL sync on submission

---

### 13.6. `form_submissions`

Submissions from website forms.

```sql
CREATE TABLE form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES website_forms(id) ON DELETE CASCADE,

  -- Submitted Data
  data jsonb NOT NULL,

  -- Metadata
  ip_address text,
  user_agent text,
  referrer text,

  -- GEO Data (ipGEOlocation API)
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
  geo_data jsonb,  -- Full API response

  -- User Creation
  created_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- GHL Sync
  ghl_sync_status text CHECK (ghl_sync_status IN ('pending', 'synced', 'failed')),
  ghl_contact_id text,
  ghl_synced_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_user ON form_submissions(created_user_id);
CREATE INDEX idx_form_submissions_ghl_sync ON form_submissions(ghl_sync_status);
```

---

### 13.7. `website_nav_items`

Navigation structure (auto-generated + custom).

```sql
CREATE TABLE website_nav_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  label text NOT NULL,
  url text,
  page_id uuid REFERENCES website_pages(id) ON DELETE CASCADE,  -- Internal page link

  parent_id uuid REFERENCES website_nav_items(id) ON DELETE CASCADE,  -- For dropdowns

  icon text,
  display_order integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_nav_items_website ON website_nav_items(website_id);
CREATE INDEX idx_website_nav_items_parent ON website_nav_items(parent_id);
```

**Notes:**
- Teams automatically listed in dropdown nav bar per organization
- Custom nav items supported

---

### 13.8. `webmaster_roles`

Non-admin users who can edit website settings.

```sql
CREATE TABLE webmaster_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  granted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, website_id)
);

CREATE INDEX idx_webmaster_roles_user ON webmaster_roles(user_id);
CREATE INDEX idx_webmaster_roles_website ON webmaster_roles(website_id);
```

---

### 13.9. `website_sponsors`

Sponsor showcase on websites.

```sql
CREATE TABLE website_sponsors (
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

CREATE INDEX idx_website_sponsors_website ON website_sponsors(website_id);
CREATE INDEX idx_website_sponsors_tier ON website_sponsors(sponsor_tier);
```

---

### 13.10. `website_analytics_settings`

Analytics configuration per website.

```sql
CREATE TABLE website_analytics_settings (
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
```

---

## 14. Forms & Analytics

### 14.1. `leads`

Website visitors and form submissions (with ipGEOlocation tracking).

```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  -- User Info (if form submitted)
  email text,
  first_name text,
  last_name text,
  phone text,

  -- Tracking
  tracking_id uuid NOT NULL,  -- Persistent across visits
  ip_address text NOT NULL,
  user_agent text,
  referrer text,

  -- Visit Info
  visit_count integer DEFAULT 1,
  first_visit_at timestamptz NOT NULL,
  last_visit_at timestamptz NOT NULL,

  -- GEO Data (ipGEOlocation API)
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
  geo_data jsonb,  -- Full API response

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

CREATE INDEX idx_leads_website ON leads(website_id);
CREATE INDEX idx_leads_tracking_id ON leads(tracking_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_ip ON leads(ip_address);
CREATE INDEX idx_leads_geo_location ON leads(geo_city, geo_state_prov, geo_country_code2);
```

**Flow:**
```
User visits site → Track with ipGEOlocation → Store in leads table (visit_count++)
User fills form → Link form_submission → Create user → Trigger GHL sync
```

---

### 14.2. `website_page_views`

Track page views for analytics.

```sql
CREATE TABLE website_page_views (
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
  session_duration integer,  -- Seconds

  -- Referrer
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_page_views_website ON website_page_views(website_id);
CREATE INDEX idx_website_page_views_page ON website_page_views(page_id);
CREATE INDEX idx_website_page_views_tracking ON website_page_views(tracking_id);
CREATE INDEX idx_website_page_views_session ON website_page_views(session_id);
CREATE INDEX idx_website_page_views_viewed_at ON website_page_views(viewed_at);
```

---

### 14.3. `website_events_tracking`

Track custom events (button clicks, downloads, etc.).

```sql
CREATE TABLE website_events_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  -- Event
  event_name text NOT NULL,  -- 'button_click', 'download', 'video_play', etc.
  event_category text,  -- 'engagement', 'conversion', 'navigation'
  event_value numeric,

  -- Visitor
  tracking_id uuid,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,

  -- Context
  page_url text,
  element_id text,  -- DOM element ID
  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_website_events_tracking_website ON website_events_tracking(website_id);
CREATE INDEX idx_website_events_tracking_event_name ON website_events_tracking(event_name);
CREATE INDEX idx_website_events_tracking_tracking ON website_events_tracking(tracking_id);
```

---

### 14.4. `website_analytics_summary`

Pre-aggregated analytics (daily rollups).

```sql
CREATE TABLE website_analytics_summary (
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
  top_pages jsonb,  -- [{"page_url": "/roster", "views": 123}, ...]

  -- Top Referrers
  top_referrers jsonb,

  -- GEO Data
  top_countries jsonb,
  top_cities jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (website_id, date)
);

CREATE INDEX idx_website_analytics_summary_website_date ON website_analytics_summary(website_id, date);
```

---

### 14.5. `activity_log`

Global activity log for audit trail.

```sql
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text,

  -- Action
  action_type text NOT NULL,  -- 'created', 'updated', 'deleted', 'login', 'logout', etc.
  entity_type text NOT NULL,  -- 'user', 'team', 'event', 'match', etc.
  entity_id uuid,

  -- Changes
  old_values jsonb,
  new_values jsonb,

  -- Metadata
  user_agent text,
  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_action ON activity_log(action_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
```

---

## Final Schema Summary

**Total Tables Designed:** 81

**By Category:**
- Core Hierarchy: 5 tables
- Users & Permissions: 7 tables
- Sport-Specific Profiles: 1 table (+ future sports)
- Events & Competitions: 7 tables
- Rosters & Stats: 5 tables
- Competitors System: 4 tables
- Payment System: 8 tables
- Equipment Management: 3 tables
- Documents & Media: 6 tables
- Webhooks & System Events: 6 tables
- GHL Integration: 5 tables
- Wrestling Platform Integration: 3 tables
- Websites & CMS: 10 tables
- Forms & Analytics: 6 tables

---

## Next Steps

1. **Create Migration Files**: Convert schema to executable SQL migrations
2. **Add RLS Policies**: Implement Row Level Security for all tables
3. **Create Triggers**: Add `updated_at` auto-update triggers
4. **Seed Data**: Insert initial data (sports, event types, document types)
5. **Test Schema**: Verify all relationships and constraints
6. **Build API**: Create API endpoints for CRUD operations

---

**Document Status:** Schema Design Complete
**Last Updated:** November 2, 2025
**Total Tables:** 81
