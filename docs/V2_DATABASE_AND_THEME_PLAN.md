# Team Track 360 V2 - Database & Theme Strategy

## Your Questions Answered

### Q1: Are we using the original database or totally starting over?

**Answer: NEW Supabase Database** ✅

We're creating a **fresh Supabase project** for v2 because:

1. **Makerkit has its own schema** - Auth, organizations, subscriptions, memberships
2. **Cleaner integration** - No conflicts with existing tables
3. **V1 stays intact** - Original database preserved for reference
4. **Migration option** - Can migrate v1 data → v2 if needed

**Migration Strategy**:
- Option A: Start fresh (users recreate teams/events)
- Option B: Write migration scripts to copy v1 data → v2
- Option C: Hybrid (migrate critical data, recreate the rest)

I recommend **Option A** (fresh start) for cleanest deployment.

---

### Q2: Using Nitro Sport Template + Theme Matching

**Answer: Two-Part Architecture** ✅

**Part 1: PUBLIC Website** (Nitro Sport Template)
- Marketing pages (home, about, pricing, contact)
- Team public pages (team profiles, stats, schedules)
- Event listings (public competition calendar)
- Blog/news
- Tech: HTML/CSS from Nitro Sport → Convert to Next.js

**Part 2: ADMIN Dashboard** (Makerkit)
- Authenticated application
- Team management (create teams, add members)
- Roster builder (assign weight classes, positions)
- Event creation (create events, build lineups)
- AI import (upload flyers, extract data)
- Billing (subscriptions, invoices)
- Settings (organization, integrations)
- Tech: Makerkit Next.js with Nitro Sport theme

---

## Nitro Sport Theme Colors

Extracted from `/Main files/assets/css/main.css`:

```css
:root {
  --body: #fff;
  --black: #000;
  --white: #fff;
  --theme: #FE5900;      /* Primary orange */
  --header: #030523;      /* Dark navy */
  --text: #434343;        /* Gray text */
  --border: #FCFCFC;      /* Light border */
  --bg: #F5F6F6;          /* Light gray background */
  --bg2: #030523;         /* Dark background */
  --bg3: #F7F3EE;         /* Beige background */
  --box-shadow: 0px 1px 14px 0px rgba(0, 0, 0, 0.13);
}
```

### Apply to Makerkit via Tailwind

Update Makerkit's `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Nitro Sport theme colors
        primary: {
          DEFAULT: '#FE5900',  // Orange
          50: '#FFF5ED',
          100: '#FFE8D6',
          200: '#FFCEAD',
          300: '#FFAD7A',
          400: '#FF8445',
          500: '#FE5900',      // Main
          600: '#E54D00',
          700: '#B93C00',
          800: '#942F00',
          900: '#6B2200',
        },
        header: {
          DEFAULT: '#030523',  // Dark navy
        },
        body: {
          DEFAULT: '#434343',  // Text gray
        },
        background: {
          DEFAULT: '#F5F6F6',  // Light gray
          dark: '#030523',     // Dark navy
          beige: '#F7F3EE',    // Beige
        },
      },
    },
  },
};
```

---

## Architecture Overview

```
Team Track 360 Platform
│
├── PUBLIC SITE (Nitro Sport Template)
│   ├── / (homepage - marketing)
│   ├── /teams (public team directory)
│   ├── /team/[slug] (team public profile)
│   ├── /events (public event calendar)
│   ├── /about (about page)
│   ├── /pricing (pricing/plans)
│   ├── /contact (contact form)
│   └── /blog (news/articles)
│
└── ADMIN APP (Makerkit + Nitro Sport Theme)
    ├── /app (Next.js App Router)
    │   ├── (authenticated)
    │   │   ├── [organization]
    │   │   │   ├── dashboard (organization dashboard)
    │   │   │   ├── teams (manage teams)
    │   │   │   ├── members (manage members)
    │   │   │   ├── events (create/manage events)
    │   │   │   ├── competitions (manage competitions)
    │   │   │   ├── rosters (build lineups)
    │   │   │   ├── ai-import (AI flyer import)
    │   │   │   ├── families (family management)
    │   │   │   ├── billing (subscriptions/invoices)
    │   │   │   ├── integrations (GHL, webhooks)
    │   │   │   └── settings (org settings)
    │   │   └── profile (user profile)
    │   └── (auth)
    │       ├── login
    │       ├── signup
    │       ├── verify-email
    │       └── forgot-password
    │
    └── Supabase Database
        ├── Makerkit Tables (auth, orgs, billing)
        └── Sports Tables (teams, events, rosters)
