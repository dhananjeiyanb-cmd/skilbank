import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getGoogleAvatarUrl } from '../utils/avatarUtils';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CheckSquare,
  Eye,
  CalendarCheck,
  Calendar,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  User,
  LogOut,
  ChevronRight,
  AlertCircle,
  UserCheck,
  BookOpen,
  Award,
  Coins,
  UserPlus,
  ChevronDown,
  Landmark,
  ClipboardList,
  Rocket,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, activeTab, setActiveTab, taskList, logout, dailyReport } = useApp();

  const overdueCount = taskList.filter((t) => t.status === 'Overdue').length;
  const pendingCount = taskList.filter((t) => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Submitted').length;

  const [iqacOpen, setIqacOpen] = useState(false);
  const [cdcOpen, setCdcOpen] = useState(false);

  const executiveRoles = ['principal', 'secretary', 'principal_pa', 'secretary_pa', 'admin'];
  const isCdcCoordinator = currentUser?.role === 'staff' && currentUser?.coordinatorRole === 'CDC Coordinator';
  const canViewCdc = currentUser?.role === 'principal' || currentUser?.role === 'admin';
  // CDC group is shown to executive roles and staff (role-based); the
  // "Dashboard" sub-item stays HOD/Principal only.
  const canSeeCdc = currentUser?.role ? [...executiveRoles, 'staff'].includes(currentUser.role) : false;

  // Tabs hidden for ALL roles (requested): Event, Class Management,
  // Student Attendance Today, CDC group and IQAC group must not appear
  // in the sidebar for any login / role.
  const HIDDEN_NAV_IDS = ['events', 'classes', 'student_attendance', 'cdc', 'cdc_exams', 'iqac_ccm', 'iqac_lesson_plan'];

  // CDC & IQAC collapsible groups are hidden for all roles (requested).
  const showCdcModule = false;
  const showIqacModule = false;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['principal', 'secretary', 'principal_pa', 'secretary_pa', 'admin', 'staff', 'librarian', 'incucula'],
    },
    {
      id: 'events',
      label: 'Events & Activities',
      icon: Calendar,
      roles: ['principal', 'secretary', 'principal_pa', 'secretary_pa', 'admin', 'incucula', ...(currentUser?.coordinatorRole === 'Event Coordinator' ? ['staff'] : [])],
      badge: currentUser?.coordinatorRole === 'Event Coordinator' ? 'Event Coordinator' : 'EVENTS',
      badgeColor: currentUser?.coordinatorRole === 'Event Coordinator' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-emerald-600 text-white font-bold',
    },
    {
      id: 'librarian_portal',
      label: 'Librarian Skill Bank (Dim 4.2 & 4.3)',
      icon: BookOpen,
      roles: ['librarian'],
      badge: 'Central Library',
      badgeColor: 'bg-teal-600 text-white font-bold',
    },
    {
      id: 'staff',
      label: 'Faculty Management',
      icon: Users,
      roles: executiveRoles,
    },
    {
      id: 'classes',
      label: 'Class Management',
      icon: GraduationCap,
      roles: [...executiveRoles, ...(currentUser?.coordinatorRole === 'Timetable Coordinator' ? ['staff'] : [])],
      badge: currentUser?.coordinatorRole === 'Timetable Coordinator' ? 'Timetable Coordinator' : undefined,
      badgeColor: 'bg-purple-600 text-white font-bold',
    },
    {
      id: 'mentor_mapping',
      label: 'Mentor-Mentee Mapping',
      icon: UserPlus,
      roles: ['secretary', 'principal_pa', 'secretary_pa', 'admin', 'staff', 'incucula'],
      badge: 'HOD / Execs',
      badgeColor: 'bg-indigo-600 text-white font-bold',
    },
    {
      id: 'tasks',
      label: 'Task Management',
      icon: CheckSquare,
      roles: [...executiveRoles, 'staff', 'incucula'],
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : pendingCount > 0 ? `${pendingCount} Pending` : undefined,
      badgeColor: overdueCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white',
    },
    {
      id: 'student_attendance',
      label: 'Student Attendance Today',
      icon: UserCheck,
      roles: [...executiveRoles, 'staff', 'incucula'],
    },
    {
      id: 'skill_bank',
      label: 'Skill Bank (SSB) Grade Coins',
      icon: Coins,
      // NOTE: principal excluded by request — SSB (Grade Coin System) is hidden for principal login only.
      roles: ['secretary', 'principal_pa', 'secretary_pa', 'admin', 'staff', 'librarian', 'incucula'],
      badge: currentUser?.coordinatorRole === 'CDC Coordinator' ? 'CDC Coordinator' : currentUser?.coordinatorRole === 'Placement Coordinator' ? 'Placement Coord' : 'AY 2026-27',
      badgeColor: currentUser?.coordinatorRole === 'CDC Coordinator' || currentUser?.coordinatorRole === 'Placement Coordinator' ? 'bg-indigo-600 text-white font-bold' : 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'principal_ssb_dashboard',
      label: 'SSB Institutional Dashboard',
      icon: BarChart3,
      roles: executiveRoles,
      badge: 'Principal',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'system_logs',
      label: 'System Logs (LOG)',
      icon: ClipboardList,
      roles: ['principal', 'admin', 'secretary', 'principal_pa', 'secretary_pa'],
      badge: 'LOGS',
      badgeColor: 'bg-indigo-600 text-white font-bold',
    },
    {
      id: 'faculty_kpi',
      label: 'My KPI Dashboard',
      icon: Award,
      // NOTE: principal excluded by request — My KPI (Faculty Performance Dashboard) is hidden for principal login only.
      roles: ['secretary', 'principal_pa', 'secretary_pa', 'admin', 'staff', 'incucula'],
      badge: 'Auto 60%',
      badgeColor: 'bg-blue-600 text-white font-bold',
    },
    {
      id: 'observations',
      label: 'Class Observations',
      icon: Eye,
      roles: executiveRoles,
    },
    {
      id: 'monitoring',
      label: 'Daily Faculty Monitoring',
      icon: CalendarCheck,
      roles: executiveRoles,
    },
    {
      id: 'daily_report',
      label: 'HOD Daily Report Card',
      icon: FileSpreadsheet,
      roles: executiveRoles,
    },
    {
      id: 'reports',
      label: 'Reports & Print Center',
      icon: Printer,
      roles: [...executiveRoles, 'staff'],
    },
    {
      id: 'my_mentees',
      label: 'My Mentees',
      icon: UserCheck,
      roles: ['staff'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!currentUser) return false;
    // These tabs are hidden for ALL roles — never show them from navItems.
    if (HIDDEN_NAV_IDS.includes(item.id)) return false;
    if (!item.roles.includes(currentUser.role)) return false;

    // Strict coordinator restrictions for staff users
    if (currentUser.role === 'staff') {
      if (item.id === 'events' && currentUser.coordinatorRole !== 'Event Coordinator') {
        return false;
      }
      if (item.id === 'classes' && currentUser.coordinatorRole !== 'Timetable Coordinator') {
        return false;
      }
      // CDC Coordinator does not need the Command/Common Dashboard,
      // Mentor-Mentee Mapping, or Student Attendance Today.
      if (isCdcCoordinator && ['dashboard', 'mentor_mapping', 'student_attendance'].includes(item.id)) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      {/* Mobile overlay background */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-60 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Branding Header in Sidebar */}
        <div className="p-5 flex items-center gap-3 bg-blue-700">
          {dailyReport?.collegeLogoUrl ? (
            <img
              src={dailyReport.collegeLogoUrl}
              alt="College Logo"
              className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 shadow-sm shrink-0 border border-white/20"
            />
          ) : (
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-blue-700 font-bold text-xl shadow-sm shrink-0">
              {dailyReport?.collegeLogoText?.[0] || 'H'}
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold tracking-tight uppercase text-sm text-white block truncate">
              Skill Bank
            </span>
            <span className="text-[10px] text-blue-100 font-medium block truncate opacity-90">
              {dailyReport?.collegeName || 'Sasurie College of Engineering'}
            </span>
          </div>
        </div>

        {/* User Quick Info Banner */}
        <div className="mx-4 mt-4 p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
            currentUser?.role === 'principal' ? 'bg-amber-500/20 text-amber-400' : currentUser?.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {currentUser?.role === 'principal' ? <GraduationCap className="w-4 h-4" /> : currentUser?.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              {currentUser?.googleConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="Google Gmail Connected"></span>}
              {currentUser?.role === 'principal' ? 'College Principal' : currentUser?.role === 'admin' ? 'Head of Department' : `ID: ${currentUser?.staffId || 'Staff'}`}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          <div className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Main Menu
          </div>
          {visibleNavItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-6 py-3 text-xs font-medium transition-colors group ${
                  isActive
                    ? 'bg-slate-800 text-blue-400 border-l-4 border-blue-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {/* Hide numeric/urgent pending badges (e.g., "12 Pending", "3 Overdue") — keep other helpful badges */}
                {item.badge && (() => {
                  const b = String(item.badge);
                  const hideForPending = /\b(pending|overdue)\b|^\d+/i.test(b) || item.id === 'tasks';
                  if (hideForPending) return null;
                  return (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  );
                })()}
              </button>
            );
          })}

        {/* CDC Module (collapsible group, like IQAC) — hidden for all roles */}
          {showCdcModule && canSeeCdc && (
          <div className="mt-2 mb-2">
            <button
              onClick={() => setCdcOpen(!cdcOpen)}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs font-semibold transition-colors group ${
                cdcOpen || activeTab === 'cdc' || activeTab === 'cdc_exams'
                  ? 'bg-slate-800 text-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Rocket className={`w-4 h-4 shrink-0 ${cdcOpen || activeTab === 'cdc' || activeTab === 'cdc_exams' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="truncate">CDC</span>
              </div>
              {currentUser?.coordinatorRole === 'CDC Coordinator' && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-md">Coordinator</span>
              )}
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${cdcOpen || activeTab === 'cdc' || activeTab === 'cdc_exams' ? 'rotate-180' : ''}`} />
            </button>

            {(cdcOpen || activeTab === 'cdc' || activeTab === 'cdc_exams') && (
              <div className="ml-4 border-l border-slate-800">
                <button
                  onClick={() => {
                    setActiveTab('cdc_exams');
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'cdc_exams' ? 'text-blue-400 border-l-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">Exam Management</span>
                </button>

                {canViewCdc || isCdcCoordinator ? (
                  <button
                    onClick={() => {
                      setActiveTab('cdc');
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-xs font-medium transition-colors ${
                      activeTab === 'cdc' ? 'text-blue-400 border-l-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Dashboard</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
          )}

          {/* IQAC Module — hidden for all roles */}
          {showIqacModule && !isCdcCoordinator && (
          <div className="mt-2 mb-2">
            <button
              onClick={() => setIqacOpen(!iqacOpen)}
              className={`w-full flex items-center justify-between px-6 py-3 text-xs font-semibold transition-colors group ${
                iqacOpen || activeTab === 'iqac_ccm' || activeTab === 'iqac_lesson_plan'
                  ? 'bg-slate-800 text-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Landmark className={`w-4 h-4 shrink-0 ${iqacOpen || activeTab === 'iqac_ccm' || activeTab === 'iqac_lesson_plan' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="truncate">IQAC</span>
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${iqacOpen ? 'rotate-180' : ''}`} />
            </button>

            {iqacOpen && (
              <div className="ml-4 border-l border-slate-800">
                <button
                  onClick={() => {
                    setActiveTab('iqac_ccm');
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'iqac_ccm' ? 'text-blue-400 border-l-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span className="truncate">CCM</span>
                  <span className="ml-auto text-[9px] uppercase text-slate-600">Docs soon</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('iqac_lesson_plan');
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'iqac_lesson_plan' ? 'text-blue-400 border-l-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">Lesson Plan</span>
                  <span className="ml-auto text-[9px] uppercase text-slate-600">Docs soon</span>
                </button>
              </div>
            )}
          </div>
          )}

          {visibleNavItems.length > 6 && (
            <>
              <div className="px-6 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Reporting
              </div>
              {visibleNavItems.slice(6).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-6 py-3 text-xs font-medium transition-colors group ${
                      isActive
                        ? 'bg-slate-800 text-blue-400 border-l-4 border-blue-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer in Sidebar */}
        <div className="p-3.5 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 mb-3 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
            <img
              src={currentUser?.avatarUrl || getGoogleAvatarUrl(currentUser?.email, currentUser?.name, currentUser?.role)}
              alt={currentUser?.name}
              className="w-9 h-9 rounded-full border border-amber-400/80 object-cover shrink-0 bg-slate-900"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0284c7&color=fff`;
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-[11px] truncate leading-tight">{currentUser?.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser?.email || currentUser?.department}</div>
              {currentUser?.coordinatorRole && currentUser.coordinatorRole !== 'General Faculty' && (
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold uppercase">
                  <Award className="w-2.5 h-2.5 text-purple-400" />
                  {currentUser.coordinatorRole}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
