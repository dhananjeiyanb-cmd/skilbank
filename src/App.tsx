import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CdcProvider } from './context/CdcContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { StaffManagementView } from './views/StaffManagementView';
import { ClassManagementView } from './views/ClassManagementView';
import { TaskManagementView } from './views/TaskManagementView';
import { ClassObservationView } from './views/ClassObservationView';
import { FacultyMonitoringView } from './views/FacultyMonitoringView';
import { DailyReportView } from './views/DailyReportView';
import { ReportsView } from './views/ReportsView';
import { StudentAttendanceView } from './views/StudentAttendanceView';
import { LessonPlanView } from './views/LessonPlanView';
import { SkillBankView } from './views/SkillBankView';
import { MentorMappingView } from './views/MentorMappingView';
import { MentorMenteeView } from './views/MentorMenteeView';
import { PrincipalSsbdashboardView } from './views/PrincipalSsbdashboardView';
import { LibrarianPortalView } from './views/LibrarianPortalView';
import { EventsView } from './views/EventsView';
import { CCMView } from './views/CCMView';
import { FacultyKpiView } from './views/FacultyKpiView';
import { CdcExamManagementView } from './views/CdcExamManagementView';
import { CdcDashboardView } from './views/CdcDashboardView';
import { StudentExamView } from './views/StudentExamView';
import { SystemLogsView } from './views/SystemLogsView';
import { BookOpen, RefreshCw } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentUser, activeTab, setActiveTab, localStorageQuotaExceeded } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Trigger states for quick modals
  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [isQuickAddStaffOpen, setIsQuickAddStaffOpen] = useState(false);
  const [isQuickAddClassOpen, setIsQuickAddClassOpen] = useState(false);

  // Redirect staff users away from unauthorized coordinator tabs or HOD-only tabs
  React.useEffect(() => {
    if (!currentUser) return;

    // These tabs are hidden for ALL roles — force any persisted/current tab back to Dashboard.
    const globallyHiddenTabs = ['events', 'classes', 'student_attendance', 'cdc', 'cdc_exams', 'iqac_ccm', 'iqac_lesson_plan'];
    if (globallyHiddenTabs.includes(activeTab)) {
      setActiveTab('dashboard');
      return;
    }

    const isStaffUser = currentUser.role === 'staff';
    const isLibrarianUser = currentUser.role === 'librarian';
    
    if (currentUser.role === 'principal' && ['events', 'classes', 'mentor_mapping', 'skill_bank', 'faculty_kpi'].includes(activeTab)) {
      setActiveTab('dashboard');
      return;
    }

    // CDC Dashboard only for HOD (admin) and Principal — not for staff.
    if (activeTab === 'cdc' && currentUser.role !== 'principal' && currentUser.role !== 'admin') {
      setActiveTab('dashboard');
      return;
    }

    if (isStaffUser) {
      const hodOnlyTabs = ['staff', 'observations', 'monitoring', 'daily_report', 'mentor_mapping', 'system_logs'];

      // Events tab only accessible if Event Coordinator
      if (activeTab === 'events' && currentUser.coordinatorRole !== 'Event Coordinator') {
        setActiveTab('dashboard');
        return;
      }

      // Classes tab only accessible if Timetable Coordinator
      if (activeTab === 'classes' && currentUser.coordinatorRole !== 'Timetable Coordinator') {
        setActiveTab('dashboard');
        return;
      }

      // CDC Coordinator does not use the Command/Common Dashboard,
      // Mentor-Mentee Mapping, or Student Attendance Today.
      if (
        currentUser.coordinatorRole === 'CDC Coordinator' &&
        ['dashboard', 'mentor_mapping', 'student_attendance'].includes(activeTab)
      ) {
        setActiveTab('cdc_exams');
        return;
      }

      if (hodOnlyTabs.includes(activeTab)) {
        setActiveTab('dashboard');
        return;
      }
    } else if (isLibrarianUser && !['librarian_portal', 'skill_bank', 'dashboard', 'events'].includes(activeTab)) {
      setActiveTab('librarian_portal');
    } else if (!isLibrarianUser && activeTab === 'librarian_portal') {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab, setActiveTab]);

  // Student Exam Portal is accessible without a staff/HOD login — students
  // authenticate separately (by Registration Number) inside StudentExamView.
  if (activeTab === 'student_exam' && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <StudentExamView />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  const handleOpenQuickAddTask = () => {
    setActiveTab('tasks');
    setIsQuickAddTaskOpen(true);
  };

  const handleOpenQuickAddStaff = () => {
    setActiveTab('staff');
    setIsQuickAddStaffOpen(true);
  };

  const handleOpenQuickAddClass = () => {
    setActiveTab('classes');
    setIsQuickAddClassOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenQuickAddStaff={handleOpenQuickAddStaff}
        onOpenQuickAddTask={handleOpenQuickAddTask}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenAddTask={handleOpenQuickAddTask}
              onOpenAddStaff={handleOpenQuickAddStaff}
              onOpenAddClass={handleOpenQuickAddClass}
            />
          )}

          {activeTab === 'events' && <EventsView />}

          {activeTab === 'staff' && (
            <StaffManagementView
              isAddModalOpen={isQuickAddStaffOpen}
              onCloseAddModal={() => setIsQuickAddStaffOpen(false)}
            />
          )}

          {activeTab === 'classes' && (
            <ClassManagementView
              isAddModalOpen={isQuickAddClassOpen}
              onCloseAddModal={() => setIsQuickAddClassOpen(false)}
            />
          )}

          {activeTab === 'mentor_mapping' && <MentorMappingView />}

          {activeTab === 'my_mentees' && <MentorMenteeView />}

          {activeTab === 'librarian_portal' && <LibrarianPortalView />}

          {activeTab === 'tasks' && (
            <TaskManagementView
              isAssignModalOpen={isQuickAddTaskOpen}
              onCloseAssignModal={() => setIsQuickAddTaskOpen(false)}
            />
          )}

          {activeTab === 'student_attendance' && <StudentAttendanceView />}

          {activeTab === 'skill_bank' && <SkillBankView />}

          {activeTab === 'principal_ssb_dashboard' && <PrincipalSsbdashboardView />}

          {activeTab === 'system_logs' && <SystemLogsView />}

          {activeTab === 'faculty_kpi' && <FacultyKpiView />}

          {activeTab === 'observations' && <ClassObservationView />}

          {activeTab === 'monitoring' && <FacultyMonitoringView />}

          {activeTab === 'daily_report' && <DailyReportView />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'iqac_ccm' && <CCMView />}

          {activeTab === 'iqac_lesson_plan' && (
            <div className="p-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center max-w-xl mx-auto">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Lesson Plan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">IQAC module — documentation &amp; features will be updated soon.</p>
              </div>
            </div>
          )}

          {activeTab === 'cdc' && <CdcDashboardView />}
          {activeTab === 'cdc_exams' && <CdcExamManagementView />}
          {activeTab === 'student_exam' && (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
              <StudentExamView />
            </div>
          )}
        </main>
      </div>

      {localStorageQuotaExceeded && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-amber-200 dark:border-amber-900 shadow-2xl max-w-md w-full space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
                SKILL BANK 26-27 IS Updating
              </h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                PLS Wait for a moment...
              </p>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
              The browser storage is optimizing data buffers. Do not close this tab. The app will resume once synchronisation completes.
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Clear Cache &amp; Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <CdcProvider>
        <MainContent />
      </CdcProvider>
    </AppProvider>
  );
}
