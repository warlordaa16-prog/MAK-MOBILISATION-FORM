import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator, 
  RefreshCw, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Bell, 
  Target, 
  Sparkles, 
  Layers,
  DoorOpen,
  Home,
  GraduationCap,
  Users,
  UserCheck,
  Share2,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Wifi,
  WifiOff,
  Zap,
  GitBranch,
  FileText
} from 'lucide-react';
import { 
  UniversityName, 
  UNIVERSITIES, 
  DataSummationSummary, 
  MobilizationEntry, 
  SchoolSummationTier,
  MOBILIZATION_METHODS
} from '../types';
import { OfflineQueueService } from '../services/offlineQueue';

interface DataSummationProps {
  selectedUniversity?: UniversityName | null;
  onSelectUniversity?: (univ: UniversityName) => void;
  sessionCount?: number;
  lastSavedEntry?: MobilizationEntry | null;
  className?: string;
}

export type SummationMethodType = 
  | 'outreach-method' 
  | 'intake-channel' 
  | 'shift-period' 
  | 'storage-sync' 
  | 'milestone-target';

// Campus color tokens for individual school summation tiers
const CAMPUS_TIER_THEMES: Record<string, {
  bg: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  accentBar: string;
  progressFill: string;
  activeBorder: string;
  dotColor: string;
}> = {
  'Kampala International University (KIU)': {
    bg: 'bg-emerald-950/20',
    badgeBg: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60',
    badgeText: 'text-emerald-300',
    border: 'border-emerald-800/40',
    accentBar: 'bg-emerald-500',
    progressFill: 'bg-emerald-500',
    activeBorder: 'ring-2 ring-emerald-500 border-emerald-500',
    dotColor: '#10b981',
  },
  'Cavendish University Uganda': {
    bg: 'bg-blue-950/20',
    badgeBg: 'bg-blue-900/60 text-blue-300 border border-blue-700/60',
    badgeText: 'text-blue-300',
    border: 'border-blue-800/40',
    accentBar: 'bg-blue-500',
    progressFill: 'bg-blue-500',
    activeBorder: 'ring-2 ring-blue-500 border-blue-500',
    dotColor: '#3b82f6',
  },
  'International University of East Africa (IUEA)': {
    bg: 'bg-purple-950/20',
    badgeBg: 'bg-purple-900/60 text-purple-300 border border-purple-700/60',
    badgeText: 'text-purple-300',
    border: 'border-purple-800/40',
    accentBar: 'bg-purple-500',
    progressFill: 'bg-purple-500',
    activeBorder: 'ring-2 ring-purple-500 border-purple-500',
    dotColor: '#a855f7',
  },
  'Clarke International University (CIU)': {
    bg: 'bg-amber-950/20',
    badgeBg: 'bg-amber-900/60 text-amber-300 border border-amber-700/60',
    badgeText: 'text-amber-300',
    border: 'border-amber-800/40',
    accentBar: 'bg-amber-500',
    progressFill: 'bg-amber-500',
    activeBorder: 'ring-2 ring-amber-500 border-amber-500',
    dotColor: '#f59e0b',
  },
  'King Caesar University (KCU)': {
    bg: 'bg-rose-950/20',
    badgeBg: 'bg-rose-900/60 text-rose-300 border border-rose-700/60',
    badgeText: 'text-rose-300',
    border: 'border-rose-800/40',
    accentBar: 'bg-rose-500',
    progressFill: 'bg-rose-500',
    activeBorder: 'ring-2 ring-rose-500 border-rose-500',
    dotColor: '#f43f5e',
  },
};

