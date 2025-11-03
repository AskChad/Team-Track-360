# Team Track 360 - Requirements Discovery Q&A Session

**Date:** November 2, 2025
**Subject:** Complete Requirements Discovery and Database Design
**Status:** In Progress - Q1-Q16 Complete, Q17-Q20 Pending

---

## Session Summary

This document captures the complete requirements gathering session for Team Track 360, a sports management system focused on wrestling (Phase 1) with modular architecture for future sports.

---

## ✅ COMPLETED QUESTIONS (Q1-Q16)

### Q1. Three-Level Structure ✅

**Answers:**
- System (Platform) → Organizations (parent_organizations) → Teams/Clubs → Users
- One Team/Club belongs to ONE Organization (strict 1:1)
- Flat structure now, designed for future nesting capability
- Scale: 1000+ organizations, optimized for more
- Display: "Organization", Internal: `parent_organizations` table
- **Team** = Scholastic (High School, Jr High, College)
- **Club** = Non-scholastic athletes
- Both in same table with `team_type` field

**Follow-ups:**
- 1a: No, teams/clubs only belong to 1 organization
- 1b: Not nested yet, but design for future nesting
- 1c: Scale to 1000+ orgs, keep efficiency high

---

### Q2. Team Types & Rosters ✅

**Answers:**
- **2a:** YES - Add `school_level` field (High School, Jr High, College, Middle School, Elementary)
- **2b:** Varsity/JV/Freshmen = **ROSTERS**, not separate teams
  - Athletes can move between rosters (e.g., JV → Varsity)
- **2c:** For Clubs - same. Age groups, skill levels = **ROSTERS**, not separate clubs

**Key Decision:**
```
Team/Club (permanent) → Rosters (flexible, per season) → Athletes (can move)
```

---

### Q3. User Types & Roles ✅

**Answers:**
- **3a:** YES - Users can have multiple TYPES (Athlete + Coach + Parent + Donor simultaneously)
- **3b:** Admin roles are **HIERARCHICAL & EXCLUSIVE**
  - Platform Admin > Org Admin > Team/Club Admin
  - Can't be Platform Admin AND Org Admin
  - BUT can be Org Admin for multiple orgs
  - BUT can be Team Admin for multiple teams
  - Non-admin roles (Communication, Member, etc.) ARE combinable
- **3c:** Family Admin:
  - Parents create "family" groups
  - Manage users in their family
  - Same permissions as user themselves
  - Can update passwords, stats, view data

**Follow-ups:**
- **3d:** Permission system:
  - Pre-defined permission sets (create sensible defaults)
  - Fully customizable: can create new roles, edit existing
  - Platform Admin = not editable, always has ALL permissions
- **3e:** Family Admin can:
  - Remove (not delete) members from family
  - Set family-level billing or per-member billing
  - Set which members can use family payment card
  - Register family members for events
  - Full proxy permissions
  - Add new users to system (auto-added to family)
  - Athletes can **opt-out** (default = family admin has access)
  - **Pay for all family members**

---

### Q4. Family Relationships ✅

**Answers:**
- **Family = Organizational grouping** for following/managing athletes
- Relationship types (parent, grandparent, etc.) are **optional metadata**
- Users can be in **multiple families** (divorced parents scenario)
- Families **span across teams/sports** (siblings on different teams)
- Purpose: Group people by who they're following, not by team

---

### Q5. Payment & Subscription System ✅

**Answers:**
- **5a:** YES - subscription model (monthly/yearly/one-time)
  - Platform charges Orgs: subscription + per-org fee + per-user fee (all can be $0)
  - Orgs charge Teams: same structure (cascades/accumulates)
  - Teams charge Users: same structure (cascades)

**Payment Gateway Access Control:**
- Platform Admin can grant gateway access to: Orgs, Teams directly
- Org Admin can grant gateway access to Teams ONLY if Org uses **their own gateway**
- **RULE:** If Org uses Platform gateway → CANNOT cascade to Teams
- Teams can use **own gateway** if Org Admin allows

