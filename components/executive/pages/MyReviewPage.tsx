import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { supabase } from '../../../lib/supabaseClient';
import { getStudentSkillsAssessments, type SkillsAssessment } from '../../../services/reviews/studentSkillsAssessments';
import { NeonGradientCard } from "@/registry/magicui/neon-gradient-card";
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
};

const MyReviewPage = () => {
    const { userId } = useUser();
    const [viewPeriod, setViewPeriod] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<SkillsAssessment | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showImprovementModal, setShowImprovementModal] = useState(false);

    // Date Helper Functions
    const getWeekRange = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        const start = new Date(d.setDate(diff));
        const end = new Date(new Date(start).setDate(start.getDate() + 6));

        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    };

    const getMonthRange = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const periodLabel = viewPeriod === 'weekly' ? getWeekRange(selectedDate) : getMonthRange(selectedDate);

    const navigatePeriod = (direction: number) => {
        const newDate = new Date(selectedDate);
        if (viewPeriod === 'weekly') {
            newDate.setDate(newDate.getDate() + direction * 7);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setSelectedDate(newDate);
    };

    const resetToToday = () => {
        setSelectedDate(new Date());
    };

    const isTodayDisabled = () => {
        const today = new Date();
        if (viewPeriod === 'weekly') {
            const startOfTodayWeek = new Date(today);
            startOfTodayWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
            startOfTodayWeek.setHours(0, 0, 0, 0);

            const startOfSelectedWeek = new Date(selectedDate);
            startOfSelectedWeek.setDate(selectedDate.getDate() - (selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1));
            startOfSelectedWeek.setHours(0, 0, 0, 0);

            return startOfTodayWeek.getTime() === startOfSelectedWeek.getTime();
        } else {
            return today.getMonth() === selectedDate.getMonth() && today.getFullYear() === selectedDate.getFullYear();
        }
    };

    useEffect(() => {
        const fetchTutorReview = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                let periodStartStr = '';
                if (viewPeriod === 'weekly') {
                    const d = new Date(selectedDate);
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    const weekStart = new Date(d.setDate(diff));
                    weekStart.setHours(12, 0, 0, 0);
                    periodStartStr = weekStart.toISOString().split('T')[0];
                } else {
                    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                    monthStart.setHours(12, 0, 0, 0);
                    periodStartStr = monthStart.toISOString().split('T')[0];
                }

                const { data, error } = await supabase
                    .from('student_skills_assessments')
                    .select('*')
                    .eq('student_id', userId)
                    .eq('period_type', viewPeriod)
                    .eq('period_start', periodStartStr)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                setAssessment(data);
            } catch (err) {
                console.error('Error fetching tutor review:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTutorReview();
    }, [userId, viewPeriod, selectedDate]);

    const getFeedbackContent = () => {
        const softTraits = assessment?.soft_skill_traits as any;
        if (softTraits?.__mentor_review) {
            return {
                review: softTraits.__mentor_review,
                improvements: softTraits.__mentor_improvements
            };
        }
        const feedback = assessment?.override_reason;
        if (!feedback) return { review: null, improvements: null };
        if (feedback.startsWith('{')) {
            try {
                const parsed = JSON.parse(feedback);
                return {
                    review: parsed.mentorReview || parsed.review || null,
                    improvements: parsed.mentorImprovements || parsed.improvements || null
                };
            } catch (e) {
                return { review: feedback, improvements: null };
            }
        }
        return { review: feedback, improvements: null };
    };

    const { review, improvements } = getFeedbackContent();

    const FeedbackModal = ({ title, content, onClose }: { title: string, content: string, onClose: () => void }) => (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }} onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    style={{
                        backgroundColor: 'white', padding: '32px', borderRadius: '24px',
                        maxWidth: '600px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }} onClick={e => e.stopPropagation()}
                >
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>{title}</h3>
                    <div style={{ color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
                        {content || 'No feedback provided for this period.'}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '12px',
                            backgroundColor: '#7c3aed', color: 'white', fontWeight: 'bold',
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ padding: '40px 40px 40px 0' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                <motion.div variants={cardVariants}>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>My Review</h1>
                    <p style={{ color: '#64748b' }}>Track your performance as a Mentor</p>
                </motion.div>

                <motion.div variants={cardVariants} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', position: 'relative' }}>
                        <button
                            onClick={() => setViewPeriod('weekly')}
                            style={{
                                padding: '8px 24px', borderRadius: '8px', border: 'none',
                                backgroundColor: viewPeriod === 'weekly' ? '#7c3aed' : 'transparent',
                                color: viewPeriod === 'weekly' ? 'white' : '#64748b',
                                fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative', zIndex: 1
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setViewPeriod('monthly')}
                            style={{
                                padding: '8px 24px', borderRadius: '8px', border: 'none',
                                backgroundColor: viewPeriod === 'monthly' ? '#7c3aed' : 'transparent',
                                color: viewPeriod === 'monthly' ? 'white' : '#64748b',
                                fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative', zIndex: 1
                            }}
                        >
                            Monthly
                        </button>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', backgroundColor: 'white',
                        border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px'
                    }}>
                        <button onClick={() => navigatePeriod(-1)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <ChevronLeft size={20} color="#64748b" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', minWidth: '160px', justifyContent: 'center' }}>
                            <Calendar size={18} color="#7c3aed" />
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{periodLabel}</span>
                        </div>
                        <button onClick={() => navigatePeriod(1)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <ChevronRight size={20} color="#64748b" />
                        </button>
                        <button
                            onClick={resetToToday}
                            disabled={isTodayDisabled()}
                            style={{
                                marginLeft: '8px', padding: '8px 16px', borderRadius: '8px',
                                backgroundColor: isTodayDisabled() ? '#f1f5f9' : '#7c3aed',
                                color: isTodayDisabled() ? '#94a3b8' : 'white',
                                border: 'none', cursor: isTodayDisabled() ? 'default' : 'pointer',
                                fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
                            }}
                        >
                            Today
                        </button>
                    </div>
                </motion.div>
            </div>

            {loading ? (
                <div className="flex justify-center p-[100px]">
                    <Loader2 className="animate-spin text-violet-600" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.div variants={cardVariants}>
                        <motion.div
                            whileHover={{ y: -6, transition: { duration: 0.2, ease: "easeOut" } }}
                            className="h-full"
                        >
                            <NeonGradientCard
                                borderRadius={24}
                                borderSize={4}
                                className="h-full hover:shadow-2xl transition-shadow duration-300"
                                innerClassName="p-10 flex flex-col h-full rounded-[20px]"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-8 shadow-sm"
                                >
                                    <Star size={36} />
                                </motion.div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-4">Review</h2>
                                <p className="text-slate-500 text-lg leading-relaxed flex-1 mb-8">
                                    View detailed feedback on your soft skills, mentorship quality, and team management performance.
                                </p>
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="w-fit bg-transparent border-none p-0 flex items-center text-violet-600 font-bold text-lg cursor-pointer hover:gap-2 transition-all group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
                                >
                                    View Reviews <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                                </button>
                            </NeonGradientCard>
                        </motion.div>
                    </motion.div>

                    <motion.div variants={cardVariants}>
                        <motion.div
                            whileHover={{ y: -6, transition: { duration: 0.2, ease: "easeOut" } }}
                            className="h-full"
                        >
                            <NeonGradientCard
                                borderRadius={24}
                                borderSize={4}
                                neonColors={{ firstColor: "#10b981", secondColor: "#059669" }}
                                className="h-full hover:shadow-2xl transition-shadow duration-300"
                                innerClassName="p-10 flex flex-col h-full rounded-[20px]"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-8 shadow-sm"
                                >
                                    <TrendingUp size={36} />
                                </motion.div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-4">Improvements</h2>
                                <p className="text-slate-500 text-lg leading-relaxed flex-1 mb-8">
                                    Identify actionable areas for growth, technical skill enhancements, and professional development milestones.
                                </p>
                                <button
                                    onClick={() => setShowImprovementModal(true)}
                                    className="w-fit bg-transparent border-none p-0 flex items-center text-emerald-600 font-bold text-lg cursor-pointer hover:gap-2 transition-all group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
                                >
                                    View Improvements <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                                </button>
                            </NeonGradientCard>
                        </motion.div>
                    </motion.div>
                </div>
            )}

            {showReviewModal && (
                <FeedbackModal
                    title="Tutor Feedback"
                    content={review || "No feedback summary provided for this period yet."}
                    onClose={() => setShowReviewModal(false)}
                />
            )}
            {showImprovementModal && (
                <FeedbackModal
                    title="Actionable Improvements"
                    content={improvements || (review ? "No specific improvements noted for this period." : "No specific improvements noted for this period yet.")}
                    onClose={() => setShowImprovementModal(false)}
                />
            )}
        </motion.div>
    );
};

export default MyReviewPage;
