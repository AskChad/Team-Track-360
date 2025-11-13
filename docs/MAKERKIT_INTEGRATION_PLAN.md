# Makerkit Integration Plan - Team Track 360

## Goal
Recreate all functionality from v1-original-build using Makerkit Pro as the foundation for auth, billing, and multi-tenancy while porting all sports management features.

---

## Phase 1: Makerkit Setup (Days 1-3)

### Step 1: Extract Makerkit Files
```bash
# Navigate to development folder
cd /mnt/c/development

# Create new v2 project folder
mkdir team-track-360-makerkit
cd team-track-360-makerkit

# Extract Makerkit download (adjust path to your download)
unzip ~/Downloads/makerkit-pro-*.zip -d .

# If Makerkit is a monorepo, navigate to the Next.js + Supabase app
cd apps/web  # or wherever the Next.js app is located

# Initialize git
git init
git add .
git commit -m "Initial Makerkit Pro setup"

# Create GitHub repo and push
gh repo create team-track-360-v2 --private --source=. --remote=origin --push
```

### Step 2: Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project: `team-track-360-v2`
3. Save credentials:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbGc...`
   - Service Role Key: `eyJhbGc...`
   - Database Password: (generate strong password)

### Step 3: Configure Environment Variables
```bash
# Copy example env
cp .env.example .env.local

# Edit .env.local with your values
```

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (Test Mode initially)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Team Track 360

# OpenAI (for AI import feature)
OPENAI_API_KEY=sk-...
```

### Step 4: Run Makerkit Migrations
```bash
# Makerkit includes migrations for auth, billing, organizations
npm run supabase:migrate

# Or manually via Supabase dashboard
# SQL Editor → Run migrations from /supabase/migrations/
```

### Step 5: Test Makerkit Base
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test at http://localhost:3000:
# 1. Create account
# 2. Verify email
# 3. Create organization
# 4. Test billing flow (test mode)
```

---

## Phase 2: Database Integration (Days 4-7)

### Makerkit's Existing Tables (DON'T MODIFY)
Makerkit provides these tables out of the box:
- `auth.users` - Supabase Auth users
- `public.users` - User profiles
- `public.organizations` - Your parent organizations
- `public.memberships` - User-organization relationships with roles
- `public.subscriptions` - Stripe subscriptions
- `public.subscription_items` - Subscription line items
- `public.invoices` - Stripe invoices

### V1 Tables to Port

#### Core Sports Tables (Port as-is)
From v1, we need to port these tables that don't conflict:

**1. Sports Master Data**
```sql
-- Reference: v1-original-build:supabase/migrations/001_initial_schema.sql
CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**2. Teams** (Modified to link to Makerkit's organizations)
```sql
-- MODIFIED: Use organization_id from Makerkit
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- Makerkit table
  sport_id uuid REFERENCES sports(id),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  banner_url text,
  primary_color text,
  secondary_color text,
  header_gradient text,
  mascot text,
  founded_year integer,
  season_id uuid REFERENCES seasons(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, slug)
);
```

**3. Seasons**
```sql
-- Port as-is from v1
CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**4. Weight Classes**
```sql
-- Port as-is from v1
CREATE TABLE weight_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid REFERENCES sports(id),
  name text NOT NULL,
  min_weight decimal(5,2),
  max_weight decimal(5,2),
  gender text CHECK (gender IN ('male', 'female', 'unisex')),
  age_group text,
  display_order integer,
  created_at timestamptz DEFAULT now()
);
```

**5. Divisions**
```sql
-- Port as-is from v1
CREATE TABLE divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid REFERENCES sports(id),
  name text NOT NULL,
  min_age integer,
  max_age integer,
  skill_level text,
  description text,
  created_at timestamptz DEFAULT now()
);
```

#### Member System (Modified to integrate with Makerkit)

**6. Member Roles** (Sport-specific roles)
```sql
-- Port from v1: supabase/migrations/022_create_member_roles_table.sql
CREATE TABLE member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid REFERENCES sports(id), -- NULL for generic roles
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  can_compete boolean DEFAULT false,
  can_receive_updates boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (slug)
);