**Features:**
- Invoice generation
- Payment tracking & history
- Refunds & credits
- Payment plans/installments
- **Products system** (events, equipment, registrations, etc.)

**Processors:**
- Phase 1: Stripe, PayPal, Authorize.net
- Phase 2: Square

**Follow-ups:**
- **5e:** Product creation hierarchical:
  - Platform Admin: create for all users, all orgs, specific orgs/teams
  - Org Admin: create for all teams, specific teams, all users in org
  - Team Admin: create for team members only

- **5f:** Payment cascade (automated):
  ```
  User pays Team ($135)
    → Team charged by Org ($25)
      → Org charged by Platform ($10)
        = Team keeps $100, Org keeps $25, Platform keeps $10
  ```

---

### Q6. Sport-Specific vs Multi-Sport ✅

**Answers:**
- **Multi-sport system** designed from day 1
- **Phase 1:** Wrestling ONLY (but build modular)
- **Future:** Swimming, boxing, BJJ, track, gymnastics (individual sports)
- **NOT team sports** for now
- **Weight classes:** Sport-specific + Season-specific + Event overrides
- **Statistics:** Separate tables per sport

**Follow-ups:**
- **6d:** Organizations can have **multiple sports**
  - Teams are **single sport only** (1 Team = 1 Sport)
- **6e:** Age brackets:
  - Same structure as weight classes
  - Need names ("Juniors", "U12", etc.)
  - Min/max age OR min/max grade (flexible)
  - Copy from previous season feature

---

### Q7. Competition & Events ✅

**Answers:**
**Competition Model:**
```
Competition (template/series for historical tracking)
  ↓
Event A (Team A's instance) + Event B (Team B's instance)
  - Different logistics per team
  - Same competition_id for stats queries
```

**Event Rosters:**
- Each team creates roster for their event
- Roster members assigned brackets/divisions per event
- Wrestling: athlete → weight class → made weight checkbox
- Swimming: athlete → relay teams + individual events
- **Sport-specific roster tables**

**Matches = Stats:**
- Match between two athletes (one may not be in system)
- Opponent recorded as text if not in system
- Match result IS the stat record
- Phase 1: End result only (winner, method)
- Team stats = calculated aggregate

**Follow-ups:**
- **7a-7g:** Confirmed competition/event model
- **7d:** Each team submits their own roster per event
- **7e:** Bracket/division assignments per athlete per event
- **7f:** Matches create stats, opponent can be text entry
- **7g:** Locations table with competition defaults, event overrides

---

### Q8. Wrestling Statistics + Competitors ✅

**Answers:**
- **8a:** Match results = stats (no separate aggregation)
- **8b:** Team stats = calculated real-time from matches
- **8c:** All time periods: per event, per season, career, head-to-head

**Competitors System (Unclaimed Teams/Athletes):**
- **8d:** Two tables: `competitor_teams` and `competitor_athletes`
  - Teams: non-user teams/schools
  - Athletes: individuals from non-user teams
- **8e:** Track: name, city, state, zip, sports
- **8f:** Claiming process:
  - Auto-link when team joins (reversible)
  - Generate audit report
  - Platform Admin can reverse
- **8g:** Duplicate detection:
  - AI checks new entries for duplicates
  - Auto-merge if confident
  - Flag for review
  - Admins approve or undo

---

### Q9. Equipment Management ✅

**Answers:**
- **9a:** Equipment levels: System, Org, or Team
  - Platform Admin: create all levels
  - Org Admin: org + team equipment
  - Team Admin: team equipment only

- **9b:** Equipment defines who can check it out

- **9c:** Track: name/type, size, serial number, condition, purchase date, cost

- **9d:** Check-out features:
  - Due dates, overdue reminders, return condition, late fees
  - Reports: overdue, upcoming due dates, late fees owed

