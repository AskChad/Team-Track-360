# Team Track 360 - Project References Summary

**Date:** November 2, 2025
**Purpose:** Document key learnings from referenced projects for Team Track 360 implementation

---

## Projects Referenced

1. **Attack Kit** (`/mnt/c/development/resources/ATTACK_KIT.md`)
2. **Data Engine** (`/mnt/c/development/Data_Engine`)
3. **Form Builder** (`/mnt/c/development/form-builder`)
4. **Marketing ROI Calculator** (`/mnt/c/development/marketing_ROI_Calculator`)

---

## 1. Attack Kit Standards

### Key Sections Applied to Team Track 360:

**Section 19: GHL Company Data Sync**
- Agency token → Location token exchange pattern
- Bi-directional linking via custom values
- Field mapping with fallback chains
- Token refresh handling
- Automatic OAuth token lifecycle management

**Section 20: OAuth Integration Standards - GoHighLevel**
- Location Token Exchange Pattern (default implementation)
- Required scopes: `oauth.readonly`, `oauth.write`, `locations/*`, `contacts/*`
- Agency tokens for reading, Location tokens for modifications
- 24-hour location token expiry (exchange on-demand, don't cache)
- Security: Store only agency tokens (encrypted), mint location tokens as needed

**Section 21: Token Manager Access & Usage**
- Node.js service for token management
- Location: `/mnt/c/Development/video_game_tokens/server.js`
- Integration patterns for other projects

**Section 22: Supabase exec_sql Function**
- **CRITICAL**: ALL projects must use exec_sql for database migrations
- Migration runner script pattern
- Idempotent migrations with IF EXISTS/IF NOT EXISTS
- Security: Only platform_admin or super_admin can execute

**Section 23: Conversation Documentation**
- Document conversations before compaction
- Filename: `YYYY-MM-DD_Subject_Description.md`
- Structure: Summary, Q&A, Key Decisions, Technical Details, Next Steps

---

## 2. Data Engine Implementation

### GHL Integration Patterns

**OAuth Service** (`lib/services/ghl-oauth.service.ts`):
```typescript
async getLocationToken(agencyAccessToken: string, locationId: string): Promise<{
  access_token: string;
  expires_in: number;
  locationId: string;
}>
```

**Company Sync** (`app/api/companies/[id]/sync-ghl/route.ts`):
1. Validate company has `ghl_location_id`
2. Get active OAuth connection
3. Refresh token if expired
4. Fetch location data from GHL
5. Map fields with fallback logic
6. Update database
7. Exchange for location token
8. Update "Data Engine ID" custom value in GHL

### Webhook System

**Test Payload Capture** (`app/api/webhooks/test/capture/route.ts`):
- POST to capture test payloads
- GET to retrieve captured payloads
- Session-based storage

**Dynamic Webhook Receiver** (`app/api/webhooks/receive/[webhook_key]/route.ts`):
- Provider routing (GHL vs Custom)
- JSON path field mapping (e.g., `$.contact.firstName` → `first_name`)
- Automatic database insertion
- Supports capture test mode

**Field Mapping Pattern:**
```typescript
function transformWebhookData(
  webhookPayload: any,
  fieldMappings: Array<{ dbField: string; jsonPath: string }>
): Record<string, any>
```

---

## 3. Form Builder Architecture

### Database Schema

**Tables:**
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - User access to workspaces
- `forms` - Form definitions with schema
- `submissions` - Form submission data
- `form_templates` - Pre-built form templates
- `webhook_logs` - Webhook delivery tracking

### Form Schema Structure

**Form Element Types:**
- Input: `text`, `textarea`, `email`, `phone`
- Selection: `select`, `radio`, `checkbox`
- File: `file`
- Static: `image`, `heading`, `paragraph`, `divider`

**Key Features:**
```typescript
interface FormElement {
  id: string
  type: FormElementType
  width?: 'full' | 'half' | 'third'
  className?: string
}

interface InputFormElement extends BaseFormElement {
  label: string
  placeholder?: string
  required?: boolean
  validation?: ValidationRule[]
  conditional?: ConditionalLogic  // Show/hide based on other fields
}

interface ConditionalLogic {
  show: boolean
  conditions: {
    fieldId: string
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'
    value: any
  }[]
  logic: 'and' | 'or'
}

interface FormSettings {
  submitButtonText: string
  successMessage: string
  redirectUrl?: string
  allowPrefill: boolean
  prefillMapping?: Record<string, string>
  recaptcha?: boolean
  customCss?: string
}
```

**GHL Integration:**
- Encrypted API key storage (`ghl_api_key_encrypted`, `ghl_api_key_iv`)
- `ghl_location_id` per form
- Submission tracking with GHL sync status

**Webhook Integration:**
```typescript
interface Webhook {
  url: string
  enabled: boolean
  headers?: Record<string, string>
}
```

**Submission Metadata:**
```typescript
interface SubmissionMetadata {
  ip?: string
  userAgent?: string
  referrer?: string
  timestamp?: string
  prefilled?: boolean
}
```

---

## 4. Marketing ROI Calculator - Analytics & Tracking

### ipGEOlocation API Integration

**Service:** `https://api.ipgeolocation.io/ipgeo`
**API Key:** `1205b2d5d21f46998615ea2330c60713`

**Implementation** (`lib/get-ip-address.ts`):

```typescript
// Get IP from request (handles reverse proxies)
function getIPAddress(request: NextRequest): string {
  // Check: x-forwarded-for, x-real-ip, cf-connecting-ip, fastly-client-ip, etc.
}

// Fetch GEO data
async function getIPGeolocation(ipAddress: string): Promise<IPGeolocationData | null> {
  const apiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`
  // Cache for 1 hour to avoid excessive API calls
}

