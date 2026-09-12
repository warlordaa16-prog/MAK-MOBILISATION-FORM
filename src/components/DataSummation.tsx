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
  Layers
} from 'lucide-react';
import { UniversityName, UNIVERSITIES, DataSummationSummary, MobilizationEntry, SchoolSummationTier } from '../types';
import { OfflineQueueService } from '../services/offlineQueue';

interface DataSummationProps {
  selectedUniversity?: UniversityName | null;
  sessionCount: number;
  lastSavedEntry?: MobilizationEntry | null;
  className?: string;
}

// Campus color tokens for individual school summation tiers
const CAMPUS_TIER_THEMES: Record<string, {
  bg: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  accentBar: string;
  progressFill: string;
  activeBorder: string;
}> = {
  'Kampala International University (KIU)': {
    bg: 'bg-emerald-50/60',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    badgeText: 'text-emerald-800',
    border: 'border-emerald-200/80',
    accentBar: 'bg-emerald-600',
    progressFill: 'bg-emerald-600',
    activeBorder: 'ring-2 ring-emerald-500 border-emerald-500',
  },
  'Cavendish University Uganda': {
    bg: 'bg-blue-50/60',
    badgeBg: 'bg-blue-100 text-blue-800',
    badgeText: 'text-blue-800',
    border: 'border-blue-200/80',
    accentBar: 'bg-blue-600',
    progressFill: 'bg-blue-600',
    activeBorder: 'ring-2 ring-blue-500 border-blue-500',
  },
  'International University of East Africa (IUEA)': {
    bg: 'bg-purple-50/60',
    badgeBg: 'bg-purple-100 text-purple-800',
    badgeText: 'text-purple-800',
    border: 'border-purple-200/80',
    accentBar: 'bg-purple-600',
    progressFill: 'bg-purple-600',
    activeBorder: 'ring-2 ring-purple-500 border-purple-500',
  },
  'Clarke International University (CIU)': {
    bg: 'bg-amber-50/60',
    badgeBg: 'bg-amber-100 text-amber-800',
    badgeText: 'text-amber-800',
    border: 'border-amber-200/80',
    accentBar: 'bg-amber-600',
    progressFill: 'bg-amber-600',
    activeBorder: 'ring-2 ring-amber-500 border-amber-500',
  },
  'King Caesar University (KCU)': {
    bg: 'bg-rose-50/60',
    badgeBg: 'bg-rose-100 text-rose-800',
    badgeText: 'text-rose-800',
    border: 'border-rose-200/80',
    accentBar: 'bg-rose-600',
    progressFill: 'bg-rose-600',
    activeBorder: 'ring-2 ring-rose-500 border-rose-500',
  },
};