**System Events (Workflow Triggers):**
- Trigger on: stats entered, late fees, reminders, event posted, payment received
- Maps to GHL workflows (to be discussed)

**Follow-up:**
- **9e:** GHL integration deferred to comprehensive discussion

---

### Q10. Documents & Custom Values ✅

**Answers:**
- **10a:** Upload permissions + approval:
  - Platform/Org/Team Admins: appropriate level
  - Coaches: upload team docs → Team Admin approval (with report)
  - Family Admins: manage all family member docs
  - Athletes: upload to own profiles

**CRITICAL: Sport-Specific Athlete Profiles!**
- Athletes need **separate profile per sport**
- Example: John Smith → Wrestling Profile + Swimming Profile
- Each profile: sport-specific settings (weight class, swim events, etc.)
- **Athlete profiles are sport-specific tables**

- **10b:** Document types:
  - Rosters (system-generated)
  - Medical forms (per athlete per sport)
  - Liability waivers (per athlete per sport)
  - Meeting minutes (tied to event)

- **10c:** Access control:
  - Role-based (configurable)
  - Per-document override permissions

- **10d:** Websites: Deferred until after GHL

---

### Q11. Webhook System ✅

**Answers:**
**Modular Webhook Builder:**

**Incoming:**
1. Create webhook endpoint
2. Click "Capture Test Payload"
3. Receive payload → Display JSON
4. Map JSON fields → Database columns
5. Auto-process future webhooks

**Outgoing:**
1. Choose trigger (system event)
2. Paste target schema
3. Map our data → their schema
4. Auto-send on trigger

**Security (per webhook):**
- API keys (optional)
- IP whitelisting (optional)
- Signature verification / HMAC (optional)

**Action:** Reference Attack Kit Section 17 + Data Engine implementation

---

### Q12. Roster Management ✅

**Answers:**
- **12a:** Rosters = Per Event (within Seasons)
  - Seasons: calendar dates, sport-specific, org-managed
  - Sports can have multiple seasons (scholastic, club)

- **12b:** Track roster changes with reasons:
  - No show, illness, injury, previous engagement, weight issues, discipline, other

- **12c:** No approval for MVP (design for future)
  - Roster live immediately, printable anytime

- **12d:** Roster size limits:
  - **Event-specific** (not org/team policy)
  - Example: JV allows 2 per weight class, Varsity allows 1

---

### Q13. Event Types & Calendar ✅

**Answers:**
- **13a:** Event types (expandable):
  - Competitive: Tournament, Dual Meet
  - Meetings: Parent, Board, Coaches
  - Additional: Practice, Weigh-in, Banquet, Fundraiser
  - Custom types allowed

- **13b:** Non-competitive features:
  - RSVP: in-app, webhook, or GHL
  - Attendance tracking
  - Attachments (agenda, minutes)
  - Custom UI per event type

- **13c:** Custom event types (hierarchical):
  - Platform Admin: system-wide
  - Org Admin: org + downline teams
  - Team Admin: team only
  - Platform Admin can "adopt" to make system-wide

**Calendar & Reminders:**
- Recurring events (start/end date, RRULE)
- Google Calendar integration (auto-populate)
- Reminder system (email + SMS, configurable)

---

### Q14. ACL Hierarchy ✅

**Answers:**
- **14a:** Org Admins see ALL teams in their org (automatic)

- **14b:** Team Admins see ONLY assigned teams

- **14c:** Family Admins see public info for teams their family members belong to
  - Full access to family members' data across teams

- **14d:** Event Admins (scoped role):
  - Assigned by Org Admin: all org teams OR specific teams (multi-select with search)
  - Assigned by Team Admin: that team only
  - Permissions: create events, manage RSVPs, track attendance

- **14e:** Data Admins (scoped role):
  - Add stats for athletes on event rosters
  - Approve/verify stats from others
  - Based on org or team scope

