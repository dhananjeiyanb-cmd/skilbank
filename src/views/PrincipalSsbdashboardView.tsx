import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { computeDepartmentSsb, DepartmentSsbtotals, DEPARTMENT_RANKING_OPTIONS } from '../utils/principalSsbutil';
import { calculateStudentTotals } from '../data/mockSkillBank';
import { isSameDept } from '../utils/departmentUtils';
import {
  BarChart3,
  TrendingUp,
  Trophy,
  Medal,
  Award,
  Filter,
  Search,
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  Sparkles,
  ArrowUpDown,
  Download,
  Database,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const DIM_LABELS: Record<keyof Pick<DepartmentSsbtotals, 'dim1Total' | 'dim2Total' | 'dim3Total' | 'dim4Total' | 'dim5Total'>, string> = {
  dim1Total: 'DIM 1',
  dim2Total: 'DIM 2',
  dim3Total: 'DIM 3',
  dim4Total: 'DIM 4',
  dim5Total: 'DIM 5',
};

const DIM_SHORT = ['dim1Total', 'dim2Total', 'dim3Total', 'dim4Total', 'dim5Total'] as const;

// Count distinct student achievement entries worth coins (used in the breakdown table)
function countStudentAchievements(student: any): number {
  if (!student) return 0;
  const arrays = [
    student.onlineCertBasic,
    student.advancedCourses,
    student.paperPresentations,
    student.hackathons,
    student.sportsLogs,
    student.artsLogs,
    student.clubLogs,
    student.professionalMemberships,
  ];
  let count = 0;
  arrays.forEach((arr) => {
    if (Array.isArray(arr)) {
      arr.forEach((item) => {
        if (item && (item.coinsEarned || 0) > 0) count += 1;
      });
    }
  });
  // Recognised one-time milestones that earn coins
  if (student.resume?.coinsEarned > 0) count += 1;
  if (student.mockInterview?.coinsEarned > 0) count += 1;
  if (student.linkedIn?.coinsEarned > 0) count += 1;
  if (student.gitHub?.coinsEarned > 0) count += 1;
  if (student.socialMedia?.coinsEarned > 0) count += 1;
  if (student.internship?.coinsEarned > 0) count += 1;
  if (student.workshop?.coinsEarned > 0) count += 1;
  if (student.collegeEvent?.coinsEarned > 0) count += 1;
  if (student.volunteering?.coinsEarned > 0) count += 1;
  if (student.libraryChecklist?.coinsEarned > 0) count += 1;
  return count;
}

export const PrincipalSsbdashboardView: React.FC = () => {
  const { currentUser, skillBankStudents, syncAllDataToFirestore } = useApp();

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof DepartmentSsbtotals>('totalCoins');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbSyncedSuccess, setDbSyncedSuccess] = useState(false);

  const filteredStudents = useMemo(() => {
    return (skillBankStudents || []).filter((s) => {
      const prof = s.studentProfile;
      const matchesDept = deptFilter === 'all' || isSameDept(prof?.department, deptFilter);
      const matchesYear = yearFilter === 'all' || (prof?.academicYear || '').includes(yearFilter) || (prof?.batch || '').includes(yearFilter);
      const matchesSem = semesterFilter === 'all' || (prof?.semester || '').toLowerCase().includes(semesterFilter.toLowerCase());
      const matchesSearch = !searchQuery || (prof?.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (prof?.registerNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesYear && matchesSem && matchesSearch;
    });
  }, [skillBankStudents, deptFilter, yearFilter, semesterFilter, searchQuery]);

  const availableDepartments = useMemo(() => Array.from(DEPARTMENT_RANKING_OPTIONS), []);

  const departmentData = useMemo(() => computeDepartmentSsb(filteredStudents, availableDepartments), [filteredStudents, availableDepartments]);

  const totals = useMemo(() => departmentData.reduce((acc, cur) => {
    acc.students += cur.studentCount;
    acc.dim1 += cur.dim1Total;
    acc.dim2 += cur.dim2Total;
    acc.dim3 += cur.dim3Total;
    acc.dim4 += cur.dim4Total;
    acc.dim5 += cur.dim5Total;
    acc.total += cur.totalCoins;
    return acc;
  }, { students: 0, dim1: 0, dim2: 0, dim3: 0, dim4: 0, dim5: 0, total: 0 }), [departmentData]);

  const sortedData = useMemo(() => {
    const data = [...departmentData];
    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return data;
  }, [departmentData, sortKey, sortDir]);

  const toggleSort = (key: keyof DepartmentSsbtotals) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const selectedDeptData = useMemo(() => departmentData.find((d) => d.department === selectedDepartment) || null, [departmentData, selectedDepartment]);
  const selectedDeptStudents = useMemo(
    () => (selectedDepartment ? filteredStudents.filter((s) => isSameDept(s.studentProfile?.department, selectedDepartment)) : []),
    [filteredStudents, selectedDepartment]
  );

  const chartData = useMemo(() => sortedData.map((d) => ({ name: d.department.replace(/ \(.*/, ''), ...d, totalCoins: d.totalCoins })), [sortedData]);

  const pieData = useMemo(() => sortedData.filter((d) => d.totalCoins > 0).map((d) => ({ name: d.department.replace(/ \(.*/, ''), value: d.totalCoins })), [sortedData]);

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="w-4 h-4 text-amber-500" />;
    if (index === 1) return <Medal className="w-4 h-4 text-slate-400" />;
    if (index === 2) return <Award className="w-4 h-4 text-amber-700" />;
    return <span className="text-[11px] font-bold text-slate-500">{index + 1}</span>;
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Principal Dashboard
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                SSB Grade Coin — Institutional Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Department-wise performance across DIM 1–DIM 5 with real-time Firestore data
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setDbSyncing(true);
                  try {
                    syncAllDataToFirestore();
                    setDbSyncedSuccess(true);
                    setTimeout(() => setDbSyncedSuccess(false), 3000);
                  } catch (err) {
                    console.error('Failed to sync SSB Grade Coin data to database:', err);
                  } finally {
                    setDbSyncing(false);
                  }
                }}
                disabled={dbSyncing}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  dbSyncedSuccess
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700'
                }`}
                title="Save all SSB Grade Coin data to the Firebase Firestore database"
              >
                {dbSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : dbSyncedSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                {dbSyncing ? 'Saving...' : dbSyncedSuccess ? 'Saved to DB!' : 'Save to Database'}
              </button>
              <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800">
                {departmentData.length} Departments
              </div>
              <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                {totals.students} Students
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <Filter className="w-4 h-4" />
              Filters
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white">
                <option value="all">All Departments</option>
                {availableDepartments.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search student / reg no" className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white w-full sm:w-56" />
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white">
                <option value="all">All Years</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
              <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white">
                <option value="all">All Semesters</option>
                <option value="I">Sem I</option>
                <option value="II">Sem II</option>
                <option value="III">Sem III</option>
                <option value="IV">Sem IV</option>
                <option value="V">Sem V</option>
                <option value="VI">Sem VI</option>
                <option value="VII">Sem VII</option>
                <option value="VIII">Sem VIII</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {[
            { label: 'DIM 1', value: totals.dim1, color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
            { label: 'DIM 2', value: totals.dim2, color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
            { label: 'DIM 3', value: totals.dim3, color: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
            { label: 'DIM 4', value: totals.dim4, color: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
            { label: 'DIM 5', value: totals.dim5, color: 'bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
            { label: 'Total', value: totals.total, color: 'bg-slate-900 text-white border-slate-700' },
          ].map((kpi) => (
            <div key={kpi.label} className={`p-3 rounded-xl border ${kpi.color} shadow-xs`}>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{kpi.label}</div>
              <div className="text-sm font-black mt-1">{kpi.value.toLocaleString()}</div>
              <div className="text-[10px] opacity-80">Grade Coins</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Department-wise Total Grade Coins</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="dim1Total" name="DIM 1" stackId="ssb" fill="#3b82f6" radius={[0,0,0,0]} />
                  <Bar dataKey="dim2Total" name="DIM 2" stackId="ssb" fill="#10b981" radius={[0,0,0,0]} />
                  <Bar dataKey="dim3Total" name="DIM 3" stackId="ssb" fill="#f59e0b" radius={[0,0,0,0]} />
                  <Bar dataKey="dim4Total" name="DIM 4" stackId="ssb" fill="#ef4444" radius={[0,0,0,0]} />
                  <Bar dataKey="dim5Total" name="DIM 5" stackId="ssb" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Share of Total Coins</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => entry.name} labelLine={{ stroke: '#94a3b8' }}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Department Detail Panel */}
        {selectedDepartment && selectedDeptData && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department Detail</div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedDeptData.department}</h3>
              </div>
              <button onClick={() => setSelectedDepartment(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors">Close</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              {DIM_SHORT.map((key) => (
                <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{DIM_LABELS[key]}</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{(selectedDeptData as any)[key].toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">Total Coins</div>
                <div className="text-base font-black text-blue-900 dark:text-blue-200">{selectedDeptData.totalCoins.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Avg / Student</div>
                <div className="text-base font-black text-emerald-900 dark:text-emerald-200">{selectedDeptData.avgCoinsPerStudent.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Achievement</div>
                <div className="text-base font-black text-amber-900 dark:text-amber-200">{selectedDeptData.achievementPct}%</div>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Students ({selectedDeptStudents.length}) — scroll vertically to view all
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="max-h-[460px] overflow-y-auto overscroll-contain">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                      <th className="p-2 font-semibold">#</th>
                      <th className="p-2 font-semibold">Student</th>
                      <th className="p-2 font-semibold">Register No</th>
                      <th className="p-2 font-semibold">Year / Sem</th>
                      <th className="p-2 font-semibold">DIM 1</th>
                      <th className="p-2 font-semibold">DIM 2</th>
                      <th className="p-2 font-semibold">DIM 3</th>
                      <th className="p-2 font-semibold">DIM 4</th>
                      <th className="p-2 font-semibold">DIM 5</th>
                      <th className="p-2 font-semibold">Total Score</th>
                      <th className="p-2 font-semibold">Avg / Student</th>
                      <th className="p-2 font-semibold">Achievements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedDeptStudents.map((s, idx) => {
                      const prof = s.studentProfile;
                      const t = calculateStudentTotals(s);
                      const d1 = t.d1.cappedTotal;
                      const d2 = t.d2.cappedTotal;
                      const d3 = t.d3.cappedTotal;
                      const d4 = t.d4.cappedTotal;
                      const d5 = t.d5.cappedTotal;
                      const total = d1 + d2 + d3 + d4 + d5;
                      const avg = Math.round(total / 5);
                      const achievements = countStudentAchievements(s);
                      return (
                        <tr key={prof.registerNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="p-2 text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-semibold text-slate-900 dark:text-white">{prof.studentName}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">{prof.registerNumber}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">{prof.academicYear || prof.batch} • {prof.semester}</td>
                          <td className="p-2 text-blue-700 dark:text-blue-300">{d1.toLocaleString()}</td>
                          <td className="p-2 text-emerald-700 dark:text-emerald-300">{d2.toLocaleString()}</td>
                          <td className="p-2 text-amber-700 dark:text-amber-300">{d3.toLocaleString()}</td>
                          <td className="p-2 text-purple-700 dark:text-purple-300">{d4.toLocaleString()}</td>
                          <td className="p-2 text-pink-700 dark:text-pink-300">{d5.toLocaleString()}</td>
                          <td className="p-2 font-black text-slate-900 dark:text-white">{total.toLocaleString()}</td>
                          <td className="p-2 font-bold text-slate-700 dark:text-slate-200">{avg.toLocaleString()}</td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${achievements >= 10 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' : achievements > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                              {achievements > 0 ? `✓ ${achievements}` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Department Ranking Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department-wise Ranking</h3>
            </div>
            <div className="text-[11px] text-slate-500">Click a department row to view detailed student breakdown</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                  <th className="p-3 font-semibold">Rank</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold text-center">Students</th>
                  <th className="p-3 font-semibold text-right">DIM 1</th>
                  <th className="p-3 font-semibold text-right">DIM 2</th>
                  <th className="p-3 font-semibold text-right">DIM 3</th>
                  <th className="p-3 font-semibold text-right">DIM 4</th>
                  <th className="p-3 font-semibold text-right">DIM 5</th>
                  <th className="p-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedData.map((row, idx) => (
                  <tr key={row.department} onClick={() => setSelectedDepartment(row.department)} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                    <td className="p-3">{getRankBadge(idx)}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{row.department}</td>
                    <td className="p-3 text-center font-black text-slate-900 dark:text-white">{row.studentCount}</td>
                    <td className="p-3 text-right text-blue-700 dark:text-blue-300">{row.dim1Total.toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{row.dim2Total.toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-700 dark:text-amber-300">{row.dim3Total.toLocaleString()}</td>
                    <td className="p-3 text-right text-purple-700 dark:text-purple-300">{row.dim4Total.toLocaleString()}</td>
                    <td className="p-3 text-right text-pink-700 dark:text-pink-300">{row.dim5Total.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-slate-900 dark:text-white">{row.totalCoins.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
