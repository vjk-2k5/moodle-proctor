-- ============================================================================
-- Moodle-Proctor Database Schema
-- Moodle Quiz Support - Migration 008
-- ============================================================================
-- This migration adds tables for storing Moodle quiz data.
-- Enables Moodle Quiz API integration (Phase 2).
-- ============================================================================

-- ============================================================================
-- CREATE MOODLE QUIZZES TABLE
-- ============================================================================
-- Stores quiz metadata synced from Moodle
CREATE TABLE IF NOT EXISTS moodle_quizzes (
  id SERIAL PRIMARY KEY,
  moodle_quiz_id INTEGER NOT NULL UNIQUE,
  course_id INTEGER NOT NULL,
  course_module_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  intro TEXT,
  time_open BIGINT,
  time_close BIGINT,
  time_limit INTEGER NOT NULL DEFAULT 0,
  lti_context_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE MOODLE QUESTIONS TABLE
-- ============================================================================
-- Stores quiz questions synced from Moodle
CREATE TABLE IF NOT EXISTS moodle_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES moodle_quizzes(id) ON DELETE CASCADE,
  moodle_question_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  question_text TEXT NOT NULL,
  default_mark INTEGER NOT NULL DEFAULT 1,
  qtype VARCHAR(50) NOT NULL,
  category INTEGER,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================

-- For LTI context lookups (hot path)
CREATE INDEX IF NOT EXISTS idx_moodle_quizzes_lti_context ON moodle_quizzes(lti_context_key);

-- For room-based quiz lookups (via join with proctoring_rooms)
CREATE INDEX IF NOT EXISTS idx_moodle_quizzes_lti_context_join ON moodle_quizzes(lti_context_key)
  WHERE lti_context_key IS NOT NULL;

-- For question queries by quiz
CREATE INDEX IF NOT EXISTS idx_moodle_questions_quiz_id ON moodle_questions(quiz_id);

-- For Moodle quiz ID lookups
CREATE INDEX IF NOT EXISTS idx_moodle_quizzes_moodle_id ON moodle_quizzes(moodle_quiz_id);

-- For Moodle question ID lookups (unique per quiz)
CREATE INDEX IF NOT EXISTS idx_moodle_questions_moodle_id ON moodle_questions(quiz_id, moodle_question_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE moodle_quizzes IS 'Stores quiz metadata synced from Moodle LMS';
COMMENT ON TABLE moodle_questions IS 'Stores quiz questions synced from Moodle LMS';

COMMENT ON COLUMN moodle_quizzes.moodle_quiz_id IS 'Quiz ID from Moodle (unique identifier)';
COMMENT ON COLUMN moodle_quizzes.course_id IS 'Moodle course ID';
COMMENT ON COLUMN moodle_quizzes.course_module_id IS 'Moodle course module ID';
COMMENT ON COLUMN moodle_quizzes.lti_context_key IS 'Links quiz to LTI context for auto-sync';
COMMENT ON COLUMN moodle_quizzes.time_open IS 'Unix timestamp when quiz opens';
COMMENT ON COLUMN moodle_quizzes.time_close IS 'Unix timestamp when quiz closes';
COMMENT ON COLUMN moodle_quizzes.time_limit IS 'Time limit in seconds (0 = no limit)';

COMMENT ON COLUMN moodle_questions.quiz_id IS 'Foreign key to moodle_quizzes table';
COMMENT ON COLUMN moodle_questions.moodle_question_id IS 'Question ID from Moodle';
COMMENT ON COLUMN moodle_questions.question_text IS 'Question text (HTML format)';
COMMENT ON COLUMN moodle_questions.default_mark IS 'Point value for this question';
COMMENT ON COLUMN moodle_questions.qtype IS 'Question type (multichoice, truefalse, shortanswer, essay, etc.)';
COMMENT ON COLUMN moodle_questions.options IS 'Question-specific options (JSON format)';