---

### Q15. MVP Features ✅

**Answers:**
**Phase 1 (MVP) - EVERYTHING except:**
- System/Org/Team hierarchy ✅
- User management ✅
- Athlete profiles (sport-specific) ✅
- Teams/Clubs management ✅
- Rosters ✅
- Events ✅
- Competitions ✅
- Match results ✅
- Stats ✅
- Families ✅
- Payment system ✅
- Equipment ✅
- Documents ✅
- Webhooks ✅
- Calendar ✅
- GHL integration ✅
- Competitors ✅
- Custom event types ✅
- Document approvals ✅
- AI duplicate detection ✅
- Recurring events ✅
- Reminders ✅
- All ACL/permissions ✅

**Phase 2:**
- Advanced reporting ❌
- Mobile app ❌

**Sport:**
- **Wrestling ONLY** for Phase 1
- Build with **modular architecture** for future sports

---

### Q16. Existing Data ✅

**Answers:**
- **No existing data** to migrate
- **Starting fresh**
- No migration tools needed

---

## ✅ COMPLETED QUESTIONS (Q17-Q19)

### Q17. Wrestling Platform Integrations ✅

**Platforms for Phase 1:**
- ✅ **TrackWrestling** (priority) - Use GitHub workaround: https://github.com/vehbiu/opentw-api
- ✅ **BoutTime**
- ❌ Flowwrestling (deferred to Phase 2)
- ❌ MatBoss (deferred to Phase 2)
- ❌ WrestleStat (deferred to Phase 2)

**Data Flow - Phase 1:**
- **FROM TrackWrestling:**
  - Download tournament data → Temporary holding tables
  - Mapping interface for easy event import into our system
  - User reviews/maps data before finalizing import

**Data Flow - Phase 2 (Future):**
- Real-time mat assignments
- Live results feed
- Deep dive opentw-api capabilities and limitations when implementing

**Push TO Platforms (Desired but not required):**
- Push match results to specific tournaments
- Update athlete results
- Register athletes for tournaments

**Integration Method Priority:**
1. API (preferred)
2. Webhook (if available)
3. Scraping/workaround (use opentw-api if needed)
4. Manual CSV import/export (always available, not preferred)

**Timeline:**
- NOT critical for MVP
- Can be implemented at **END of Phase 1**
- Lower priority than core features

**Action Items:**
- Research opentw-api GitHub repo
- Understand capabilities and limitations
- Test with real tournament data

---

### Q18. GHL (GoHighLevel) Integration ✅

**CRITICAL FOR PHASE 1** - References Attack Kit Sections 19 & 20 + Data Engine implementation

#### GHL Account Architecture

**Platform Level:**
- Team Track 360 Platform = **GHL Agency**
- Platform has **its own sub-account** for platform communications

**Organization Level:**
- **Current (Phase 1):** 1 Organization = 1 GHL Sub-account/Location (1:1 mapping)
- **Future:** Multiple Organizations MAY share 1 GHL Sub-account (design for flexibility)
- Database: `parent_organizations.ghl_location_id` (nullable, allows shared location IDs)

**Compliance:**
- All messaging **A2P (Application-to-Person) compliant** with current regulations
- All accounts use **Team Track privacy and data policies**

#### Entity Mapping - Users

**Admins (Platform/Org/Team):**
- Synced as **GHL Users** (can login to GHL to manage external communications)

**Everyone Else (Athletes, Coaches, Parents, Donors):**
- Synced as **GHL Contacts**
- **Custom Fields on Contacts:**
  - `user_type` (athlete, coach, parent, donor)
  - `organizations` (comma-separated text field for multiple org affiliations)
  - `team_track_user_id` (bi-directional linking)
  - `family_name` (for family relationships)
  - `family_id` (for family relationships)

