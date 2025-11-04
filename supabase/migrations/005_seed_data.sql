-- Team Track 360 - Seed Data Migration
-- Date: November 2, 2025
-- Description: Inserts initial seed data for sports, event types, and document types
-- Migration: 005_seed_data

-- ==============================================
-- 1. SPORTS - Initial Sports Setup
-- ==============================================

INSERT INTO sports (name, slug, description, is_active, display_order) VALUES
  ('Wrestling', 'wrestling', 'Competitive wrestling including folkstyle, freestyle, and greco-roman styles', true, 1),
  ('Swimming', 'swimming', 'Competitive swimming and diving', false, 2),
  ('Track & Field', 'track-field', 'Track and field athletics including running, jumping, and throwing events', false, 3),
  ('Basketball', 'basketball', 'Competitive basketball', false, 4),
  ('Soccer', 'soccer', 'Competitive soccer/football', false, 5),
  ('Baseball', 'baseball', 'Competitive baseball', false, 6),
  ('Softball', 'softball', 'Competitive softball', false, 7),
  ('Volleyball', 'volleyball', 'Competitive volleyball', false, 8),
  ('Football', 'football', 'Competitive American football', false, 9),
  ('Hockey', 'hockey', 'Competitive ice hockey', false, 10)
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- 2. EVENT TYPES - System-Level Event Types
-- ==============================================

INSERT INTO event_types (name, description, color, icon, category, scope_type) VALUES
  ('Practice', 'Team practice session', '#3B82F6', 'dumbbell', 'practice', 'system'),
  ('Competition', 'Competitive wrestling meet or tournament', '#EF4444', 'trophy', 'competitive', 'system'),
  ('Dual Meet', 'Head-to-head team competition', '#F59E0B', 'users', 'competitive', 'system'),
  ('Tournament', 'Multi-team tournament event', '#8B5CF6', 'award', 'competitive', 'system'),
  ('Weigh-In', 'Official weigh-in session', '#10B981', 'scale', 'other', 'system'),
  ('Team Meeting', 'Team meeting or discussion', '#6B7280', 'users', 'meeting', 'system'),
  ('Conditioning', 'Strength and conditioning session', '#14B8A6', 'activity', 'practice', 'system'),
  ('Film Session', 'Video review and analysis', '#6366F1', 'video', 'meeting', 'system'),
  ('Fundraiser', 'Team fundraising event', '#EC4899', 'dollar-sign', 'fundraiser', 'system'),
  ('Social Event', 'Team social gathering or celebration', '#F97316', 'calendar', 'social', 'system'),
  ('Parent Meeting', 'Meeting for parents and guardians', '#84CC16', 'users', 'meeting', 'system'),
  ('Volunteer Opportunity', 'Volunteer opportunity for team members', '#06B6D4', 'heart', 'other', 'system');

-- ==============================================
-- 3. DOCUMENT TYPES - Standard Document Types
-- ==============================================

INSERT INTO document_types (name, slug, description, required_for, display_order) VALUES
  ('Birth Certificate', 'birth-certificate', 'Official birth certificate or proof of age', 'athlete', 1),
  ('Medical Physical', 'medical-physical', 'Annual sports physical examination form', 'athlete', 2),
  ('Medical Release Form', 'medical-release', 'Authorization for medical treatment in case of emergency', 'athlete', 3),
  ('Concussion Form', 'concussion-form', 'Concussion awareness and acknowledgment form', 'athlete', 4),
  ('Liability Waiver', 'liability-waiver', 'General liability waiver and release', 'all', 5),
  ('Code of Conduct', 'code-of-conduct', 'Team code of conduct agreement', 'all', 6),
  ('Parent Consent', 'parent-consent', 'Parental consent for participation (minors only)', 'athlete', 7),
  ('Insurance Card', 'insurance-card', 'Copy of health insurance card', 'athlete', 8),
  ('Photo Release', 'photo-release', 'Permission to use photos and videos for promotional purposes', 'all', 9),
  ('Transportation Consent', 'transportation-consent', 'Permission for team travel and transportation', 'athlete', 10),
  ('Background Check', 'background-check', 'Background check clearance (for coaches and volunteers)', 'coach', 11),
  ('SafeSport Certificate', 'safesport-certificate', 'SafeSport training completion certificate', 'coach', 12),
  ('Coaching License', 'coaching-license', 'Official coaching certification or license', 'coach', 13),
  ('First Aid/CPR', 'first-aid-cpr', 'Current First Aid and CPR certification', 'coach', 14),
  ('W9 Form', 'w9-form', 'IRS W9 form for independent contractors', 'coach', 15),
  ('Volunteer Application', 'volunteer-application', 'Volunteer application and agreement', 'volunteer', 16),
  ('Financial Agreement', 'financial-agreement', 'Payment plan or financial obligation agreement', 'all', 17),
  ('Equipment Checkout', 'equipment-checkout', 'Equipment checkout and responsibility form', 'athlete', 18),
  ('Travel Itinerary', 'travel-itinerary', 'Team travel information and itinerary', 'all', 19),
  ('Hotel Rooming List', 'hotel-rooming', 'Hotel accommodation assignments', 'all', 20)
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- 4. SYSTEM EVENTS - Webhook Trigger Types
-- ==============================================

