-- ============================================================================
-- SQL Migration: Create Student Skills Assessments Table
-- ============================================================================
-- Purpose: Store periodic (weekly/monthly) skills assessments for students
--          separate from per-task reviews.
-- 
-- This table stores:
--   - Soft Skills (10 traits)
--   - Development Skills (9 traits)
--   - Weekly or Monthly assessments
--   - Who reviewed and when
--
-- Created: January 21, 2026
-- ============================================================================

-- Step 1: Create the student_skills_assessments table
CREATE TABLE IF NOT EXISTS student_skills_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('executive', 'manager', 'team_lead', 'employee')),
    
    -- Period information
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,  -- Start date of the week (Monday) or month (1st)
    period_end DATE NOT NULL,    -- End date of the week (Sunday) or month (last day)
    
    -- Soft Skills Assessment
    soft_skill_traits JSONB DEFAULT '{}',
    soft_skills_score NUMERIC(4,2) DEFAULT 0,
    
    -- Development Skills Assessment
    development_skill_traits JSONB DEFAULT '{}',
    development_skills_score NUMERIC(4,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One assessment per student per period type per period start
    UNIQUE(student_id, period_type, period_start)
);

-- Step 2: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_skills_student_id ON student_skills_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_skills_period ON student_skills_assessments(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_skills_reviewer ON student_skills_assessments(reviewer_id);

-- Step 3: Add RLS policies
ALTER TABLE student_skills_assessments ENABLE ROW LEVEL SECURITY;

-- Allow executives to do everything
CREATE POLICY "Executives can manage all skills assessments"
ON student_skills_assessments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'executive'
    )
);

-- Allow managers to manage assessments for their team
CREATE POLICY "Managers can manage team skills assessments"
ON student_skills_assessments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p1, profiles p2
        WHERE p1.id = auth.uid() 
        AND p1.role = 'manager'
        AND p2.id = student_skills_assessments.student_id
        AND p1.team_id = p2.team_id
    )
);

-- Allow students to view their own assessments
CREATE POLICY "Students can view their own skills assessments"
ON student_skills_assessments
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Step 4: Add comments for documentation
COMMENT ON TABLE student_skills_assessments IS 'Stores periodic (weekly/monthly) skills assessments for students';
COMMENT ON COLUMN student_skills_assessments.period_type IS 'Type of period: weekly or monthly';
COMMENT ON COLUMN student_skills_assessments.period_start IS 'Start date of the assessment period (Monday for weekly, 1st for monthly)';
COMMENT ON COLUMN student_skills_assessments.soft_skill_traits IS 'JSONB object with individual soft skill scores (0-10)';
COMMENT ON COLUMN student_skills_assessments.development_skill_traits IS 'JSONB object with individual development skill scores (0-10)';

-- ============================================================================
-- Helper function to get week start (Monday) for a given date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    -- Returns the Monday of the week containing the input date
    RETURN input_date - ((EXTRACT(ISODOW FROM input_date) - 1)::INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper function to get week end (Sunday) for a given date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_week_end(input_date DATE)
RETURNS DATE AS $$
BEGIN
    -- Returns the Sunday of the week containing the input date
    RETURN input_date + (7 - EXTRACT(ISODOW FROM input_date)::INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_skills_assessments';

-- ============================================================================
-- Example Usage
-- ============================================================================
-- INSERT INTO student_skills_assessments (
--     student_id, reviewer_id, reviewer_role,
--     period_type, period_start, period_end,
--     soft_skill_traits, soft_skills_score,
--     development_skill_traits, development_skills_score
-- ) VALUES (
--     'student-uuid', 'reviewer-uuid', 'executive',
--     'weekly', '2026-01-20', '2026-01-26',
--     '{"Accountability": 8, "Communication": 7.5}'::jsonb, 7.75,
--     '{"Frontend": 9, "Backend": 8}'::jsonb, 8.5
-- )
-- ON CONFLICT (student_id, period_type, period_start) 
-- DO UPDATE SET
--     soft_skill_traits = EXCLUDED.soft_skill_traits,
--     soft_skills_score = EXCLUDED.soft_skills_score,
--     development_skill_traits = EXCLUDED.development_skill_traits,
--     development_skills_score = EXCLUDED.development_skills_score,
--     updated_at = NOW();

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS student_skills_assessments;
-- DROP FUNCTION IF EXISTS get_week_start(DATE);
-- DROP FUNCTION IF EXISTS get_week_end(DATE);
