-- Team Track 360 - Row Level Security Policies
-- Date: November 2, 2025
-- Description: Enables RLS and creates policies for all 74 tables
-- Migration: 004_rls_policies

-- ==============================================
-- HELPER FUNCTIONS FOR RLS
-- ==============================================

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = $1
    AND role_type IN ('platform_admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(user_id uuid, org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = $1
    AND parent_organization_id = $2
    AND role_type IN ('org_admin', 'platform_admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(user_id uuid, team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = $1
    AND admin_roles.team_id = $2
    AND role_type IN ('team_admin', 'org_admin', 'platform_admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is member of team
CREATE OR REPLACE FUNCTION is_team_member(user_id uuid, team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = $1
    AND team_members.team_id = $2
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's org IDs
CREATE OR REPLACE FUNCTION get_user_org_ids(user_id uuid)
RETURNS TABLE(org_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT parent_organization_id FROM admin_roles
  WHERE user_id = $1 AND is_active = true
  UNION
  SELECT DISTINCT t.parent_organization_id FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = $1 AND tm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team IDs
CREATE OR REPLACE FUNCTION get_user_team_ids(user_id uuid)
RETURNS TABLE(team_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT admin_roles.team_id FROM admin_roles
  WHERE user_id = $1 AND is_active = true AND admin_roles.team_id IS NOT NULL
  UNION
  SELECT DISTINCT team_members.team_id FROM team_members
  WHERE user_id = $1 AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 1. CORE HIERARCHY - RLS POLICIES
-- ==============================================

-- 1.1. sports (public read, admin write)
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_public_read" ON sports FOR SELECT USING (true);
CREATE POLICY "sports_admin_all" ON sports FOR ALL USING (is_platform_admin(auth.uid()));

-- 1.2. parent_organizations
ALTER TABLE parent_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_read_member" ON parent_organizations FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    id IN (SELECT org_id FROM get_user_org_ids(auth.uid()))
  );

CREATE POLICY "orgs_admin_all" ON parent_organizations FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), id)
  );

-- 1.3. organization_sports
ALTER TABLE organization_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_sports_read" ON organization_sports FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    parent_organization_id IN (SELECT org_id FROM get_user_org_ids(auth.uid()))
  );

CREATE POLICY "org_sports_admin" ON organization_sports FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), parent_organization_id)
  );

-- 1.4. teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_read_member" ON teams FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    parent_organization_id IN (SELECT org_id FROM get_user_org_ids(auth.uid())) OR
    id IN (SELECT team_id FROM get_user_team_ids(auth.uid()))
  );

CREATE POLICY "teams_admin" ON teams FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), parent_organization_id) OR
    is_team_admin(auth.uid(), id)
  );

-- 1.5. seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasons_read" ON seasons FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    parent_organization_id IN (SELECT org_id FROM get_user_org_ids(auth.uid()))
  );

CREATE POLICY "seasons_admin" ON seasons FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    is_org_admin(auth.uid(), parent_organization_id)
  );

-- ==============================================
-- 2. USERS & PERMISSIONS - RLS POLICIES
-- ==============================================

-- 2.1. profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- 2.2. user_types
ALTER TABLE user_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_types_read_own" ON user_types FOR SELECT
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "user_types_manage_own" ON user_types FOR ALL
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- 2.3. admin_roles
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_roles_read" ON admin_roles FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id))
  );

CREATE POLICY "admin_roles_platform_admin" ON admin_roles FOR ALL
  USING (is_platform_admin(auth.uid()));

-- 2.4. roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_read" ON roles FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

CREATE POLICY "roles_admin" ON roles FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- 2.5. role_assignments
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_assignments_read" ON role_assignments FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM roles WHERE roles.id = role_id AND
      (is_org_admin(auth.uid(), roles.parent_organization_id) OR
       is_team_admin(auth.uid(), roles.team_id)))
  );

CREATE POLICY "role_assignments_admin" ON role_assignments FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM roles WHERE roles.id = role_id AND
      (is_org_admin(auth.uid(), roles.parent_organization_id) OR
       is_team_admin(auth.uid(), roles.team_id)))
  );