**CRITICAL - Multiple Contact Records per User:**
- Users affiliated with multiple orgs/teams get **separate contact IDs per org**
  - Example: John Smith = Club wrestler (Org A) + High school wrestler (Org B)
  - Contact ID 1 in Org A's GHL location
  - Contact ID 2 in Org B's GHL location
- **New Table:** `user_ghl_contacts`
  ```sql
  user_ghl_contacts:
  - id (uuid)
  - user_id (uuid → profiles)
  - organization_id (uuid → parent_organizations)
  - ghl_location_id (text)
  - ghl_contact_id (text)
  - created_at, updated_at
  ```

**NOT Synced to GHL:**
- ❌ Team rosters (Team Track only)
- ❌ Sport-specific profiles (weight class, swim events, etc.)

#### Entity Mapping - Teams

**Teams identified in GHL via:**
- **Option A:** Custom field on contacts/users
- **Option B:** GHL Internal Objects (if needed)
- Build both options for flexibility

#### Entity Mapping - Events

**Event reminder emails via GHL workflows:**
- Add users to workflows dynamically
- Send **templated emails** with event details (date, time, location, roster, etc.)

**Flow:**
```
Event created in Team Track
  → Trigger outgoing webhook to GHL
    → Add contacts to workflow
      → Send dynamic email from template
```

#### Outgoing Webhooks TO GHL

**ALL events should be mappable:**
- ✅ User registration (new athlete/parent signs up)
- ✅ Payment received (registration fee, equipment, etc.)
- ✅ Late equipment fees accrued
- ✅ Match result entered (for parent notifications)
- ✅ Event created/updated (for calendar sync)
- ✅ Roster changes (athlete added/removed)
- ✅ Document uploaded/approved
- ✅ Other (custom triggers)

**Implementation:** `system_events` table with configurable webhook triggers

#### Incoming Webhooks FROM GHL

**Modular Webhook System** (Data Engine pattern):
> "i want it to be more of a modular approach i create a webhook... click a button and wait for payload when it comes in map it to any table i choose."

**Implementation Steps:**
1. Create webhook in UI
2. Click "Capture Test Payload" button
3. Send test webhook from GHL (or any source)
4. Display captured JSON payload
5. Map JSON fields to database table columns using JSON paths (e.g., `$.contact.firstName` → `first_name`)
6. Choose target table
7. Save configuration
8. Future webhooks auto-process and insert data

**Confirmed Webhook Events:**
- ✅ Contact updates (phone/email changes in GHL sync back to Team Track)
- ✅ **NEW Organizations:** When contacts subscribe via GHL form → auto-create organization in Team Track
- ✅ Any other mappable events (flexible system)

**Reference:** Attack Kit Section 11 + Data Engine `/app/api/webhooks/` implementation

#### Lifecycle Stages / Tags

- ❌ Not necessary for Phase 1

---

### Q19. Websites/CMS ✅

**CRITICAL FOR PHASE 1**

#### Website Scope - Three-Level Hierarchy

1. **Platform Website** (Team Track 360 marketing)
   - Custom non-templated site
   - Platform marketing and communications

2. **Organization Websites** (marketing)
   - Organization template
   - Each org gets their own site

3. **Team/Club Websites**
   - Team/club template
   - **Default:** Teams inherit organization's design
   - **Navigation:** Teams automatically listed in dropdown nav bar per organization

#### Website Builder

**Phase 1: Template-Based**
- Organization template
- Team/club template
- Custom non-templated (platform only)

**Phase 2: WYSIWYG** (drag-and-drop editor - future)

#### Public Pages & Access Control

| Page Type | Public Access | Logged-In Access | Notes |
|-----------|---------------|------------------|-------|
| **Rosters** | ❌ No | ✅ Approved team members only | NOT public |
| **Event Calendar** | ✅ Yes | ✅ Yes | Published internally AND externally |
| **Match Results** | ⚠️ Conditional | ✅ Yes | By weight class only (NOT named athletes) |
| **Registration Forms** | ✅ Yes | ✅ Yes | Auto-assign to correct org/team |
| **Sponsor Showcase** | ✅ Yes | ✅ Yes | Display sponsors |
| **Donation Pages** | ✅ Yes | ✅ Yes | Accept donations |
| **Fan Pages** | ✅ Yes | ✅ Yes | Public fan engagement |

