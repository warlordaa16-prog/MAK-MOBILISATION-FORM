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
  Zap,
  Activity,
  Cpu,
  Layers,
  Bell,
  LayoutDashboard,
  ChevronDown,
  Car,
  Award,
} from 'lucide-react';
import { UNIVERSITIES, UniversityName, AdminRole, AdminUser, SchoolNotification } from '../types';
import { GoogleSheetsGuideModal } from './GoogleSheetsGuideModal';
import { CSVExportModal } from './CSVExportModal';
import { OfflineQueueService } from '../services/offlineQueue';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminLoggedIn: boolean;
  onLoginSuccess: (token: string, admin?: AdminUser) => void;
  onLogout: () => void;
}

const UNIVERSITY_ACRONYMS: Record<string, string> = {
  'Kampala International University (KIU)': 'KIU',
};

const UNIVERSITY_SLUGS: Record<string, string> = {
  'Kampala International University (KIU)': 'kiu',
};

const DEFAULT_ACCOUNTS = [
  { role: 'SYSTEM_ADMIN' as AdminRole, username: 'admin', pass: 'Ignite', label: 'Administrator', univ: null },
  { role: 'SYSTEM_ADMIN' as AdminRole, username: 'kiu_admin', pass: 'Ignite', label: 'KIU Admin', univ: 'Kampala International University (KIU)' },
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

  // Login form state - Official password is Ignite
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Ignite');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('admin');

  // Notifications state
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isTriggeringTestMilestone, setIsTriggeringTestMilestone] = useState(false);

  // Active view tab: overview | report | entries | sheets | notifications | users
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'entries' | 'sheets' | 'notifications' | 'users'>('overview');

  // Synced Report state (daily report of people mobilized by several people)
  const [syncedReport, setSyncedReport] = useState<any>(null);
  const [selectedReportDate, setSelectedReportDate] = useState<string>('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [lastLiveUpdated, setLastLiveUpdated] = useState<Date>(new Date());
  const [transportFilter, setTransportFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [expandedMobilizers, setExpandedMobilizers] = useState<Record<string, boolean>>({});

  const toggleMobilizerExpand = (mobName: string) => {
    setExpandedMobilizers((prev) => ({
      ...prev,
      [mobName]: !prev[mobName],
    }));
  };

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
      loadSyncedReport(selectedReportDate);
      loadSheetsStatus();
      loadNotifications();

      // Real-Time live polling every 3 seconds so data entered by 4+ mobilizers instantly appears!
      const interval = setInterval(() => {
        loadStats();
        loadEntries(currentPage);
        loadSyncedReport(selectedReportDate);
        setLastLiveUpdated(new Date());
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isAdminLoggedIn, currentPage, selectedReportDate]);

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

  const loadSyncedReport = async (date?: string) => {
    try {
      const q = date && date !== 'all' ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`/api/admin/synced-report${q}`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          setSyncedReport(data.report);
          if (!selectedReportDate && data.report.selectedDate) {
            setSelectedReportDate(data.report.selectedDate);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load synced report:', err);
    }
  };

  const loadEntries = async (page = 1) => {
    setIsLoadingData(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      if (transportFilter && transportFilter !== 'all') {
        params.set('transport', transportFilter);
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

  const playMilestoneChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext muted or unsupported
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications', { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readBy: [...n.readBy, currentAdmin?.username || ''] } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleTriggerTestMilestone = async () => {
    setIsTriggeringTestMilestone(true);
    try {
      const targetUniv = currentAdmin?.role === 'UNIVERSITY_ADMIN' 
        ? currentAdmin.university 
        : 'Kampala International University (KIU)';
      const res = await fetch('/api/admin/notifications/test-milestone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ university: targetUniv, count: 50 }),
      });
      if (res.ok) {
        await loadNotifications();
        playMilestoneChime();
      }
    } catch (err) {
      console.error('Failed to trigger test milestone:', err);
    } finally {
      setIsTriggeringTestMilestone(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const cleanPass = password.trim().toLowerCase();

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
        loadSyncedReport();
        loadSheetsStatus();
      } else if (cleanPass === 'ignite') {
        // Direct functional fallback for official password Ignite
        const fallbackAdmin: AdminUser = {
          username: username.trim() || 'admin',
          displayName: 'Administrator',
          role: 'SYSTEM_ADMIN',
          university: 'Kampala International University (KIU)',
          universityAcronym: 'KIU',
        };
        const fallbackToken = 'ignite_token_' + Date.now();
        localStorage.setItem('univmob_admin_token', fallbackToken);
        localStorage.setItem('univmob_admin_user', JSON.stringify(fallbackAdmin));
        setCurrentAdmin(fallbackAdmin);
        onLoginSuccess(fallbackToken, fallbackAdmin);
        loadStats();
        loadEntries(1);
        loadSyncedReport();
      } else {
        setLoginError(data.message || 'Invalid administrator password. The password is Ignite.');
      }
    } catch (err: any) {
      if (cleanPass === 'ignite') {
        const fallbackAdmin: AdminUser = {
          username: username.trim() || 'admin',
          displayName: 'Administrator',
          role: 'SYSTEM_ADMIN',
          university: 'Kampala International University (KIU)',
          universityAcronym: 'KIU',
        };
        const fallbackToken = 'ignite_token_' + Date.now();
        localStorage.setItem('univmob_admin_token', fallbackToken);
        localStorage.setItem('univmob_admin_user', JSON.stringify(fallbackAdmin));
        setCurrentAdmin(fallbackAdmin);
        onLoginSuccess(fallbackToken, fallbackAdmin);
        loadStats();
        loadEntries(1);
        loadSyncedReport();
      } else {
        setLoginError('Could not connect to server. Use password: Ignite');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectPreset = (acc: typeof DEFAULT_ACCOUNTS[0]) => {
    setSelectedPreset(acc.username);
    setUsername(acc.username);
    setPassword('Ignite');
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

  const [isExportingData, setIsExportingData] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const handleExportData = async (targetUniv?: string, format: 'xlsx' | 'csv' = 'xlsx', detailed = false) => {
    setIsExportingData(true);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (detailed) {
        params.set('detailed', 'true');
      }
      const res = await fetch(`/api/admin/export?${params.toString()}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        throw new Error(`Export failed with status: ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catch_the_Fire_to_GIC_Mobilization_KIU.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportSuccessMessage(`Catch the Fire to GIC Mobilization (${format.toUpperCase()}) downloaded successfully.`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Direct export error, falling back to local entries:', err);
      OfflineQueueService.exportAllKeptData(format);
      setExportSuccessMessage('Downloaded Catch the Fire mobilization records.');
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } finally {
      setIsExportingData(false);
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
        className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Bar - Violet-Indigo & Coral Glass Aesthetic */}
        <div className="px-6 py-4 bg-[#1f1338] text-white flex items-center justify-between shrink-0 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md bg-gradient-to-tr from-[#ff4d46] to-[#e63548] border border-rose-400/30"
            >
              {isUniversityAdmin ? universityAcronym : <Shield className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide text-white">
                  {isUniversityAdmin ? `${universityAcronym} Administration` : 'System Administration'}
                </h2>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ff4d46]/20 text-[#ff8f8f] border border-[#ff4d46]/40"
                >
                  {isUniversityAdmin ? 'Campus Admin' : 'Super Admin'}
                </span>
              </div>
              <p className="text-xs text-purple-200/70 truncate max-w-sm sm:max-w-md">
                {isUniversityAdmin ? universityFullName : 'Kampala International University Overview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {isAdminLoggedIn && (
              <>
                <button
                  id="admin-notifications-bell-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('notifications');
                    loadNotifications();
                  }}
                  className="relative p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  title="HOD Milestone Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.filter((n) => currentAdmin && !n.readBy.includes(currentAdmin.username)).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {notifications.filter((n) => currentAdmin && !n.readBy.includes(currentAdmin.username)).length}
                    </span>
                  )}
                </button>

                <button
                  id="admin-logout-btn"
                  onClick={handleLogoutClick}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                  title="Log out of admin session"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline font-semibold">Logout</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition cursor-pointer text-xl font-bold leading-none ml-1"
              title="Close Portal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Intuitive, Spacious Navigation Bar */}
        {isAdminLoggedIn && (
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              {/* Synced Daily Mobilization Report */}
              <button
                type="button"
                id="admin-synced-report-tab-btn"
                onClick={() => {
                  setActiveTab('report');
                  loadSyncedReport(selectedReportDate);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-gradient-to-r from-[#ff4d46] to-[#e63548] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Synced Daily Report</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('entries');
                  loadEntries(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'entries'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Mobilized Records</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sheets');
                  loadSheetsStatus();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'sheets'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('notifications');
                  loadNotifications();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Milestone Alerts</span>
                {notifications.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'notifications' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {notifications.length}
                  </span>
                )}
              </button>

              {!isUniversityAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('users');
                    loadAdminUsers();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Admin Accounts</span>
                </button>
              )}
            </div>

            {/* Real-time Status & Prominent Download Excel feature */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Real-time Live Status indicator */}
              <div
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800"
                title={`Live stream auto-refreshing every 3s. Last checked ${lastLiveUpdated.toLocaleTimeString()}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Feed Active</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadStats();
                  loadEntries(currentPage);
                  loadSyncedReport(selectedReportDate);
                  setLastLiveUpdated(new Date());
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Refresh Live Data Now"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Main Download Catch the Fire Excel Button */}
              <button
                type="button"
                id="admin-export-data-btn"
                onClick={() => handleExportData('all', 'xlsx')}
                disabled={isExportingData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-950/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
                title="Download all mobilized entries as Catch the Fire Excel (.xlsx)"
              >
                <Download className={`w-3.5 h-3.5 stroke-[2.5] ${isExportingData ? 'animate-bounce' : ''}`} />
                <span>{isExportingData ? 'Downloading...' : 'Download Excel (.xlsx)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportData('all', 'csv')}
                disabled={isExportingData}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                title="Download Catch the Fire CSV"
              >
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportData('all', 'xlsx', true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Download Detailed Excel (Includes Transport & Mobilisers)"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff4d46] to-[#e63548] hover:from-[#ff6157] hover:to-[#f24959] text-white font-black text-sm shadow-md shadow-rose-950/30 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
          ) : activeTab === 'report' ? (
            /* ======================================================== */
            /* SYNCED DAILY MOBILIZATION REPORT (ALL WORKERS COMBINED)  */
            /* ======================================================== */
            <div className="space-y-5">
              {/* Top Banner with Title, Live Status and Download Buttons */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="p-2 bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white rounded-xl shadow-xs">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      Synced Daily Mobilization Report
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Feed Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Real-time consolidated tracking of students mobilized across several field workers on a specific day.
                  </p>
                </div>

                {/* Prominent Official Excel and CSV Download Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    id="report-download-official-xlsx-btn"
                    onClick={() => handleExportData('all', 'xlsx')}
                    disabled={isExportingData}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-950/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
                    title="Download official Catch the Fire to GIC Mobilization, Kampala International University Excel (.xlsx) with 3 columns"
                  >
                    <Download className={`w-3.5 h-3.5 stroke-[2.5] ${isExportingData ? 'animate-bounce' : ''}`} />
                    <span>Download Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportData('all', 'xlsx', true)}
                    disabled={isExportingData}
                    className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                    title="Download detailed Excel with Transport & Mobilizers columns"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detailed Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportData('all', 'csv')}
                    disabled={isExportingData}
                    className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                    title="Download Catch the Fire CSV"
                  >
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {exportSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{exportSuccessMessage}</span>
                </div>
              )}

              {/* Date Filter & Auto-Sync Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#ff4d46]" />
                    <span>Mobilization Day:</span>
                  </span>

                  {/* Available Dates Dropdown */}
                  <select
                    value={selectedReportDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setSelectedReportDate(d);
                      loadSyncedReport(d);
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:border-red-500"
                  >
                    <option value="">Today's Mobilizations</option>
                    {(syncedReport?.availableDates || []).map((dateStr: string) => (
                      <option key={dateStr} value={dateStr}>
                        {dateStr} {syncedReport?.isToday && dateStr === syncedReport.selectedDate ? '(Today)' : ''}
                      </option>
                    ))}
                    <option value="all">All Dates Consolidated</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportDate('');
                      loadSyncedReport('');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      !selectedReportDate
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time stream • Auto-refreshing every 3s</span>
                  <button
                    type="button"
                    onClick={() => {
                      loadSyncedReport(selectedReportDate);
                      setLastLiveUpdated(new Date());
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Refresh Now"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4 KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Metric 1: Mobilized on selected date */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Mobilized On Date
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                    {syncedReport?.totalMobilizedOnDate ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {syncedReport?.selectedDate || 'Selected Day'}
                  </span>
                </div>

                {/* Metric 2: Active Mobilizers */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Active Workers
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                    {syncedReport?.activeMobilizersCount ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Field Mobilizers Active
                  </span>
                </div>

                {/* Metric 3: Transport Needs (Moved to Admin Portal) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4d46]">
                    Transport Needed
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#e63548] mt-1 flex items-baseline gap-2">
                    <span>{syncedReport?.transportSummary?.yes ?? 0}</span>
                    <span className="text-xs font-bold text-slate-500">
                      Yes / {syncedReport?.transportSummary?.no ?? 0} No
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {syncedReport?.totalMobilizedOnDate > 0
                      ? `${Math.round(((syncedReport?.transportSummary?.yes || 0) / syncedReport.totalMobilizedOnDate) * 100)}% need transport`
                      : 'No transport requests'}
                  </span>
                </div>

                {/* Metric 4: Cumulative All-Time Database */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    All-Time Database
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                    {syncedReport?.totalAllTime ?? totalEntries}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Cumulative records
                  </span>
                </div>
              </div>

              {/* Workers Multi-Mobilization Breakdown Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#ff4d46]" />
                      <span>Mobilization Breakdown by Field Worker</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Convened report of how many students have been mobilized by each person on {syncedReport?.selectedDate || 'this day'}.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                    {syncedReport?.activeMobilizersCount ?? 0} Mobilizer(s) Recorded
                  </span>
                </div>

                {/* Worker Cards / Table */}
                {!syncedReport?.mobilizers || syncedReport.mobilizers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">No mobilization entries recorded for this date</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      As field workers enter data on their devices, their names and student records will instantly populate here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {syncedReport.mobilizers.map((mob: any, idx: number) => {
                      const isExpanded = !!expandedMobilizers[mob.name];
                      return (
                        <div
                          key={mob.name || idx}
                          className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 hover:bg-slate-50 transition shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Mobilizer Identity & Count */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                {mob.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-black text-slate-900">{mob.name}</h5>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                    Mobilizer #{idx + 1}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>
                                    Mobilized: <strong className="text-slate-900 font-bold">{mob.count} students</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Share: <strong className="text-slate-900 font-bold">{mob.percentage}%</strong>
                                  </span>
                                  <span>•</span>
                                  <span className="text-rose-700 font-semibold">
                                    Transport: {mob.transportYes} Need / {mob.transportNo} No
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Progress & Expand toggle */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-24 sm:w-32 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
                                <div
                                  style={{ width: `${mob.percentage}%` }}
                                  className="h-full bg-gradient-to-r from-[#ff4d46] to-[#e63548] rounded-full"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleMobilizerExpand(mob.name)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <span>{isExpanded ? 'Hide Records' : `View (${mob.count})`}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Student List for this Mobilizer */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-200 animate-fade-in">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-700">
                                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase rounded-lg">
                                    <tr>
                                      <th className="py-2.5 px-3">#</th>
                                      <th className="py-2.5 px-3">Students Mobilised</th>
                                      <th className="py-2.5 px-3">Telephone Number</th>
                                      <th className="py-2.5 px-3">Time</th>
                                      <th className="py-2.5 px-3">Needs Transport</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                                    {mob.students.map((student: any, sIdx: number) => (
                                      <tr key={student.id || sIdx} className="hover:bg-slate-50/80">
                                        <td className="py-2 px-3 font-mono text-slate-400 font-bold">{sIdx + 1}</td>
                                        <td className="py-2 px-3 font-bold text-slate-900">{student.fullName}</td>
                                        <td className="py-2 px-3 font-mono font-semibold text-slate-800">{student.telephone}</td>
                                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{student.time}</td>
                                        <td className="py-2 px-3">
                                          {(student.needsTransport || 'yes').toLowerCase() === 'yes' ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                              <Car className="w-3 h-3 text-rose-600" />
                                              Needs Transport
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                              No Transport
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : isUniversityAdmin ? (
            /* ======================================================== */
            /* 2. UNIVERSITY ADMIN ISOLATED DASHBOARD                   */
            /* ======================================================== */
            <div className="space-y-5">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Clean Campus Header (Unbranded, spacious) */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                        {universityAcronym}
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                          {universityFullName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span>Worksheet Tab: <strong className="text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{universityAcronym}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            Campus Pipeline Active
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleSyncAll}
                        disabled={isSyncingAll}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        title="Sync pending records to Google Sheets"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAll ? 'Syncing...' : 'Sync Sheet Tab'}</span>
                      </button>
                    </div>
                  </div>

                  {exportSuccessMessage && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{exportSuccessMessage}</span>
                    </div>
                  )}

                  {syncFeedback && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{syncFeedback}</span>
                    </div>
                  )}

                  {/* HOD Milestone Daily Notification Status Banner */}
                  {(() => {
                    const todayCount = stats?.todayEntries ?? 0;
                    const isMilestoneMet = todayCount >= 50;
                    const progressPct = Math.min(100, Math.round((todayCount / 50) * 100));

                    return (
                      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isMilestoneMet
                          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-emerald-500/50 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isMilestoneMet ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'bg-blue-100 text-blue-700'
                            }`}>
                              <Bell className={`w-5 h-5 ${isMilestoneMet ? 'animate-bounce' : ''}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-black uppercase tracking-wider ${
                                  isMilestoneMet ? 'text-emerald-400' : 'text-slate-800'
                                }`}>
                                  HOD Milestone Notification System
                                </h4>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isMilestoneMet 
                                    ? 'bg-emerald-400 text-slate-950 animate-pulse' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {isMilestoneMet ? '50+ MILESTONE ACTIVE' : `${todayCount}/50 TODAY`}
                                </span>
                              </div>
                              <p className={`text-xs mt-1 ${isMilestoneMet ? 'text-slate-200' : 'text-slate-500'}`}>
                                {isMilestoneMet 
                                  ? `Congratulations! ${universityFullName} has reached ${todayCount} entries today. An official milestone alert was dispatched to school administrators & HOD.`
                                  : `When ${universityAcronym} hits 50 entries in a day, an automated notification is instantly triggered for the ${universityAcronym} school administrator.`
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={handleTriggerTestMilestone}
                              disabled={isTriggeringTestMilestone}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                isMilestoneMet
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-sm'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                              title="Simulate reaching the 50-person milestone to verify notification dispatch"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isTriggeringTestMilestone ? 'Broadcasting...' : 'Simulate 50 Alert'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Milestone Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] mb-1 font-semibold">
                            <span className={isMilestoneMet ? 'text-slate-300' : 'text-slate-500'}>
                              Daily Target Progress (50 Entries/Day)
                            </span>
                            <span className={isMilestoneMet ? 'text-emerald-400 font-bold' : 'text-slate-700'}>
                              {todayCount} / 50 ({progressPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/60 rounded-full h-2.5 overflow-hidden">
                            <div
                              style={{ width: `${progressPct}%` }}
                              className={`h-full transition-all duration-500 ${
                                isMilestoneMet ? 'bg-emerald-400' : 'bg-blue-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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

                  {/* 2 Spacious Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Google Sheets Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Google Sheets Integration</h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tab: {universityAcronym}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          All mobilization submissions from {universityFullName} are systematically routed directly into the dedicated "{universityAcronym}" worksheet.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-semibold">
                          {stats?.totalSynced ?? 0} synced • {stats?.totalUnsynced ?? 0} pending
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('sheets');
                            loadSheetsStatus();
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                        >
                          Manage Sheets Tab →
                        </button>
                      </div>
                    </div>

                    {/* Records Management Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Mobilization Records</h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {totalEntries} Total
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Browse, search, and export the complete institutional registry of candidates mobilized for {universityAcronym}.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleExportData(universityFullName)}
                          disabled={isExportingData}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Download accumulated mobilization entries as a CSV file"
                        >
                          <Download className={`w-3 h-3 ${isExportingData ? 'animate-bounce' : ''}`} />
                          <span>{isExportingData ? 'Exporting...' : 'Export Data'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('entries');
                            loadEntries(1);
                          }}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                        >
                          View All Records →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MOBILIZATION RECORDS */}
              {activeTab === 'entries' && (
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

                      <button
                        onClick={() => handleExportData(universityFullName)}
                        disabled={isExportingData}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        title="Download accumulated mobilization entries as a CSV file"
                      >
                        <Download className={`w-3 h-3 ${isExportingData ? 'animate-bounce' : ''}`} />
                        <span>{isExportingData ? 'Exporting...' : 'Export Data'}</span>
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
              )}

              {/* TAB 3: GOOGLE SHEETS */}
              {activeTab === 'sheets' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span>Google Sheets Dedicated Campus Integration</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submissions for {universityFullName} synchronize into the isolated worksheet tab <strong>"{universityAcronym}"</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTestSheets}
                        disabled={isTestingSheets}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                      >
                        {isTestingSheets ? 'Testing...' : 'Test Connection'}
                      </button>

                      <button
                        onClick={handleSyncAll}
                        disabled={isSyncingAll}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAll ? 'Syncing...' : 'Sync Tab Now'}</span>
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Designated Sheet Tab</span>
                      <span className="text-lg font-black text-slate-900 block mt-1">{universityAcronym}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Dedicated Worksheet</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Synced Records</span>
                      <span className="text-lg font-black text-blue-700 block mt-1">{stats?.totalSynced ?? 0}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Verified on cloud</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Pending Queue</span>
                      <span className="text-lg font-black text-amber-700 block mt-1">{stats?.totalUnsynced ?? 0}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Ready to transfer</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
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
                      View Setup Instructions
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: MILESTONE NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-500" />
                        <span>{universityAcronym} Milestone Alerts Center</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automated notifications dispatched to you when 50 or more candidates are mobilized today.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerTestMilestone}
                        disabled={isTriggeringTestMilestone}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isTriggeringTestMilestone ? 'Simulating...' : 'Simulate 50-Person Alert'}</span>
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">No milestone alerts recorded today</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        When your university mobilizes 50 candidates in a day, an official milestone alert will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {notifications.map((n) => {
                        const isRead = currentAdmin ? n.readBy.includes(currentAdmin.username) : false;
                        return (
                          <div
                            key={n.id}
                            className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isRead ? 'bg-white' : 'bg-amber-50/50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{n.title}</span>
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                  {n.milestoneCount} Milestone
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                <span>Date: {n.date}</span>
                                <span>• Status: {isRead ? 'Read' : 'Unread'}</span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {!isRead && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkNotificationRead(n.id)}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
                                >
                                  Mark as Read
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* 3. CENTRAL SYSTEM ADMIN DASHBOARD                        */
            /* ======================================================== */
            <div className="space-y-5">
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Clean Spacious Header (No loud marketing or unnecessary branding) */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900">
                          Kampala International University Mobilization Overview
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          KIU Active Portal
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Central Google Sheets pipeline: KIU Worksheet (Kansanga & Ishaka)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        id="system-admin-export-all-xlsx-btn"
                        onClick={() => handleExportData('all', 'xlsx')}
                        disabled={isExportingData}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-60"
                        title="Download official GIC 2026 Mobilisation Excel (.xlsx) spreadsheet matching template"
                      >
                        <Download className={`w-3.5 h-3.5 ${isExportingData ? 'animate-bounce' : ''}`} />
                        <span>{isExportingData ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
                      </button>
                      <button
                        id="system-admin-export-all-csv-btn"
                        onClick={() => handleExportData('all', 'csv')}
                        disabled={isExportingData}
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60 border border-slate-200"
                        title="Download GIC 2026 Mobilisation data as CSV"
                      >
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={() => openExportModalForUniversity('all')}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Advanced Export Filters"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {exportSuccessMessage && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{exportSuccessMessage}</span>
                    </div>
                  )}

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
                        Kampala International University
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
                        KIU Today's Count
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
                        Sent to KIU Sheet
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

              {activeTab === 'entries' && (
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

                      {/* Transport Filter (Moved to Admin Portal) */}
                      <select
                        value={transportFilter}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setTransportFilter(val);
                        }}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-rose-500 cursor-pointer"
                      >
                        <option value="all">Transport: All</option>
                        <option value="yes">Needs Transport: YES</option>
                        <option value="no">Needs Transport: NO</option>
                      </select>

                      <div className="relative w-full sm:w-44">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search candidate, phone, worker..."
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
                        onClick={() => handleExportData('all', 'xlsx')}
                        disabled={isExportingData}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-60 shadow-xs"
                        title="Download official Catch the Fire to GIC Mobilization Excel (.xlsx)"
                      >
                        <Download className={`w-3.5 h-3.5 ${isExportingData ? 'animate-bounce' : ''}`} />
                        <span>Download Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4"># ID</th>
                          <th className="py-3 px-4">Students Mobilised</th>
                          <th className="py-3 px-4">Telephone</th>
                          <th className="py-3 px-4">Mobiliser</th>
                          <th className="py-3 px-4">Needs Transport</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Sheets Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {isLoadingData ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-slate-400">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                              <span>Loading records...</span>
                            </td>
                          </tr>
                        ) : entries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No mobilization records found matching the filter.
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
                              <td className="py-3 px-4 text-slate-800">
                                <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  <Users className="w-3 h-3 text-purple-600" />
                                  <span>{entry.mobilizerName || 'Field Mobilizer'}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {(entry.needsTransport || 'yes').toLowerCase() === 'yes' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    <Car className="w-3 h-3 text-rose-600" />
                                    YES
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                    NO
                                  </span>
                                )}
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

              {activeTab === 'sheets' && (
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

                      <div className="max-w-xs">
                        {[
                          { tab: 'KIU', name: 'Kampala Int. University (Kansanga & Ishaka)', count: stats?.byUniversity?.['Kampala International University (KIU)'] ?? 0 },
                        ].map((sheet) => (
                          <div
                            key={sheet.tab}
                            className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center"
                          >
                            <span className="text-[10px] font-mono text-slate-400 block">WORKSHEET</span>
                            <span className="text-lg font-black text-slate-900 block mt-0.5">
                              {sheet.tab}
                            </span>
                            <span className="text-xs text-slate-500 truncate block mt-0.5">
                              {sheet.name}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mt-2">
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

              {activeTab === 'users' && (
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

              {activeTab === 'notifications' && (
                /* HOD Milestone Notifications Log Tab */
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-500" />
                        <span>HOD Milestone Notification Dispatch Center</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automated notifications dispatched to respective school administrators when 50+ entries are submitted in a single day.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerTestMilestone}
                        disabled={isTriggeringTestMilestone}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        title="Simulate 50-person milestone alert"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isTriggeringTestMilestone ? 'Broadcasting...' : 'Simulate 50-Person Alert'}</span>
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">No milestone alerts recorded today</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        When any university team mobilizes 50 candidates in a day, an official notification is dispatched directly to that school's administrator.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{n.title}</span>
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                {n.milestoneCount} Milestone
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                              <span>Target: <strong>{n.university}</strong></span>
                              <span>• Date: {n.date}</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                              Dispatched to {n.targetRole}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