-- 2.6. families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_read_member" ON families FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = families.id AND user_id = auth.uid()) OR
    is_platform_admin(auth.uid())
  );

CREATE POLICY "families_manage_member" ON families FOR ALL
  USING (
    EXISTS (SELECT 1 FROM family_members WHERE family_id = families.id AND user_id = auth.uid() AND role = 'primary') OR
    is_platform_admin(auth.uid())
  );

-- 2.7. family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_read" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid()) OR
    is_platform_admin(auth.uid())
  );

CREATE POLICY "family_members_manage" ON family_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid() AND fm.role = 'primary') OR
    is_platform_admin(auth.uid())
  );

-- ==============================================
-- 3. SPORT-SPECIFIC PROFILES
-- ==============================================

-- 3.1. wrestling_athlete_profiles
ALTER TABLE wrestling_athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrestling_profiles_read" ON wrestling_athlete_profiles FOR SELECT
  USING (
    user_id = auth.uid() OR
    team_id IN (SELECT team_id FROM get_user_team_ids(auth.uid())) OR
    is_platform_admin(auth.uid())
  );

CREATE POLICY "wrestling_profiles_manage" ON wrestling_athlete_profiles FOR ALL
  USING (
    user_id = auth.uid() OR
    is_team_admin(auth.uid(), team_id) OR
    is_platform_admin(auth.uid())
  );

-- ==============================================
-- 4. EVENTS & COMPETITIONS - RLS POLICIES
-- ==============================================

-- 4.1. locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_read" ON locations FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

CREATE POLICY "locations_admin" ON locations FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- 4.2. competitions
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions_public_read" ON competitions FOR SELECT USING (true);
CREATE POLICY "competitions_admin" ON competitions FOR ALL USING (is_platform_admin(auth.uid()));

-- 4.3. event_types
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_types_read" ON event_types FOR SELECT
  USING (
    visibility_level = 'public' OR
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
    (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

CREATE POLICY "event_types_admin" ON event_types FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
    (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- 4.4. events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read" ON events FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    is_team_member(auth.uid(), team_id) OR
    is_team_admin(auth.uid(), team_id)
  );

CREATE POLICY "events_admin" ON events FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    is_team_admin(auth.uid(), team_id)
  );

-- 4.5. event_rsvps
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_rsvps_read_own" ON event_rsvps FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND is_team_admin(auth.uid(), events.team_id))
  );

CREATE POLICY "event_rsvps_manage_own" ON event_rsvps FOR ALL
  USING (
    user_id = auth.uid() OR
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND is_team_admin(auth.uid(), events.team_id))
  );

-- 4.6. event_reminders
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_reminders_read" ON event_reminders FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_platform_admin(auth.uid())
  );

CREATE POLICY "event_reminders_manage" ON event_reminders FOR ALL
  USING (
    user_id = auth.uid() OR
    is_platform_admin(auth.uid())
  );

-- 4.7. user_calendar_integrations
ALTER TABLE user_calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_integrations_own" ON user_calendar_integrations FOR ALL
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- ==============================================
-- 5. ROSTERS & STATS - RLS POLICIES
-- ==============================================

-- 5.1. event_rosters
ALTER TABLE event_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_rosters_read" ON event_rosters FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND is_team_member(auth.uid(), events.team_id))
  );

CREATE POLICY "event_rosters_admin" ON event_rosters FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND is_team_admin(auth.uid(), events.team_id))
  );

-- 5.2. wrestling_roster_members
ALTER TABLE wrestling_roster_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrestling_roster_read" ON wrestling_roster_members FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM event_rosters er JOIN events e ON er.event_id = e.id
      WHERE er.id = roster_id AND is_team_member(auth.uid(), e.team_id))
  );

CREATE POLICY "wrestling_roster_admin" ON wrestling_roster_members FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM event_rosters er JOIN events e ON er.event_id = e.id
      WHERE er.id = roster_id AND is_team_admin(auth.uid(), e.team_id))
  );

-- 5.3. roster_change_log
ALTER TABLE roster_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roster_log_read" ON roster_change_log FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    changed_by_user_id = auth.uid()
  );

-- 5.4. wrestling_matches
ALTER TABLE wrestling_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrestling_matches_public_read" ON wrestling_matches FOR SELECT USING (true);