**Match Results Display Rules:**
- Display by **weight class** only (no athlete names on public view)
- **Toggle control:**
  - Team Admin can turn ON/OFF for their team
  - Org Admin can turn ON/OFF for their org + teams
- **Hierarchy Rule:** If Org Admin turns ON but Team Admin has it OFF → Results still **OFF** (Team Admin wins)

**Registration Forms:**
- Automatically assign users to correct org AND team **based on where they registered**
- Each site needs its own registration forms
- Reference **"form project"** for form builder requirements

#### Custom Domains

**Support All Domain Types:**
- ✅ Custom domains (e.g., `springfieldwrestling.com`)
- ✅ Subdomains (e.g., `springfield.teamtrack360.com`)
- ✅ Wildcards (if desired)

#### Content Management

**Edit Permissions:**
- **Platform Admin:** All sites (platform + all orgs + all teams)
- **Org Admin:** Their org site + downline teams
- **Team Admin:** Their team site only
- **NEW ROLE: Webmaster** - Non-admin users who can edit website settings

**Media Library:**
- **Storage:** Supabase
- **Organization:** By types (videos, photos, logos, etc.)

**Hierarchical Access Control:**
```
Teams:
  - View: Their images + org images + (platform images if granted)
  - Delete: Their images only (NOT org images)

Organizations:
  - View: Their images + platform images
  - Delete: Their images only (NOT platform images)

Platform Admins:
  - View: All images
  - Delete: All images
  - Special: Manually set which orgs/teams can view specific platform images
```

#### Forms Integration

**Forms Built IN Team Track Platform:**
- Reference **"form project"** for detailed requirements
- New contacts in system → trigger GHL sync to add contacts there

**Leads Table:**
- Store contacts that visit websites (tracked with ipGEOlocation)
- Store contacts that fill out forms
- Sync leads to GHL as well

**Flow:**
```
User visits site → Track with ipGEOlocation → Store in leads table
User fills form → Create contact in Team Track → Trigger GHL sync → Add to GHL
```

#### SEO & Analytics

**Built-In Features:**
- ✅ SEO (meta tags, sitemaps, etc.)
- ✅ **GEO (Generative Engine Optimization)**
- ✅ Custom tracking codes
- ⏳ Built-in tracking (Possible Phase 2)

**Analytics:**
- Reference **"roi marketing calculator project"** for analytics patterns
- Use **ipGEOlocation** for visitor tracking
- Leads table to track visitors and form submissions

---

## 📊 Key Design Decisions Captured

### Database Tables Identified

**Core Hierarchy:**
- sports
- parent_organizations
- organization_sports (many-to-many)
- teams (single sport)
- seasons (sport-specific, org-specific)

**Users & Permissions:**
- profiles (base user data)
- user_types (many-to-many: athlete, coach, parent, donor)
- admin_roles (hierarchical)
- role_assignments (non-hierarchical with scopes)
- roles (customizable permissions)
- families
- family_members

**Sport-Specific Profiles:**
- wrestling_athlete_profiles
- swimming_athlete_profiles (future)
- {sport}_athlete_profiles (pattern)

**Events & Competitions:**
- competitions (historical tracking)
- events (team-specific instances)
- event_types (customizable, hierarchical visibility)
- locations
- event_rsvps
- user_calendar_integrations
- event_reminder_preferences

**Rosters (Sport-Specific):**
- event_rosters
- wrestling_roster_members
- swimming_roster_members (future)
- roster_change_log

