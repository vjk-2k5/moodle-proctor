-- ============================================================================
-- Fix proctoring room uniqueness
-- Replace the old UNIQUE(exam_id, teacher_id, status) rule with a partial
-- uniqueness rule so a teacher can keep room history while still having only
-- one open room per exam at a time.
-- ============================================================================

ALTER TABLE proctoring_rooms
DROP CONSTRAINT IF EXISTS proctoring_rooms_exam_id_teacher_id_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rooms_exam_teacher_open
ON proctoring_rooms (exam_id, teacher_id)
WHERE status IN ('created', 'activated');