```

---

## Database: V1 vs V2

### V1 Database (Current - KEEP AS REFERENCE)
- Supabase Project: `ohmioijbzvhoydyhdkdk.supabase.co`
- 74 tables with all data
- Stays untouched
- Use for reference and optional migration

### V2 Database (New - PRODUCTION)
- New Supabase Project: `team-track-360-v2`
- Makerkit tables + Sports tables
- Fresh start
- Clean schema

### Key Table Mappings

| Feature | V1 Table | V2 Table | Notes |
|---------|----------|----------|-------|
| Users | `profiles` | `public.users` | Makerkit's users table |
| Organizations | `parent_organizations` | `public.organizations` | Makerkit's orgs |
| User-Org Link | `admin_roles` | `public.memberships` | Makerkit's membership |
| Teams | `teams` | `teams` | Same name, link to Makerkit orgs |
| Members | `team_members` | `team_members` | Link to Makerkit users |
| Subscriptions | `subscriptions` (custom) | `public.subscriptions` | Makerkit + Stripe |
| Invoices | `invoices` (custom) | `public.invoices` + `custom_invoices` | Makerkit for Stripe, custom for team fees |

---

## Implementation Plan

### Phase 1: Setup New V2 Project (Days 1-3)

**Step 1: Create New Supabase Project**
```bash
# Go to https://supabase.com/dashboard
# Create new project: team-track-360-v2
# Save credentials:
# - Project URL: https://xxxxx.supabase.co
# - Anon Key
# - Service Role Key
# - Database Password
```

**Step 2: Extract Makerkit**
```bash
cd /mnt/c/development
mkdir team-track-360-v2
cd team-track-360-v2

# Extract Makerkit (wherever you downloaded it)
# Initialize git
git init
git add .
git commit -m "Initial Makerkit setup"

# Create GitHub repo
gh repo create team-track-360-v2 --private --source=. --remote=origin --push
```

**Step 3: Configure Environment**
```env
# .env.local

# NEW Supabase V2
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key

# Stripe (test mode initially)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (for AI import)
OPENAI_API_KEY=sk-...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Team Track 360
```

**Step 4: Run Makerkit Migrations**
```bash
npm install
npm run supabase:migrate

# This creates Makerkit's base tables:
# - auth.users
# - public.users
# - public.organizations
# - public.memberships
# - public.subscriptions
# - public.invoices
```

**Step 5: Test Makerkit Base**
```bash
npm run dev

# Test at http://localhost:3000:
# 1. Sign up
# 2. Verify email
# 3. Create organization
# 4. Test billing (test mode)
```

---

### Phase 2: Apply Nitro Sport Theme (Days 4-5)

**Step 1: Update Tailwind Config**
```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FE5900',  // Nitro Sport orange
          // ... color shades
        },
        // ... other Nitro colors
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],  // From Nitro Sport
        body: ['Inter', 'sans-serif'],
      },
    },
  },
};
```

**Step 2: Replace Makerkit Colors**
```typescript
// Update Makerkit components to use new theme
// Example: Button component

<Button className="bg-primary hover:bg-primary-600 text-white">
  Create Team
