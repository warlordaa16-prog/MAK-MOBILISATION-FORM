import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator, 
  RefreshCw, 
  Building2, 
  Download,
  CloudCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  UniversityName, 
  UNIVERSITIES, 
  DataSummationSummary, 
  MobilizationEntry, 
  SchoolSummationTier
} from '../types';
import { OfflineQueueService } from '../services/offlineQueue';

interface DataSummationProps {
  selectedUniversity?: UniversityName | null;
  onSelectUniversity?: (univ: UniversityName) => void;
  sessionCount?: number;
  lastSavedEntry?: MobilizationEntry | null;
  className?: string;
}

export const DataSummation: React.FC<DataSummationProps> = ({
  selectedUniversity,
  lastSavedEntry,
  className = '',
}) => {
  const [data, setData] = useState<DataSummationSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

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
          setLastUpdated(
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
          );
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

  // Merge server summation with local offline queue for accurate zero-loss tallies
  const { grandTotal, todayTotal, totalSynced, totalPending } = useMemo(() => {
    const queue = OfflineQueueService.getQueue();
    const offlineEntries = queue.map((q) => q.temporaryEntry);

    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let offlineGrand = 0;
    let offlineToday = 0;

    offlineEntries.forEach((entry) => {
      offlineGrand++;
      if (entry.date === todayStr) {
        offlineToday++;
      }
    });

    const totalGrand = (data?.grandTotal || 0) + offlineGrand;
    const totalT = (data?.todayTotal || 0) + offlineToday;
    const totalS = data?.totalSynced || 0;
    const totalP = (data?.totalPending || 0) + offlineGrand;

    return {
      grandTotal: totalGrand,
      todayTotal: totalT,
      totalSynced: totalS,
      totalPending: totalP,
    };
  }, [data]);

  const syncRate = grandTotal > 0 ? Math.round((totalSynced / grandTotal) * 100) : 100;

  return (
    <div className={`relative w-full rounded-3xl bg-gradient-to-br from-[#2f1f54]/90 via-[#231742]/95 to-[#1a1c4b]/90 border border-white/15 p-5 sm:p-7 backdrop-blur-2xl shadow-2xl space-y-6 ${className} text-white`}>
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white shadow-md shadow-rose-950/40">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                KIU Mobilization Summation
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ACTIVE PORTAL
              </span>
            </div>
            <p className="text-xs text-purple-200/70 mt-0.5">
              Unified counts for Kampala International University (Kansanga Main Campus & Ishaka)
            </p>
          </div>
        </div>

        {/* Action Controls: Refresh and Keep Data Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => OfflineQueueService.exportAllKeptData('csv')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            title="Download all stored data kept safely (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-purple-200" />
            <span>Export Kept Data (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => fetchSummation(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition cursor-pointer disabled:opacity-50 backdrop-blur-md"
            title="Refresh live sums"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#ff6666]' : 'text-purple-200'}`} />
          </button>
        </div>
      </div>

      {/* Trio of Stat Metric Cards - Styled exactly like the PNG (Coral Red Wins card, Violet Frosted Losses card, White Winning % card) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Vibrant Coral-Red "Total Contacts" Card (Matches "Wins 84" in PNG) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff4f46] via-[#f0384a] to-[#e63548] p-5 text-white shadow-xl shadow-red-950/40 border border-rose-400/30 flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-white/90">
              Total Contacts
            </span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {grandTotal}
            </div>
            <div className="text-[11px] font-medium text-white/80 mt-0.5">
              Cumulative KIU Tallies
            </div>
          </div>
        </div>

        {/* Card 2: Deep Violet Frosted Glass Card (Matches "Losses 18" in PNG) */}
        <div className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl p-5 text-white shadow-lg border border-white/15 flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-purple-200/80">
              Today's Shift
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-purple-200" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              +{todayTotal}
            </div>
            <div className="text-[11px] font-medium text-purple-200/70 mt-0.5">
              Today's Field Session
            </div>
          </div>
        </div>

        {/* Card 3: Crisp White Card (Matches "Winning % 82.3%" in PNG) */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 text-slate-900 shadow-xl border border-white/20 flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Sync Health
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <CloudCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {syncRate}%
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {totalSynced} Synced • {totalPending} Queued
            </div>
          </div>
        </div>
      </div>

      {/* Scope & Breakdown Bar */}
      <div className="p-4 rounded-2xl bg-[#1d1238]/80 border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#ff7575]" />
          <span className="text-xs font-bold text-white">
            Kampala International University (Kansanga & Ishaka)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {totalSynced} Synced to Google Sheets
          </span>
          {totalPending > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#ff4d46]/20 text-[#ff8f8f] border border-[#ff4d46]/40">
              {totalPending} Queued in Outbox
            </span>
          )}
        </div>
      </div>

      {/* Footer info */}
      {lastUpdated && (
        <div className="flex justify-end pt-1 text-[11px] text-purple-300/60 font-medium">
          <span>Last calculated at {lastUpdated}</span>
        </div>
      )}
    </div>
  );
};
