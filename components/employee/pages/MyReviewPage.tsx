import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, Star, TrendingUp, Award, ChevronRight, ChevronLeft, Loader2, Calendar } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { getStudentTasksWithReviews } from '@/services/reviews/studentTaskReviews';
import { getStudentSkillsAssessments, type SkillsAssessment } from '@/services/reviews/studentSkillsAssessments';
import { Confetti, type ConfettiRef } from '@/registry/magicui/confetti';

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
    const [selectedTab, setSelectedTab] = useState('Score');
    const [tasks, setTasks] = useState<any[]>([]);
    const [skills, setSkills] = useState<SkillsAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [viewPeriod, setViewPeriod] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [skillCategory, setSkillCategory] = useState<'soft' | 'development'>('soft');
    const confettiRef = useRef<ConfettiRef>(null);

    // Helper functions for period navigation
    const getWeekStart = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const isSamePeriod = (d1: Date, d2: Date, period: 'weekly' | 'monthly') => {
        if (period === 'weekly') {
            const s1 = getWeekStart(d1);
            const s2 = getWeekStart(d2);
            return s1.toISOString().split('T')[0] === s2.toISOString().split('T')[0];
        } else {
            return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
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
    const filteredTasks = tasks.filter(task => {
        const reviews = task.student_task_reviews || [];
        return reviews.some((review: any) => {
            const reviewDate = new Date(review.created_at || review.updated_at);
            return isSamePeriod(reviewDate, selectedDate, viewPeriod);
        });
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const [tasksData, skillsData] = await Promise.all([
                    getStudentTasksWithReviews(userId),
                    getStudentSkillsAssessments(userId)
                ]);
                setTasks(tasksData || []);
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
        { id: 'Score', icon: <Star size={24} />, color: '#f59e0b', label: 'Score' },
        { id: 'Review', icon: <ClipboardList size={24} />, color: '#3b82f6', label: 'Review' },
        { id: 'Improvements', icon: <TrendingUp size={24} />, color: '#10b981', label: 'Improvements' },
        { id: 'Skills', icon: <Award size={24} />, color: '#8b5cf6', label: 'Skills' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-gray-400" size={48} />
            </div>
        );
    }

    const renderContent = () => {
        if (selectedTab === 'Skills') {
            const periodStartStr = (viewPeriod === 'weekly' ? getWeekStart(selectedDate) : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)).toISOString().split('T')[0];

            // Find assessment for this specific period
            const periodSkills = skills.find(s => s.period_type === viewPeriod && s.period_start === periodStartStr);

            // Default empty traits if none found
            const softTraitScores = periodSkills?.soft_skill_traits || {};
            const devTraitScores = periodSkills?.development_skill_traits || {};

            // Only include traits that have an actual score (not null/undefined)
            const softTraits = SOFT_SKILL_TRAITS
                .filter(name => softTraitScores[name] !== undefined && softTraitScores[name] !== null)
                .map(name => ({
                    name,
                    score: softTraitScores[name]
                }));
            const softOverallScore = periodSkills?.soft_skills_score || 0;

            const devTraits = DEVELOPMENT_SKILL_TRAITS
                .filter(name => devTraitScores[name] !== undefined && devTraitScores[name] !== null)
                .map(name => ({
                    name,
                    score: devTraitScores[name]
                }));
            const devOverallScore = periodSkills?.development_skills_score || 0;

            return (
                <div>
                    {/* Sub-tabs for Soft Skills / Development Skills */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            display: 'flex',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '12px',
                            padding: '4px'
                        }}>
                            <button
                                onClick={() => setSkillCategory('soft')}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: skillCategory === 'soft' ? '#8b5cf6' : 'transparent',
                                    color: skillCategory === 'soft' ? 'white' : '#64748b',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Soft Skills
                            </button>
                            <button
                                onClick={() => setSkillCategory('development')}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: skillCategory === 'development' ? '#10b981' : 'transparent',
                                    color: skillCategory === 'development' ? 'white' : '#64748b',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Development Skills
                            </button>
                        </div>
                    </div>

                    {/* Render the selected skill category */}
                    {skillCategory === 'soft' ? (
                        <SoftSkillsSection
                            softSkillsAverageScore={softOverallScore}
                            softSkillsTraits={softTraits}
                        />
                    ) : (
                        <SoftSkillsSection
                            softSkillsAverageScore={devOverallScore}
                            softSkillsTraits={devTraits}
                        />
                    )}
                </div>
            );
        }

        // Updated: 'Soft Skills' now uses the table view like other tabs to show per-task scores
        return (
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '8px' }}>
                    <div style={{ width: '40px', fontWeight: 'bold', color: '#64748b' }}>#</div>
                    <div style={{ flex: 1, fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Task</div>
                    <div style={{ width: '120px', fontWeight: 'bold', color: '#64748b', fontSize: '1rem', textAlign: 'center' }}>Given By</div>
                    <div style={{ width: '150px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>
                        {selectedTab}
                    </div>
                </div>

                {/* Task List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredTasks.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                            <p style={{ fontSize: '1.1rem', marginBottom: '8px', fontStyle: 'italic' }}>
                                No reviews found for this {viewPeriod === 'weekly' ? 'week' : 'month'}.
                            </p>
                            <p style={{ fontSize: '0.9rem' }}>
                                Keep up the great work! New reviews will appear here.
                            </p>
                        </div>
                    ) : (
                        filteredTasks.map((task, index) => {
                            const reviews = task.student_task_reviews || [];
                            // In single-review model, we display the primary review. 
                            // Prioritize Executive if multiple exist (cleanup safety), else first.
                            const review = reviews.find((r: any) => r.reviewer_role === 'executive') || reviews[0];

                            let displayValue: any = '--';

                            // Determine reviewer label
                            let givenBy = '--';
                            if (review?.reviewer_role) {
                                givenBy = review.reviewer_role === 'executive' ? 'Tutor' : 'Mentor';
                            }

                            // Calculate display value based on tab
                            if (review) {
                                if (selectedTab === 'Score') displayValue = <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{review.score}/10</span>;
                                else if (selectedTab === 'Review') displayValue = <span style={{ fontSize: '0.9rem', color: '#475569' }}>{review.review || '--'}</span>;
                                else if (selectedTab === 'Improvements') displayValue = <span style={{ fontSize: '0.9rem', color: '#475569' }}>{review.improvements || '--'}</span>;
                            }

                            return (
                                <div key={task.id} style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                                    <div style={{ width: '40px', color: '#94a3b8', fontWeight: '500' }}>{index + 1}</div>
                                    <div style={{ flex: 1, fontWeight: '500', color: '#1e293b' }}>{task.title}</div>

                                    {/* Given By Column */}
                                    <div style={{ width: '120px', textAlign: 'center' }}>
                                        {givenBy !== '--' ? (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                backgroundColor: givenBy === 'Tutor' ? '#f3e8ff' : '#e0f2fe',
                                                color: givenBy === 'Tutor' ? '#7e22ce' : '#0369a1',
                                                textTransform: 'capitalize'
                                            }}>
                                                {givenBy}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#cbd5e1' }}>--</span>
                                        )}
                                    </div>

                                    <div style={{ width: '150px', textAlign: 'right' }}>
                                        {displayValue}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header with Weekly/Monthly Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>My Review</h1>
                    <p style={{ color: '#64748b' }}>Track your performance across tasks and skills</p>
                </div>

                {/* Weekly / Monthly Toggle & Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '12px',
                        padding: '4px'
                    }}>
                        <button
                            onClick={() => { setViewPeriod('weekly'); setSelectedDate(new Date()); }}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: viewPeriod === 'weekly' ? '#f59e0b' : 'transparent',
                                color: viewPeriod === 'weekly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => { setViewPeriod('monthly'); setSelectedDate(new Date()); }}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: viewPeriod === 'monthly' ? '#f59e0b' : 'transparent',
                                color: viewPeriod === 'monthly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Monthly
                        </button>
                    </div>

                    {/* Period Navigator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '4px 8px'
                    }}>
                        <button
                            onClick={() => navigatePeriod(-1)}
                            style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                        >
                            <ChevronLeft size={18} color="#64748b" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}>
                            <Calendar size={16} color="#f59e0b" />
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>
                                {formatPeriodRange(selectedDate)}
                            </span>
                        </div>
                        <button
                            onClick={() => navigatePeriod(1)}
                            disabled={isCurrentPeriod}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: isCurrentPeriod ? 'not-allowed' : 'pointer',
                                opacity: isCurrentPeriod ? 0.3 : 1
                            }}
                        >
                            <ChevronRight size={18} color="#64748b" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 Cards/Icons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        style={{
                            backgroundColor: selectedTab === tab.id ? tab.color : '#fff',
                            color: selectedTab === tab.id ? '#fff' : '#1e293b',
                            padding: '24px',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid #e2e8f0',
                            boxShadow: selectedTab === tab.id ? `0 10px 15px -3px ${tab.color}40` : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            transform: selectedTab === tab.id ? 'translateY(-4px)' : 'none'
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
        </div>
    );
};

export default MyReviewPage;
