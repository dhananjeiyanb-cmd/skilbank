import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../types';
import { isSameDept } from '../utils/departmentUtils';
import { getGoogleAvatarUrl } from '../utils/avatarUtils';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  ShieldAlert,
  ArrowUpDown,
  BookOpen,
  Settings,
  LogIn,
  LogOut,
  Users,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export const SystemLogsView: React.FC = () => {
  const { systemLogs } = useApp();

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Available departments from global settings/types
  const availableDepartments = useMemo(() => Array.from(DEPARTMENTS), []);

  // Filtered logs computed locally
  const filteredLogs = useMemo(() => {
    return (systemLogs || []).filter((log) => {
      // 1) Department check (Department-wise grouping/filtering)
      const matchesDept =
        deptFilter === 'all' ||
        isSameDept(log.department, deptFilter) ||
        (log.department && log.department.toLowerCase().includes(deptFilter.toLowerCase()));

      // 2) Action check
      let matchesAction = true;
      if (actionFilter !== 'all') {
        if (actionFilter === 'auth') {
          matchesAction = log.action === 'Login' || log.action === 'Logout' || log.action.includes('Login');
        } else if (actionFilter === 'mentor') {
          matchesAction = log.action === 'Mentor-Mentee Allocation';
        } else if (actionFilter === 'sheets') {
          matchesAction = log.action === 'Import Sheets';
        } else if (actionFilter === 'student') {
          matchesAction = log.action === 'Student Update';
        } else {
          matchesAction = log.action.toLowerCase() === actionFilter.toLowerCase();
        }
      }

      // 3) Keyword Search
      const textToSearch = `${log.userName} ${log.userId} ${log.action} ${log.details} ${log.role}`.toLowerCase();
      const matchesSearch = !searchQuery || textToSearch.includes(searchQuery.toLowerCase());

      return matchesDept && matchesAction && matchesSearch;
    });
  }, [systemLogs, deptFilter, actionFilter, searchQuery]);

  // Sort logs by time
  const sortedLogs = useMemo(() => {
    const logs = [...filteredLogs];
    logs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
    return logs;
  }, [filteredLogs, sortOrder]);

  // Stats computation for headers
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logsToday = (systemLogs || []).filter((l) => l.timestamp.startsWith(todayStr));

    const loginsToday = logsToday.filter((l) => l.action.toLowerCase().includes('login')).length;
    const updatesToday = logsToday.filter((l) => l.action !== 'Login' && l.action !== 'Logout').length;

    return {
      loginsToday,
      updatesToday,
      totalCount: systemLogs?.length || 0,
    };
  }, [systemLogs]);

  // Date formatter
  const formatLogDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Colored action tag generator
  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act === 'login') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
          <LogIn className="w-3.5 h-3.5" />
          Login
        </span>
      );
    }
    if (act.includes('login')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
          <LogIn className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (act === 'logout') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </span>
      );
    }
    if (act.includes('mentor')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
          <Users className="w-3.5 h-3.5" />
          Mentor Mappings
        </span>
      );
    }
    if (act.includes('import') || act.includes('sheet')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Spreadsheet Import
        </span>
      );
    }
    if (act.includes('student')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          <BookOpen className="w-3.5 h-3.5" />
          Student Update
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
        <Settings className="w-3.5 h-3.5" />
        {action}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Title Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
                <ClipboardList className="w-3.5 h-3.5" />
                Audit Trail System
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                System Activity &amp; Login Logs
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Real-time tracking of user logins/logoffs, mentor assignments, and spreadsheet updates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Logins Today</div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{stats.loginsToday}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-xl text-center">
                <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Updates Today</div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{stats.updatesToday}</div>
              </div>
              <div className="bg-slate-800 text-white px-4 py-2 rounded-xl text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Logs</div>
                <div className="text-lg font-black mt-0.5">{stats.totalCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <Filter className="w-4 h-4" />
              Filter Options
            </div>
            <button
              onClick={() => {
                setDeptFilter('all');
                setActionFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start md:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {/* Department Wise Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {availableDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Activity Type</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Activities</option>
                <option value="auth">Logins &amp; Logouts</option>
                <option value="mentor">Mentor-Mentee Mappings</option>
                <option value="sheets">Spreadsheet Imports</option>
                <option value="student">Student Updates</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Search Keywords</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, ID or detail text..."
                  className="pl-9 pr-3 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Sorting Toggler */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Sort Order</label>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  {sortOrder === 'desc' ? 'Newest Logs First' : 'Oldest Logs First'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Activity Log Listings ({sortedLogs.length} matches)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Auto-synced with Cloud Firestore</span>
          </div>

          {sortedLogs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No logs found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No system audit logs matched your current filter criteria. Try resetting filters or updating keywords.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                    <th className="p-4 font-semibold w-[180px]">Date &amp; Time</th>
                    <th className="p-4 font-semibold w-[260px]">User Details</th>
                    <th className="p-4 font-semibold w-[160px]">Action Category</th>
                    <th className="p-4 font-semibold">Activity Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sortedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors align-top"
                    >
                      <td className="p-4 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60 text-slate-400" />
                          {formatLogDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getGoogleAvatarUrl(log.userId + '@sasurie.com', log.userName, log.role as any)}
                            alt={log.userName}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover bg-slate-100"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                log.userName
                              )}&background=0284c7&color=fff`;
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {log.userName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                              <span>ID: {log.userId}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                              <span className="capitalize">{log.role}</span>
                            </div>
                            {log.department && (
                              <div className="text-[9px] text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">
                                {log.department}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                      <td className="p-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed break-words max-w-[500px]">
                          {log.details}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