INSERT INTO system_events (event_name, description, category, is_active) VALUES
  -- User Events
  ('user.created', 'New user account created', 'user', true),
  ('user.updated', 'User profile updated', 'user', true),
  ('user.deleted', 'User account deleted', 'user', true),

  -- Team Events
  ('team.created', 'New team created', 'team', true),
  ('team.updated', 'Team information updated', 'team', true),
  ('team.member_added', 'Member added to team', 'team', true),
  ('team.member_removed', 'Member removed from team', 'team', true),

  -- Event Events
  ('event.created', 'New event created', 'event', true),
  ('event.updated', 'Event details updated', 'event', true),
  ('event.cancelled', 'Event cancelled', 'event', true),
  ('event.rsvp_submitted', 'RSVP submitted for event', 'event', true),

  -- Payment Events
  ('payment.received', 'Payment successfully processed', 'payment', true),
  ('payment.failed', 'Payment processing failed', 'payment', true),
  ('invoice.created', 'New invoice generated', 'payment', true),
  ('invoice.overdue', 'Invoice payment overdue', 'payment', true),

  -- Document Events
  ('document.uploaded', 'Document uploaded', 'document', true),
  ('document.approved', 'Document approved', 'document', true),
  ('document.rejected', 'Document rejected', 'document', true),

  -- Match/Competition Events
  ('match.result_entered', 'Match result recorded', 'competition', true),
  ('competition.completed', 'Competition event completed', 'competition', true),

  -- Form Submission Events
  ('form.submitted', 'Website form submitted', 'website', true),
  ('lead.created', 'New lead captured', 'website', true)
ON CONFLICT (event_name) DO NOTHING;

-- ==============================================
-- 5. PLATFORM-LEVEL FEE STRUCTURE (Optional)
-- ==============================================

-- Insert platform-level subscription fee (this would be customized per deployment)
INSERT INTO fee_structures (
  name,
  slug,
  fee_type,
  scope_level,
  amount,
  currency,
  billing_frequency,
  description,
  is_active
) VALUES
  (
    'Platform Base Fee',
    'platform-base-fee',
    'subscription',
    'platform',
    99.00,
    'USD',
    'monthly',
    'Base platform subscription fee for organizations',
    false  -- Set to false by default, enable as needed
  ),
  (
    'Per User Fee',
    'per-user-fee',
    'per_user',
    'platform',
    2.00,
    'USD',
    'monthly',
    'Per user monthly fee',
    false  -- Set to false by default, enable as needed
  )
ON CONFLICT DO NOTHING;

-- ==============================================
-- SEED DATA SUMMARY
-- ==============================================
-- Sports: 10 sports (Wrestling active, 9 others inactive for future)
-- Event Types: 12 wrestling event types
-- Document Types: 20 standard document types
-- System Events: 21 webhook trigger types
-- Fee Structures: 2 platform-level fees (disabled by default)
--
-- Total seed records: ~45 records
--
-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================
