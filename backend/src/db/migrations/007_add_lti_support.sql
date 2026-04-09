-- ============================================================================
-- Moodle-Proctor Database Schema
-- LTI 1.1 Support - Migration 007
-- ============================================================================
-- This migration adds LTI 1.1 support for automatic room creation from Moodle.
-- Enables Moodle External Tool integration with OAuth 1.0 signature validation.
-- ============================================================================

-- ============================================================================
-- ALTER PROCTORING ROOMS TABLE - ADD LTI COLUMNS
-- ============================================================================

-- LTI context key (unique identifier for Moodle course/resource)
-- Format: {context_id}_{resource_link_id}
-- Used for idempotent room creation (same LTI context = same room)
ALTER TABLE proctoring_rooms ADD COLUMN IF NOT EXISTS lti_context_key VARCHAR(255) UNIQUE;

-- LTI context label (human-readable course name from Moodle)
-- Used for display purposes in teacher dashboard
ALTER TABLE proctoring_rooms ADD COLUMN IF NOT EXISTS lti_context_label VARCHAR(255);

-- LTI resource ID (from Moodle)
-- Identifies which specific resource in the course (e.g., "Exam 1")
ALTER TABLE proctoring_rooms ADD COLUMN IF NOT EXISTS lti_resource_id VARCHAR(255);

-- Auto-created flag (true if room was created via LTI, false if manual)
-- Used for filtering LTI-created rooms in dashboard
ALTER TABLE proctoring_rooms ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;

-- ============================================================================
-- INDEXES (for performance - LTI context lookups are hot path)
-- ============================================================================

-- For LTI room lookups (hot path) - find room by LTI context key
CREATE INDEX IF NOT EXISTS idx_rooms_lti_context ON proctoring_rooms(lti_context_key);

-- For teacher dashboard - filter auto-created LTI rooms
CREATE INDEX IF NOT EXISTS idx_rooms_auto_created ON proctoring_rooms(auto_created);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN proctoring_rooms.lti_context_key IS 'LTI context key (unique: context_id + resource_link_id)';
COMMENT ON COLUMN proctoring_rooms.lti_context_label IS 'LTI context label (human-readable course name)';
COMMENT ON COLUMN proctoring_rooms.lti_resource_id IS 'LTI resource link ID (identifies specific resource)';
COMMENT ON COLUMN proctoring_rooms.auto_created IS 'True if room was auto-created via LTI launch';
