-- ============================================================================
-- SQL Migration: Add Development Skills to Student Task Reviews
-- ============================================================================
-- Purpose: Add a new JSONB column to store development skill trait scores
--          alongside the existing soft_skill_traits column.
-- 
-- Development Skills (9 traits):
--   1. Frontend
--   2. Backend
--   3. Workflows
--   4. Databases
--   5. Prompting
--   6. Non-popular LLMs
--   7. Fine-tuning
--   8. Data Labelling
--   9. Content Generation
--
-- Created: January 21, 2026
-- ============================================================================

-- Step 1: Add the development_skill_traits column
ALTER TABLE student_task_reviews 
ADD COLUMN IF NOT EXISTS development_skill_traits JSONB DEFAULT '{}';

-- Step 2: Add development_skills_score column for the average score
ALTER TABLE student_task_reviews 
ADD COLUMN IF NOT EXISTS development_skills_score NUMERIC(4,2) DEFAULT 0;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN student_task_reviews.development_skill_traits IS 
'JSONB object storing individual development skill scores (0-10). Keys: Frontend, Backend, Workflows, Databases, Prompting, Non-popular LLMs, Fine-tuning, Data Labelling, Content Generation';

COMMENT ON COLUMN student_task_reviews.development_skills_score IS 
'Average score across all development skill traits (0-10)';

-- ============================================================================
-- Verification Query: Check if columns were added successfully
-- ============================================================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_task_reviews' 
-- AND column_name IN ('development_skill_traits', 'development_skills_score');

-- ============================================================================
-- Example Insert/Update Usage
-- ============================================================================
-- INSERT INTO student_task_reviews (
--     student_id, task_id, reviewer_id, reviewer_role, score,
--     soft_skill_traits, soft_skills_score,
--     development_skill_traits, development_skills_score
-- ) VALUES (
--     'student-uuid', 'task-uuid', 'reviewer-uuid', 'executive', 8.5,
--     '{"Accountability": 8, "Communication": 7.5}'::jsonb, 7.75,
--     '{"Frontend": 9, "Backend": 8, "Databases": 7.5}'::jsonb, 8.17
-- );

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- ALTER TABLE student_task_reviews DROP COLUMN IF EXISTS development_skill_traits;
-- ALTER TABLE student_task_reviews DROP COLUMN IF EXISTS development_skills_score;
