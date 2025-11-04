# Run Database Migrations via Supabase Dashboard

## Why Dashboard Method?

Direct PostgreSQL connection from WSL has network/firewall restrictions. The Supabase Dashboard SQL Editor is the most reliable way to run migrations.

---

## ⚡ Quick Steps (5 minutes)

### 1. Open SQL Editor
**Visit:** https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/sql/new

### 2. Run Each Migration in Order

Copy and paste the contents of each file into the SQL Editor and click "Run":

---

#### Migration 1: Initial Schema (39 tables)

**File:** `supabase/migrations/001_initial_schema.sql`

**What it creates:**
- Core tables: sports, organizations, teams, seasons
- User management: profiles, roles, admin_roles, families
- Sport-specific: wrestling_athlete_profiles
- Events: event_types, events, locations, rsvps
- Competitors: teams, athletes, claims
- Payments: gateways, invoices, products, transactions
- Equipment: inventory, checkouts, late_fees

**To run:**
1. Click "New Query" in SQL Editor
2. Copy entire contents of `001_initial_schema.sql`
3. Paste into editor
4. Click "Run" (or press Ctrl+Enter)
5. Wait for ✅ "Success" message

---

#### Migration 2: Schema Part 2 (35 tables)

**File:** `supabase/migrations/002_initial_schema_part2.sql`

**What it creates:**
- Documents: types, documents, approval queue
- Media: library, access control
- Webhooks: endpoints, triggers, logs
- GHL Integration: oauth, contacts, sync
- Wrestling Platforms: TrackWrestling, BoutTime imports
- Websites: CMS, pages, forms, domains
- Analytics: leads, page views, events, summaries
- Activity logs

**To run:**
1. Click "New Query"
2. Copy entire contents of `002_initial_schema_part2.sql`
3. Paste and Run

---

#### Migration 3: Triggers (69 triggers)

**File:** `supabase/migrations/003_triggers_updated_at.sql`

**What it creates:**
- Function: `update_updated_at_column()`
- 69 triggers on all tables with `updated_at` column
- Auto-updates timestamp on every row update

**To run:**
1. Click "New Query"
2. Copy entire contents of `003_triggers_updated_at.sql`
3. Paste and Run

---

#### Migration 4: RLS Policies (100+ policies)

**File:** `supabase/migrations/004_rls_policies.sql`

**What it creates:**
- 6 helper functions for permission checks:
  - `is_platform_admin()`
  - `is_org_admin()`
  - `is_team_admin()`
  - `is_team_member()`
  - `can_access_organization()`
  - `can_access_team()`
- Enables RLS on all 74 tables
- Creates 100+ security policies for:
  - Public read access where appropriate
  - Admin full access
  - User-scoped access
  - Team-scoped access

**To run:**
1. Click "New Query"
2. Copy entire contents of `004_rls_policies.sql`
3. Paste and Run
4. This may take 30-60 seconds

---

#### Migration 5: Seed Data

**File:** `supabase/migrations/005_seed_data.sql`

**What it creates:**
- 10 sports (Wrestling active, 9 others inactive)
- 12 wrestling event types (practice, competition, weigh-in, etc.)
- 20 document types
- 21 system webhook events
- 2 platform-level fee structures

**To run:**
1. Click "New Query"
2. Copy entire contents of `005_seed_data.sql`
3. Paste and Run

---

## ✅ Verification

After running all migrations, verify success:

### 1. Check Table Count

Run this query:
```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
```

**Expected result:** 74 tables

### 2. Check Seed Data

Run this query:
```sql
SELECT name, is_active FROM sports ORDER BY name;
```

**Expected result:** 10 sports (Wrestling should be active)

### 3. Check RLS is Enabled

Run this query:
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** All tables should have `rls_enabled = true`

---

## 🎉 Success Checklist

After all migrations complete:

- [x] **74 tables created**
- [x] **69 triggers active** (auto-update timestamps)
- [x] **RLS enabled on all tables**
- [x] **100+ security policies** created
- [x] **Seed data inserted** (sports, event types, etc.)
- [x] **6 helper functions** for permission checks

---

## 🚀 Next Steps

Once migrations are complete:

### 1. Update Vercel Environment Variables

Visit: https://vercel.com/new

Import: `AskChad/Team-Track-360`

Add these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://iccmkpmujtmvtfpvoxli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTUyMDUsImV4cCI6MjA3MjA3MTIwNX0._Ei7OHf__oc40Q_NjE22yRniLnuIrO0CQOezDTW8c04
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ5NTIwNSwiZXhwIjoyMDcyMDcxMjA1fQ.V48JPvspOn1kCgPMWaBcHL2H4Eq-SuCJCh7RkR_vH90
JWT_SECRET=4Qv6KwU9rOB2CjZGx8NsfIyCY3RrhX0gxH7lPTBDvnWaOf4NALS/olLsg8EZkTs+
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=bkAun2U09L9IONvnC8vKK5EOeZS+Orjp+Z+5dlzKpBKnktP40gbG0PemejhfebQ/
NODE_ENV=production
```

### 2. Deploy to Vercel

- Click "Deploy"
- Wait ~2-3 minutes
- App deploys to **sfo1** (West Coast) automatically 🌊

### 3. Test Application

Visit your Vercel URL and test:
- Create account
- Login
- Create team
- Add events
- Invite members

---

## 📁 Migration File Locations

All migration files are in:
```
/mnt/c/development/team-track-360/supabase/migrations/
├── 001_initial_schema.sql (35KB - 39 tables)
├── 002_initial_schema_part2.sql (30KB - 35 tables)
├── 003_triggers_updated_at.sql (10KB - 69 triggers)
├── 004_rls_policies.sql (27KB - 100+ policies)
└── 005_seed_data.sql (9KB - seed data)
```

**Total:** 114KB of SQL

---

## 🆘 Troubleshooting

### Error: "relation already exists"

**Cause:** Migration was partially run before
**Solution:** Either drop the existing tables or skip that statement

### Error: "permission denied"

**Cause:** Not using service role key
**Solution:** Make sure you're logged into Supabase dashboard with admin access

### Error: "function does not exist"

**Cause:** Migrations run out of order
**Solution:** Run migrations in exact order (001 → 002 → 003 → 004 → 005)

### Slow Query

**Cause:** Creating many policies takes time
**Solution:** Wait patiently, especially for migration 004 (RLS policies)

---

**Ready to run migrations?** Start with migration 001!

**Dashboard URL:** https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/sql/new