CREATE POLICY "wrestling_matches_admin" ON wrestling_matches FOR ALL
  USING (
    is_platform_admin(auth.uid()) OR
    (team_athlete_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM wrestling_athlete_profiles WHERE id = team_athlete_id AND is_team_admin(auth.uid(), team_id)
    ))
  );

-- ==============================================
-- SIMPLIFIED POLICIES FOR REMAINING TABLES
-- ==============================================
-- For brevity, remaining tables use similar patterns:
-- - Public read for competitor data
-- - Admin-only for system tables
-- - Team-scoped for team data
-- - User-scoped for user data

-- 6. COMPETITORS SYSTEM
ALTER TABLE competitor_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_teams_public_read" ON competitor_teams FOR SELECT USING (true);
CREATE POLICY "competitor_teams_admin" ON competitor_teams FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE competitor_athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_athletes_public_read" ON competitor_athletes FOR SELECT USING (true);
CREATE POLICY "competitor_athletes_admin" ON competitor_athletes FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE competitor_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_claims_read" ON competitor_claims FOR SELECT USING (
  claimed_by_user_id = auth.uid() OR is_platform_admin(auth.uid())
);

ALTER TABLE duplicate_detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duplicate_detections_admin" ON duplicate_detections FOR ALL USING (is_platform_admin(auth.uid()));

-- 7. PAYMENT SYSTEM - Admin and org-scoped
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_gateways_read" ON payment_gateways FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id))
);
CREATE POLICY "payment_gateways_admin" ON payment_gateways FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE gateway_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gateway_access_read" ON gateway_access FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id))
);

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_structures_read" ON fee_structures FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id))
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON products FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND parent_organization_id IN (SELECT org_id FROM get_user_org_ids(auth.uid()))) OR
  (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM get_user_team_ids(auth.uid())))
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_read_own" ON invoices FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_read" ON invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND
    (user_id = auth.uid() OR is_platform_admin(auth.uid())))
);

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_plans_read" ON payment_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND
    (user_id = auth.uid() OR is_platform_admin(auth.uid())))
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_read" ON transactions FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

-- 8. EQUIPMENT MANAGEMENT
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_read" ON equipment FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
  (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
);

ALTER TABLE equipment_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_checkouts_read" ON equipment_checkouts FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM equipment WHERE equipment.id = equipment_id AND
    (is_org_admin(auth.uid(), equipment.parent_organization_id) OR is_team_admin(auth.uid(), equipment.team_id)))
);

ALTER TABLE equipment_late_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_late_fees_read" ON equipment_late_fees FOR SELECT USING (
  EXISTS (SELECT 1 FROM equipment_checkouts WHERE equipment_checkouts.id = checkout_id AND
    (user_id = auth.uid() OR is_platform_admin(auth.uid())))
);

-- 9. DOCUMENTS & MEDIA
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_types_read" ON document_types FOR SELECT USING (true);
CREATE POLICY "document_types_admin" ON document_types FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_read" ON documents FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
  (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
);

ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_permissions_read" ON document_permissions FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

ALTER TABLE document_approval_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_approval_read" ON document_approval_queue FOR SELECT USING (
  uploaded_by_user_id = auth.uid() OR is_platform_admin(auth.uid())
);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_read" ON media_library FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
  (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
);

ALTER TABLE media_access_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_access_read" ON media_access_control FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

-- 10. WEBHOOKS & SYSTEM EVENTS - Admin only
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_events_admin" ON system_events FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_endpoints_admin" ON webhook_endpoints FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE test_webhook_payloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_webhook_payloads_admin" ON test_webhook_payloads FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE webhook_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_triggers_read" ON webhook_triggers FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id))
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_admin" ON webhook_logs FOR SELECT USING (is_platform_admin(auth.uid()));

ALTER TABLE ghl_workflow_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_workflow_mappings_admin" ON ghl_workflow_mappings FOR ALL USING (is_platform_admin(auth.uid()));

-- 11. GHL INTEGRATION
ALTER TABLE ghl_oauth_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_oauth_admin" ON ghl_oauth_connections FOR ALL USING (
  is_platform_admin(auth.uid()) OR is_org_admin(auth.uid(), parent_organization_id)
);

