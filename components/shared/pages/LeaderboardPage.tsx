import React, { useState, useEffect } from 'react';
import {
    Trophy, AlertTriangle, ShieldAlert, Award, Star,
    TrendingUp, TrendingDown, Users, ChevronRight, Loader2,
    Medal, Crown, Activity
} from 'lucide-react';
import { useUser } from '../../employee/context/UserContext';
import { useToast } from '../../employee/context/ToastContext';
import { getOrganizationRankings, RankingData } from '@/services/reviews/rankingService';
import { supabase } from '@/lib/supabaseClient';

const LeaderboardPage = () => {
    const { userId, userRole = 'guest', orgId } = useUser();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rankings, setRankings] = useState<RankingData[]>([]);
    const [currentPeriodStart, setCurrentPeriodStart] = useState('');

    useEffect(() => {
        // Get current week Monday
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        const mondayStr = monday.toISOString().split('T')[0];
        setCurrentPeriodStart(mondayStr);

        loadRankings(mondayStr);

        // Real-time subscription for dynamic updates
        const channel = supabase
            .channel('ranking_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'student_skills_assessments'
                },
                () => {
                    loadRankings(mondayStr);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId]);

    const loadRankings = async (period: string) => {
        setLoading(true);
        try {
            const data = await getOrganizationRankings(period, 'weekly', orgId);
            setRankings(data);
        } catch (error) {
            addToast('Failed to load leaderboard', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculate lists
    const totalStudents = rankings.length;

    // --- NEW RANKING LOGIC ---
    // Top 5: First 5 students in rankings
    const top5 = rankings.slice(0, 5);

    // Bottom 5: Last 5 students (only if count > 5)
    // Sorted descending by score, so last index is the worst.
    const bottom5 = rankings.length > 5 ? rankings.slice(-5) : [];

    // Remaining (for Mentors): Students with rank > 5
    const remainingStudents = rankings.length > 5 ? rankings.slice(5) : [];

    // User status
    const userRank = rankings.findIndex(r => r.student_id === userId) + 1;
    const isUserInTop5 = userRank > 0 && userRank <= 5;
    const isUserInRiskGroup = userRank > 5 && rankings.length > 5 && userRank > (rankings.length - 5);

    // Zone detection for bottom 5
    // positions from bottom: 1 (last), 2, 3, 4, 5
    const getZone = (rank: number) => {
        if (rankings.length === 0) return null;
        const fromBottom = rankings.length - rank + 1;
        if (fromBottom <= 2) return 'red';    // Bottom 2 of Bottom 5 -> RED ZONE
        if (fromBottom <= 5) return 'yellow'; // Top 3 of Bottom 5 -> YELLOW ZONE
        return null;
    };

    const userZone = isUserInRiskGroup ? getZone(userRank) : null;
    const isInRedZone = userZone === 'red';
    const isInYellowZone = userZone === 'yellow';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Calculating Standings...</p>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 w-full space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Organization Rankings</h1>
                    <p className="text-slate-500 mt-2 text-lg">Performance standings for the current session</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <TrendingUp className="text-indigo-500" size={20} />
                    <span className="text-slate-700 font-semibold">Week of {new Date(currentPeriodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
            </div>

            {/* Top 5 - Visible to Everyone */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <Trophy className="text-amber-600" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Top Performers</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {top5.map((student, index) => (
                        <div
                            key={student.student_id}
                            className={`relative group overflow-hidden bg-white p-6 rounded-3xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${index === 0 ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50' :
                                index === 1 ? 'border-slate-200' :
                                    index === 2 ? 'border-orange-100' : 'border-slate-100'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${index === 0 ? 'bg-amber-400 text-white' :
                                index === 1 ? 'bg-slate-300 text-white' :
                                    index === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {index + 1}
                            </div>

                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {student.full_name.charAt(0)}
                                    </div>
                                    {index === 0 && <Crown className="absolute -top-3 -right-2 text-amber-500 rotate-12" size={24} />}
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900 line-clamp-1">{student.full_name}</h3>
                                    <div className="flex items-center justify-center gap-1 text-indigo-600 font-bold text-lg">
                                        <Star size={16} fill="currentColor" />
                                        {student.overall_score}
                                    </div>
                                </div>

                                <div className="w-full pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                    <div>
                                        <div className="text-slate-600 text-xs">{student.soft_score}</div>
                                        Soft
                                    </div>
                                    <div>
                                        <div className="text-slate-600 text-xs">{student.dev_score}</div>
                                        Dev
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {top5.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 animate-pulse">
                            <Users className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500">Awaiting current week assessment data...</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Performance Risk Zones - Visible ONLY to Tutor (Executive) */}
            {userRole === 'executive' && bottom5.length > 0 && (
                <section className="space-y-6 pt-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-xl">
                            <Activity className="text-red-600" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Intervention Required (Bottom 5 Members)</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <span className="font-bold text-slate-700">Risk Assessment</span>
                                <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase">Private Access</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {bottom5.map((student) => {
                                    const sRank = rankings.findIndex(r => r.student_id === student.student_id) + 1;
                                    const z = getZone(sRank);
                                    const isRed = z === 'red';
                                    return (
                                        <div key={student.student_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isRed ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    {student.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{student.full_name}</div>
                                                    <div className="text-xs text-slate-500">Overall Score: {student.overall_score} • Rank: #{sRank}</div>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${isRed ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-amber-400 text-white'
                                                }`}>
                                                {isRed ? 'Red Zone' : 'Yellow Zone'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* 1. Personalized Standing Card - ALWAYS Visible to Students (Role: Employee) */}
            {userRole === 'employee' && userRank > 0 && (
                <section className="space-y-6 pt-6">
                    {/* CASE A: Student is in Top 5 */}
                    {isUserInTop5 ? (
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-[2rem] shadow-xl flex items-center justify-between text-white relative overflow-hidden transition-all hover:scale-[1.01]">
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />

                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                                    <Trophy size={48} className="text-amber-300" />
                                </div>
                                <div className="space-y-2 text-center md:text-left">
                                    <h3 className="text-3xl font-black flex items-center justify-center md:justify-start gap-3">
                                        Congratulations!
                                        <Crown className="text-amber-300" size={28} />
                                    </h3>
                                    <p className="text-indigo-100 font-medium text-lg leading-relaxed">
                                        You are in <span className="text-white font-black underline decoration-amber-300 underline-offset-4">top 5</span>. Keep leading the cohort with excellence!
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="text-right">
                                    <div className="text-xs font-black text-indigo-200 uppercase tracking-[0.2em]">Global Rank</div>
                                    <div className="text-6xl font-black text-white flex items-baseline justify-end">
                                        <span className="text-3xl text-amber-300">#</span>
                                        {userRank}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isUserInRiskGroup ? (
                        /* CASE B: Student is in Risk Group (Bottom 5) */
                        <div className={`p-8 rounded-[2rem] border-2 shadow-2xl relative overflow-hidden transition-all duration-500 hover:scale-[1.01] ${isInRedZone ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                            }`}>
                            {/* Background Decoration */}
                            <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isInRedZone ? 'bg-red-500' : 'bg-amber-500'
                                }`} />

                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${isInRedZone ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white'
                                    }`}>
                                    {isInRedZone ? <ShieldAlert size={48} /> : <AlertTriangle size={48} />}
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="space-y-1">
                                        <h3 className={`text-2xl font-black ${isInRedZone ? 'text-red-900' : 'text-amber-900'}`}>
                                            {isInRedZone ? 'IMMEDIATE ACTION REQUIRED' : 'ATTENTION REQUIRED'}
                                        </h3>
                                        <div className={`text-xl font-bold space-y-3 ${isInRedZone ? 'text-red-700' : 'text-amber-700'}`}>
                                            <p>You are in the <span className="underline decoration-2 underline-offset-4">bottom 5</span> based on your current ranking.</p>
                                            <div className={`p-5 rounded-2xl font-black text-2xl bg-white/60 border-2 flex items-center gap-3 ${isInRedZone ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-600'}`}>
                                                <AlertTriangle size={32} />
                                                ⚠️ You are in the bottom 5. Improve your skills to move up the ranking.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Rank</div>
                                        <div className={`text-5xl font-black ${isInRedZone ? 'text-red-600' : 'text-amber-600'}`}>#{userRank}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* CASE C: Student is in Neutral Zone */
                        <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-slate-800">Developing Well</h3>
                                <p className="text-slate-500 text-lg">You are in the stable zone. Keep pushing to reach the Top 5!</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Rank</div>
                                    <div className="text-5xl font-black text-indigo-600">#{userRank}</div>
                                </div>
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner">
                                    <TrendingUp size={32} />
                                </div>
                            </div>
                        </section>
                    )}
                </section>
            )}

            {/* Mentor Team Members Section - Visible ONLY to Mentor (Manager) */}
            {userRole === 'manager' && remainingStudents.length > 0 && (
                <section className="space-y-6 pt-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Users className="text-indigo-600" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Cohort Members</h2>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <span className="font-bold text-slate-700">Team Performance Breakdown</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {remainingStudents.map((student) => {
                                const sRank = rankings.findIndex(r => r.student_id === student.student_id) + 1;
                                return (
                                    <div key={student.student_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                {student.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{student.full_name}</div>
                                                <div className="text-xs text-slate-500">Overall Score: {student.overall_score}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rank</div>
                                            <div className="text-lg font-black text-indigo-600">#{sRank}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
};

export default LeaderboardPage;
