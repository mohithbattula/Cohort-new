import { supabase } from '../../lib/supabaseClient';

export interface SkillsAssessment {
    id: string;
    student_id: string;
    reviewer_id: string;
    reviewer_role: 'executive' | 'manager' | 'team_lead' | 'employee';
    period_type: 'weekly' | 'monthly';
    period_start: string;
    period_end: string;
    soft_skill_traits: Record<string, number>;
    soft_skills_score: number;
    development_skill_traits: Record<string, number>;
    development_skills_score: number;
    created_at: string;
    updated_at: string;
}

/**
 * Fetch skills assessments for a student
 */
export const getStudentSkillsAssessments = async (studentId: string, periodType?: 'weekly' | 'monthly') => {
    let query = supabase
        .from('student_skills_assessments')
        .select('*')
        .eq('student_id', studentId)
        .order('period_start', { ascending: false });

    if (periodType) {
        query = query.eq('period_type', periodType);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching skills assessments:', error);
        throw error;
    }
    return data as SkillsAssessment[];
};

/**
 * Fetch assessment for a specific student and period
 */
export const getSkillsAssessment = async (studentId: string, periodType: 'weekly' | 'monthly', periodStart: string) => {
    const { data, error } = await supabase
        .from('student_skills_assessments')
        .select('*')
        .eq('student_id', studentId)
        .eq('period_type', periodType)
        .eq('period_start', periodStart)
        .maybeSingle();

    if (error) {
        console.error('Error fetching skills assessment:', error);
        throw error;
    }
    return data as SkillsAssessment | null;
};
