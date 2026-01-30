import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, Star, TrendingUp, Award, ChevronRight, ChevronLeft, Loader2, Calendar, User, Save, CheckCircle2, Clock, BarChart3, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { NumberTicker } from "@/registry/magicui/number-ticker";
import { getStudentTasksWithReviews } from '@/services/reviews/studentTaskReviews';
import { getStudentSkillsAssessments, type SkillsAssessment } from '@/services/reviews/studentSkillsAssessments';
import { Confetti, type ConfettiRef } from '@/registry/magicui/confetti';
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import { useToast } from '../context/ToastContext';

const SOFT_SKILL_TRAITS = [
    "Accountability", "Learnability", "Abstract Thinking", "Curiosity", "Second-Order Thinking",
    "Compliance", "Ambitious", "Communication", "English", "First-Principle Thinking"
];

const DEVELOPMENT_SKILL_TRAITS = [
    "Frontend", "Backend", "Workflows", "Databases", "Prompting",
    "Non-popular LLMs", "Fine-tuning", "Data Labelling", "Content Generation"
];

import SoftSkillsSection from '../components/SoftSkillsSection';

const MyReviewPage = () => {
    const { userId } = useUser();
    const { addToast } = useToast();
    const [selectedTab, setSelectedTab] = useState('Score');
    const [tasks, setTasks] = useState<any[]>([]);
    const [skills, setSkills] = useState<SkillsAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [viewPeriod, setViewPeriod] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [skillCategory, setSkillCategory] = useState<'soft' | 'development'>('soft');
    const confettiRef = useRef<ConfettiRef>(null);

    // Self Assessment State
    const [selfSoftSkillScores, setSelfSoftSkillScores] = useState<Record<string, number>>({});
    const [selfSoftSkillEnabled, setSelfSoftSkillEnabled] = useState<Record<string, boolean>>({});
    const [selfSoftSkillsAvg, setSelfSoftSkillsAvg] = useState(0);

    const [selfDevSkillScores, setSelfDevSkillScores] = useState<Record<string, number>>({});
    const [selfDevSkillEnabled, setSelfDevSkillEnabled] = useState<Record<string, boolean>>({});
    const [selfDevSkillsAvg, setSelfDevSkillsAvg] = useState(0);

    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // UI Filtering State
    const [filterStatus, setFilterStatus] = useState<'all' | 'reviewed' | 'pending'>('reviewed'); // Default to reviewed
    const [showScoreModal, setShowScoreModal] = useState(false);

    // Task Details Modal State
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Helper functions for period navigation
    const getWeekStart = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const isSamePeriod = (d1: Date, d2: Date, period: 'weekly' | 'monthly') => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        date1.setHours(12, 0, 0, 0);
        date2.setHours(12, 0, 0, 0);

        if (period === 'weekly') {
            const s1 = getWeekStart(date1);
            const s2 = getWeekStart(date2);
            s1.setHours(12, 0, 0, 0);
            s2.setHours(12, 0, 0, 0);
            return s1.toISOString().split('T')[0] === s2.toISOString().split('T')[0];
        } else {
            return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
        }
    };

    const formatPeriodRange = (date: Date) => {
        if (viewPeriod === 'weekly') {
            const start = getWeekStart(date);
            const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    };

    const navigatePeriod = (direction: number) => {
        const newDate = new Date(selectedDate);
        if (viewPeriod === 'weekly') {
            newDate.setDate(newDate.getDate() + direction * 7);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }

        // Don't navigate into future
        if (newDate <= new Date()) {
            setSelectedDate(newDate);
        }
    };

    const isCurrentPeriod = isSamePeriod(selectedDate, new Date(), viewPeriod);

    // Updated: Filter tasks by the selected period
    // Filter tasks by the selected period (Due Date OR Review Date)
    // Filter tasks by the selected period (Due Date OR Review Date)
    const tasksInPeriod = tasks.filter(task => {
        // Condition 1: Task due date is in this period
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(12, 0, 0, 0);
            if (isSamePeriod(dueDate, selectedDate, viewPeriod)) return true;
        }

        // Condition 2: Any review was created/updated in this period
        const reviews = task.student_task_reviews || [];
        return reviews.some((review: any) => {
            const reviewDate = new Date(review.updated_at || review.created_at);
            reviewDate.setHours(12, 0, 0, 0);
            return isSamePeriod(reviewDate, selectedDate, viewPeriod);
        });
    });

    const filteredTasks = tasksInPeriod.filter(task => {
        const reviews = task.student_task_reviews || [];
        const hasReview = reviews.length > 0; // Simplified check

        if (filterStatus === 'reviewed') return hasReview;
        if (filterStatus === 'pending') return !hasReview;
        return true;
    });

    const metrics = React.useMemo(() => {
        const reviewed = tasksInPeriod.filter(t => t.student_task_reviews?.length > 0);
        const reviewedCount = reviewed.length;
        const pendingCount = tasksInPeriod.length - reviewedCount;

        const totalScore = reviewed.reduce((acc, t) => {
            const r = t.student_task_reviews.find((rev: any) => rev.reviewer_role === 'executive') || t.student_task_reviews[0];
            return acc + (r?.score || 0);
        }, 0);
        const avgVal = reviewedCount > 0 ? (totalScore / reviewedCount) : 0;

        return {
            reviewedCount,
            pendingCount,
            avgScoreVal: avgVal,
            avgScoreDisplay: avgVal.toFixed(1)
        };
    }, [tasksInPeriod]);

    // Animation State
    const [animatedScore, setAnimatedScore] = useState(0);
    const [confettiVisible, setConfettiVisible] = useState(false);

    useEffect(() => {
        if (showScoreModal) {
            setAnimatedScore(0);
            setConfettiVisible(false);

            // Score Animation delay
            const timerScore = setTimeout(() => {
                setAnimatedScore(metrics.avgScoreVal * 10);
            }, 100);

            // Confetti delay to sync with animation completion
            const timerConfetti = setTimeout(() => {
                if (metrics.avgScoreVal >= 7) {
                    setConfettiVisible(true);
                }
            }, 1200);

            return () => {
                clearTimeout(timerScore);
                clearTimeout(timerConfetti);
            };
        } else {
            setAnimatedScore(0);
            setConfettiVisible(false);
        }
    }, [showScoreModal, metrics.avgScoreVal]);

    const getScoreColor = (score: number) => {
        if (score >= 8) return "rgb(34 197 94)"; // Green-500
        if (score >= 6) return "rgb(234 179 8)"; // Yellow-500
        return "rgb(239 68 68)"; // Red-500
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const [tasksData, skillsData] = await Promise.all([
                    getStudentTasksWithReviews(userId),
                    getStudentSkillsAssessments(userId)
                ]);
                const sortedTasks = (tasksData || []).sort((a: any, b: any) => {
                    const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                    return dateB - dateA; // Latest first
                });
                setTasks(sortedTasks);
                setSkills(skillsData || []);
            } catch (error) {
                console.error('Error fetching review data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, refreshTrigger]);

    // REAL-TIME SUBSCRIPTION
    useEffect(() => {
        const taskChannel = supabase
            .channel('student-task-review-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_task_reviews' }, () => {
                setRefreshTrigger(prev => prev + 1);
            })
            .subscribe();

        const skillsChannel = supabase
            .channel('student-skills-review-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_skills_assessments' }, () => {
                setRefreshTrigger(prev => prev + 1);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(taskChannel);
            supabase.removeChannel(skillsChannel);
        };
    }, []);

    const tabs = [
        { id: 'Score', icon: <Star size={32} />, color: '#f59e0b', label: 'Score' },
        // { id: 'Review', icon: <ClipboardList size={24} />, color: '#3b82f6', label: 'Review' }, // REMOVED
        // { id: 'Improvements', icon: <TrendingUp size={24} />, color: '#10b981', label: 'Improvements' }, // REMOVED
        { id: 'My Score', icon: <User size={32} />, color: '#3b82f6', label: 'My Score' },
        { id: 'Org Score', icon: <Award size={32} />, color: '#8b5cf6', label: 'Org Score' } // Renamed from Skills
    ];

    // --- Self Assessment Helpers ---
    useEffect(() => {
        if (!userId) return;
        const loadSelfAssessment = async () => {
            const periodStartStr = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];
            // Find existing assessment in the fetched skills list (or fetch specifically if needed, but we have getStudentSkillsAssessments returning all)
            // The current API might return all, let's filter from 'skills' state if possible, or fetch fresh.
            // optimized: use 'skills' state.
            const currentAssessment = skills.find(s => s.period_type === viewPeriod && s.period_start === periodStartStr);

            if (currentAssessment) {
                // Load Self Scores
                const sSoft = currentAssessment.self_soft_skill_traits || {};
                const sDev = currentAssessment.self_development_skill_traits || {};

                const initialSoftScores: Record<string, number> = {};
                const initialSoftEnabled: Record<string, boolean> = {};
                SOFT_SKILL_TRAITS.forEach(t => {
                    if (sSoft[t] !== undefined && sSoft[t] !== null) {
                        initialSoftScores[t] = sSoft[t];
                        initialSoftEnabled[t] = true;
                    } else {
                        initialSoftScores[t] = 0;
                        initialSoftEnabled[t] = false; // Default false if not set
                    }
                });

                const initialDevScores: Record<string, number> = {};
                const initialDevEnabled: Record<string, boolean> = {};
                DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                    if (sDev[t] !== undefined && sDev[t] !== null) {
                        initialDevScores[t] = sDev[t];
                        initialDevEnabled[t] = true;
                    } else {
                        initialDevScores[t] = 0;
                        initialDevEnabled[t] = false;
                    }
                });

                setSelfSoftSkillScores(initialSoftScores);
                setSelfSoftSkillEnabled(initialSoftEnabled);
                setSelfSoftSkillsAvg(currentAssessment.self_soft_skills_score || 0);

                setSelfDevSkillScores(initialDevScores);
                setSelfDevSkillEnabled(initialDevEnabled);
                setSelfDevSkillsAvg(currentAssessment.self_development_skills_score || 0);

                setIsEditing(false); // Mode: View/Edit
            } else {
                // Reset
                setSelfSoftSkillScores({});
                setSelfSoftSkillEnabled(SOFT_SKILL_TRAITS.reduce((acc, t) => ({ ...acc, [t]: true }), {})); // Default all enabled for new? Or logic choice. Let's say all enabled default 0.
                setSelfSoftSkillsAvg(0);
                setSelfDevSkillScores({});
                setSelfDevSkillEnabled(DEVELOPMENT_SKILL_TRAITS.reduce((acc, t) => ({ ...acc, [t]: true }), {}));
                setSelfDevSkillsAvg(0);
                setIsEditing(true); // New assessment
            }
        };
        loadSelfAssessment();
    }, [skills, viewPeriod, selectedDate, userId]);

    const calculateAvg = (scores: Record<string, number>, enabled: Record<string, boolean>, traits: string[]) => {
        let total = 0;
        let count = 0;
        traits.forEach(t => {
            if (enabled[t]) {
                total += (scores[t] || 0);
                count++;
            }
        });
        return count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
    };

    const handleSoftChange = (trait: string, val: number) => {
        const newScores = { ...selfSoftSkillScores, [trait]: val };
        setSelfSoftSkillScores(newScores);
        setSelfSoftSkillsAvg(calculateAvg(newScores, selfSoftSkillEnabled, SOFT_SKILL_TRAITS));
    };

    const toggleSoft = (trait: string) => {
        const newEnabled = { ...selfSoftSkillEnabled, [trait]: !selfSoftSkillEnabled[trait] };
        setSelfSoftSkillEnabled(newEnabled);
        setSelfSoftSkillsAvg(calculateAvg(selfSoftSkillScores, newEnabled, SOFT_SKILL_TRAITS));
    };

    const handleDevChange = (trait: string, val: number) => {
        const newScores = { ...selfDevSkillScores, [trait]: val };
        setSelfDevSkillScores(newScores);
        setSelfDevSkillsAvg(calculateAvg(newScores, selfDevSkillEnabled, DEVELOPMENT_SKILL_TRAITS));
    };

    const toggleDev = (trait: string) => {
        const newEnabled = { ...selfDevSkillEnabled, [trait]: !selfDevSkillEnabled[trait] };
        setSelfDevSkillEnabled(newEnabled);
        setSelfDevSkillsAvg(calculateAvg(selfDevSkillScores, newEnabled, DEVELOPMENT_SKILL_TRAITS));
    };

    const handleSaveSelfAssessment = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const periodStart = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
            periodStart.setHours(12, 0, 0, 0);
            const periodStartStr = periodStart.toISOString().split('T')[0];

            const pEnd = (viewPeriod === 'weekly' ? new Date(periodStart.getTime() + 6 * 24 * 60 * 60 * 1000) : new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0));
            pEnd.setHours(12, 0, 0, 0);
            const periodEnd = pEnd.toISOString().split('T')[0];

            const softTraitsToSave: Record<string, number | null> = {};
            SOFT_SKILL_TRAITS.forEach(t => {
                softTraitsToSave[t] = selfSoftSkillEnabled[t] ? (selfSoftSkillScores[t] || 0) : null;
            });

            const devTraitsToSave: Record<string, number | null> = {};
            DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                devTraitsToSave[t] = selfDevSkillEnabled[t] ? (selfDevSkillScores[t] || 0) : null;
            });

            // Upsert
            const { error } = await supabase
                .from('student_skills_assessments')
                .upsert({
                    student_id: userId,
                    reviewer_id: userId, // Self-assessed
                    reviewer_role: 'employee',
                    period_type: viewPeriod,
                    period_start: periodStartStr,
                    period_end: periodEnd,
                    self_soft_skill_traits: softTraitsToSave,
                    self_soft_skills_score: selfSoftSkillsAvg,
                    self_development_skill_traits: devTraitsToSave,
                    self_development_skills_score: selfDevSkillsAvg,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id,period_type,period_start' });

            if (error) throw error;

            addToast('Self assessment saved!', 'success');
            if (confettiRef.current) confettiRef.current.fire({});
            // Refresh logic handled by realtime subscription or manual refetch
        } catch (err) {
            console.error(err);
            addToast('Failed to save assessment', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-gray-400" size={48} />
            </div>
        );
    }

    const renderContent = () => {
        // --- ORG SCORE (Read Only) ---
        if (selectedTab === 'Org Score') {
            const periodStart = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
            periodStart.setHours(12, 0, 0, 0);
            const periodStartStr = periodStart.toISOString().split('T')[0];
            const periodSkills = skills.find(s => s.period_type === viewPeriod && s.period_start === periodStartStr);

            // Org Scores (Manager/Lead)
            const softTraitScores = periodSkills?.soft_skill_traits || {};
            const devTraitScores = periodSkills?.development_skill_traits || {};

            const softTraits = SOFT_SKILL_TRAITS
                .filter(name => softTraitScores[name] !== undefined && softTraitScores[name] !== null)
                .map(name => ({ name, score: softTraitScores[name] }));
            const softOverall = periodSkills?.soft_skills_score || 0;

            const devTraits = DEVELOPMENT_SKILL_TRAITS
                .filter(name => devTraitScores[name] !== undefined && devTraitScores[name] !== null)
                .map(name => ({ name, score: devTraitScores[name] }));
            const devOverall = periodSkills?.development_skills_score || 0;

            // Compare with Self Scores for "Reason" display?
            // Actually requirement says: "if alter any scores from personal scores , he needs to add the reasons and that scores will be shown in "Org Scores""
            // So we should show the "override_reason" if it exists.
            // Parse structured override reasons
            let traitReasons = {};
            let generalFeedback = "";
            let improvements = "";

            if (periodSkills?.override_reason) {
                try {
                    const parsed = JSON.parse(periodSkills.override_reason);
                    traitReasons = parsed.traitReasons || {};
                    generalFeedback = parsed.mentorReview || "";
                    improvements = parsed.mentorImprovements || "";
                } catch (e) {
                    // Fallback for legacy string-only reasons
                    generalFeedback = periodSkills.override_reason;
                }
            }

            return (
                <div style={{ padding: '0 8px' }}>
                    {generalFeedback && (
                        <div className="mb-6 p-6 bg-purple-50 border border-purple-100 rounded-2xl shadow-sm">
                            <h3 className="font-bold text-purple-800 text-sm uppercase mb-2 tracking-wider">Reviewer's Feedback</h3>
                            <p className="text-purple-900 leading-relaxed font-medium">{generalFeedback}</p>
                            {improvements && (
                                <div className="mt-4 pt-4 border-t border-purple-200">
                                    <h4 className="font-bold text-purple-700 text-xs uppercase mb-1">Focus Areas</h4>
                                    <p className="text-purple-800 text-sm italic">{improvements}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sub-tabs for Soft / Dev */}
                    <div className="flex justify-center mb-6">
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setSkillCategory('soft')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'soft' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Soft Skills
                            </button>
                            <button
                                onClick={() => setSkillCategory('development')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'development' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Development Skills
                            </button>
                        </div>
                    </div>

                    {skillCategory === 'soft' ? (
                        <SoftSkillsSection softSkillsAverageScore={softOverall} softSkillsTraits={softTraits} traitReasons={traitReasons} />
                    ) : (
                        <SoftSkillsSection softSkillsAverageScore={devOverall} softSkillsTraits={devTraits} traitReasons={traitReasons} />
                    )}
                </div>
            );
        }

        // --- MY SCORE (Self Assessment) ---
        if (selectedTab === 'My Score') {
            const isSoft = skillCategory === 'soft';
            const currentTraits = isSoft ? SOFT_SKILL_TRAITS : DEVELOPMENT_SKILL_TRAITS;
            const currentScores = isSoft ? selfSoftSkillScores : selfDevSkillScores;
            const currentEnabled = isSoft ? selfSoftSkillEnabled : selfDevSkillEnabled;
            const currentAvg = isSoft ? selfSoftSkillsAvg : selfDevSkillsAvg;
            const toggleFn = isSoft ? toggleSoft : toggleDev;
            const changeFn = isSoft ? handleSoftChange : handleDevChange;

            const themeColor = isSoft ? 'text-orange-500' : 'text-emerald-500';
            const borderColor = isSoft ? 'border-orange-500' : 'border-emerald-500';
            const bgColor = isSoft ? 'bg-orange-500' : 'bg-emerald-500';

            return (
                <div style={{ padding: '0 8px' }}>
                    {/* Sub-tabs */}
                    <div className="flex justify-center mb-6">
                        <div className="flex bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setSkillCategory('soft')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'soft' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Soft Skills
                            </button>
                            <button
                                onClick={() => setSkillCategory('development')}
                                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${skillCategory === 'development' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Development Skills
                            </button>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
                        {/* Background Confetti for High Score */}
                        {currentAvg >= 7 && (
                            <Confetti
                                ref={confettiRef}
                                className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-50"
                            />
                        )}

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">My Self Assessment</h2>
                                    <p className="text-slate-500 text-sm">Rate your {isSoft ? 'soft' : 'development'} skills</p>
                                </div>
                                <button
                                    onClick={handleSaveSelfAssessment}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform active:scale-95 transition-all"
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Save Assessment'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
                                {/* Left: Average Score Circle */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className={`flex h-48 w-48 items-center justify-center rounded-full border-[8px] ${borderColor} bg-white shadow-xl`} style={{ boxShadow: `0 10px 30px -10px ${isSoft ? 'rgba(249, 115, 22, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                                        <div className="flex flex-col items-center justify-center">
                                            <NumberTicker
                                                value={currentAvg}
                                                decimalPlaces={1}
                                                className={`text-5xl font-black ${themeColor}`}
                                            />
                                            <div className="mt-1 text-sm font-bold text-slate-400">OUT OF 10</div>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-sm font-semibold text-slate-500 uppercase tracking-wide">Average Score</p>

                                    <div className={`mt-4 px-4 py-2 rounded-full text-sm font-bold ${isSoft ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                        {currentAvg >= 8 ? 'Outstanding! 🚀' : currentAvg >= 6 ? 'Good Progress 👍' : 'Keep Improving 💪'}
                                    </div>
                                </div>

                                {/* Right: Inputs Grid */}
                                <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {currentTraits.map(t => (
                                        <div
                                            key={t}
                                            className={`group flex items-center justify-between rounded-xl px-5 py-4 border transition-all duration-200 ${currentEnabled[t] ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                                        >
                                            <div
                                                className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer"
                                                onClick={() => toggleFn(t)}
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${currentEnabled[t] ? `${borderColor} ${bgColor}` : 'border-slate-300 bg-white group-hover:border-slate-400'}`}
                                                >
                                                    {currentEnabled[t] && <span className="text-white text-xs font-bold">✓</span>}
                                                </div>
                                                <span className={`font-semibold text-sm truncate transition-colors ${currentEnabled[t] ? 'text-slate-700' : 'text-slate-400'}`} title={t}>
                                                    {t}
                                                </span>
                                            </div>

                                            <input
                                                type="number"
                                                min="0" max="10" step="0.5"
                                                disabled={!currentEnabled[t]}
                                                value={currentScores[t] || 0}
                                                onChange={(e) => {
                                                    let val = parseFloat(e.target.value);
                                                    if (isNaN(val)) val = 0;
                                                    if (val < 0) val = 0;
                                                    if (val > 10) val = 10;
                                                    changeFn(t, val);
                                                }}
                                                className={`w-16 h-10 text-center border-2 rounded-lg font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${currentEnabled[t] ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400' : 'bg-slate-100 border-transparent text-slate-400'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- SCORES (Task List) ---
        // Create explicit variables from metrics for cleaner usage if desired, or use metrics directly
        const { reviewedCount, pendingCount, avgScoreVal } = metrics;


        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Summary Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                        onClick={() => setFilterStatus('reviewed')}
                        className={`cursor-pointer bg-purple-50/60 p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1 group ${filterStatus === 'reviewed' ? 'border-purple-200 ring-2 ring-purple-100 shadow-md transform -translate-y-1' : 'border-purple-100 shadow-sm'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${filterStatus === 'reviewed' ? 'bg-purple-100 text-purple-700' : 'bg-purple-100/50 text-purple-600 group-hover:bg-purple-100'}`}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-600">Tasks Reviewed</p>
                                <h3 className="text-2xl font-bold text-slate-800">{reviewedCount}</h3>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => setShowScoreModal(true)}
                        className="cursor-pointer bg-blue-50/60 p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1 group"
                    >
                        <div className="p-3 bg-blue-100/50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-600">Average Score</p>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                <ChevronRight size={24} />
                            </h3>
                        </div>
                    </div>

                    <div
                        onClick={() => setFilterStatus('pending')}
                        className={`cursor-pointer bg-orange-50/60 p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-1 group ${filterStatus === 'pending' ? 'border-orange-200 ring-2 ring-orange-100 shadow-md transform -translate-y-1' : 'border-orange-100 shadow-sm'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${filterStatus === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-orange-100/50 text-orange-600 group-hover:bg-orange-100'}`}>
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-600">Feedback Pending</p>
                                <h3 className="text-2xl font-bold text-slate-800">{pendingCount}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task List Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Task Name</th>
                                    {/* Removed Status Column */}
                                    <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Given By</th>
                                    <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                    <ClipboardList className="text-slate-300" size={32} />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800 mb-1">No {filterStatus === 'pending' ? 'pending' : 'reviewed'} tasks found</h3>
                                                <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                                                    {filterStatus === 'pending'
                                                        ? "You're all caught up! No pending tasks for this period."
                                                        : "No reviews yet. Complete tasks to get feedback!"}
                                                </p>
                                                <button
                                                    onClick={() => setFilterStatus('all')}
                                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl active:scale-95"
                                                >
                                                    View All Tasks
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTasks.map((task) => {
                                        const reviews = task.student_task_reviews || [];
                                        const review = reviews.find((r: any) => r.reviewer_role === 'executive') || reviews[0];
                                        const score = review?.score || 0;

                                        // Helper to get initials or color based on role
                                        let givenBy = '--';
                                        if (review?.reviewer_role) {
                                            givenBy = review.reviewer_role === 'executive' ? 'Tutor' : 'Mentor';
                                        }

                                        let badgeColor = "bg-slate-100 text-slate-600";
                                        let rowClass = "hover:bg-slate-50";

                                        if (review) {
                                            if (score >= 8) {
                                                badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                                                rowClass = "bg-green-50/60 hover:bg-green-100/60";
                                            } else if (score >= 6) {
                                                badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
                                                rowClass = "bg-yellow-50/60 hover:bg-yellow-100/60";
                                            } else {
                                                badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
                                                rowClass = "bg-red-50/60 hover:bg-red-100/60";
                                            }
                                        }

                                        return (
                                            <tr
                                                key={task.id}
                                                onClick={() => review && setSelectedTask({ task, review })}
                                                className={`group transition-colors ${review ? 'cursor-pointer' : ''} ${rowClass}`}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                                                        {task.title}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-1">
                                                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date'}
                                                    </div>
                                                </td>
                                                {/* Removed Status Cell */}
                                                <td className="px-6 py-5 text-center">
                                                    {givenBy !== '--' ? (
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${givenBy === 'Tutor' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                                                            {givenBy}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">--</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {review ? (
                                                        <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-xl font-black text-lg border-2 ${badgeColor} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                                                            {score}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-bold text-xl">--</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    {review && (
                                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed Score Modal */}
                {showScoreModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl relative text-center transform animate-in zoom-in-95 duration-200 overflow-hidden">
                            <button
                                onClick={() => setShowScoreModal(false)}
                                className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ChevronRight className="rotate-90" size={24} />
                            </button>

                            <h2 className="text-2xl font-bold text-slate-800 mb-8">Average Score</h2>

                            <div className="flex justify-center mb-8 relative">
                                {confettiVisible && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-0 pointer-events-none flex items-center justify-center">
                                        <Confetti
                                            className="w-full h-full"
                                        />
                                    </div>
                                )}
                                <div className="relative z-10 w-56 h-56 flex items-center justify-center">
                                    <div className="relative w-full h-full">
                                        <AnimatedCircularProgressBar
                                            max={100}
                                            min={0}
                                            value={animatedScore}
                                            gaugePrimaryColor={getScoreColor(avgScoreVal)}
                                            gaugeSecondaryColor="rgba(0, 0, 0, 0.05)"
                                            className="w-56 h-56"
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                                        <NumberTicker
                                            value={avgScoreVal}
                                            decimalPlaces={1}
                                            className="text-7xl font-black"
                                            style={{ color: getScoreColor(avgScoreVal) }}
                                        />
                                        <div className="mt-1 text-xl font-bold text-slate-400">/10</div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-500 font-medium text-lg mb-8">Average score of all the tasks</p>

                            <div className="py-3 px-6 bg-slate-50 rounded-full inline-block">
                                <p className="font-bold text-slate-700 flex items-center gap-2">
                                    {avgScoreVal >= 8 ? 'Outstanding Performance! 🚀' : avgScoreVal >= 6 ? 'Keep practicing, you\'ll improve soon 💪' : 'Focus on the basics and improve! 🔥'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            {/* Header with Weekly/Monthly Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>My Review</h1>
                    <p style={{ color: '#64748b' }}>Track your performance across tasks and skills</p>
                </div>

                {/* Weekly / Monthly Toggle & Navigator */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Period Toggle */}
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1">
                        <button
                            onClick={() => { setViewPeriod('weekly'); setSelectedDate(new Date()); }}
                            className={`relative px-6 py-3 rounded-xl transition-all duration-300 flex flex-col items-center min-w-[120px] ${viewPeriod === 'weekly'
                                ? 'bg-[#14532d] text-white shadow-md'
                                : 'bg-transparent text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <span className="font-bold text-sm">Weekly</span>
                            <span className={`text-[10px] uppercase tracking-wider mt-0.5 ${viewPeriod === 'weekly' ? 'text-green-100' : 'text-slate-300'}`}>Last 7 Days</span>
                        </button>

                        <button
                            onClick={() => { setViewPeriod('monthly'); setSelectedDate(new Date()); }}
                            className={`relative px-6 py-3 rounded-xl transition-all duration-300 flex flex-col items-center min-w-[120px] ${viewPeriod === 'monthly'
                                ? 'bg-[#14532d] text-white shadow-md'
                                : 'bg-transparent text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <span className="font-bold text-sm">Monthly</span>
                            <span className={`text-[10px] uppercase tracking-wider mt-0.5 ${viewPeriod === 'monthly' ? 'text-green-100' : 'text-slate-300'}`}>Current Month</span>
                        </button>
                    </div>

                    {/* Period Navigator */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-sm h-[60px]">
                        <button
                            onClick={() => navigatePeriod(-1)}
                            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2 px-2 min-w-[160px] justify-center border-l border-r border-slate-100 h-full">
                            <Calendar size={18} className="text-slate-900" />
                            <span className="font-bold text-slate-700 text-sm">
                                {formatPeriodRange(selectedDate)}
                            </span>
                        </div>
                        <button
                            onClick={() => navigatePeriod(1)}
                            disabled={isCurrentPeriod}
                            className={`p-2 rounded-xl transition-colors ${isCurrentPeriod
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>


            {/* 4 Cards/Icons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center gap-3 p-6 rounded-3xl border border-slate-200 ${selectedTab === tab.id ? '-translate-y-1 shadow-md' : 'shadow-sm hover:-translate-y-1'}`}
                        style={{
                            backgroundColor: selectedTab === tab.id ? tab.color : '#fff',
                            color: selectedTab === tab.id ? '#fff' : '#1e293b',
                            boxShadow: selectedTab === tab.id ? `0 10px 15px -3px ${tab.color}40` : '',
                        }}
                    >
                        <div style={{
                            backgroundColor: selectedTab === tab.id ? 'rgba(255,255,255,0.2)' : `${tab.color}15`,
                            color: selectedTab === tab.id ? '#fff' : tab.color,
                            padding: '12px',
                            borderRadius: '16px'
                        }}>
                            {tab.icon}
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{tab.label}</span>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div>
                {renderContent()}
            </div>

            {/* Task Review Modal */}
            {
                selectedTask && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{selectedTask.task.title}</h3>
                                    <p className="text-slate-500 text-sm">Review Details</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full"
                                >
                                    <ChevronRight className="rotate-90" />
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Score</label>
                                        <div className="text-3xl font-bold text-blue-700 mt-1">{selectedTask.review.score}<span className="text-lg text-blue-400">/10</span></div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reviewer</label>
                                        <div className="font-bold text-slate-700 mt-1 capitalize">{selectedTask.review.reviewer_role === 'executive' ? 'Tutor' : 'Mentor'}</div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                                        <ClipboardList size={20} className="text-blue-500" />
                                        Review / Feedback
                                    </h4>
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedTask.review.review || 'No written review provided.'}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                                        <TrendingUp size={20} className="text-emerald-500" />
                                        Areas for Improvement
                                    </h4>
                                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedTask.review.improvements || 'No specific improvements noted.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MyReviewPage;
