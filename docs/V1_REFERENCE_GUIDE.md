# V1 Reference Guide - Original Build

## Branch: `v1-original-build`

All your original work (74 tables, migrations, APIs, components) is preserved in the `v1-original-build` branch for reference while building v2 with Makerkit.

**Branch URL**: https://github.com/AskChad/Team-Track-360/tree/v1-original-build

---

## How to Reference the Original Work

### View Files from V1 Branch

```bash
# Option 1: Checkout the branch temporarily
git checkout v1-original-build

# Look at files you need
cat supabase/migrations/022_create_member_roles_table.sql

# Go back to main
git checkout main

# Option 2: View specific file without checking out
git show v1-original-build:supabase/migrations/022_create_member_roles_table.sql

# Option 3: Copy specific file to reference
git show v1-original-build:supabase/migrations/022_create_member_roles_table.sql > /tmp/reference.sql
```

---

## What to Reference from V1

### 1. Database Schema Design ⭐⭐⭐

**Location**: `/supabase/migrations/`

**What's Valuable**:
- 74 tables with thoughtful relationships
- Sport-specific structures (weight classes, rosters, member roles)
- Families system design
- Multi-sport support architecture

**How to Use**:
When designing your sports tables in Makerkit, reference:
- `001_initial_schema.sql` - Core hierarchy
- `022_create_member_roles_table.sql` - Role system
- `023_create_families_system.sql` - Family admin system
- `021_add_sport_id_to_event_types.sql` - Multi-sport approach

```bash
# View specific migration
git show v1-original-build:supabase/migrations/022_create_member_roles_table.sql
```

### 2. Business Logic ⭐⭐⭐

**Location**: `/app/api/`

**What's Valuable**:
- API endpoint patterns
- Validation logic
- Permission checking
- Data transformation

**Key Files to Reference**:
```bash
# Competition creation logic
git show v1-original-build:app/api/competitions/route.ts

# AI import logic (OpenAI Vision)
git show v1-original-build:app/api/ai-import-direct/route.ts

# Event roster management
git show v1-original-build:app/api/rosters/route.ts

# Team member roles
git show v1-original-build:app/api/teams/[id]/members/route.ts
```

### 3. Documentation ⭐⭐⭐

**Location**: `/docs/`

**What's Valuable**:
- Database terminology
- System architecture decisions
- Feature plans

**Key Docs**:
```bash
# Database structure explained
git show v1-original-build:docs/DATABASE_TERMINOLOGY.md

# Families system design
git show v1-original-build:docs/FAMILIES_SYSTEM_IMPLEMENTATION_PLAN.md

# Original build summary
git show v1-original-build:COMPLETE_BUILD_SUMMARY.md
```

### 4. TypeScript Interfaces ⭐⭐

**Location**: Throughout `/app/` pages

**What's Valuable**:
- Type definitions for entities
- Interface patterns

**Example**:
```bash
# Event interfaces
git show v1-original-build:app/events/[id]/page.tsx | grep -A 20 "interface Event"

# Team interfaces
git show v1-original-build:app/teams/[id]/page.tsx | grep -A 20 "interface Team"
```

### 5. UI Patterns ⭐

**Location**: `/app/` and `/components/`

**What's Valuable**:
- Form layouts
- Table structures
- Modal patterns

**Less Critical**: Makerkit has better UI components, but good for reference

---

## Specific Features to Port

### Must Port: AI Import Feature

**Original Location**: `/app/api/ai-import-direct/route.ts`

**What it Does**:
- Accepts image upload (competition flyer)
- Uses OpenAI Vision to extract data
- Creates competitions, locations, events
- Has duplicate checking logic

**Port Strategy**:
1. Copy the OpenAI Vision integration code
2. Adapt to Makerkit's organization structure
3. Update to use Makerkit's file upload
4. Connect to your new competitions table

```bash
# Extract the full file for reference
git show v1-original-build:app/api/ai-import-direct/route.ts > /tmp/ai-import-v1.ts

# Study the implementation
code /tmp/ai-import-v1.ts
```

### Must Port: Families System

**Original Location**:
- `/supabase/migrations/023_create_families_system.sql`
- `/docs/FAMILIES_SYSTEM_IMPLEMENTATION_PLAN.md`