export const DataSummation: React.FC<DataSummationProps> = ({
  selectedUniversity,
  sessionCount,
  lastSavedEntry,
  className = '',
}) => {
  const [data, setData] = useState<DataSummationSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showFullBreakdown, setShowFullBreakdown] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<string>('all'); // 'all' or university name

  // If user selects a university in the mobilization form, sync the view filter tab if in single mode
  useEffect(() => {
    if (selectedUniversity && viewFilter !== 'all') {
      setViewFilter(selectedUniversity);
    }
  }, [selectedUniversity]);

  const fetchSummation = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const url = selectedUniversity 
        ? `/api/entries/summation?university=${encodeURIComponent(selectedUniversity)}` 
        : '/api/entries/summation';
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
  }, [selectedUniversity]);

  // Fetch on mount and when selected university changes
  useEffect(() => {
    fetchSummation();
  }, [fetchSummation]);

  // Re-fetch automatically on new entry
  useEffect(() => {
    if (lastSavedEntry) {
      fetchSummation();
    }
  }, [lastSavedEntry, fetchSummation]);

  // Listen to offline queue events
  useEffect(() => {
    const unsub = OfflineQueueService.subscribe(() => {
      fetchSummation();
    });
    return () => unsub();
  }, [fetchSummation]);

  // Periodic 10s auto-refresh for live HOD / mobilizer tally
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSummation();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchSummation]);

  // Calculate per-school summations including local offline queue additions
  const schoolTiers = useMemo(() => {
    const queue = OfflineQueueService.getQueue();
    const offlineEntries = queue.map((q) => q.temporaryEntry);

    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Base tiers from server or default 0s
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
        dailyMilestoneProgress: 0,
        dailyMilestoneGoal: 50,
        milestonesAchievedToday: 0,
        lastEntryTime: serverTier?.lastEntryTime,
      };
    });

    // Merge offline items per school
    offlineEntries.forEach((entry) => {
      if (entry.university && tiers[entry.university]) {
        tiers[entry.university].totalSum++;
        tiers[entry.university].pendingSum++;
        if (entry.date === todayStr) {
          tiers[entry.university].todaySum++;
        }
      }
    });

    // Compute progress towards 50 milestone for each school
    Object.values(tiers).forEach((tier) => {
      tier.dailyMilestoneProgress = tier.todaySum % 50;
      tier.milestonesAchievedToday = Math.floor(tier.todaySum / 50);
    });

    return tiers;
  }, [data]);

  return (
    <section 
      id="multi-level-summation-component" 
      className={`w-full max-w-5xl mx-auto px-2 sm:px-0 py-2 ${className}`}
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200">
        
        {/* Header Bar */}
        <div className="bg-slate-950 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-slate-100">
                  Campus Mobilization Tally
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full">
                  Independent Tallies
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live entry counters and daily 50-participant milestone tracking for each institution
              </p>
            </div>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden sm:inline-block font-mono">
                Updated {lastUpdated}
              </span>
            )}
            <button
              id="refresh-summation-btn"
              type="button"
              onClick={() => fetchSummation(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              title="Refresh campus tallies"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* School Tier Filter Pills */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>Summation Levels:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                viewFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Schools
            </button>
            {UNIVERSITIES.map((univ) => {
              const isCurrent = viewFilter === univ.name;
              const isFormSelected = univ.name === selectedUniversity;
              return (
                <button
                  key={univ.id}
                  type="button"
                  onClick={() => setViewFilter(univ.name)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{univ.acronym}</span>
                  {isFormSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active on entry form" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Independent School Summation Cards Grid */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {UNIVERSITIES.filter((u) => viewFilter === 'all' || viewFilter === u.name).map((univ) => {
              const tier = schoolTiers[univ.name];
              const theme = CAMPUS_TIER_THEMES[univ.name] || CAMPUS_TIER_THEMES['Kampala International University (KIU)'];
              const isFormActive = univ.name === selectedUniversity;
              const totalSum = tier?.totalSum ?? 0;
              const todaySum = tier?.todaySum ?? 0;
              const milestoneAchieved = todaySum >= 50;
              const milestonePercent = Math.min(100, Math.round((todaySum / 50) * 100));

              return (
                <div
                  key={univ.id}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                    theme.bg
                  } ${
                    isFormActive ? theme.activeBorder + ' shadow-md' : theme.border + ' hover:border-slate-300'
                  }`}
                >
                  {/* Top Accent Color Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar}`} />

                  {/* Card School Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${theme.badgeBg}`}>
                          {univ.acronym}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate max-w-[130px]">
                          Summation Level
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 truncate max-w-[190px]" title={univ.name}>
                        {univ.shortName}
                      </h4>
                    </div>

                    {isFormActive && (
                      <span className="text-[9px] uppercase font-black bg-slate-900 text-white px-2 py-0.5 rounded-full shrink-0 shadow-xs">
                        Active Focus
                      </span>
                    )}
                  </div>

                  {/* Main Metric: School Total Summation */}
                  <div className="my-2 p-2.5 bg-white/90 rounded-lg border border-slate-200/60 shadow-2xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {univ.acronym} Total Mobilized
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {isLoading ? '...' : totalSum}
                      </span>
                    </div>

                    {/* Today's Count Subtally */}
                    <div className="flex items-center justify-between text-xs mt-1.5 pt-1.5 border-t border-slate-100">
                      <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Today's Mobilizations:
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        +{todaySum}
                      </span>
                    </div>
                  </div>

                  {/* Daily 50-Person Milestone Indicator for HOD Notification */}
                  <div className="mt-1 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Bell className={`w-3 h-3 ${milestoneAchieved ? 'text-amber-500' : 'text-slate-400'}`} />
                        HOD Daily Target (50/day):
                      </span>
                      <span className="font-bold text-slate-800 text-[10px]">
                        {todaySum >= 50 ? (
                          <span className="text-emerald-700 font-black flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                            {todaySum}/50 REACHED
                          </span>
                        ) : (
                          <span>{todaySum}/50</span>
                        )}
                      </span>
                    </div>

                    {/* Milestone Progress Bar */}
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        style={{ width: `${milestonePercent}%` }}
                        className={`h-full transition-all duration-500 ${
                          milestoneAchieved ? 'bg-emerald-500' : theme.progressFill
                        }`}
                      />
                    </div>

                    {milestoneAchieved && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>50+ alert generated for {univ.acronym} HOD</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Shift Session Counter */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="text-slate-700 font-medium">
                Active Mobilizer Shift Session: <strong className="font-black text-slate-900">{sessionCount}</strong> entries added this login
              </span>
            </div>

            {/* Toggle Full Comparison Table */}
            <button
              id="toggle-summation-breakdown-btn"
              type="button"
              onClick={() => setShowFullBreakdown(!showFullBreakdown)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer ml-auto"
            >
              <span>{showFullBreakdown ? 'Hide Summation Table' : 'Compare School Summations'}</span>
              {showFullBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Per-School Breakdown Table (WITHOUT Grand Total) */}
          {showFullBreakdown && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">University Level</th>
                      <th className="py-2.5 px-2 text-center">Today's Sum</th>
                      <th className="py-2.5 px-2 text-center">Total School Sum</th>
                      <th className="py-2.5 px-3 text-center">Daily 50 HOD Milestone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {UNIVERSITIES.map((univ) => {
                      const tier = schoolTiers[univ.name];
                      const totalCount = tier?.totalSum ?? 0;
                      const todayCount = tier?.todaySum ?? 0;
                      const isCurrent = univ.name === selectedUniversity;
                      const theme = CAMPUS_TIER_THEMES[univ.name];

                      return (
                        <tr 
                          key={univ.id}
                          className={`transition-colors ${
                            isCurrent 
                              ? 'bg-blue-50/70 font-semibold text-slate-900' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${theme?.accentBar || 'bg-slate-400'}`} />
                              <div>
                                <span className="font-bold text-slate-900">{univ.acronym}</span>
                                <span className="text-slate-500 text-[11px] hidden sm:inline ml-1.5 font-normal">
                                  {univ.shortName}
                                </span>
                              </div>
                              {isCurrent && (
                                <span className="text-[9px] uppercase font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                            {todayCount > 0 ? (
                              <span className="inline-block bg-blue-100/80 text-blue-900 font-extrabold px-2 py-0.5 rounded text-[11px]">
                                +{todayCount}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-slate-900 text-sm">
                            {totalCount}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {todayCount >= 50 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Achieved ({todayCount}/50)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-600">
                                {todayCount}/50 ({50 - todayCount} remaining)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer: Reinforces Isolated Multi-Level Status (NO GRAND TOTAL) */}
                  <tfoot className="bg-slate-900 text-white font-semibold text-xs border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-center text-slate-300 text-[11px]">
                        Multi-Level Institutional Summation &bull; Isolated School Pipelines Active &bull; 5 Campus Levels
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};
