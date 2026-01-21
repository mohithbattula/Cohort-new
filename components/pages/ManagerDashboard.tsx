import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// @ts-ignore
import Layout from '../manager/components/Layout/Layout';
// @ts-ignore
import DashboardHome from '../manager/pages/DashboardHome';
// @ts-ignore
import ModulePage from '../manager/pages/ModulePage';
// @ts-ignore
import MyLeavesPage from '../manager/pages/MyLeavesPage';
// @ts-ignore
import ManagerAllTasksPage from '../manager/pages/ManagerAllTasksPage';
// @ts-ignore
import MessagingHub from '../shared/MessagingHub';
// @ts-ignore
import RaiseTicketPage from '../shared/pages/RaiseTicketPage';
// @ts-ignore
import { ToastProvider as ManagerToastProvider } from '../manager/context/ToastContext';
// @ts-ignore
import { UserProvider as ManagerUserProvider } from '../manager/context/UserContext';
// @ts-ignore
import { ToastProvider as ExecutiveToastProvider } from '../executive/context/ToastContext';
// @ts-ignore
import { UserProvider as ExecutiveUserProvider } from '../executive/context/UserContext';
// @ts-ignore
import { UserProvider as EmployeeUserProvider } from '../employee/context/UserContext';
// @ts-ignore
import { ToastProvider as EmployeeToastProvider } from '../employee/context/ToastContext';
// @ts-ignore
import { ProjectProvider } from '../employee/context/ProjectContext';
// @ts-ignore
import StudentReviewPage from '../executive/pages/StudentReviewPage';
// @ts-ignore
import TaskReviewPage from '../executive/pages/TaskReviewPage';
// @ts-ignore
import LeaderboardPage from '../shared/pages/LeaderboardPage';
import RoleGuard from '../shared/RoleGuard';
import '../manager/index.css';

export const ManagerDashboard = () => {
    return (
        <RoleGuard allowedRoles={['manager']}>
            <ExecutiveUserProvider>
                <ExecutiveToastProvider>
                    <ManagerUserProvider>
                        <ManagerToastProvider>
                            <EmployeeUserProvider>
                                <EmployeeToastProvider>
                                    <ProjectProvider>
                                        <Layout>
                                            <Routes>
                                                <Route path="/" element={<Navigate to="dashboard" replace />} />
                                                <Route path="dashboard" element={<DashboardHome />} />
                                                <Route path="analytics" element={<ModulePage title="Team Performance" type="analytics" />} />
                                                <Route path="students" element={<ModulePage title="Students" type="workforce" />} />
                                                <Route path="tasks" element={<ModulePage title="All Project Tasks" type="tasks" />} />
                                                <Route path="global-tasks" element={<ManagerAllTasksPage />} />
                                                <Route path="personal-tasks" element={<ModulePage title="My Tasks" type="personal-tasks" />} />
                                                <Route path="leaves" element={<ModulePage title="Leave Requests" type="leaves" />} />
                                                <Route path="my-leaves" element={<MyLeavesPage />} />
                                                <Route path="student-status" element={<ModulePage title="Student Status" type="status" />} />
                                                <Route path="payslips" element={<ModulePage title="Payslips" type="payroll" />} />
                                                <Route path="policies" element={<ModulePage title="Policies" type="policies" />} />
                                                <Route path="payroll" element={<ModulePage title="Payroll" type="payroll-generation" />} />
                                                <Route path="hiring" element={<ModulePage title="Hiring Portal" type="recruitment" />} />
                                                <Route path="hierarchy" element={<ModulePage title="Organizational Hierarchy" type="default" />} />
                                                <Route path="project-hierarchy" element={<ModulePage title="Project Hierarchy" type="default" />} />
                                                <Route path="messages" element={<MessagingHub />} />
                                                <Route path="announcements" element={<ModulePage title="Announcements" type="default" />} />
                                                <Route path="raise-ticket" element={<RaiseTicketPage />} />
                                                <Route path="documents" element={<ModulePage title="Project Documents" type="documents" />} />
                                                <Route path="student-review" element={<StudentReviewPage />} />
                                                <Route path="rankings" element={<LeaderboardPage />} />
                                                <Route path="task-review" element={<TaskReviewPage />} />
                                                <Route path="settings" element={<ModulePage title="Settings" type="default" />} />
                                            </Routes>
                                        </Layout>
                                    </ProjectProvider>
                                </EmployeeToastProvider>
                            </EmployeeUserProvider>
                        </ManagerToastProvider>
                    </ManagerUserProvider>
                </ExecutiveToastProvider>
            </ExecutiveUserProvider>
        </RoleGuard>
    );
};