**What it Does**:
- Groups users into family units
- Family admins can manage member accounts
- Helper functions: `is_family_admin()`, `get_manageable_users()`

**Port Strategy**:
1. Reference the table structure
2. Adapt to work with Makerkit's users table
3. Build UI using Makerkit components
4. Implement permission checking

```bash
# Extract schema
git show v1-original-build:supabase/migrations/023_create_families_system.sql > /tmp/families-schema.sql

# Extract plan
git show v1-original-build:docs/FAMILIES_SYSTEM_IMPLEMENTATION_PLAN.md > /tmp/families-plan.md
```

### Must Port: Member Roles System

**Original Location**: `/supabase/migrations/022_create_member_roles_table.sql`

**What it Does**:
- Flexible role system (athletes, coaches, parents, staff, supporters)
- Generic roles (all sports) vs sport-specific roles
- Properties: `can_compete`, `can_receive_updates`

**Port Strategy**:
1. Add member_roles table to Makerkit
2. Connect to Makerkit's memberships table
3. Extend organization membership with role_id
4. Build role management UI

```bash
# Extract schema
git show v1-original-build:supabase/migrations/022_create_member_roles_table.sql > /tmp/roles-schema.sql
```

### Should Port: Multi-Sport Architecture

**Original Location**: `/supabase/migrations/021_add_sport_id_to_event_types.sql`

**What it Does**:
- Sports table with master list
- Event types tied to sports
- Sport-specific vs generic patterns

**Port Strategy**:
1. Create sports table in Makerkit
2. Add sport_id to teams
3. Add sport_id to event_types
4. Build sport management UI

### Should Port: Weight Class System

**Original Location**: `/supabase/migrations/001_initial_schema.sql` (look for weight_classes)

**What it Does**:
- Weight classes per sport
- Age divisions
- Gender categories

**Port Strategy**:
1. Add weight_classes table
2. Connect to rosters
3. Build weight class management UI

---

## Quick Reference Commands

### Compare Two Files

```bash
# Compare old vs new implementation
git show v1-original-build:app/api/teams/route.ts > /tmp/teams-v1.ts
cat app/api/teams/route.ts > /tmp/teams-v2.ts
code --diff /tmp/teams-v1.ts /tmp/teams-v2.ts
```

### Extract Multiple Files at Once

```bash
# Extract all migration files
mkdir -p /tmp/v1-migrations
for file in $(git ls-tree -r --name-only v1-original-build:supabase/migrations/); do
  git show v1-original-build:supabase/migrations/$file > /tmp/v1-migrations/$file
done

# Now you can reference them all
ls /tmp/v1-migrations/
```

### Search for Specific Logic

```bash
# Find where weight classes are used
git grep -n "weight_class" v1-original-build

# Find duplicate checking logic
git grep -n "duplicate" v1-original-build -- "*.ts"

# Find AI/OpenAI usage
git grep -n "openai\|OpenAI" v1-original-build
```

### View Full Directory Structure

```bash
# See what's in the original
git ls-tree -r --name-only v1-original-build | less
```

---

## Database Tables Reference

### Core Hierarchy (5 tables)
- `sports` - Master list of sports
- `parent_organizations` - Top-level organizations
- `teams` - Teams within organizations
- `seasons` - Season tracking
- `team_members` - Team roster (permanent)

### Members & Roles (7 tables)
- `profiles` - User profiles
- `admin_roles` - Platform/org/team admin roles
- `member_roles` - Flexible role definitions (athlete, coach, parent, etc.)
- `families` - Family groups
- `family_members` - Family member relationships

### Events & Competitions (7 tables)
- `events` - Events (competitions, practices, meetings)
- `competitions` - Competition master records
- `event_types` - Sport-specific event types
- `locations` - Venues
- `event_rosters` - Event lineups (temporary)
- `wrestling_roster_members` - Wrestling-specific roster data
- `event_rsvps` - RSVP tracking

### Weight Classes & Divisions
- `weight_classes` - Weight class definitions per sport
- `divisions` - Age/skill divisions

### Payments (8 tables)
- `payment_gateways`
- `invoices`
- `invoice_items`
- `products`
- `transactions`
- `subscriptions`
- `subscription_items`
- `payment_methods`

