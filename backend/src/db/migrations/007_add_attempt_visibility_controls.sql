-- ============================================================================
-- Add Attempt Visibility Controls - Migration 007
-- ============================================================================
-- Allows teachers to hide attempts from operational views without deleting them.
-- ============================================================================

ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hidden_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_hidden_at ON exam_attempts(hidden_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_hidden ON exam_attempts(exam_id, hidden_at);
