import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator, 
  RefreshCw, 
  Calendar, 
  Users, 
  Building2, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Award,
  Sparkles,
  TrendingUp,
  Percent
} from 'lucide-react';
import { UniversityName, UNIVERSITIES, DataSummationSummary, MobilizationEntry } from '../types';
import { OfflineQueueService } from '../services/offlineQueue';

interface DataSummationProps {
  selectedUniversity?: UniversityName | null;
  sessionCount: number;
  lastSavedEntry?: MobilizationEntry | null;
  className?: string;
}

// Campus color tokens for distribution bar and badges
const CAMPUS_THEMES: Record<string, { bg: string; text: string; fill: string; border: string }> = {
  'Kampala International University (KIU)': {
    bg: 'bg-emerald-50 text-emerald-800',
    text: 'text-emerald-700',
    fill: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  'Cavendish University Uganda': {
    bg: 'bg-blue-50 text-blue-800',
    text: 'text-blue-700',
    fill: 'bg-blue-500',
    border: 'border-blue-200',
  },
  'International University of East Africa (IUEA)': {
    bg: 'bg-purple-50 text-purple-800',
    text: 'text-purple-700',
    fill: 'bg-purple-500',
    border: 'border-purple-200',
  },
  'Clarke International University (CIU)': {
    bg: 'bg-amber-50 text-amber-800',
    text: 'text-amber-700',
    fill: 'bg-amber-500',
    border: 'border-amber-200',
  },
  'King Caesar University (KCU)': {
    bg: 'bg-rose-50 text-rose-800',
    text: 'text-rose-700',
    fill: 'bg-rose-500',
    border: 'border-rose-200',
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
      console.error('Failed to fetch auto summation data:', err);
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

  // Re-fetch automatically whenever a new entry is saved or offline queue updates
  useEffect(() => {
    if (lastSavedEntry) {
      fetchSummation();
    }
  }, [lastSavedEntry, fetchSummation]);

  // Listen to offline queue events for real-time summation changes
  useEffect(() => {
    const unsub = OfflineQueueService.subscribe(() => {
      fetchSummation();
    });
    return () => unsub();
  }, [fetchSummation]);

  // Periodic polling every 10 seconds so 50+ mobilizers see live consolidated summation updates in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSummation();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchSummation]);

  // Merge queued offline items with server summation so the math is always instantly accurate
  const calculatedSums = useMemo(() => {
    const queue = OfflineQueueService.getQueue();
    const offlineEntries = queue.map((q) => q.temporaryEntry);

    const baseGrandTotal = data?.grandTotal ?? 0;
    const baseTodayTotal = data?.todayTotal ?? 0;
    const baseTotalSynced = data?.totalSynced ?? 0;
    const baseByUniv = { ...(data?.byUniversity || {}) };
    const baseTodayByUniv = { ...(data?.todayByUniversity || {}) };

    // Today's date string in DD/MM/YYYY format
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Add any offline entries that are not yet on the server
    let offlineCount = offlineEntries.length;
    let offlineTodayCount = 0;

    offlineEntries.forEach((entry) => {
      if (entry.university) {
        baseByUniv[entry.university] = (baseByUniv[entry.university] || 0) + 1;
      }
      if (entry.date === todayStr) {
        offlineTodayCount++;
        if (entry.university) {
          baseTodayByUniv[entry.university] = (baseTodayByUniv[entry.university] || 0) + 1;
        }
      }
    });

    const grandTotal = baseGrandTotal + offlineCount;
    const todayTotal = baseTodayTotal + offlineTodayCount;
    const totalPending = (data?.totalPending ?? 0) + offlineCount;

    let activeUnivTotal = 0;
    let activeUnivToday = 0;
    if (selectedUniversity) {
      activeUnivTotal = baseByUniv[selectedUniversity] || 0;
      activeUnivToday = baseTodayByUniv[selectedUniversity] || 0;
    }

    return {
      grandTotal,
      todayTotal,
      totalSynced: baseTotalSynced,
      totalPending,
      activeUnivTotal,
      activeUnivToday,
      byUniversity: baseByUniv,
      todayByUniversity: baseTodayByUniv,
      offlineCount,
      todayStr,
    };
  }, [data, selectedUniversity]);

  // Selected university short acronym
  const selectedUnivAcronym = useMemo(() => {
    if (!selectedUniversity) return null;
    const found = UNIVERSITIES.find((u) => u.name === selectedUniversity);
    return found ? found.acronym : 'Campus';
  }, [selectedUniversity]);

  // Calculate percentage for active university
  const activeUnivPercentage = useMemo(() => {
    if (calculatedSums.grandTotal === 0) return 0;
    return Math.round((calculatedSums.activeUnivTotal / calculatedSums.grandTotal) * 100);
  }, [calculatedSums.grandTotal, calculatedSums.activeUnivTotal]);

  return (
    <section 
      id="auto-summation-component" 
      className={`w-full max-w-xl mx-auto px-3 sm:px-0 py-2 ${className}`}
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Data Auto Summation
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Tally
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Continuous auto-calculated totals for all mobilized entries
              </p>
            </div>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-slate-400 hidden sm:inline-block font-mono">
                {lastUpdated}
              </span>
            )}
            <button
              id="refresh-summation-btn"
              type="button"
              onClick={() => fetchSummation(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              title="Recalculate and refresh auto summation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Primary Summation Metrics Grid */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Grand Total Sum */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Grand Total
                </span>
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? '...' : calculatedSums.grandTotal}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                All-time recorded
              </div>
            </div>

            {/* 2. Today's Sum */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex flex-col justify-between hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">
                  Today's Sum
                </span>
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
                {isLoading ? '...' : calculatedSums.todayTotal}
              </div>
              <div className="text-[10px] text-blue-700 font-medium mt-0.5 truncate">
                Recorded today
              </div>
            </div>

            {/* 3. Selected Campus Subtotal */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex flex-col justify-between hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 truncate">
                  {selectedUnivAcronym ? `${selectedUnivAcronym} Subtotal` : 'Campus Subtotal'}
                </span>
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
                {isLoading ? '...' : calculatedSums.activeUnivTotal}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                <span>{activeUnivPercentage}% of campaign</span>
              </div>
            </div>

            {/* 4. Active Shift / Session Sum */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-col justify-between hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-between text-amber-800 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                  Shift Session
                </span>
                <Award className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 tracking-tight">
                {sessionCount}
              </div>
              <div className="text-[10px] text-amber-700 font-medium mt-0.5 truncate">
                Added this shift
              </div>
            </div>
          </div>

          {/* Proportional Campus Distribution Bar */}
          {calculatedSums.grandTotal > 0 && (
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  Institutional Share Summation
                </span>
                <span className="text-[10px] text-slate-500">
                  {calculatedSums.grandTotal} total entries
                </span>
              </div>

              {/* Progress Stack Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                {UNIVERSITIES.map((univ) => {
                  const count = calculatedSums.byUniversity[univ.name] || 0;
                  const pct = calculatedSums.grandTotal > 0 ? (count / calculatedSums.grandTotal) * 100 : 0;
                  if (pct <= 0) return null;
                  const theme = CAMPUS_THEMES[univ.name] || { fill: 'bg-blue-500' };

                  return (
                    <div
                      key={univ.id}
                      style={{ width: `${pct}%` }}
                      className={`${theme.fill} h-full transition-all duration-500 relative group`}
                      title={`${univ.acronym}: ${count} entries (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>

              {/* Quick Legend Tags */}
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
                {UNIVERSITIES.map((univ) => {
                  const count = calculatedSums.byUniversity[univ.name] || 0;
                  const theme = CAMPUS_THEMES[univ.name] || { fill: 'bg-blue-500', text: 'text-slate-700' };
                  const isSelected = univ.name === selectedUniversity;

                  return (
                    <div
                      key={univ.id}
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                        isSelected 
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 font-medium'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${theme.fill}`} />
                      <span>{univ.acronym}:</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sync & Storage Auto Status Tally */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Synced: <strong className="font-bold">{calculatedSums.totalSynced}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Local / In Review: <strong className="font-bold">{calculatedSums.totalPending}</strong>
              </span>
            </div>

            {/* Toggle Full Campus Breakdown Table */}
            <button
              id="toggle-summation-breakdown-btn"
              type="button"
              onClick={() => setShowFullBreakdown(!showFullBreakdown)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              <span>{showFullBreakdown ? 'Hide Breakdown Table' : 'View Full Summation Table'}</span>
              {showFullBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expandable Full Breakdown Table */}
          {showFullBreakdown && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">University</th>
                      <th className="py-2 px-2 text-center">Today</th>
                      <th className="py-2 px-2 text-center">Total Sum</th>
                      <th className="py-2 px-3 text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {UNIVERSITIES.map((univ) => {
                      const totalCount = calculatedSums.byUniversity[univ.name] || 0;
                      const todayCount = calculatedSums.todayByUniversity[univ.name] || 0;
                      const sharePct = calculatedSums.grandTotal > 0 
                        ? ((totalCount / calculatedSums.grandTotal) * 100).toFixed(1)
                        : '0.0';
                      const isCurrent = univ.name === selectedUniversity;
                      const theme = CAMPUS_THEMES[univ.name];

                      return (
                        <tr 
                          key={univ.id}
                          className={`transition-colors ${
                            isCurrent 
                              ? 'bg-blue-50/60 font-semibold text-slate-900' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${theme?.fill || 'bg-slate-400'}`} />
                              <div className="truncate max-w-[180px] sm:max-w-[240px]">
                                <span className="font-bold">{univ.acronym}</span>
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
                          <td className="py-2.5 px-2 text-center font-medium text-slate-800">
                            {todayCount > 0 ? (
                              <span className="inline-block bg-blue-100/80 text-blue-900 font-bold px-1.5 py-0.5 rounded text-[11px]">
                                +{todayCount}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                            {totalCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {sharePct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Summation Footer Row */}
                  <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-900">
                    <tr>
                      <td className="py-2.5 px-3 uppercase tracking-wider text-[10px] text-slate-300">
                        Sum Total
                      </td>
                      <td className="py-2.5 px-2 text-center text-blue-300">
                        {calculatedSums.todayTotal}
                      </td>
                      <td className="py-2.5 px-2 text-center text-white text-sm">
                        {calculatedSums.grandTotal}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-mono">
                        100%
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
