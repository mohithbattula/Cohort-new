import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// @ts-ignore
import Layout from '../executive/components/Layout/Layout';
// @ts-ignore
import DashboardHome from '../executive/pages/DashboardHome';
// @ts-ignore
import ModulePage from '../executive/pages/ModulePage';
// @ts-ignore
import MessagingHub from '../shared/MessagingHub';
// @ts-ignore
import { UserProvider as ExecutiveUserProvider } from '../executive/context/UserContext';
// @ts-ignore
import { ToastProvider as ExecutiveToastProvider, useToast as useExecutiveToast } from '../executive/context/ToastContext';
// @ts-ignore
import { UserProvider as ManagerUserProvider } from '../manager/context/UserContext';
// @ts-ignore
import { ToastProvider as ManagerToastProvider } from '../manager/context/ToastContext';
// @ts-ignore
import { UserProvider as EmployeeUserProvider } from '../employee/context/UserContext';
// @ts-ignore
import { ToastProvider as EmployeeToastProvider } from '../employee/context/ToastContext';

// @ts-ignore
import { ATSDataProvider } from '../executive/context/ATSDataContext';
// @ts-ignore
import HiringPortal from '../executive/pages/HiringPortal/HiringPortal';
// @ts-ignore
import ProjectManagement from '../executive/pages/ProjectManagement';
// @ts-ignore
import ProjectDocuments from '../employee/pages/ProjectDocuments';
// @ts-ignore
import RaiseTicketPage from '../shared/pages/RaiseTicketPage';
// @ts-ignore
import ExecutiveAllTasksPage from '../executive/pages/ExecutiveAllTasksPage';
// @ts-ignore
import StudentReviewPage from '../executive/pages/StudentReviewPage';
// @ts-ignore
import TaskReviewPage from '../executive/pages/TaskReviewPage';
// @ts-ignore
import LeaderboardPage from '../shared/pages/LeaderboardPage';
import RoleGuard from '../shared/RoleGuard';
import '../executive/index.css';

// Wrapper to provide toast context from executive provider to employee component
const DocumentsWithToast = () => {
    const { addToast } = useExecutiveToast();
    return <ProjectDocuments userRole="executive" addToast={addToast} />;
};

export function ExecutiveDashboard({ userId, orgId }: { userId: string, orgId: string }) {
    return (
        <RoleGuard allowedRoles={['executive', 'admin']}>
            <ExecutiveUserProvider>
                <ExecutiveToastProvider>
                    <ManagerUserProvider>
                        <ManagerToastProvider>
                            <EmployeeUserProvider>
                                <EmployeeToastProvider>
                                    <ATSDataProvider>
                                        <Layout>
                                            <Routes>
                                                <Route path="/" element={<Navigate to="dashboard" replace />} />
                                                <Route path="dashboard" element={<DashboardHome />} />
                                                <Route path="analytics" element={<ModulePage title="Analytics" type="analytics" />} />
                                                <Route path="projects" element={<ProjectManagement />} />
                                                <Route path="students" element={<ModulePage title="Students" type="workforce" />} />
                                                <Route path="tasks" element={<ExecutiveAllTasksPage />} />
                                                <Route path="leaves" element={<ModulePage title="Leave Requests" type="leaves" />} />
                                                <Route path="student-status" element={<ModulePage title="Student Status" type="status" />} />
                                                <Route path="payslips" element={<ModulePage title="Payslips" type="payroll" />} />
                                                <Route path="policies" element={<ModulePage title="Policies" type="policies" />} />
                                                <Route path="payroll" element={<ModulePage title="Payroll" type="payroll-generation" />} />
                                                <Route path="invoice" element={<ModulePage title="Invoice" type="invoice" />} />
                                                <Route path="messages" element={<MessagingHub />} />
                                                <Route path="hiring" element={<HiringPortal />} />
                                                <Route path="hierarchy" element={<ModulePage title="Organizational Hierarchy" type="default" />} />
                                                <Route path="project-hierarchy" element={<ModulePage title="Project Hierarchy" type="default" />} />
                                                <Route path="announcements" element={<ModulePage title="Announcements" type="default" />} />
                                                <Route path="raise-ticket" element={<RaiseTicketPage />} />
                                                <Route path="settings" element={<ModulePage title="Settings" type="default" />} />
                                                <Route path="project-analytics" element={<ModulePage title="Project Analytics" type="project-analytics" />} />
                                                <Route path="student-review" element={<StudentReviewPage />} />
                                                <Route path="rankings" element={<LeaderboardPage />} />
                                                <Route path="task-review" element={<TaskReviewPage />} />
                                                <Route path="documents" element={<DocumentsWithToast />} />
                                            </Routes>
                                        </Layout>
                                    </ATSDataProvider>
                                </EmployeeToastProvider>
                            </EmployeeUserProvider>
                        </ManagerToastProvider>
                    </ManagerUserProvider>
                </ExecutiveToastProvider>
            </ExecutiveUserProvider>
        </RoleGuard>
    );
};