ALTER TABLE user_ghl_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_ghl_contacts_read" ON user_ghl_contacts FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

ALTER TABLE ghl_user_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_user_mappings_admin" ON ghl_user_mappings FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE ghl_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_sync_log_admin" ON ghl_sync_log FOR SELECT USING (is_platform_admin(auth.uid()));

ALTER TABLE ghl_custom_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_custom_field_mappings_admin" ON ghl_custom_field_mappings FOR ALL USING (is_platform_admin(auth.uid()));

-- 12. WRESTLING PLATFORM INTEGRATION
ALTER TABLE trackwrestling_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trackwrestling_imports_admin" ON trackwrestling_imports FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE bouttime_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bouttime_imports_admin" ON bouttime_imports FOR ALL USING (is_platform_admin(auth.uid()));

ALTER TABLE tournament_import_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournament_import_mappings_admin" ON tournament_import_mappings FOR ALL USING (is_platform_admin(auth.uid()));

-- 13. WEBSITES & CMS
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_templates_read" ON website_templates FOR SELECT USING (
  visibility = 'public' OR is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id))
);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "websites_public_read" ON websites FOR SELECT USING (is_published = true OR is_platform_admin(auth.uid()));
CREATE POLICY "websites_admin" ON websites FOR ALL USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
  (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
);

ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_pages_public_read" ON website_pages FOR SELECT USING (
  is_published = true OR is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM websites WHERE websites.id = website_id AND
    (is_org_admin(auth.uid(), websites.parent_organization_id) OR is_team_admin(auth.uid(), websites.team_id)))
);

ALTER TABLE website_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_domains_read" ON website_domains FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM websites WHERE websites.id = website_id AND
    (is_org_admin(auth.uid(), websites.parent_organization_id) OR is_team_admin(auth.uid(), websites.team_id)))
);

ALTER TABLE website_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_forms_public_read" ON website_forms FOR SELECT USING (
  is_active = true OR is_platform_admin(auth.uid())
);

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_submissions_admin" ON form_submissions FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM website_forms wf JOIN websites w ON wf.website_id = w.id
    WHERE wf.id = form_id AND (is_org_admin(auth.uid(), w.parent_organization_id) OR is_team_admin(auth.uid(), w.team_id)))
);

ALTER TABLE website_nav_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_nav_items_read" ON website_nav_items FOR SELECT USING (true);

ALTER TABLE webmaster_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webmaster_roles_read" ON webmaster_roles FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

ALTER TABLE website_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_sponsors_public_read" ON website_sponsors FOR SELECT USING (is_active = true);

ALTER TABLE website_analytics_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_analytics_settings_admin" ON website_analytics_settings FOR ALL USING (
  is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM websites WHERE websites.id = website_id AND
    (is_org_admin(auth.uid(), websites.parent_organization_id) OR is_team_admin(auth.uid(), websites.team_id)))
);

-- 14. LEADS & ANALYTICS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_admin" ON leads FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  (parent_organization_id IS NOT NULL AND is_org_admin(auth.uid(), parent_organization_id)) OR
  (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
);

ALTER TABLE website_page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_page_views_admin" ON website_page_views FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM websites WHERE websites.id = website_id AND
    (is_org_admin(auth.uid(), websites.parent_organization_id) OR is_team_admin(auth.uid(), websites.team_id)))
);

ALTER TABLE website_events_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_events_tracking_admin" ON website_events_tracking FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM websites WHERE websites.id = website_id AND
    (is_org_admin(auth.uid(), websites.parent_organization_id) OR is_team_admin(auth.uid(), websites.team_id)))
);

ALTER TABLE website_analytics_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_analytics_summary_admin" ON website_analytics_summary FOR SELECT USING (
  is_platform_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM websites WHERE websites.id = website_id AND
    (is_org_admin(auth.uid(), websites.parent_organization_id) OR is_team_admin(auth.uid(), websites.team_id)))
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_read" ON activity_log FOR SELECT USING (
  user_id = auth.uid() OR is_platform_admin(auth.uid())
);

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================
-- Total tables with RLS: 74
-- Total policies created: ~100+
-- Security model: Platform Admin > Org Admin > Team Admin > User
