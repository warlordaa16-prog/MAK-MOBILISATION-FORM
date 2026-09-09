import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Search,
  Download,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  Calendar,
  Building,
  Users,
  Sparkles,
  FileText,
  UserCheck,
  Key,
  Database,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { UNIVERSITIES, UniversityName, AdminRole, AdminUser } from '../types';
import { GoogleSheetsGuideModal } from './GoogleSheetsGuideModal';
import { CSVExportModal } from './CSVExportModal';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminLoggedIn: boolean;
  onLoginSuccess: (token: string, admin?: AdminUser) => void;
  onLogout: () => void;
}

const UNIVERSITY_ACRONYMS: Record<string, string> = {
  'Kampala International University (KIU)': 'KIU',
  'Cavendish University Uganda': 'CAVENDISH',
  'International University of East Africa (IUEA)': 'IUEA',
  'Clarke International University (CIU)': 'CIU',
  'King Caesar University (KCU)': 'KCU',
};

const UNIVERSITY_SLUGS: Record<string, string> = {
  'Kampala International University (KIU)': 'kiu',
  'Cavendish University Uganda': 'cavendish',
  'International University of East Africa (IUEA)': 'iuea',
  'Clarke International University (CIU)': 'ciu',
  'King Caesar University (KCU)': 'kcu',
};