-- Seed generic roles
INSERT INTO member_roles (name, slug, description, can_compete, can_receive_updates) VALUES
('Athlete', 'athlete', 'Competes in events', true, true),
('Coach', 'coach', 'Coaches the team', false, true),
('Parent/Guardian', 'parent', 'Parent or guardian of athlete', false, true),
('Staff', 'staff', 'Team staff member', false, true),
('Supporter/Fan', 'supporter', 'Team supporter or fan', false, false);
```

**7. Team Members** (Links Makerkit users to teams with roles)
```sql
-- MODIFIED: Use user_id from Makerkit's users table
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, -- Makerkit users
  role_id uuid REFERENCES member_roles(id),
  weight_class_id uuid REFERENCES weight_classes(id),
  jersey_number text,
  position text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);
```

**8. Families System**
```sql
-- Port from v1: supabase/migrations/023_create_families_system.sql
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, -- Makerkit users
  is_admin boolean DEFAULT false,
  relationship text, -- 'parent', 'guardian', 'athlete', 'sibling', etc.
  created_at timestamptz DEFAULT now(),
  UNIQUE (family_id, user_id)
);
```

#### Events & Competitions

**9. Locations**
```sql
-- Port as-is from v1
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'USA',
  latitude decimal(10,8),
  longitude decimal(11,8),
  website_url text,
  phone text,
  created_at timestamptz DEFAULT now()
);
```

**10. Event Types**
```sql
-- Port as-is from v1
CREATE TABLE event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid REFERENCES sports(id), -- NULL for generic types
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  color text,
  requires_rsvp boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (slug)
);

-- Seed generic event types
INSERT INTO event_types (name, slug, icon, color, requires_rsvp) VALUES
('Competition', 'competition', '🏆', '#FFD700', true),
('Practice', 'practice', '💪', '#4CAF50', false),
('Team Meeting', 'meeting', '👥', '#2196F3', false),
('Fundraiser', 'fundraiser', '💰', '#9C27B0', true),
('Social Event', 'social', '🎉', '#FF9800', true);
```

**11. Competitions**
```sql
-- MODIFIED: Link to Makerkit's organizations
CREATE TABLE competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id), -- Makerkit
  sport_id uuid REFERENCES sports(id),
  name text NOT NULL,
  description text,
  competition_type text,
  default_location_id uuid REFERENCES locations(id),
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  contact_first_name text,
  contact_last_name text,
  contact_email text,
  contact_phone text,
  divisions text,
  created_at timestamptz DEFAULT now()
);
```

**12. Events**
```sql
-- Port as-is from v1
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id),
  season_id uuid REFERENCES seasons(id),
  competition_id uuid REFERENCES competitions(id),
  event_type_id uuid REFERENCES event_types(id),
  name text NOT NULL,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  location_id uuid REFERENCES locations(id),
  is_home boolean DEFAULT false,
  opponent text,
  result text,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**13. Event Rosters** (Lineups)
```sql
-- Port as-is from v1
CREATE TABLE event_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES team_members(id),
  weight_class_id uuid REFERENCES weight_classes(id),
  position text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'declined', 'no_response')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, team_member_id)
);
```

**14. Wrestling Roster Members** (Sport-specific)
```sql
-- Port as-is from v1
CREATE TABLE wrestling_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_roster_id uuid REFERENCES event_rosters(id) ON DELETE CASCADE,
  bout_number integer,
  opponent_name text,
  opponent_team text,
  win_method text,
  match_time text,
  points_scored integer,
  created_at timestamptz DEFAULT now()
);
```

**15. Event RSVPs**
```sql
-- Port as-is from v1
CREATE TABLE event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, -- Makerkit users
  status text NOT NULL CHECK (status IN ('attending', 'not_attending', 'maybe')),
  guest_count integer DEFAULT 0,
  notes text,
  responded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
```

#### Payment Integration (Modified for Makerkit + Stripe)

Makerkit already handles subscriptions via Stripe, so we'll integrate our payment tables:

**16. Payment Gateways** (Multi-gateway support beyond Stripe)
```sql
-- Port from v1 but integrate with Makerkit
CREATE TABLE payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id), -- Makerkit
  gateway_type text NOT NULL CHECK (gateway_type IN ('stripe', 'square', 'paypal', 'venmo')),
  api_key_encrypted text,
  webhook_secret_encrypted text,
  is_active boolean DEFAULT true,
  is_test_mode boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**17. Invoices** (Extended from Makerkit's invoices)
```sql
-- Makerkit already has invoices table for Stripe
-- Add custom invoice types for team fees, fundraisers, etc.
CREATE TABLE custom_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.users(id),
  team_id uuid REFERENCES teams(id),
  invoice_type text CHECK (invoice_type IN ('membership_fee', 'event_fee', 'equipment', 'fundraiser', 'other')),
  amount decimal(10,2) NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**18. Products** (Team merchandise, equipment, etc.)
```sql
-- Port from v1
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  team_id uuid REFERENCES teams(id),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  product_type text CHECK (product_type IN ('merchandise', 'equipment', 'membership', 'event_ticket')),
  stock_quantity integer,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

#### Webhooks & Integrations

**19. Webhook Endpoints**
```sql
-- Port from v1
CREATE TABLE webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  url text NOT NULL,
  secret text NOT NULL,
  event_types text[], -- ['event.created', 'roster.updated', etc.]
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**20. Webhook Logs**
```sql
-- Port from v1
CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES webhook_endpoints(id),
  event_type text,
  payload jsonb,
  response_status integer,
  response_body text,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**21. GHL OAuth Connections**
```sql
-- Port from v1
CREATE TABLE ghl_oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  access_token_encrypted text,
  refresh_token_encrypted text,
  location_id text,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**22. GHL Contact Sync**