**Matches/Stats (Sport-Specific):**
- wrestling_matches (ARE the stats)
- swimming_races (future)
- Weight classes, age brackets (sport-specific, season-specific)

**Competitors (Unclaimed):**
- competitor_teams
- competitor_athletes
- competitor_claims (audit trail)
- duplicate_detections (AI-powered)

**Payments:**
- payment_gateways (per org/team)
- gateway_access (cascade permissions)
- fee_structures (cascading fees)
- products (hierarchical creation)
- invoices
- payment_plans
- transactions (cascade chain tracking)

**Equipment:**
- equipment (hierarchical ownership)
- equipment_checkouts
- equipment_late_fees
- equipment_report_settings

**Documents:**
- documents (per entity, per sport)
- document_types
- document_permissions
- document_approval_queue

**System Events & Webhooks:**
- system_events (workflow triggers)
- ghl_workflow_mappings
- webhook_endpoints (incoming)
- webhook_triggers (outgoing)
- test_webhook_payloads (capture system)

**GHL Integration:**
- user_ghl_contacts (multiple contact IDs per user per org)
- ghl_oauth_connections
- ghl_location_tokens (if caching needed)
- ghl_sync_log (audit trail)

**Wrestling Platform Integrations:**
- trackwrestling_imports (temporary holding)
- bouttime_imports (temporary holding)
- tournament_import_mappings (user-defined mappings)

**Websites/CMS:**
- websites (platform, org, team levels)
- website_templates (org template, team template)
- website_pages (dynamic pages per site)
- website_domains (custom domains + subdomains)
- media_library (photos, videos, logos)
- media_access_control (hierarchical permissions)
- website_forms (registration, contact, donation)
- leads (website visitors + form submissions)
- website_analytics (tracked with ipGEOlocation)
- webmaster_roles (non-admin website editors)

---

## 🎯 Critical Features Summary

### Unique to This System

1. **Three-level hierarchy** (System → Org → Team)
2. **Sport-specific athlete profiles** (separate profile per sport per team)
3. **Competition vs Event model** (historical tracking)
4. **Cascading payment system** (each level charges level below)
5. **Payment gateway access control** (complex inheritance rules)
6. **Competitor system** (unclaimed teams/athletes with AI de-dupe)
7. **Modular webhook builder** (capture payload, map fields)
8. **Family admin** (proxy permissions for family members)
9. **Sport-specific rosters and stats** (extensible design)
10. **Event-specific roster size limits** (not org policy)
11. **Multiple GHL contact IDs per user** (one per org affiliation)
12. **Three-level website hierarchy** (Platform → Org → Team sites)
13. **Template inheritance** (teams inherit org design by default)
14. **Hierarchical media library** (teams see org images, can't delete)
15. **Conditional public match results** (weight class only, team admin override)
16. **Wrestling platform imports** (temporary holding tables with mapping UI)
17. **Modular GHL workflows** (all system events mappable to GHL)
18. **A2P compliant messaging** (all GHL communications)
19. **ipGEOlocation tracking** (website visitors and leads)
20. **Custom domain support** (orgs/teams use own domains)

---

## 📝 Next Steps

**Requirements Discovery:** ✅ COMPLETE (Q1-Q19)

**Immediate Actions:**
1. ✅ Update conversation log with Q17-Q19
2. ⏳ Review "form project" for form builder requirements
3. ⏳ Review "roi marketing calculator" for analytics patterns
4. ⏳ Begin comprehensive database schema design
5. ⏳ Create migration files (exec_sql pattern)
6. ⏳ Build initial API structure

**Projects to Reference:**
- Attack Kit (implementation standards)
- Data Engine (GHL integration, webhooks, company sync)
- Form Project (form builder requirements)
- ROI Marketing Calculator (analytics patterns, ipGEOlocation)

---

**Document Status:** Requirements Discovery Complete
**Last Updated:** November 2, 2025 - Q17-Q19 Added
**Next Update:** After schema design completion