// Extract fields for database
function extractGeolocationFields(geoData: IPGeolocationData | null) {
  return {
    geo_country_name: geoData.country_name || null,
    geo_country_code2: geoData.country_code2 || null,
    geo_state_prov: geoData.state_prov || null,
    geo_city: geoData.city || null,
    geo_zipcode: geoData.zipcode || null,
    geo_latitude: parseFloat(geoData.latitude) || null,
    geo_longitude: parseFloat(geoData.longitude) || null,
    geo_timezone: geoData.time_zone?.name || null,
    geo_isp: geoData.isp || null,
    geo_organization: geoData.organization || null,
    geo_continent_name: geoData.continent_name || null,
    geo_continent_code: geoData.continent_code || null,
    geo_currency_code: geoData.currency?.code || null,
    geo_currency_name: geoData.currency?.name || null,
    geo_calling_code: geoData.calling_code || null,
    geo_languages: geoData.languages || null,
    geo_data: geoData,  // Store full response as JSONB
  }
}
```

### Lead Capture Pattern

**Database Columns** (`lead_captures` table):
- User data: `first_name`, `last_name`, `email`, `phone`, `company_name`, `website_url`
- Tracking: `tracking_id`, `ip_address`, `visit_count`
- GEO fields: All 16 fields listed above
- Brand/tenant: `brand_id`

**Flow:**
1. Extract IP from request headers
2. Fetch GEO data from ipgeolocation.io API
3. Extract GEO fields
4. Check for existing email → reuse tracking_id
5. Insert lead with all tracking data
6. Set tracking cookie
7. Sync to GHL (if configured)

**Tracking ID System:**
- Persistent across visits
- Stored in cookie
- Reused for returning users (matched by email)
- Enables visit count tracking

---

## Key Implementation Patterns for Team Track 360

### 1. GHL Integration Architecture

```
Team Track 360 (Agency Level)
  ├── Platform Sub-account (for platform communications)
  └── Organizations (Locations)
      ├── Org 1 → GHL Location 1
      ├── Org 2 → GHL Location 2
      └── Org N → GHL Location N (1:1 now, many:1 future)

Users:
  - Admins → GHL Users (can login to GHL)
  - Athletes/Coaches/Parents → GHL Contacts (multiple contact IDs per user per org)
```

**Database Tables:**
- `ghl_oauth_connections` - Store agency OAuth tokens (encrypted)
- `user_ghl_contacts` - Map users to GHL contact IDs (one-to-many: user can have multiple contact IDs across orgs)
- `ghl_sync_log` - Audit trail for sync operations

### 2. Webhook System (Data Engine Pattern)

**Tables:**
- `webhook_endpoints` - Incoming webhook configurations
- `webhook_triggers` - Outgoing webhook configurations
- `test_webhook_payloads` - Captured test payloads (session-based)
- `system_events` - System event types that can trigger webhooks

**Features:**
- Click "Capture Test Payload" button
- Display captured JSON
- Map JSON paths to database columns
- Choose target table
- Auto-process future webhooks

### 3. Form Builder (Form Project Pattern)

**Tables:**
- `website_forms` - Form definitions
- `form_submissions` - Submitted form data
- `form_templates` - Pre-built templates (registration, contact, donation, fan pages)

**Features:**
- Drag-and-drop form builder (Phase 2 WYSIWYG)
- Conditional logic
- Validation rules
- GHL sync on submission
- Auto-assign to org/team based on form location
- Webhook triggers on submission

### 4. Analytics & Tracking (ROI Calculator Pattern)

**Tables:**
- `leads` - Website visitors and form submissions
- `website_analytics` - Page views, visits, conversions

**GEO Fields Pattern:**
```sql
-- Add to leads table
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
geo_data jsonb  -- Full API response
```

**Tracking Fields:**
```sql
tracking_id uuid,
ip_address text,
user_agent text,
referrer text,
visit_count integer,
first_visit_at timestamptz,
last_visit_at timestamptz
```

---

## Security Patterns

### 1. Encrypted Storage (GHL API Keys)

```typescript
// From form-builder
ghl_api_key_encrypted text
ghl_api_key_iv text
```

Use AES-256-CBC encryption for sensitive data.

### 2. Row Level Security (RLS)

All tables must have RLS enabled with appropriate policies based on:
- Platform Admin: Full access
- Org Admin: Access to their org + downline teams
- Team Admin: Access to their team only
- User: Access to their own data + public data

### 3. exec_sql Security

```sql
-- Only platform_admin or super_admin can execute
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is platform_admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND platform_role IN ('platform_admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only platform administrators can execute SQL';
  END IF;

  -- Execute query and return results
  ...
END;
$$ LANGUAGE plpgsql;
```

---

## Next Steps

1. ✅ Reviewed Attack Kit patterns
2. ✅ Reviewed Data Engine GHL integration
3. ✅ Reviewed Form Builder architecture
4. ✅ Reviewed ROI Calculator analytics
5. ⏳ Begin comprehensive database schema design
6. ⏳ Create migration files
7. ⏳ Build API structure

---

**Document Status:** Project References Complete
**Last Updated:** November 2, 2025
**Next:** Database Schema Design