```sql
-- Port from v1
CREATE TABLE ghl_contact_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  ghl_contact_id text NOT NULL,
  last_synced_at timestamptz,
  sync_status text CHECK (sync_status IN ('synced', 'pending', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

#### Analytics

**23. Analytics Tables**
```sql
-- Port from v1
CREATE TABLE analytics_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  source text,
  medium text,
  campaign text,
  email text,
  phone text,
  name text,
  status text DEFAULT 'new',
  converted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.users(id),
  page_path text NOT NULL,
  referrer text,
  user_agent text,
  ip_address inet,
  viewed_at timestamptz DEFAULT now()
);
```

### Migration Creation Strategy

Create a single comprehensive migration that:
1. Checks for Makerkit tables (don't modify them)
2. Creates all sports-specific tables
3. Sets up foreign keys to Makerkit tables
4. Adds RLS policies
5. Seeds initial data (sports, event types, member roles)

---

## Phase 3: API Integration (Days 8-12)

### Makerkit API Structure
Makerkit typically uses this pattern:
```
/app/api/
  /auth/           (Makerkit - don't modify)
  /organizations/  (Makerkit - extend)
  /billing/        (Makerkit - don't modify)
```

### Our API Extensions
Add sports-specific APIs:
```
/app/api/
  /teams/
    route.ts              GET/POST teams
    [id]/
      route.ts            GET/PUT/DELETE team
      members/
        route.ts          GET/POST team members
  /events/
    route.ts              GET/POST events
    [id]/
      route.ts            GET/PUT/DELETE event
      roster/
        route.ts          GET/PUT event roster
  /competitions/
    route.ts              GET/POST competitions
    [id]/
      route.ts            GET/PUT/DELETE competition
  /ai-import/
    route.ts              POST AI import from flyer
  /families/
    route.ts              GET/POST families
    [id]/
      members/
        route.ts          GET/POST/DELETE family members
  /weight-classes/
    route.ts              GET/POST weight classes
  /webhooks/
    /ghl/
      route.ts            POST GHL webhook receiver
```

### Port v1 API Logic

**Example: Teams API**
```typescript
// /app/api/teams/route.ts
// Port from v1-original-build:app/api/teams/route.ts

import { requireAuth } from '@makerkit/next/server'; // Use Makerkit's auth
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  // Use Makerkit's requireAuth instead of custom JWT
  const { user } = await requireAuth(req);

  // Rest of v1 logic stays the same
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organization_id');

  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      *,
      sports (id, name),
      seasons (id, name)
    `)
    .eq('organization_id', organizationId);

  return Response.json({ success: true, data: teams });
}
```

**Example: AI Import API**
```typescript
// /app/api/ai-import/route.ts
// Port from v1-original-build:app/api/ai-import-direct/route.ts

import { requireAuth } from '@makerkit/next/server';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { user } = await requireAuth(req);

  // Check organization access (Makerkit handles this)
  // Port entire OpenAI Vision logic from v1

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // ... rest of AI import logic from v1
}
```

### Authentication Integration

**v1 Pattern** (JWT):
```typescript
const user = requireAuth(authHeader);
```

**v2 Pattern** (Makerkit):
```typescript
import { requireAuth } from '@makerkit/next/server';

const { user, organization } = await requireAuth(req);
// user.id - Makerkit user ID
// organization.id - Current organization context
```

### Permission Checking

**v1 Pattern**:
```typescript
const { data: adminRoles } = await supabase
  .from('admin_roles')
  .select('role_type')
  .eq('user_id', user.userId);

const isPlatformAdmin = adminRoles?.some(r => r.role_type === 'platform_admin');
```

**v2 Pattern** (Use Makerkit's membership roles):
```typescript
import { requireOrganizationRole } from '@makerkit/next/server';

// Check if user is owner/admin of organization
const { user, membership } = await requireOrganizationRole(req, ['owner', 'admin']);
```

---

## Phase 4: UI Integration (Days 13-20)

### Makerkit Component Library

Makerkit provides these components:
- `<Button>` - Various button styles
- `<Input>` - Form inputs with validation
- `<Select>` - Dropdown selects
- `<Table>` - Data tables with sorting/filtering
- `<Modal>` - Modal dialogs
- `<Card>` - Content cards
- `<Alert>` - Notifications
- `<Badge>` - Status badges
- `<Tabs>` - Tabbed interfaces

### Page Structure

**Makerkit Layout**:
```
/app/
  (authenticated)/          # Protected routes
    [organization]/         # Organization context
      page.tsx             # Dashboard
      teams/
        page.tsx           # Teams list
        [id]/
          page.tsx         # Team detail
      events/
        page.tsx           # Events calendar
      competitions/
        page.tsx           # Competitions list
      settings/
        page.tsx           # Settings
```

### Port v1 Pages with Makerkit Components

**Example: Teams List Page**
```typescript
// /app/(authenticated)/[organization]/teams/page.tsx

import { PageHeader } from '@makerkit/ui/page-header';
import { Button } from '@makerkit/ui/button';
import { Table } from '@makerkit/ui/table';
import { Card } from '@makerkit/ui/card';

export default async function TeamsPage({
  params,
}: {
  params: { organization: string };
}) {
  // Fetch teams using organization context
  const teams = await getTeams(params.organization);

  return (
    <>
      <PageHeader
        title="Teams"
        description="Manage your organization's teams"
      >
        <Button href={`/${params.organization}/teams/new`}>
          Add Team
        </Button>
      </PageHeader>

      <Card>
        <Table>
          {/* Port v1 team table logic */}
        </Table>
      </Card>
    </>
  );
}
```

**Example: Event Calendar (Port from v1)**
```typescript
// /app/(authenticated)/[organization]/events/page.tsx

import { Calendar } from '@/components/Calendar'; // Port from v1
import { PageHeader } from '@makerkit/ui/page-header';

export default function EventsPage() {
  return (
    <>
      <PageHeader title="Events Calendar" />
      {/* Port v1 calendar component with Makerkit styling */}
      <Calendar />
    </>
  );
}
```

### Custom Components to Port

These are sport-specific and need to be ported from v1:

1. **RosterBuilder** - Drag-and-drop roster management
2. **WeightClassSelector** - Weight class management
3. **CompetitionBracket** - Tournament brackets
4. **AthleteCard** - Athlete profile cards
5. **TeamStatsWidget** - Dashboard statistics
6. **AIImportModal** - AI-powered flyer import

---

## Phase 5: Billing Integration (Days 21-25)

### Makerkit's Stripe Integration

Makerkit handles:
- ✅ Subscription plans
- ✅ Payment methods
- ✅ Invoices
- ✅ Webhooks
- ✅ Customer portal

### Extend for Sports Features

**Add Team-Level Subscriptions**:
```sql
-- Allow organizations to charge per team
ALTER TABLE teams ADD COLUMN subscription_id text REFERENCES public.subscriptions(id);
```

**Custom Invoice Types**:
```typescript
// /app/api/billing/custom-invoice/route.ts

export async function POST(req: Request) {
  const { organizationId, userId, teamId, invoiceType, amount } = await req.json();

  // Create custom Stripe invoice for team fees, equipment, etc.
  const invoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    description: `${invoiceType} for ${teamName}`,
    collection_method: 'send_invoice',
    days_until_due: 30,
  });

  // Track in custom_invoices table
  await supabase.from('custom_invoices').insert({
    organization_id: organizationId,
    user_id: userId,
    team_id: teamId,
    invoice_type: invoiceType,
    amount,
    status: 'pending',
  });
}
```

---

## Phase 6: Testing & Deployment (Days 26-30)

### Testing Checklist

**Authentication**:
- [ ] Sign up new user
- [ ] Email verification
- [ ] Password reset
- [ ] Login/logout
- [ ] Multi-factor authentication

**Organizations**:
- [ ] Create organization
- [ ] Invite members
- [ ] Assign roles
- [ ] Switch organizations

**Teams**:
- [ ] Create team
- [ ] Add athletes
- [ ] Assign weight classes
- [ ] Build rosters

**Events**:
- [ ] Create event
- [ ] Add roster
- [ ] RSVP system
- [ ] Competition import (AI)

**Billing**:
- [ ] Subscribe to plan
- [ ] Update payment method
- [ ] Create custom invoice
- [ ] Payment succeeds

**Integrations**:
- [ ] GHL webhook receives data
- [ ] Contact sync works
- [ ] Webhook logs captured

### Deployment

**Vercel Deployment**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables via dashboard:
# - All Supabase credentials
# - Stripe keys
# - OpenAI API key
# - GHL OAuth credentials
```

**Supabase Production**:
1. Create production project
2. Run all migrations
3. Configure RLS policies
4. Set up backups

**Stripe Production**:
1. Switch to live keys
2. Configure webhook endpoints
3. Test live payments

---

## Key Differences: v1 vs v2 (Makerkit)

| Feature | v1 (Original) | v2 (Makerkit) |
|---------|---------------|---------------|
| **Authentication** | Custom JWT | Makerkit + Supabase Auth |
| **User Table** | `profiles` | `public.users` (Makerkit) |
| **Organizations** | `parent_organizations` | `public.organizations` (Makerkit) |
| **User-Org Link** | Custom admin_roles | `public.memberships` (Makerkit) |
| **Billing** | Custom tables | Stripe via Makerkit |
| **Subscriptions** | Custom implementation | Makerkit + Stripe |
| **Auth Endpoints** | `/api/auth/*` | Makerkit endpoints |
| **Permission Check** | Query admin_roles | Makerkit membership roles |
| **Components** | Custom built | Makerkit UI library |
| **Layout** | Custom | Makerkit layouts |

---

## Migration Commands Reference

### View v1 Code
```bash
# View specific file from v1
git show v1-original-build:app/api/teams/route.ts

# Copy file for reference
git show v1-original-build:app/api/ai-import-direct/route.ts > /tmp/ai-import-v1.ts

# Extract all migrations
mkdir -p /tmp/v1-migrations
for file in $(git ls-tree -r --name-only v1-original-build:supabase/migrations/); do
  git show v1-original-build:supabase/migrations/$file > /tmp/v1-migrations/$(basename $file)
done
```

### Compare v1 vs v2
```bash
# Compare implementations
git show v1-original-build:app/api/teams/route.ts > /tmp/teams-v1.ts
cat app/api/teams/route.ts > /tmp/teams-v2.ts
code --diff /tmp/teams-v1.ts /tmp/teams-v2.ts
```

---

## Next Immediate Steps

1. ✅ **You've purchased Makerkit** - Great!
2. **Extract Makerkit files** - Where did you download it?
3. **Set up project structure** - Follow Phase 1 above
4. **Create Supabase project** - New v2 project
5. **Configure environment** - Copy .env.example

Ready to start? Let me know where you downloaded Makerkit and I'll help you set it up!