export const DataSummation: React.FC<DataSummationProps> = ({
  selectedUniversity,
  onSelectUniversity,
  lastSavedEntry,
  className = '',
}) => {
  const [data, setData] = useState<DataSummationSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<string>(selectedUniversity || 'all');
  const [activeMethod, setActiveMethod] = useState<SummationMethodType>('outreach-method');
  const [showMobilizerRollup, setShowMobilizerRollup] = useState<boolean>(false);

  // Keep viewFilter synced if parent selectedUniversity changes
  useEffect(() => {
    if (selectedUniversity) {
      setViewFilter(selectedUniversity);
    }
  }, [selectedUniversity]);

  const fetchSummation = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const url = '/api/entries/summation';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
          const now = new Date();
          setLastUpdated(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch summation data:', err);
    } finally {
      setIsLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  // Initial fetch and auto-refresh on offline queue changes or incoming entry
  useEffect(() => {
    fetchSummation();
  }, [fetchSummation]);

  useEffect(() => {
    if (lastSavedEntry) {
      fetchSummation();
    }
  }, [lastSavedEntry, fetchSummation]);

  useEffect(() => {
    const unsub = OfflineQueueService.subscribe(() => {
      fetchSummation();
    });
    return () => unsub();
  }, [fetchSummation]);

  // Periodic 8s auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSummation();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchSummation]);

  // Merge server summation with current local offline queue to guarantee zero-loss accurate tallies
  const { schoolTiers, grandTotal, todayTotal, totalSynced, totalPending } = useMemo(() => {
    const queue = OfflineQueueService.getQueue();
    const offlineEntries = queue.map((q) => q.temporaryEntry);

    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const tiers: Record<string, SchoolSummationTier> = {};

    UNIVERSITIES.forEach((univ) => {
      const serverTier = data?.schoolTiers?.[univ.name];
      tiers[univ.name] = {
        university: univ.name,
        acronym: univ.acronym,
        totalSum: serverTier ? serverTier.totalSum : (data?.byUniversity?.[univ.name] || 0),
        todaySum: serverTier ? serverTier.todaySum : (data?.todayByUniversity?.[univ.name] || 0),
        syncedSum: serverTier?.syncedSum ?? 0,
        pendingSum: serverTier?.pendingSum ?? 0,
        byMobilizationMethod: { ...(serverTier?.byMobilizationMethod || {}) },
        byIntakeMethod: { ...(serverTier?.byIntakeMethod || {}) },
        byMobilizer: { ...(serverTier?.byMobilizer || {}) },
        dailyMilestoneProgress: 0,
        dailyMilestoneGoal: 50,
        milestonesAchievedToday: 0,
        lastEntryTime: serverTier?.lastEntryTime,
      };
    });

    let offlineGrand = 0;
    let offlineToday = 0;

    // Merge offline items per school
    offlineEntries.forEach((entry) => {
      offlineGrand++;
      const u = entry.university;
      if (u && tiers[u]) {
        tiers[u].totalSum++;
        tiers[u].pendingSum++;
        if (entry.date === todayStr) {
          tiers[u].todaySum++;
          offlineToday++;
        }

        const mobMethod = entry.mobilizationMethod || 'Campus Gate / Main Entrance';
        tiers[u].byMobilizationMethod = tiers[u].byMobilizationMethod || {};
        tiers[u].byMobilizationMethod[mobMethod] = (tiers[u].byMobilizationMethod[mobMethod] || 0) + 1;

        const intake = entry.intakeMethod || 'rapid-single';
        tiers[u].byIntakeMethod = tiers[u].byIntakeMethod || {};
        tiers[u].byIntakeMethod[intake] = (tiers[u].byIntakeMethod[intake] || 0) + 1;

        const mob = entry.mobilizerName || 'Field Mobilizer';
        tiers[u].byMobilizer = tiers[u].byMobilizer || {};
        tiers[u].byMobilizer[mob] = (tiers[u].byMobilizer[mob] || 0) + 1;
      }
    });

    // Compute progress towards 50 milestone for each school
    Object.values(tiers).forEach((tier) => {
      tier.dailyMilestoneProgress = tier.todaySum % 50;
      tier.milestonesAchievedToday = Math.floor(tier.todaySum / 50);
    });

    const totalGrand = (data?.grandTotal || 0) + offlineGrand;
    const totalT = (data?.todayTotal || 0) + offlineToday;
    const totalS = data?.totalSynced || 0;
    const totalP = (data?.totalPending || 0) + offlineGrand;

    return {
      schoolTiers: tiers,
      grandTotal: totalGrand,
      todayTotal: totalT,
      totalSynced: totalS,
      totalPending: totalP,
    };
  }, [data]);

  // Active university tier for scoped view
  const activeScopedTier = viewFilter !== 'all' ? schoolTiers[viewFilter] : null;

  // Render Method 1: Outreach Method Summation
  const renderOutreachMethodSummation = (tier?: SchoolSummationTier | null) => {
    // If a specific tier is passed, compute for that university; otherwise compute globally
    const counts: Record<string, number> = {};
    MOBILIZATION_METHODS.forEach((m) => {
      counts[m.name] = 0;
    });

    if (tier) {
      if (tier.byMobilizationMethod) {
        Object.entries(tier.byMobilizationMethod).forEach(([k, v]) => {
          counts[k] = (counts[k] || 0) + (v as number);
        });
      }
    } else {
      // Sum all schools
      (Object.values(schoolTiers) as SchoolSummationTier[]).forEach((t) => {
        if (t.byMobilizationMethod) {
          Object.entries(t.byMobilizationMethod).forEach(([k, v]) => {
            counts[k] = (counts[k] || 0) + (v as number);
          });
        }
      });
    }

    const totalForScope = tier ? tier.totalSum : grandTotal;

    const methodMeta = [
      { name: 'Campus Gate / Main Entrance', short: 'Gate Booth', icon: DoorOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
      { name: 'Door-to-Door / Hostel Outreach', short: 'Hostel Outreach', icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
      { name: 'Lecture Hall / Class Visitation', short: 'Class Visitation', icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
      { name: 'Fellowship / Evening Rally', short: 'Fellowship / Rally', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
      { name: 'One-on-One Peer Outreach', short: 'One-on-One Peer', icon: UserCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
      { name: 'Digital / WhatsApp Referral', short: 'Digital Referral', icon: Share2, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
    ];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1 border-b border-cyan-950/60">
          <span>OUTREACH MOBILIZATION METHOD</span>
          <span>TALLY / % OF UNIVERSITY TOTAL</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {methodMeta.map((m) => {
            const count = counts[m.name] || 0;
            const pct = totalForScope > 0 ? Math.round((count / totalForScope) * 100) : 0;
            const Icon = m.icon;

            return (
              <div
                key={m.name}
                className={`p-3 rounded-xl border ${m.bg} flex flex-col justify-between space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs font-mono font-bold text-white">
                      {m.short}
                    </span>
                  </div>
                  <span className={`text-base font-mono font-black ${m.color}`}>
                    {count}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Share of contacts</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Method 2: Intake Channel Summation
  const renderIntakeChannelSummation = (tier?: SchoolSummationTier | null) => {
    const counts: Record<string, number> = {
      'rapid-single': 0,
      'multi-part': 0,
      'batch-roster': 0,
      'offline-buffer': 0,
    };

    if (tier) {
      if (tier.byIntakeMethod) {
        Object.entries(tier.byIntakeMethod).forEach(([k, v]) => {
          counts[k] = (counts[k] || 0) + (v as number);
        });
      }
    } else {
      (Object.values(schoolTiers) as SchoolSummationTier[]).forEach((t) => {
        if (t.byIntakeMethod) {
          Object.entries(t.byIntakeMethod).forEach(([k, v]) => {
            counts[k] = (counts[k] || 0) + (v as number);
          });
        }
      });
    }

    const totalForScope = tier ? tier.totalSum : grandTotal;

    const channels = [
      {
        id: 'rapid-single',
        label: 'Rapid Single Terminal',
        description: 'Single field mobile intake with instant validation',
        icon: Zap,
        count: counts['rapid-single'] || 0,
        color: 'text-amber-400',
        border: 'border-amber-500/40 bg-amber-500/10',
      },
      {
        id: 'multi-part',
        label: 'Multi-Station Concurrent Intake',
        description: 'Simultaneous multi-station ingest across stations',
        icon: GitBranch,
        count: counts['multi-part'] || 0,
        color: 'text-cyan-400',
        border: 'border-cyan-500/40 bg-cyan-500/10',
      },
      {
        id: 'batch-roster',
        label: 'Batch Roster Import',
        description: 'Consolidated list and roster batch intake',
        icon: FileSpreadsheet,
        count: counts['batch-roster'] || 0,
        color: 'text-purple-400',
        border: 'border-purple-500/40 bg-purple-500/10',
      },
      {
        id: 'offline-buffer',
        label: 'Offline-Kept Local Buffer',
        description: 'Saved on device during low-connectivity and synced',
        icon: ShieldCheck,
        count: counts['offline-buffer'] || 0,
        color: 'text-emerald-400',
        border: 'border-emerald-500/40 bg-emerald-500/10',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {channels.map((ch) => {
          const pct = totalForScope > 0 ? Math.round((ch.count / totalForScope) * 100) : 0;
          const Icon = ch.icon;
          return (
            <div
              key={ch.id}
              className={`p-3.5 rounded-2xl border ${ch.border} flex items-center justify-between gap-3`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
                  <Icon className={`w-4 h-4 ${ch.color}`} />
                </div>
                <div>
                  <h5 className="text-xs font-mono font-bold text-white">
                    {ch.label}
                  </h5>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {ch.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono text-cyan-300">
                      {pct}% of university data
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-black text-white">
                  {ch.count}
                </span>
                <span className="block text-[10px] font-mono text-slate-400">
                  contacts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Method 3: Temporal Shift Summation
  const renderTemporalShiftSummation = (tier?: SchoolSummationTier | null) => {
    const today = tier ? tier.todaySum : todayTotal;
    const allTime = tier ? tier.totalSum : grandTotal;
    const historical = Math.max(0, allTime - today);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Calendar className="w-4 h-4" />
            <span>TODAY'S SHIFT SUM</span>
          </div>
          <div className="mt-2 text-3xl font-mono font-black text-emerald-300">
            +{today}
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Registered during active shift today
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
            <Clock className="w-4 h-4" />
            <span>PREVIOUS SESSIONS SUM</span>
          </div>
          <div className="mt-2 text-3xl font-mono font-black text-blue-300">
            {historical}
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Safely retained historical records
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Calculator className="w-4 h-4" />
            <span>TOTAL AGGREGATE SUM</span>
          </div>
          <div className="mt-2 text-3xl font-mono font-black text-white">
            {allTime}
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Cumulative unified student registrations
          </p>
        </div>
      </div>
    );
  };

  // Render Method 4: Storage & Sync Summation
  const renderStorageSyncSummation = (tier?: SchoolSummationTier | null) => {
    const synced = tier ? tier.syncedSum : totalSynced;
    const pending = tier ? tier.pendingSum : totalPending;
    const total = tier ? tier.totalSum : grandTotal;
    const syncPct = total > 0 ? Math.round((synced / total) * 100) : 100;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>GOOGLE SHEETS SYNCED</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Pushed to official dedicated university tab
              </p>
            </div>
            <span className="text-3xl font-mono font-black text-emerald-400">
              {synced}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-800/50 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>PERSISTENT LOCAL SAFE-KEEP</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Stored safely in browser storage & offline outbox
              </p>
            </div>
            <span className="text-3xl font-mono font-black text-amber-400">
              {pending}
            </span>
          </div>
        </div>

        {/* Sync Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-900/50 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-300">Persistence Health & Cloud Sync Ratio:</span>
            <span className="text-cyan-400 font-bold">{syncPct}% Synced ({synced} of {total})</span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-cyan-900/40">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${syncPct}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            * All records are immediately written to atomic disk storage and local memory to prevent any data loss.
          </p>
        </div>
      </div>
    );
  };

  // Render Method 5: Milestone Target Quota Summation
  const renderMilestoneSummation = (tier?: SchoolSummationTier | null) => {
    const today = tier ? tier.todaySum : todayTotal;
    const progress = today % 50;
    const achieved = Math.floor(today / 50);
    const needed = 50 - progress;

    return (
      <div className="p-4 rounded-2xl bg-[#091522] border border-cyan-800/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <h5 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Daily 50-Participant Quota Tracker
              </h5>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Head of Delegation threshold notification triggered every 50 registrations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {achieved} Milestones Achieved Today
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{progress}</span>
              <span className="text-sm text-slate-400">/ 50 contacts</span>
            </div>
            <span className="text-xs text-cyan-400 font-bold">
              {needed === 50 ? 'Next cycle starting' : `${needed} more needed to trigger HOD notification`}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${(progress / 50) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative w-full rounded-3xl bg-[#080e18] border border-cyan-900/50 p-4 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5 ${className}`}>
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-950/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-950/90 border border-cyan-700/60 text-cyan-400 shadow-inner">
            <Calculator className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider">
                University Multi-Method Summation
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                UNIFIED ENGINE
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Sums all data entered irrespective of mobilizer • Differentiated by specific mobilization methods
            </p>
          </div>
        </div>

        {/* Action Controls: Refresh and Keep Data Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => OfflineQueueService.exportAllKeptData('csv')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-800/60 text-cyan-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            title="Download all stored data kept safely (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Kept Data (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => fetchSummation(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-900 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Refresh live sums"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* University Selector Pills (Campus Focus) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/80 rounded-2xl border border-cyan-950">
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 px-1">
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>SCOPE UNIVERSITY:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
              viewFilter === 'all'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            All 5 Universities ({grandTotal})
          </button>

          {UNIVERSITIES.map((univ) => {
            const isSelected = viewFilter === univ.name;
            const tier = schoolTiers[univ.name];
            const sum = tier ? tier.totalSum : 0;
            return (
              <button
                key={univ.id}
                type="button"
                onClick={() => {
                  setViewFilter(univ.name);
                  if (onSelectUniversity) onSelectUniversity(univ.name);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span>{univ.acronym}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-black' : 'bg-slate-800 text-cyan-400'}`}>
                  {sum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero University Summary Card */}
      {viewFilter !== 'all' && activeScopedTier ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#091829] to-[#0a121c] border border-cyan-700/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-md bg-cyan-400 text-black">
                  {activeScopedTier.acronym}
                </span>
                <h4 className="text-sm font-mono font-bold text-white">
                  {activeScopedTier.university}
                </h4>
              </div>
              <p className="text-[11px] font-mono text-cyan-300/80 mt-1">
                ✓ Irrespective of who entered the data, all records under {activeScopedTier.acronym} are unified here.
              </p>
            </div>

            <div className="flex items-baseline gap-4 font-mono">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Total School Sum</span>
                <span className="text-3xl font-extrabold text-white">{activeScopedTier.totalSum}</span>
              </div>
              <div className="text-right border-l border-cyan-900/80 pl-4">
                <span className="text-[10px] text-emerald-400 uppercase block">Today's Shift</span>
                <span className="text-3xl font-extrabold text-emerald-400">+{activeScopedTier.todaySum}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#091522] border border-cyan-900/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-mono font-bold text-white">
              All 5 Partner Universities Combined
            </h4>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Consolidated data pooling across KIU, CUU, IUEA, CIU, and KCU
            </p>
          </div>
          <div className="flex items-baseline gap-4 font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Grand Unified Total</span>
              <span className="text-3xl font-extrabold text-white">{grandTotal}</span>
            </div>
            <div className="text-right border-l border-cyan-900/80 pl-4">
              <span className="text-[10px] text-emerald-400 uppercase block">All Today</span>
              <span className="text-3xl font-extrabold text-emerald-400">+{todayTotal}</span>
            </div>
          </div>
        </div>
      )}

      {/* METHOD SELECTOR TABS: "The summations should be done differently under those specific methods" */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SELECT SUMMATION METHOD:</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Differentiated aggregations under {viewFilter === 'all' ? 'All Institutions' : viewFilter}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-950/90 rounded-2xl border border-cyan-950">
          <button
            type="button"
            onClick={() => setActiveMethod('outreach-method')}
            className={`p-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
              activeMethod === 'outreach-method'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span className="text-[11px] text-center">Outreach Method</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('intake-channel')}
            className={`p-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
              activeMethod === 'intake-channel'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span className="text-[11px] text-center">Intake Channel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('shift-period')}
            className={`p-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
              activeMethod === 'shift-period'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-[11px] text-center">Shift / Time</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('storage-sync')}
            className={`p-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
              activeMethod === 'storage-sync'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] text-center">Storage & Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('milestone-target')}
            className={`p-2 rounded-xl text-xs font-mono font-semibold transition cursor-pointer flex flex-col items-center gap-1 col-span-2 sm:col-span-1 ${
              activeMethod === 'milestone-target'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="text-[11px] text-center">50-Daily Quota</span>
          </button>
        </div>

        {/* Active Summation Method View */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-950 min-h-[140px]">
          {activeMethod === 'outreach-method' && renderOutreachMethodSummation(activeScopedTier)}
          {activeMethod === 'intake-channel' && renderIntakeChannelSummation(activeScopedTier)}
          {activeMethod === 'shift-period' && renderTemporalShiftSummation(activeScopedTier)}
          {activeMethod === 'storage-sync' && renderStorageSyncSummation(activeScopedTier)}
          {activeMethod === 'milestone-target' && renderMilestoneSummation(activeScopedTier)}
        </div>
      </div>

      {/* Contributing Mobilizers Breakdown (Verifying "Irrespective of who has entered it") */}
      <div className="pt-2 border-t border-cyan-950/80">
        <button
          type="button"
          onClick={() => setShowMobilizerRollup(!showMobilizerRollup)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 text-xs font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <span className="flex items-center gap-2 font-bold text-cyan-400">
            <Users className="w-3.5 h-3.5" />
            <span>Mobilizer Rollup Breakdown (Irrespective of recorder, all roll up into the school)</span>
          </span>
          {showMobilizerRollup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMobilizerRollup && (
          <div className="mt-3 p-4 rounded-2xl bg-[#091320] border border-cyan-900/40 space-y-2">
            <p className="text-[11px] font-mono text-slate-400">
              Each student record entered by any mobilizer, tablet station, or field volunteer is unified under the selected institution:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {activeScopedTier && activeScopedTier.byMobilizer && Object.keys(activeScopedTier.byMobilizer).length > 0 ? (
                Object.entries(activeScopedTier.byMobilizer).map(([mob, count]) => (
                  <div key={mob} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-bold truncate max-w-[150px]">{mob}</span>
                    <span className="text-cyan-400 font-bold">+{count} contributed</span>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 col-span-full">
                  All active mobilizers and station parts are unified into the {viewFilter === 'all' ? 'Partner Institutions' : activeScopedTier?.acronym} master tally.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-950/60 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Continuous zero-loss local storage & background Google Sheets sync</span>
        </div>
        {lastUpdated && <span>Last calculated at {lastUpdated}</span>}
      </div>
    </div>
  );
};
