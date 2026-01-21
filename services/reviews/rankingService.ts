import { supabase } from '../../lib/supabaseClient';

export interface RankingData {
    student_id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    soft_score: number;
    dev_score: number;
    overall_score: number;
}

export const getOrganizationRankings = async (periodStart: string, periodType: 'weekly' | 'monthly' = 'weekly'): Promise<RankingData[]> => {
    try {
        // 1. Fetch all assessments for this period
        const { data: assessments, error: assessmentError } = await supabase
            .from('student_skills_assessments')
            .select(`
                student_id,
                soft_skills_score,
                development_skills_score,
                profiles:student_id (
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('period_start', periodStart)
            .eq('period_type', periodType);

        if (assessmentError) throw assessmentError;
        if (!assessments) return [];

        // 2. Map and calculate overall scores
        const rankings: RankingData[] = assessments.map((a: any) => {
            const soft = parseFloat(a.soft_skills_score) || 0;
            const dev = parseFloat(a.development_skills_score) || 0;
            const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;

            return {
                student_id: a.student_id,
                full_name: profile?.full_name || 'Anonymous',
                email: profile?.email || '',
                avatar_url: profile?.avatar_url || null,
                soft_score: soft,
                dev_score: dev,
                overall_score: parseFloat(((soft + dev) / 2).toFixed(2))
            };
        });

        // 3. Sort by overall score descending
        return rankings.sort((a, b) => b.overall_score - a.overall_score);
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return [];
    }
};