const DEFAULT_ACCOUNTS = [
  { role: 'UNIVERSITY_ADMIN' as AdminRole, username: 'kiu_admin', pass: 'kiu_admin_2026', label: 'KIU Admin', univ: 'Kampala International University (KIU)' },
  { role: 'UNIVERSITY_ADMIN' as AdminRole, username: 'cavendish_admin', pass: 'cavendish_admin_2026', label: 'Cavendish Admin', univ: 'Cavendish University Uganda' },
  { role: 'UNIVERSITY_ADMIN' as AdminRole, username: 'iuea_admin', pass: 'iuea_admin_2026', label: 'IUEA Admin', univ: 'International University of East Africa (IUEA)' },
  { role: 'UNIVERSITY_ADMIN' as AdminRole, username: 'ciu_admin', pass: 'ciu_admin_2026', label: 'CIU Admin', univ: 'Clarke International University (CIU)' },
  { role: 'UNIVERSITY_ADMIN' as AdminRole, username: 'kcu_admin', pass: 'kcu_admin_2026', label: 'KCU Admin', univ: 'King Caesar University (KCU)' },
  { role: 'SYSTEM_ADMIN' as AdminRole, username: 'admin', pass: 'mobilize2026_admin', label: 'System Admin (Central)', univ: null },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  isAdminLoggedIn,
  onLoginSuccess,
  onLogout,
}) => {
  // Current admin session profile
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('univmob_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [username, setUsername] = useState('kiu_admin');
  const [password, setPassword] = useState('kiu_admin_2026');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('kiu_admin');

  // Dashboard active view tab (for System Admin)
  const [systemActiveTab, setSystemActiveTab] = useState<'overview' | 'entries' | 'sheets' | 'users' | 'settings'>('overview');

  // Dashboard data state
  const [stats, setStats] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnivFilter, setSelectedUnivFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Settings & Sheets state
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'warn' | 'allow' | 'block'>('warn');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Admin users list (for System Admin)
  const [adminUsersList, setAdminUsersList] = useState<any[]>([]);
  const [editingPasswordUser, setEditingPasswordUser] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // CSV Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportUniversityTarget, setExportUniversityTarget] = useState<string>('all');

  const getAuthHeader = () => {
    const token = localStorage.getItem('univmob_admin_token') || '';
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (isOpen && isAdminLoggedIn) {
      loadAdminProfile();
      loadStats();
      loadEntries(1);
      loadSheetsStatus();
    }
  }, [isOpen, isAdminLoggedIn]);

  // Load verified admin profile
  const loadAdminProfile = async () => {
    try {
      const res = await fetch('/api/admin/me', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.admin) {
          setCurrentAdmin(data.admin);
          localStorage.setItem('univmob_admin_user', JSON.stringify(data.admin));

          // If University Admin, lock the filter
          if (data.admin.role === 'UNIVERSITY_ADMIN' && data.admin.university) {
            setSelectedUnivFilter(data.admin.university);
          }
        }
      } else if (res.status === 401 || res.status === 403) {
        handleLogoutClick();
      }
    } catch {
      // fallback to cached admin
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadEntries = async (page = 1) => {
    setIsLoadingData(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      // If System Admin, apply filter dropdown; if University Admin, backend strictly handles own university
      if (currentAdmin?.role === 'SYSTEM_ADMIN') {
        if (selectedUnivFilter && selectedUnivFilter !== 'all') {
          params.set('university', selectedUnivFilter);
        }
      }

      if (selectedDateFilter) {
        params.set('date', selectedDateFilter);
      }

      const res = await fetch(`/api/admin/entries?${params.toString()}`, {
        headers: getAuthHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotalEntries(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadSheetsStatus = async () => {
    try {
      const res = await fetch('/api/admin/sheets-status', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setSheetsStatus(data.status);
        if (data.duplicatePolicy) {
          setDuplicatePolicy(data.duplicatePolicy);
        }
      }
    } catch (err) {
      console.error('Failed to load sheets status:', err);
    }
  };

  const loadAdminUsers = async () => {
    if (currentAdmin?.role !== 'SYSTEM_ADMIN') return;
    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setAdminUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('univmob_admin_token', data.token);
        if (data.admin) {
          setCurrentAdmin(data.admin);
          localStorage.setItem('univmob_admin_user', JSON.stringify(data.admin));
        }
        onLoginSuccess(data.token, data.admin);
        loadStats();
        loadEntries(1);
        loadSheetsStatus();
      } else {
        setLoginError(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setLoginError('Could not connect to server. Please verify network.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectPreset = (acc: typeof DEFAULT_ACCOUNTS[0]) => {
    setSelectedPreset(acc.username);
    setUsername(acc.username);
    setPassword(acc.pass);
    setLoginError(null);
  };

  const handleLogoutClick = () => {
    localStorage.removeItem('univmob_admin_token');
    localStorage.removeItem('univmob_admin_user');
    setCurrentAdmin(null);
    onLogout();
  };

  const handleTestSheets = async () => {
    setIsTestingSheets(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/test-sheets', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Google Sheets verified successfully!' : 'Connection failed.'),
      });
      loadSheetsStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: 'Test failed: Network error' });
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/sync-all-to-sheets', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`Successfully synchronized ${data.synced} pending records to designated worksheet tabs.`);
        loadStats();
        loadEntries(currentPage);
      } else {
        setSyncFeedback(`Sync note: ${data.message || 'Error occurred during batch sync.'}`);
      }
    } catch (err: any) {
      setSyncFeedback('Sync failed: Network error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handlePasswordReset = async (targetUsername: string) => {
    if (!newPasswordValue || newPasswordValue.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    try {
      const res = await fetch('/api/admin/users/password', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: targetUsername, newPassword: newPasswordValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordChangeSuccess(`Password updated for ${targetUsername}`);
        setEditingPasswordUser(null);
        setNewPasswordValue('');
        setTimeout(() => setPasswordChangeSuccess(null), 4000);
      } else {
        alert(data.message || 'Failed to update password');
      }
    } catch {
      alert('Error updating password');
    }
  };

  const openExportModalForUniversity = (targetUniv: string) => {
    setExportUniversityTarget(targetUniv);
    setShowExportModal(true);
  };

  if (!isOpen) return null;

  const isUniversityAdmin = currentAdmin?.role === 'UNIVERSITY_ADMIN';
  const universityFullName = currentAdmin?.university || '';
  const universityAcronym = currentAdmin?.universityAcronym || (universityFullName ? UNIVERSITY_ACRONYMS[universityFullName] : '') || 'UNIV';

  return (
    <div
      id="admin-dashboard-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div
        id="admin-dashboard-container"
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                isUniversityAdmin ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-red-600 to-rose-700'
              }`}
            >
              {isUniversityAdmin ? universityAcronym : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white">
                  {isUniversityAdmin ? `${universityAcronym} Administration Portal` : 'Central System Admin Portal'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isUniversityAdmin
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      : 'bg-red-500/20 text-red-300 border border-red-400/30'
                  }`}
                >
                  {isUniversityAdmin ? 'University Admin' : 'System Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
                {isUniversityAdmin ? universityFullName : 'Cross-institutional multi-university records & Google Sheets manager'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminLoggedIn && (
              <button
                id="admin-logout-btn"
                onClick={handleLogoutClick}
                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                title="Log out of admin session"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition cursor-pointer text-xl font-bold leading-none"
              title="Close Portal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {!isAdminLoggedIn ? (
            /* ======================================================== */
            /* 1. LOGIN SCREEN WITH ROLE SELECTOR CHIPS                 */
            /* ======================================================== */
            <div className="max-w-md mx-auto py-6">
              <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200">
                <div className="text-center mb-6">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center mb-3 shadow-md">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Administrator Sign In</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your administrative role or institution to authenticate
                  </p>
                </div>

                {/* Preset Role Quick Selector Chips */}
                <div className="mb-5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Quick Role Selector
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {DEFAULT_ACCOUNTS.map((acc) => {
                      const isSelected = selectedPreset === acc.username;
                      return (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => handleSelectPreset(acc)}
                          className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className="block truncate font-bold text-[11px]">{acc.label}</span>
                          <span className={`text-[10px] block truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {acc.username}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Username / ID</label>
                    <input
                      id="admin-login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="e.g. kiu_admin or admin"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      id="admin-login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter administrator password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-600 transition"
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    id="admin-submit-login-btn"
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <span>Authenticate Session</span>
                    )}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                  <span className="text-[11px] text-slate-500">
                    Each university administrator has isolated access to their campus database.
                  </span>
                </div>
              </div>
            </div>
          ) : isUniversityAdmin ? (
            /* ======================================================== */
            /* 2. UNIVERSITY ADMIN ISOLATED DASHBOARD                   */
            /* ======================================================== */
            <div className="space-y-6">
              {/* Institution Identity Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg shrink-0 border border-blue-400/30">
                    {universityAcronym}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        Designated University Administrator
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                        Isolated Data Pipeline Active
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                      {universityFullName}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dedicated Google Sheet Worksheet Tab: <strong>{universityAcronym}</strong></span>
                    </p>
                  </div>
                </div>

                {/* THE PROMINENT EXPORT CSV BUTTON FOR UNIVERSITY ADMIN */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="univ-admin-export-csv-btn"
                    onClick={() => openExportModalForUniversity(universityFullName)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-red-900/40 transition active:scale-[0.99] cursor-pointer border border-red-400/40"
                    title={`Download ${UNIVERSITY_SLUGS[universityFullName] || 'univ'}_mobilization_${new Date().toISOString().slice(0, 10)}.csv`}
                  >
                    <Download className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>EXPORT CSV</span>
                  </button>

                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncingAll}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                    title="Sync this university's pending records to Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAll ? 'Syncing...' : 'Sync Tab'}</span>
                  </button>
                </div>
              </div>

              {syncFeedback && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Statistics Cards (Isolated to this University) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Mobilized
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                    {stats?.totalEntries ?? totalEntries}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    All-time for {universityAcronym}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Today's Mobilizations
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                    {stats?.todayEntries ?? 0}
                  </div>
                  <span className="text-[11px] text-emerald-600/80 mt-1 block">
                    Recorded today
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Sheets Synced
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                    {stats?.totalSynced ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    In tab <strong>{universityAcronym}</strong>
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                    Pending Sync
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                    {stats?.totalUnsynced ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Cached in storage
                  </span>
                </div>
              </div>

              {/* Isolated Mobilization Records Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      {universityFullName} Mobilization Database
                    </h4>
                    <p className="text-xs text-slate-500">
                      Displaying {totalEntries} record(s) strictly isolated to this institution.
                    </p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search candidate or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadEntries(1)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600"
                      />
                    </div>

                    <button
                      onClick={() => loadEntries(1)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4"># ID</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Telephone</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Worksheet Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {isLoadingData ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                            <span>Loading records...</span>
                          </td>
                        </tr>
                      ) : entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No mobilization records found for this university.
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {entry.id}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {entry.fullName}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-800 font-semibold">
                              {entry.telephone}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {entry.date}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono">
                              {entry.time}
                            </td>
                            <td className="py-3 px-4">
                              {entry.syncedToGoogleSheets ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Synced to [{universityAcronym}]
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Pending Sync
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Page {currentPage} of {totalPages} ({totalEntries} items)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadEntries(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => loadEntries(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* 3. CENTRAL SYSTEM ADMIN DASHBOARD                        */
            /* ======================================================== */
            <div className="space-y-5">
              {/* System Admin Sub-Navigation */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 overflow-x-auto">
                <button
                  onClick={() => setSystemActiveTab('overview')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    systemActiveTab === 'overview'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cross-University Overview
                </button>
                <button
                  onClick={() => setSystemActiveTab('entries')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    systemActiveTab === 'entries'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Master Mobilization Database
                </button>
                <button
                  onClick={() => setSystemActiveTab('sheets')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    systemActiveTab === 'sheets'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Google Sheets 5-Worksheet Hub
                </button>
                <button
                  onClick={() => {
                    setSystemActiveTab('users');
                    loadAdminUsers();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    systemActiveTab === 'users'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  University Administrators
                </button>
              </div>

              {systemActiveTab === 'overview' && (
                <div className="space-y-5">
                  {/* System Hero Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Central System Administration
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        5 Universities • Central Google Sheets Pipeline
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">
                        Cross-institutional records tracking with isolated worksheet tabs: KIU, CAVENDISH, IUEA, CIU, KCU
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="system-admin-export-all-csv-btn"
                        onClick={() => openExportModalForUniversity('all')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-red-900/40 transition active:scale-[0.99] cursor-pointer border border-red-400/40"
                      >
                        <Download className="w-4 h-4 text-white stroke-[2.5]" />
                        <span>EXPORT ALL CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* System High-Level Figures */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Total Mobilized People
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        {stats?.totalEntries ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Across all 5 universities
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                        Total Today
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                        {stats?.todayEntries ?? 0}
                      </div>
                      <span className="text-[11px] text-emerald-600/80 mt-1 block">
                        All campuses combined
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                        Google Sheets Synced
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                        {stats?.totalSynced ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Sent to 5 tabs
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                        Pending In Storage
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                        {stats?.totalUnsynced ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Ready to sync
                      </span>
                    </div>
                  </div>

                  {/* 5 INDIVIDUAL UNIVERSITY STATS CARDS (REQUIREMENT 8) */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>Individual University Performance Breakdown</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {UNIVERSITIES.map((univ) => {
                        const totalForUniv = stats?.byUniversity?.[univ.name] ?? 0;
                        const todayForUniv = stats?.todayByUniversity?.[univ.name] ?? 0;
                        const tabName = UNIVERSITY_ACRONYMS[univ.name] || 'TAB';

                        return (
                          <div
                            key={univ.id}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded text-white ${univ.accentBg}`}>
                                  {univ.acronym}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Tab: {tabName}
                                </span>
                              </div>

                              <h5 className="text-sm font-bold text-slate-900 leading-tight">
                                {univ.name}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {univ.campus}
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                                  <span className="text-xl font-black text-slate-900">{totalForUniv}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Today</span>
                                  <span className="text-xl font-black text-emerald-700">{todayForUniv}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                onClick={() => openExportModalForUniversity(univ.name)}
                                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-red-600" />
                                <span>Export {univ.acronym} CSV</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {systemActiveTab === 'entries' && (
                /* Master Database Tab */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        Cross-University Mobilization Database
                      </h4>
                      <p className="text-xs text-slate-500">
                        Total {totalEntries} records found matching filter.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* University Filter for System Admin */}
                      <select
                        value={selectedUnivFilter}
                        onChange={(e) => setSelectedUnivFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-blue-600 cursor-pointer"
                      >
                        <option value="all">All Universities</option>
                        {UNIVERSITIES.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.acronym} - {u.shortName}
                          </option>
                        ))}
                      </select>

                      <div className="relative w-full sm:w-48">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search records..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadEntries(1)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600"
                        />
                      </div>

                      <button
                        onClick={() => loadEntries(1)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Apply
                      </button>

                      <button
                        onClick={() => openExportModalForUniversity(selectedUnivFilter)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4"># ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Telephone</th>
                          <th className="py-3 px-4">University</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Sheets Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {isLoadingData ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                              <span>Loading records...</span>
                            </td>
                          </tr>
                        ) : entries.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No mobilization records found.
                            </td>
                          </tr>
                        ) : (
                          entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                {entry.id}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {entry.fullName}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-800 font-semibold">
                                {entry.telephone}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                                  {entry.university}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {entry.date} <span className="font-mono text-[11px] text-slate-400">{entry.time}</span>
                              </td>
                              <td className="py-3 px-4">
                                {entry.syncedToGoogleSheets ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Synced
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Page {currentPage} of {totalPages} ({totalEntries} items)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadEntries(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => loadEntries(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {systemActiveTab === 'sheets' && (
                /* Google Sheets Multi-Worksheet Architecture Tab */
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          <span>Google Sheets Multi-Worksheet Architecture</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Each participating university writes to its own isolated worksheet tab within the central spreadsheet.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleTestSheets}
                          disabled={isTestingSheets}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                        >
                          {isTestingSheets ? 'Testing Tabs...' : 'Test Connection'}
                        </button>

                        <button
                          onClick={handleSyncAll}
                          disabled={isSyncingAll}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          {isSyncingAll ? 'Syncing...' : 'Sync All Pending'}
                        </button>
                      </div>
                    </div>

                    {testResult && (
                      <div
                        className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                          testResult.success
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}

                    {syncFeedback && (
                      <div className="mt-4 p-3 rounded-xl text-xs bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{syncFeedback}</span>
                      </div>
                    )}

                    {/* 5 Worksheet Tabs Diagram */}
                    <div className="mt-5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        Configured University Worksheet Tabs
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {[
                          { tab: 'KIU', name: 'Kampala Int. University', count: stats?.byUniversity?.['Kampala International University (KIU)'] ?? 0 },
                          { tab: 'CAVENDISH', name: 'Cavendish University', count: stats?.byUniversity?.['Cavendish University Uganda'] ?? 0 },
                          { tab: 'IUEA', name: 'Int. Univ of East Africa', count: stats?.byUniversity?.['International University of East Africa (IUEA)'] ?? 0 },
                          { tab: 'CIU', name: 'Clarke Int. University', count: stats?.byUniversity?.['Clarke International University (CIU)'] ?? 0 },
                          { tab: 'KCU', name: 'King Caesar University', count: stats?.byUniversity?.['King Caesar University (KCU)'] ?? 0 },
                        ].map((sheet) => (
                          <div
                            key={sheet.tab}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center"
                          >
                            <span className="text-[10px] font-mono text-slate-400 block">WORKSHEET</span>
                            <span className="text-base font-black text-slate-900 block mt-0.5">
                              {sheet.tab}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                              {sheet.name}
                            </span>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-2">
                              {sheet.count} entries
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                      <div>
                        Spreadsheet ID:{' '}
                        <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                          {sheetsStatus?.spreadsheetId || 'GOOGLE_SHEETS_SPREADSHEET_ID'}
                        </code>
                      </div>

                      <button
                        onClick={() => setShowGuideModal(true)}
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline underline-offset-2"
                      >
                        View Google Sheets Setup Instructions
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {systemActiveTab === 'users' && (
                /* University Administrators Management Tab */
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <span>University Administrator Accounts</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      The system administrator manages credentials for the 5 university accounts.
                    </p>
                  </div>

                  {passwordChangeSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{passwordChangeSuccess}</span>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {adminUsersList.map((user) => (
                      <div
                        key={user.username}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{user.displayName}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                user.role === 'SYSTEM_ADMIN'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                            <span>
                              Username: <strong className="font-mono text-slate-700">{user.username}</strong>
                            </span>
                            {user.university && (
                              <span>• Campus: {user.university}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingPasswordUser === user.username ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="New password"
                                value={newPasswordValue}
                                onChange={(e) => setNewPasswordValue(e.target.value)}
                                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg"
                              />
                              <button
                                onClick={() => handlePasswordReset(user.username)}
                                className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPasswordUser(null);
                                  setNewPasswordValue('');
                                }}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPasswordUser(user.username);
                                setNewPasswordValue('');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5 text-slate-500" />
                              <span>Reset Password</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSV Export Modal */}
      <CSVExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        adminRole={currentAdmin?.role || 'SYSTEM_ADMIN'}
        userUniversity={currentAdmin?.university || null}
        defaultUniversity={exportUniversityTarget}
      />

      {/* Google Sheets Setup Guide Modal */}
      <GoogleSheetsGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
};
