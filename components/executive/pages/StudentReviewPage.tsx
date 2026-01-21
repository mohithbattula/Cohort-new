import React, { useState, useEffect } from 'react';
import {
    Award, Search, ChevronRight, ChevronLeft, Loader2, X, Calendar
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const SOFT_SKILL_TRAITS = [
    "Accountability", "Learnability", "Abstract Thinking", "Curiosity", "Second-Order Thinking",
    "Compliance", "Ambitious", "Communication", "English", "First-Principle Thinking"
];

const DEVELOPMENT_SKILL_TRAITS = [
    "Frontend", "Backend", "Workflows", "Databases", "Prompting",
    "Non-popular LLMs", "Fine-tuning", "Data Labelling", "Content Generation"
];

/**
 * StudentReviewPage - Weekly/Monthly Skills Assessment
 * 
 * This page is for assessing student skills:
 * - Soft Skills (10 traits)
 * - Development Skills (9 traits)
 * 
 * Skills are assessed per week or month, NOT per task.
 * Task-specific reviews are handled in TaskReviewPage.
 */
const StudentReviewPage = () => {
    const { userId, userRole, teamId } = useUser();
    const { addToast } = useToast();

    // State
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);

    // Period State
    const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedWeek, setSelectedWeek] = useState<Date>(getWeekStart(new Date()));

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [existingAssessment, setExistingAssessment] = useState<any>(null);
    const [loadingAssessment, setLoadingAssessment] = useState(false);

    // Skills Form State
    const [softSkillScores, setSoftSkillScores] = useState<Record<string, number>>({});
    const [softSkillEnabled, setSoftSkillEnabled] = useState<Record<string, boolean>>({});
    const [softSkillsAvg, setSoftSkillsAvg] = useState(0);

    const [devSkillScores, setDevSkillScores] = useState<Record<string, number>>({});
    const [devSkillEnabled, setDevSkillEnabled] = useState<Record<string, boolean>>({});
    const [devSkillsAvg, setDevSkillsAvg] = useState(0);

    // Helper function to get Monday of the week
    function getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(d.setDate(diff));
    }

    // Helper function to get Sunday of the week
    function getWeekEnd(date: Date): Date {
        const weekStart = getWeekStart(date);
        return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    // Format date for display
    function formatWeekRange(weekStart: Date): string {
        const weekEnd = getWeekEnd(weekStart);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
    }

    // Navigate weeks
    const goToPreviousWeek = () => {
        setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000));
    };

    const goToNextWeek = () => {
        const nextWeek = new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        const currentWeek = getWeekStart(new Date());
        if (nextWeek <= currentWeek) {
            setSelectedWeek(nextWeek);
        }
    };

    const goToCurrentWeek = () => {
        setSelectedWeek(getWeekStart(new Date()));
    };

    const isCurrentWeek = selectedWeek.getTime() === getWeekStart(new Date()).getTime();

    useEffect(() => {
        fetchStudents();
    }, [userId, userRole, teamId]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*')
                .in('role', ['employee', 'manager', 'team_lead', 'executive']);

            if (userRole === 'manager' && teamId) {
                query = query.eq('team_id', teamId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const sortedData = (data || []).sort((a: any, b: any) =>
                (a.full_name || '').localeCompare(b.full_name || '')
            );

            setStudents(sortedData);
        } catch (error) {
            console.error('Error fetching students:', error);
            addToast('Failed to fetch students', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentClick = async (student: any) => {
        setSelectedStudent(student);
        setShowModal(true);
        setExistingAssessment(null);

        // Reset form
        const initialSoftScores: Record<string, number> = {};
        const initialSoftEnabled: Record<string, boolean> = {};
        SOFT_SKILL_TRAITS.forEach(t => {
            initialSoftScores[t] = 0;
            initialSoftEnabled[t] = true;
        });
        setSoftSkillScores(initialSoftScores);
        setSoftSkillEnabled(initialSoftEnabled);
        setSoftSkillsAvg(0);

        const initialDevScores: Record<string, number> = {};
        const initialDevEnabled: Record<string, boolean> = {};
        DEVELOPMENT_SKILL_TRAITS.forEach(t => {
            initialDevScores[t] = 0;
            initialDevEnabled[t] = true;
        });
        setDevSkillScores(initialDevScores);
        setDevSkillEnabled(initialDevEnabled);
        setDevSkillsAvg(0);

        // Fetch existing assessment for this period
        setLoadingAssessment(true);
        try {
            const periodStart = selectedWeek.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('student_skills_assessments')
                .select('*')
                .eq('student_id', student.id)
                .eq('period_type', periodType)
                .eq('period_start', periodStart)
                .single();

            if (data && !error) {
                setExistingAssessment(data);

                // Process Soft Skills
                const savedSoftTraits = data.soft_skill_traits || {};
                const newSoftScores = { ...initialSoftScores };
                const newSoftEnabled: Record<string, boolean> = {};
                SOFT_SKILL_TRAITS.forEach(t => {
                    if (savedSoftTraits[t] !== undefined && savedSoftTraits[t] !== null) {
                        newSoftScores[t] = savedSoftTraits[t];
                        newSoftEnabled[t] = true;
                    } else {
                        newSoftEnabled[t] = false;
                    }
                });
                setSoftSkillScores(newSoftScores);
                setSoftSkillEnabled(newSoftEnabled);
                setSoftSkillsAvg(data.soft_skills_score || 0);

                // Process Dev Skills
                const savedDevTraits = data.development_skill_traits || {};
                const newDevScores = { ...initialDevScores };
                const newDevEnabled: Record<string, boolean> = {};
                DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                    if (savedDevTraits[t] !== undefined && savedDevTraits[t] !== null) {
                        newDevScores[t] = savedDevTraits[t];
                        newDevEnabled[t] = true;
                    } else {
                        newDevEnabled[t] = false;
                    }
                });
                setDevSkillScores(newDevScores);
                setDevSkillEnabled(newDevEnabled);
                setDevSkillsAvg(data.development_skills_score || 0);
            }
        } catch (error) {
            // No existing assessment - that's fine
        } finally {
            setLoadingAssessment(false);
        }
    };

    const calculateSoftSkillsAvg = (scores: Record<string, number>, enabled: Record<string, boolean>) => {
        let total = 0;
        let count = 0;
        SOFT_SKILL_TRAITS.forEach(t => {
            if (enabled[t]) {
                total += (scores[t] || 0);
                count++;
            }
        });
        return count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
    };

    const calculateDevSkillsAvg = (scores: Record<string, number>, enabled: Record<string, boolean>) => {
        let total = 0;
        let count = 0;
        DEVELOPMENT_SKILL_TRAITS.forEach(t => {
            if (enabled[t]) {
                total += (scores[t] || 0);
                count++;
            }
        });
        return count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
    };

    const toggleSoftSkill = (trait: string) => {
        const newEnabled = { ...softSkillEnabled, [trait]: !softSkillEnabled[trait] };
        setSoftSkillEnabled(newEnabled);
        setSoftSkillsAvg(calculateSoftSkillsAvg(softSkillScores, newEnabled));
    };

    const toggleDevSkill = (trait: string) => {
        const newEnabled = { ...devSkillEnabled, [trait]: !devSkillEnabled[trait] };
        setDevSkillEnabled(newEnabled);
        setDevSkillsAvg(calculateDevSkillsAvg(devSkillScores, newEnabled));
    };

    const handleSoftSkillChange = (trait: string, value: number) => {
        const newScores = { ...softSkillScores, [trait]: value };
        setSoftSkillScores(newScores);
        setSoftSkillsAvg(calculateSoftSkillsAvg(newScores, softSkillEnabled));
    };

    const handleDevSkillChange = (trait: string, value: number) => {
        const newScores = { ...devSkillScores, [trait]: value };
        setDevSkillScores(newScores);
        setDevSkillsAvg(calculateDevSkillsAvg(newScores, devSkillEnabled));
    };

    const handleSaveAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !userId) return;

        setSaving(true);
        try {
            const periodStart = selectedWeek.toISOString().split('T')[0];
            const weekEnd = getWeekEnd(selectedWeek);
            const periodEnd = weekEnd.toISOString().split('T')[0];

            // Prepare traits (only store checked ones)
            const softTraitsToSave: Record<string, number | null> = {};
            SOFT_SKILL_TRAITS.forEach(t => {
                softTraitsToSave[t] = softSkillEnabled[t] ? softSkillScores[t] : null;
            });

            const devTraitsToSave: Record<string, number | null> = {};
            DEVELOPMENT_SKILL_TRAITS.forEach(t => {
                devTraitsToSave[t] = devSkillEnabled[t] ? devSkillScores[t] : null;
            });

            const assessmentData = {
                student_id: selectedStudent.id,
                reviewer_id: userId,
                reviewer_role: userRole,
                period_type: periodType,
                period_start: periodStart,
                period_end: periodEnd,
                soft_skill_traits: softTraitsToSave,
                soft_skills_score: softSkillsAvg,
                development_skill_traits: devTraitsToSave,
                development_skills_score: devSkillsAvg,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('student_skills_assessments')
                .upsert(assessmentData, {
                    onConflict: 'student_id,period_type,period_start'
                });

            if (error) throw error;

            addToast('Skills assessment saved successfully', 'success');
            setExistingAssessment({ ...existingAssessment, ...assessmentData });

        } catch (error) {
            console.error('Error saving skills assessment:', error);
            addToast('Failed to save skills assessment', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'employee': return 'Student';
            case 'manager': return 'Mentor';
            case 'executive': return 'Tutor';
            case 'team_lead': return 'Team Lead';
            default: return role;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] p-6 lg:p-8" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>Student Review</h1>
                    <p style={{ color: '#64748b' }}>Assess student skills on a weekly or monthly basis</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Period Type Toggle */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '12px',
                        padding: '4px'
                    }}>
                        <button
                            onClick={() => setPeriodType('weekly')}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: periodType === 'weekly' ? '#8b5cf6' : 'transparent',
                                color: periodType === 'weekly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setPeriodType('monthly')}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: periodType === 'monthly' ? '#8b5cf6' : 'transparent',
                                color: periodType === 'monthly' ? 'white' : '#64748b',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Monthly
                        </button>
                    </div>

                    {/* Week Navigator */}
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
                            onClick={goToPreviousWeek}
                            style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer'
                            }}
                        >
                            <ChevronLeft size={18} color="#64748b" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} color="#8b5cf6" />
                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', minWidth: '140px', textAlign: 'center' }}>
                                {formatWeekRange(selectedWeek)}
                            </span>
                        </div>
                        <button
                            onClick={goToNextWeek}
                            disabled={isCurrentWeek}
                            style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: isCurrentWeek ? 'not-allowed' : 'pointer',
                                opacity: isCurrentWeek ? 0.3 : 1
                            }}
                        >
                            <ChevronRight size={18} color="#64748b" />
                        </button>
                        {!isCurrentWeek && (
                            <button
                                onClick={goToCurrentWeek}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Today
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', width: '250px' }}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 16px 10px 40px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#fff',
                                outline: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content: Student List */}
            <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                        All Students <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>({filteredStudents.length})</span>
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-purple-500" size={32} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">No students found</div>
                        ) : (
                            filteredStudents.map((student, index) => (
                                <div
                                    key={student.id}
                                    onClick={() => handleStudentClick(student)}
                                    style={{
                                        padding: '16px 24px',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '24px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#8b5cf6';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        backgroundColor: '#f3e8ff', color: '#8b5cf6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', flexShrink: 0
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        backgroundColor: '#f3e8ff', color: '#8b5cf6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0
                                    }}>
                                        {student.full_name?.charAt(0) || 'S'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{student.full_name || 'Unnamed'}</h3>
                                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{student.email}</p>
                                    </div>
                                    <div style={{
                                        padding: '4px 12px', borderRadius: '20px',
                                        backgroundColor: '#f3e8ff', color: '#8b5cf6',
                                        fontSize: '0.85rem', fontWeight: '500'
                                    }}>
                                        {getRoleLabel(student.role)}
                                    </div>
                                    <Award size={20} color="#8b5cf6" />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal for Skills Assessment */}
            {showModal && selectedStudent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '20px', width: '100%',
                        maxWidth: '700px',
                        maxHeight: '90vh',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3e8ff' }}>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b', lineHeight: '1.2' }}>
                                    Skills Assessment: {selectedStudent.full_name}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <Calendar size={14} color="#8b5cf6" />
                                    <span style={{ color: '#8b5cf6', fontSize: '0.9rem', fontWeight: '600' }}>
                                        {formatWeekRange(selectedWeek)}
                                    </span>
                                    {existingAssessment && (
                                        <span style={{ fontSize: '0.75rem', backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                                            Previously Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'white' }}>
                                <X size={24} color="#64748b" />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {loadingAssessment ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-purple-500" size={32} />
                                </div>
                            ) : (
                                <form onSubmit={handleSaveAssessment}>
                                    {/* Soft Skills Section */}
                                    <div className="mb-8">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>Soft Skills (0-10)</label>
                                            <div style={{
                                                padding: '6px 16px',
                                                borderRadius: '10px',
                                                backgroundColor: '#8b5cf6',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '0.95rem'
                                            }}>
                                                Avg: {softSkillsAvg}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x 24px', rowGap: '12px' }}>
                                            {SOFT_SKILL_TRAITS.map(trait => (
                                                <div key={trait} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    opacity: softSkillEnabled[trait] ? 1 : 0.6,
                                                    transition: 'opacity 0.2s'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={softSkillEnabled[trait]}
                                                        onChange={() => toggleSoftSkill(trait)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                                                    />
                                                    <label
                                                        style={{ fontSize: '0.85rem', color: '#475569', flex: 1, cursor: 'pointer' }}
                                                        onClick={() => toggleSoftSkill(trait)}
                                                        title={trait}
                                                    >
                                                        {trait}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0" max="10" step="0.5"
                                                        disabled={!softSkillEnabled[trait]}
                                                        value={softSkillScores[trait] || 0}
                                                        onChange={(e) => {
                                                            let val = parseFloat(e.target.value) || 0;
                                                            val = Math.min(10, Math.max(0, val));
                                                            handleSoftSkillChange(trait, val);
                                                        }}
                                                        style={{
                                                            width: '60px', padding: '6px', borderRadius: '8px',
                                                            border: '1px solid #e2e8f0', textAlign: 'center',
                                                            fontSize: '0.9rem',
                                                            backgroundColor: softSkillEnabled[trait] ? 'white' : '#f1f5f9'
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Development Skills Section */}
                                    <div className="mb-8">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>Development Skills (0-10)</label>
                                            <div style={{
                                                padding: '6px 16px',
                                                borderRadius: '10px',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '0.95rem'
                                            }}>
                                                Avg: {devSkillsAvg}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x 24px', rowGap: '12px' }}>
                                            {DEVELOPMENT_SKILL_TRAITS.map(trait => (
                                                <div key={trait} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    opacity: devSkillEnabled[trait] ? 1 : 0.6,
                                                    transition: 'opacity 0.2s'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={devSkillEnabled[trait]}
                                                        onChange={() => toggleDevSkill(trait)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
                                                    />
                                                    <label
                                                        style={{ fontSize: '0.85rem', color: '#475569', flex: 1, cursor: 'pointer' }}
                                                        onClick={() => toggleDevSkill(trait)}
                                                        title={trait}
                                                    >
                                                        {trait}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0" max="10" step="0.5"
                                                        disabled={!devSkillEnabled[trait]}
                                                        value={devSkillScores[trait] || 0}
                                                        onChange={(e) => {
                                                            let val = parseFloat(e.target.value) || 0;
                                                            val = Math.min(10, Math.max(0, val));
                                                            handleDevSkillChange(trait, val);
                                                        }}
                                                        style={{
                                                            width: '60px', padding: '6px', borderRadius: '8px',
                                                            border: '1px solid #e2e8f0', textAlign: 'center',
                                                            fontSize: '0.9rem',
                                                            backgroundColor: devSkillEnabled[trait] ? 'white' : '#f1f5f9'
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            padding: '14px 24px',
                                            backgroundColor: '#8b5cf6',
                                            color: '#fff',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            border: 'none',
                                            cursor: 'pointer',
                                            width: '100%',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        {saving ? 'Saving...' : 'Save Skills Assessment'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentReviewPage;
