import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getFirestoreSyncStatus, flushPendingFirestoreSync } from '../lib/firestoreSync';
import { DEPARTMENTS, SASURIE_COLLEGES } from '../types';
import { getCollegeLogoText } from '../utils/departmentUtils';
import { SettingsModal } from './SettingsModal';
import { ProfilePasswordModal } from './ProfilePasswordModal';
import { getGoogleAvatarUrl } from '../utils/avatarUtils';
import {
  Bell,
  Sun,
  Moon,
  Search,
  UserCheck,
  LogOut,
  Shield,
  User,
  Menu,
  X,
  RotateCcw,
  PlusCircle,
  FileText,
  Settings,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  CloudOff,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenQuickAddStaff?: () => void;
  onOpenQuickAddTask?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenQuickAddStaff,
  onOpenQuickAddTask,
}) => {
  const {
    currentUser,
    staffList,
    logout,
    loginAsDemo,
    isDarkMode,
    toggleDarkMode,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    filterState,
    setFilterState,
    resetToDefaultData,
    setActiveTab,
    dailyReport,
    updateDailyReport,
  } = useApp();

    const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfilePasswordModal, setShowProfilePasswordModal] = useState(false);

  // Cloud sync indicator: how many local changes are still waiting to reach the
  // cloud database, and whether Firestore is currently rejecting writes (e.g. the
  // free-tier daily quota being used up). Polled so it stays live.
  const [cloudSync, setCloudSync] = useState<{ pending: number; lastErrorCode: string | null; lastErrorAt: number | null }>({
    pending: 0,
    lastErrorCode: null,
    lastErrorAt: null,
  });

  useEffect(() => {
    const refresh = () => {
      const st = getFirestoreSyncStatus();
      setCloudSync({ pending: st.pendingCount, lastErrorCode: st.lastErrorCode, lastErrorAt: st.lastErrorAt });
    };
    refresh();
    const iv = window.setInterval(refresh, 10000);
    return () => window.clearInterval(iv);
  }, []);

  const QUOTA_UNSYNCED = cloudSync.pending > 0;
  const QUOTA_PAUSED =
    cloudSync.pending === 0 &&
    cloudSync.lastErrorCode === 'resource-exhausted' &&
    cloudSync.lastErrorAt !== null &&
    Date.now() - (cloudSync.lastErrorAt as number) < 24 * 60 * 60 * 1000;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const selectedDeptValue = filterState.department || dailyReport.department || 'Artificial Intelligence & Data Science (AI & DS)';
  const isAll = (selectedDeptValue || '').toLowerCase() === 'all' || (selectedDeptValue || '').toLowerCase() === 'all departments';
  const rawDept = isAll ? 'All Departments' : selectedDeptValue;
  const cleanDept = rawDept.replace(/^Department of\s+/i, '');
  const displayDept = isAll ? 'All Departments (College Overview)' : `Department of ${cleanDept}`;

  // Find HOD for active department dynamically
  const deptHod = staffList.find(
    (s) => s.role === 'admin' && (s.department?.toLowerCase() === rawDept.toLowerCase() || s.department?.toLowerCase().includes(cleanDept.toLowerCase()))
  ) || staffList.find((s) => s.role === 'admin');

  const hodName = currentUser?.role === 'admin'
    ? currentUser.name
    : (deptHod?.facultyName || dailyReport.hodName || 'Dr. C. HOD (AI & DS)');

  const hodEmail = currentUser?.role === 'admin'
    ? (currentUser.email || 'hod@sasurie.com')
    : (deptHod?.email || dailyReport.hodEmail || 'hodcs@sasurie.com');

  const subText = currentUser
    ? currentUser.role === 'admin'
      ? `HOD: ${hodName}${hodEmail ? ` (${hodEmail})` : ''}`
      : `Faculty: ${currentUser.name} • HOD: ${hodName}${hodEmail ? ` (${hodEmail})` : ''}`
    : `HOD: ${hodName}${hodEmail ? ` (${hodEmail})` : ''}`;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors px-6 sm:px-8 h-16 flex items-center justify-between shadow-xs">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Header Title with College Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            title="Toggle Sidebar Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* College Logo Display / Upload Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="relative group shrink-0"
            title="Click to Upload / Change College Logo"
          >
            {dailyReport.collegeLogoUrl ? (
              <div className="relative">
                <img
                  src={dailyReport.collegeLogoUrl}
                  alt="College Logo"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-0.5 shadow-xs group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-2.5 h-2.5" />
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-xs sm:text-sm border-2 border-amber-400 shadow-xs group-hover:bg-blue-800 transition-colors">
                {dailyReport.collegeLogoText || 'SCE'}
              </div>
            )}
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {displayDept}
              </h1>
            </div>

            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide mt-0.5">
              🎓 {dailyReport.collegeName || 'Sasurie College of Engineering'}
            </p>
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-xs lg:max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty, tasks, observations..."
              value={filterState.searchQuery}
              onChange={(e) => setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {filterState.searchQuery && (
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions: Date display, Notifications, Dark Mode, Profile Avatar */}
        <div className="flex items-center gap-4">
          {/* Date & Time Display */}
          <div className="text-right hidden sm:block">
            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
            title="College, HOD & Department Settings"
          >
            <Settings className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Admin / Principal Quick Action Button */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'principal') && (
            <button
              onClick={onOpenQuickAddTask}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + Add Task
            </button>
          )}

                    {/* Cloud Sync Status Pill */}
          {(QUOTA_UNSYNCED || QUOTA_PAUSED) && (
            <button
              onClick={(e) => {
                e.preventDefault();
                flushPendingFirestoreSync();
                const st = getFirestoreSyncStatus();
                setCloudSync({ pending: st.pendingCount, lastErrorCode: st.lastErrorCode, lastErrorAt: st.lastErrorAt });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                QUOTA_UNSYNCED
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                  : 'bg-orange-50 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60'
              }`}
              title={
                QUOTA_UNSYNCED
                  ? `${cloudSync.pending} local change(s) are saved on this device and waiting to reach the cloud database. Click to try saving now. This happens when the free daily Cloud database quota is used up; the app keeps retrying automatically and will upload once the quota resets (00:00 US-Pacific / 07:00 UTC).`
                  : 'The Cloud database daily quota is currently used up. Your data is safely stored on this device and will upload automatically when the database accepts writes again. Click to retry now.'
              }
            >
              {QUOTA_UNSYNCED ? (
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden md:inline">
                {QUOTA_UNSYNCED
                  ? `Cloud sync: ${cloudSync.pending} pending`
                  : 'Cloud database quota used up — auto-retrying'}
              </span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Notifications ({notifications.length})
                  </h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[10px] text-slate-500 hover:text-rose-600 dark:text-slate-400"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      No notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.relatedTaskId) setActiveTab('tasks');
                          setShowNotifications(false);
                        }}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          !n.read ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400">{n.date}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 group focus:outline-none"
              title={`${currentUser?.name} (${currentUser?.email || 'Logged in'})`}
            >
              <img
                src={currentUser?.avatarUrl || getGoogleAvatarUrl(currentUser?.email, currentUser?.name, currentUser?.role)}
                alt={currentUser?.name || 'User Profile'}
                className="w-10 h-10 rounded-full border-2 border-amber-400 bg-slate-100 dark:bg-slate-800 p-0.5 shadow-sm object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0284c7&color=fff`;
                }}
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2.5 text-xs">
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={currentUser?.avatarUrl || getGoogleAvatarUrl(currentUser?.email, currentUser?.name, currentUser?.role)}
                      alt={currentUser?.name}
                      className="w-11 h-11 rounded-full border-2 border-amber-400/80 bg-slate-100 dark:bg-slate-800 object-cover shrink-0 shadow-xs"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0284c7&color=fff`;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate">{currentUser?.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] truncate mt-0.5">{currentUser?.email || currentUser?.department}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      currentUser?.role === 'principal'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40'
                        : currentUser?.role === 'secretary'
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300/40'
                        : currentUser?.role === 'principal_pa'
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/40'
                        : currentUser?.role === 'secretary_pa'
                        ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300/40'
                        : currentUser?.role === 'admin'
                        ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300/40'
                        : currentUser?.role === 'librarian'
                        ? 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 border border-teal-300/40'
                        : currentUser?.role === 'incucula'
                        ? 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-300 border border-fuchsia-300/40'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                    }`}>
                      {currentUser?.role === 'principal'
                        ? 'College Principal'
                        : currentUser?.role === 'secretary'
                        ? 'College Secretary'
                        : currentUser?.role === 'principal_pa'
                        ? 'Principal PA'
                        : currentUser?.role === 'secretary_pa'
                        ? 'Secretary PA'
                        : currentUser?.role === 'admin'
                        ? 'HOD Administrator'
                        : currentUser?.role === 'librarian'
                        ? 'Central Librarian'
                        : currentUser?.role === 'incucula'
                        ? 'Incucula Cell Head'
                        : 'Faculty Member'}
                    </span>

                    {currentUser?.googleConnected && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        Google
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile & Password Settings */}
                <div className="p-1 border-b border-slate-100 dark:border-slate-800 mb-1 space-y-1">
                  <button
                    onClick={() => {
                      setShowProfilePasswordModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-left font-semibold transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Profile & Password Settings
                  </button>

                  <button
                    onClick={() => {
                      resetToDefaultData();
                      setShowProfileMenu(false);
                      alert('System state reset to default data.');
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-left font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Seed Data
                  </button>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Institutional Settings Modal */}
    <SettingsModal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
    />

    {/* Profile & Password Modal */}
    <ProfilePasswordModal
      isOpen={showProfilePasswordModal}
      onClose={() => setShowProfilePasswordModal(false)}
    />
  </>
);
};
