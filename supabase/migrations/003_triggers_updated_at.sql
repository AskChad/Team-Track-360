-- Team Track 360 - Triggers Migration
-- Date: November 2, 2025
-- Description: Creates updated_at triggers for all tables
-- Migration: 003_triggers_updated_at

-- ==============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==============================================

-- Create the function that updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- APPLY TRIGGERS TO ALL TABLES WITH updated_at
-- ==============================================

-- 1. CORE HIERARCHY
CREATE TRIGGER update_sports_updated_at BEFORE UPDATE ON sports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parent_organizations_updated_at BEFORE UPDATE ON parent_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_sports_updated_at BEFORE UPDATE ON organization_sports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. USERS & PERMISSIONS
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_types_updated_at BEFORE UPDATE ON user_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_assignments_updated_at BEFORE UPDATE ON role_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. SPORT-SPECIFIC PROFILES
CREATE TRIGGER update_wrestling_athlete_profiles_updated_at BEFORE UPDATE ON wrestling_athlete_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. EVENTS & COMPETITIONS
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_types_updated_at BEFORE UPDATE ON event_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON event_rsvps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_calendar_integrations_updated_at BEFORE UPDATE ON user_calendar_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. ROSTERS & STATS
CREATE TRIGGER update_event_rosters_updated_at BEFORE UPDATE ON event_rosters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wrestling_roster_members_updated_at BEFORE UPDATE ON wrestling_roster_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wrestling_matches_updated_at BEFORE UPDATE ON wrestling_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. COMPETITORS SYSTEM
CREATE TRIGGER update_competitor_teams_updated_at BEFORE UPDATE ON competitor_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competitor_athletes_updated_at BEFORE UPDATE ON competitor_athletes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. PAYMENT SYSTEM
CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON payment_gateways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gateway_access_updated_at BEFORE UPDATE ON gateway_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_plans_updated_at BEFORE UPDATE ON payment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. EQUIPMENT MANAGEMENT
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_checkouts_updated_at BEFORE UPDATE ON equipment_checkouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_late_fees_updated_at BEFORE UPDATE ON equipment_late_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. DOCUMENTS & MEDIA
CREATE TRIGGER update_document_types_updated_at BEFORE UPDATE ON document_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_permissions_updated_at BEFORE UPDATE ON document_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_approval_queue_updated_at BEFORE UPDATE ON document_approval_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_library_updated_at BEFORE UPDATE ON media_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_access_control_updated_at BEFORE UPDATE ON media_access_control FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. WEBHOOKS & SYSTEM EVENTS
CREATE TRIGGER update_system_events_updated_at BEFORE UPDATE ON system_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_triggers_updated_at BEFORE UPDATE ON webhook_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_workflow_mappings_updated_at BEFORE UPDATE ON ghl_workflow_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. GHL INTEGRATION
CREATE TRIGGER update_ghl_oauth_connections_updated_at BEFORE UPDATE ON ghl_oauth_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_ghl_contacts_updated_at BEFORE UPDATE ON user_ghl_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_user_mappings_updated_at BEFORE UPDATE ON ghl_user_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_custom_field_mappings_updated_at BEFORE UPDATE ON ghl_custom_field_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. WRESTLING PLATFORM INTEGRATION
CREATE TRIGGER update_trackwrestling_imports_updated_at BEFORE UPDATE ON trackwrestling_imports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bouttime_imports_updated_at BEFORE UPDATE ON bouttime_imports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournament_import_mappings_updated_at BEFORE UPDATE ON tournament_import_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. WEBSITES & CMS
CREATE TRIGGER update_website_templates_updated_at BEFORE UPDATE ON website_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_domains_updated_at BEFORE UPDATE ON website_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_forms_updated_at BEFORE UPDATE ON website_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_nav_items_updated_at BEFORE UPDATE ON website_nav_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webmaster_roles_updated_at BEFORE UPDATE ON webmaster_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_sponsors_updated_at BEFORE UPDATE ON website_sponsors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_analytics_settings_updated_at BEFORE UPDATE ON website_analytics_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. LEADS & ANALYTICS
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- NOTES:
-- ==============================================
-- Tables WITHOUT updated_at (no triggers needed):
-- - event_reminders (has remind_at, not updated_at)
-- - roster_change_log (immutable log)
-- - duplicate_detections (immutable log)
-- - invoice_items (part of invoice)
-- - transactions (immutable financial record)
-- - test_webhook_payloads (immutable test data)
-- - webhook_logs (immutable log)
-- - ghl_sync_log (immutable log)
-- - competitor_claims (immutable audit trail)
-- - website_page_views (immutable tracking)
-- - website_events_tracking (immutable tracking)
-- - website_analytics_summary (daily rollup, not updated)
-- - activity_log (immutable audit log)
--
-- Total triggers created: 69 triggers for 69 tables with updated_at

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================