### Analytics (6 tables)
- `analytics_leads`
- `page_views`
- `analytics_events`
- `analytics_summaries`

---

## Don't Copy These

### ❌ Authentication System
Makerkit's auth is better. Don't copy:
- `/app/api/auth/login/route.ts`
- `/app/api/auth/signup/route.ts`
- `/lib/auth.ts` (JWT handling)

### ❌ Basic UI Components
Makerkit has better versions. Don't copy:
- `/components/Navigation.tsx`
- `/components/Modal.tsx`
- `/components/LoadingSpinner.tsx`

### ❌ Payment Tables
Makerkit uses Stripe directly. Don't copy:
- Payment gateway tables
- Invoice tables (use Stripe's)
- Subscription tables (use Makerkit's)

---

## Port Priority

### Phase 1: Foundation (Week 3-4)
1. ⭐⭐⭐ Sports table schema
2. ⭐⭐⭐ Teams table schema
3. ⭐⭐⭐ Member roles system
4. ⭐⭐ Weight classes table

### Phase 2: Events (Week 5-6)
1. ⭐⭐⭐ Events table schema
2. ⭐⭐⭐ Competitions table schema
3. ⭐⭐⭐ Event rosters structure
4. ⭐⭐ Event types system

### Phase 3: Advanced (Week 7-8)
1. ⭐⭐⭐ AI import feature (entire file)
2. ⭐⭐⭐ Families system (schema + logic)
3. ⭐⭐ Multi-sport architecture
4. ⭐ Duplicate checking logic

### Phase 4: Integrations (Week 9-10)
1. ⭐⭐ GHL webhook structure
2. ⭐ Analytics tables
3. ⭐ Document management (if needed)

---

## Example: Porting AI Import

Here's how to port the AI import feature:

### Step 1: Extract Original Code

```bash
# Get the full file
git show v1-original-build:app/api/ai-import-direct/route.ts > /tmp/ai-import-original.ts
```

### Step 2: Identify Key Parts

1. **OpenAI Vision Setup** (lines 15-140)
   - API key management
   - Image processing
   - Prompt engineering

2. **Data Extraction** (lines 180-220)
   - Parsing OpenAI response
   - Validation logic

3. **Database Inserts** (lines 240-360)
   - Location creation/deduplication
   - Competition creation/update
   - Event creation

### Step 3: Adapt to Makerkit

```typescript
// In Makerkit v2: /app/api/organizations/[orgId]/ai-import/route.ts
import { requireAuth } from '@makerkit/next';
import { OpenAI } from 'openai';

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  // Use Makerkit's auth
  const { user } = await requireAuth(req);

  // Check organization access (Makerkit handles this)
  // ... Makerkit permission check

  // COPY: OpenAI Vision integration from v1
  const openai = new OpenAI({ apiKey: getOrgOpenAIKey() });

  // COPY: Image processing logic from v1
  // ... file upload, base64 encoding

  // COPY: Prompt and extraction from v1
  // ... OpenAI Vision API call

  // ADAPT: Database inserts for Makerkit structure
  // Instead of: INSERT INTO competitions
  // Do: INSERT INTO competitions (organization_id = params.orgId)
}
```

### Step 4: Test Incrementally

1. Test file upload ✅
2. Test OpenAI Vision call ✅
3. Test data extraction ✅
4. Test database inserts ✅
5. Test duplicate handling ✅
6. Test event creation ✅

---

## Summary

Your v1 work is preserved and ready to reference. The most valuable parts to port are:

1. ⭐⭐⭐ **Database schema designs** - Well thought out, just adapt to Makerkit
2. ⭐⭐⭐ **AI import feature** - Unique functionality, copy the whole thing
3. ⭐⭐⭐ **Families system** - Custom feature, port the schema and logic
4. ⭐⭐⭐ **Member roles** - Flexible system, port the structure
5. ⭐⭐ **Multi-sport architecture** - Good design, adapt to Makerkit

Everything else (auth, billing, basic UI) Makerkit does better - don't waste time porting.

**Next Step**: Purchase Makerkit Pro and let's start building v2!

---

*Branch: `v1-original-build`*
*URL: https://github.com/AskChad/Team-Track-360/tree/v1-original-build*
*Reference this doc when building v2 features*
