import React, { useState, useEffect } from 'react';
import {
    Trophy, AlertTriangle, ShieldAlert, Award, Star,
    TrendingUp, TrendingDown, Users, ChevronRight, Loader2,
    Medal, Crown, Activity
} from 'lucide-react';
import { useUser } from '../../employee/context/UserContext';
import { useToast } from '../../employee/context/ToastContext';
import { getOrganizationRankings, RankingData } from '@/services/reviews/rankingService';

const LeaderboardPage = () => {
    const { userId, userRole = 'guest' } = useUser();
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
    }, []);

    const loadRankings = async (period: string) => {
        setLoading(true);
        try {
            const data = await getOrganizationRankings(period);
            setRankings(data);
        } catch (error) {
            addToast('Failed to load leaderboard', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculate lists
    const top5 = rankings.slice(0, 5);
    const bottom5 = rankings.length >= 5 ? rankings.slice(-5) : [];

    // User status
    const userRank = rankings.findIndex(r => r.student_id === userId) + 1;
    const isUserInTop5 = userRank > 0 && userRank <= 5;
    const isUserInBottom5 = userRank > 0 && userRank > (rankings.length - 5);

    // Zone detection for bottom 5
    // Bottom 1 & 2 (last 2 overall ranks) are Red Zone
    // Next 3 are Yellow Zone
    const isInRedZone = userRank > 0 && userRank > (rankings.length - 2);
    const isInYellowZone = userRank > 0 && !isInRedZone && userRank > (rankings.length - 5);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Calculating Standings...</p>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
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

            {/* Risk Zones - Private to Individuals or Managers/Executives */}
            {(isUserInBottom5 || userRole === 'manager' || userRole === 'executive') && (
                <section className="space-y-6 pt-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-xl">
                            <Activity className="text-red-600" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {userRole === 'executive' || userRole === 'manager' ? 'Intervention Required' : 'Growth Status'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* If Admin/Manager, show the list */}
                        {userRole !== 'employee' ? (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <span className="font-bold text-slate-700">Bottom 5 Members</span>
                                    <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase">Action Required</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {bottom5.map((student, idx) => {
                                        const globalRank = rankings.length - 4 + idx;
                                        const isRed = idx >= 3; // Last 2 in bottom 5
                                        return (
                                            <div key={student.student_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isRed ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {student.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{student.full_name}</div>
                                                        <div className="text-xs text-slate-500">Overall: {student.overall_score}</div>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${isRed ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-amber-400 text-white'
                                                    }`}>
                                                    {isRed ? 'Red Zone (Risk)' : 'Yellow Zone (Warning)'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* If Individual Student in Bottom 5, show their specific alert */
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
                                            <h3 className={`text-3xl font-black ${isInRedZone ? 'text-red-900' : 'text-amber-900'}`}>
                                                {isInRedZone ? 'IMMEDIATE ACTION REQUIRED' : 'ATTENTION REQUIRED'}
                                            </h3>
                                            <p className={`text-lg font-medium ${isInRedZone ? 'text-red-700' : 'text-amber-700'}`}>
                                                You are currently in the <strong>{isInRedZone ? 'Red Zone (Risk)' : 'Yellow Zone (Warning)'}</strong> based on this week's assessment.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white">
                                                <div className="text-sm font-bold text-slate-500 uppercase">Your Avg</div>
                                                <div className={`text-2xl font-black ${isInRedZone ? 'text-red-600' : 'text-amber-600'}`}>{rankings.find(r => r.student_id === userId)?.overall_score}</div>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white">
                                                <div className="text-sm font-bold text-slate-500 uppercase">Proximity</div>
                                                <div className="text-slate-800 font-bold italic">Schedule Mentor Sync</div>
                                            </div>
                                        </div>
                                    </div>

                                    <button className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all hover:shadow-xl active:scale-95 ${isInRedZone ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black text-white hover:bg-slate-800'
                                        }`}>
                                        Review Improvement Plan
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Neutral Zone / My Rank (If not in top or bottom) */}
            {!isUserInTop5 && !isUserInBottom5 && userRole === 'employee' && userRank > 0 && (
                <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-800">Developing Well</h3>
                        <p className="text-slate-500">You are in the stable zone of the organization. Keep pushing for the Top 5!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase">Your Rank</div>
                            <div className="text-3xl font-black text-indigo-600">#{userRank}</div>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default LeaderboardPage;
