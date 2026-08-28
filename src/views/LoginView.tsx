import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SASURIE_COLLEGES } from '../types';
import { getCollegeLogoText } from '../utils/departmentUtils';
import { SettingsModal } from '../components/SettingsModal';
import {
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  GraduationCap,
  Building2,
  Settings,
  Mail,
  Crown,
  UserCheck,
  BookOpen,
  Rocket,
  CheckCircle2,
  X,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, loginAsDemo, dailyReport, updateDailyReport, setActiveTab, staffList, resetToDefaultData } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [studentRegNo, setStudentRegNo] = useState('');
  const [studentLoginError, setStudentLoginError] = useState('');
  const [showStudentLogin, setShowStudentLogin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(username, password);
    if (!res.success) {
      setError(res.message || 'Account or Email ID not found in database. Please contact ADMIN.');
    }
  };

  const handleCustomGoogleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    setGoogleError('');
    const res = loginWithGoogle(customGoogleEmail.trim());
    if (!res.success) {
      setGoogleError(res.message || 'Email ID not found in database. Please contact ADMIN.');
      return;
    }
    setShowGoogleModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Atmospheric Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 my-6">
        {/* Institutional Branding Header */}
        <div className="text-center mb-6">
          <div
            onClick={() => setShowSettingsModal(true)}
            className="relative inline-block mb-3 cursor-pointer group"
            title="Click to update College Logo & Name"
          >
            {dailyReport.collegeLogoUrl && !logoError ? (
              <div className="relative">
                <img
                  src={dailyReport.collegeLogoUrl}
                  alt={dailyReport.collegeName || 'College Logo'}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-20 h-20 object-contain rounded-2xl border-2 border-amber-400 bg-white p-1.5 shadow-2xl shadow-blue-900/50 mx-auto transition-transform group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-900 rounded-full mx-auto flex items-center justify-center p-1.5 shadow-2xl shadow-blue-900/50 border-2 border-amber-400 relative transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-amber-300/40 flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-slate-950 text-amber-300 p-1">
                    <GraduationCap className="w-7 h-7 text-amber-400 drop-shadow" />
                    <span className="text-[8px] font-black tracking-widest text-amber-200 uppercase mt-0.5">
                      {dailyReport.collegeLogoText || 'SCE'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-white shadow-xs">
                    {dailyReport.collegeLogoText || 'SCE'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-1">
            <select
              aria-label="Select Sasurie College"
              value={dailyReport.collegeName || 'Sasurie College of Engineering'}
              onChange={(e) => {
                const newCol = e.target.value;
                const logoText = getCollegeLogoText(newCol);
                updateDailyReport({
                  collegeName: newCol,
                  collegeLogoText: logoText,
                });
              }}
              className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400/95 bg-slate-900/90 border border-amber-500/30 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer max-w-full truncate text-center"
              title="Select Sasurie Institution"
            >
              {SASURIE_COLLEGES.map((col) => (
                <option key={col} value={col} className="bg-slate-900 text-amber-300 font-bold">
                  🎓 {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* UNIFIED LOGIN CARD */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs rounded-2xl font-bold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Faculty ID or Email ID <span className="text-blue-400 font-normal">(sasurie.com)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. FAC001 or name@sasurie.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>SIGN IN TO PORTAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          {/* Student Login Toggle */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowStudentLogin(!showStudentLogin)}
              className="w-full py-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              {showStudentLogin ? 'Hide Student Login' : 'Student? Login with Registration Number'}
            </button>

            {showStudentLogin && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setStudentLoginError('');
                  const regNo = studentRegNo.trim();
                  if (!regNo) {
                    setStudentLoginError('Please enter your Registration Number.');
                    return;
                  }
                  // Navigate to student exam portal
                  setActiveTab('student_exam');
                }}
                className="mt-4 space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Registration Number</label>
                  <input
                    type="text"
                    value={studentRegNo}
                    onChange={(e) => setStudentRegNo(e.target.value)}
                    placeholder="e.g. 713422104001"
                    required
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  />
                </div>

                {studentLoginError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs rounded-2xl font-bold">
                    {studentLoginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>ENTER EXAM PORTAL</span>
                </button>
              </form>
            )}

            {staffList.length === 0 && (
              <div className="mt-5 p-4 bg-blue-950/40 border border-blue-900/60 rounded-2xl text-center space-y-2.5 animate-in fade-in">
                <p className="text-xs text-blue-300 font-semibold leading-relaxed">
                  No staff accounts found in the database. Initialize with default demo accounts to log in.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetToDefaultData();
                    alert('Database successfully initialized with default demo accounts (HOD, Staff, etc.). You can now log in!');
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Initialize Default Accounts</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Login Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setGoogleError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Google Workspace Authentication</h3>
              <p className="text-xs text-slate-400 mt-1">Enter your institutional Google email address</p>
            </div>

            {googleError && (
              <div className="mb-4 p-3.5 bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs rounded-xl font-bold flex items-start gap-2">
                <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div>{googleError}</div>
                  <div className="text-[10px] font-normal text-rose-300 mt-1">
                    Contact system ADMIN to register your email in the department database.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCustomGoogleSignIn} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@sasurie.com"
                  value={customGoogleEmail}
                  onChange={(e) => {
                    setCustomGoogleEmail(e.target.value);
                    setGoogleError('');
                  }}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Continue with Google
              </button>
            </form>
          </div>
        </div>
      )}

      {/* College Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