</Button>
```

**Step 3: Extract Nitro Sport Assets**
```bash
# Copy Nitro Sport assets to Makerkit
cp /mnt/c/Development/Website_Templates/themeforest-My3CYnKC-nitro-sport/"Main files"/assets/images/* public/images/

# Convert Nitro Sport fonts to Next.js font imports
# Update layout.tsx with Nitro Sport fonts
```

---

### Phase 3: Port Sports Database (Days 6-8)

Create comprehensive migration:

```sql
-- /supabase/migrations/001_sports_tables.sql

-- Sports master table
CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Teams (link to Makerkit organizations)
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
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
  season_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- Seasons
CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Weight classes
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

-- Member roles (sport-specific roles)
CREATE TABLE member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  can_compete boolean DEFAULT false,
  can_receive_updates boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Team members (link Makerkit users to teams with roles)
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES member_roles(id),
  weight_class_id uuid REFERENCES weight_classes(id),
  jersey_number text,
  position text,
  status text DEFAULT 'active',
  joined_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Families
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  is_admin boolean DEFAULT false,
  relationship text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (family_id, user_id)
);

-- Locations
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address_line1 text,
  city text,
  state text,
  zip_code text,
  latitude decimal(10,8),
  longitude decimal(11,8),
  created_at timestamptz DEFAULT now()
);

-- Event types
CREATE TABLE event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  color text,
  requires_rsvp boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Competitions
CREATE TABLE competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  sport_id uuid REFERENCES sports(id),
  name text NOT NULL,
  description text,
  competition_type text,
  default_location_id uuid REFERENCES locations(id),
  contact_email text,
  contact_phone text,
  divisions text,
  created_at timestamptz DEFAULT now()
);

-- Events
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
  created_at timestamptz DEFAULT now()
);

-- Event rosters (lineups)
CREATE TABLE event_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES team_members(id),
  weight_class_id uuid REFERENCES weight_classes(id),
  position text,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, team_member_id)
);

-- Seed initial data
INSERT INTO sports (name, icon, description) VALUES
('Wrestling', '🤼', 'Competitive wrestling'),
('Football', '🏈', 'American football'),
('Soccer', '⚽', 'Association football'),
('Basketball', '🏀', 'Basketball');

INSERT INTO member_roles (name, slug, description, can_compete, can_receive_updates) VALUES
('Athlete', 'athlete', 'Competes in events', true, true),
('Coach', 'coach', 'Coaches the team', false, true),
('Parent/Guardian', 'parent', 'Parent or guardian of athlete', false, true),
('Staff', 'staff', 'Team staff member', false, true),
('Supporter/Fan', 'supporter', 'Team supporter or fan', false, false);

INSERT INTO event_types (name, slug, icon, color, requires_rsvp) VALUES
('Competition', 'competition', '🏆', '#FFD700', true),
('Practice', 'practice', '💪', '#4CAF50', false),
('Team Meeting', 'meeting', '👥', '#2196F3', false);
```

Run migration:
```bash
npm run supabase:migrate
```

---

### Phase 4: Port API Endpoints (Days 9-12)

Port all v1 API endpoints, adapting to use Makerkit auth:

**Example: Teams API**
```typescript
// /app/api/teams/route.ts

import { requireAuth } from '@makerkit/next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  // Use Makerkit's auth (no more JWT parsing)
  const { user, organization } = await requireAuth(req);

  const supabase = createClient();

  // Query teams for current organization
  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      *,
      sports (id, name),
      seasons (id, name)
    `)
    .eq('organization_id', organization.id)
    .order('name');

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, data: teams });
}
```

Port these v1 APIs:
- `/api/teams` (from v1)
- `/api/events` (from v1)
- `/api/competitions` (from v1)
- `/api/ai-import` (from v1 ai-import-direct)
- `/api/rosters` (from v1)
- `/api/families` (from v1)
- `/api/weight-classes` (new)

---

### Phase 5: Build UI Pages (Days 13-20)

Use Makerkit components with Nitro Sport theme:

**Teams List Page**
```typescript
// /app/(authenticated)/[organization]/teams/page.tsx

import { PageHeader } from '@makerkit/ui/page-header';
import { Button } from '@makerkit/ui/button';
import { Card } from '@makerkit/ui/card';

export default async function TeamsPage({
  params,
}: {
  params: { organization: string };
}) {
  const teams = await getTeams(params.organization);

  return (
    <>
      <PageHeader
        title="Teams"
        description="Manage your organization's teams"
        className="bg-gradient-to-r from-primary to-primary-600"
      >
        <Button
          href={`/${params.organization}/teams/new`}
          className="bg-white text-primary hover:bg-gray-100"
        >
          Create Team
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow">
            {/* Team card content */}
          </Card>
        ))}
      </div>
    </>
  );
}
```

---

### Phase 6: Convert Nitro Sport Public Pages (Days 21-25)

Convert Nitro Sport HTML to Next.js pages:

**Homepage**
```typescript
// /app/page.tsx (public)

import Hero from '@/components/nitro/Hero';
import Features from '@/components/nitro/Features';
import Teams from '@/components/nitro/Teams';
import Pricing from '@/components/nitro/Pricing';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Teams />
      <Pricing />
    </>
  );
}
```

Extract Nitro Sport components:
- Hero section
- Features grid
- Team cards
- Event calendar
- Footer

---

## Summary

### Database Strategy
- ✅ **NEW Supabase database** for v2
- ✅ V1 database stays intact for reference
- ✅ Can migrate data if needed (optional)

### Theme Strategy
- ✅ **Nitro Sport** for public pages
- ✅ **Makerkit** for admin dashboard
- ✅ **Nitro Sport colors** applied to Makerkit via Tailwind
- ✅ Consistent branding across both parts

### Timeline
- Phase 1: Setup (3 days)
- Phase 2: Theme (2 days)
- Phase 3: Database (3 days)
- Phase 4: APIs (4 days)
- Phase 5: Admin UI (8 days)
- Phase 6: Public pages (5 days)
- **Total: 25 days (5 weeks)**

Ready to start with Phase 1? Let me know where you downloaded Makerkit!
