import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  GitBranch, 
  Zap, 
  Layers, 
  Database, 
  CloudUpload, 
  Radio, 
  FileSpreadsheet, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Cpu,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  Calculator,
  Download
} from 'lucide-react';
import { UniversityName, MobilizationEntry, UNIVERSITIES } from '../types';
import { MultiPartIngestionTerminal } from './MultiPartIngestionTerminal';
import { MobilizationForm } from './MobilizationForm';
import { DataSummation } from './DataSummation';
import { OfflineQueueService } from '../services/offlineQueue';

interface TelemetryDeckProps {
  selectedUniversity: UniversityName | null;
  onSwitchUniversity: () => void;
  onSelectUniversity: (u: UniversityName) => void;
  recentEntries: MobilizationEntry[];
  totalEntries: number;
  queuedCount: number;
  isOnline: boolean;
  onConsolidationSuccess: (entries: MobilizationEntry[], isOffline: boolean) => void;
  onOpenOutbox: () => void;
  onOpenAdmin: () => void;
}

export const ConsolidationTelemetryDeck: React.FC<TelemetryDeckProps> = ({
  selectedUniversity,
  onSwitchUniversity,
  onSelectUniversity,
  recentEntries,
  totalEntries,
  queuedCount,
  isOnline,
  onConsolidationSuccess,
  onOpenOutbox,
  onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'multi-part' | 'single' | 'summation' | 'telemetry' | 'feed'>('multi-part');
  const [searchFilter, setSearchFilter] = useState('');

  // 12-bar ingestion velocity waveform (replicating the Sentiment Rate 75% waveform from the PNG)
  const waveformBars = [
    { height: 35, glow: false },
    { height: 50, glow: false },
    { height: 75, glow: true },
    { height: 40, glow: false },
    { height: 90, glow: true },
    { height: 60, glow: false },
    { height: 85, glow: true },
    { height: 100, glow: true },
    { height: 70, glow: false },
    { height: 45, glow: false },
    { height: 80, glow: true },
    { height: 65, glow: false },
    { height: 95, glow: true },
    { height: 55, glow: false },
    { height: 85, glow: true },
    { height: 90, glow: true },
  ];

  const filteredEntries = recentEntries.filter((e) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(query) ||
      e.telephone.includes(query) ||
      e.university.toLowerCase().includes(query) ||
      e.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="relative w-full rounded-3xl bg-[#080d14]/95 border border-cyan-900/50 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Top Deck Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-950/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 shadow-inner">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider">
                Consolidation Telemetry Deck
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              High-concurrency parallel multi-station intake engine
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('multi-part')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'multi-part'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Multi-Part Ingest</span>
            <span className="sm:hidden">Multi-Part</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rapid Single</span>
            <span className="sm:hidden">Single</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summation')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'summation'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Method Summations</span>
            <span className="sm:hidden">Summations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'telemetry'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Feed ({recentEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Hero Telemetry Card with Glowing Waveform (Faithful to the Sentiment Rate 75% card in the PNG) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0b131e] via-[#091724] to-[#0b131e] border border-cyan-800/40 shadow-inner flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase font-bold text-cyan-400 tracking-wider">
              CONSOLIDATION EFFICIENCY
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              ZERO-LOSS PIPELINE
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
              99.8%
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              ↑ +4.2% vs standard queue
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Atomic lock de-duplication running at &lt;1ms • Background sync to 5 isolated tabs
          </p>
        </div>

        {/* The Waveform Histogram from the PNG */}
        <div className="flex items-end gap-1.5 h-12 bg-slate-950/80 p-2.5 rounded-xl border border-cyan-900/50">
          {waveformBars.map((bar, idx) => (
            <div
              key={idx}
              style={{ height: `${bar.height}%` }}
              className={`w-1.5 rounded-t-sm transition-all duration-500 ${
                bar.glow
                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                  : 'bg-cyan-800/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 4-Box Telemetry Metric Grid (Faithful to the 4-box layout in the uploaded PNG) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Consolidated */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              TOTAL CONSOLIDATED
            </span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white">
            {totalEntries}
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5" />
            Continuous multi-stream intake
          </span>
        </div>

        {/* Metric 2: Active Concurrent Parts */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              CONCURRENT PARTS
            </span>
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white">
            5 Stations
          </div>
          <span className="text-[10px] font-mono text-cyan-300">
            KIU, CUU, IUEA, CIU, KCU
          </span>
        </div>

        {/* Metric 3: Offline Buffered Outbox */}
        <div 
          onClick={onOpenOutbox}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-600/50 shadow-sm space-y-1 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              OFFLINE BUFFER
            </span>
            <CloudUpload className={`w-3.5 h-3.5 ${queuedCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-mono font-bold ${queuedCount > 0 ? 'text-amber-300' : 'text-white'}`}>
            {queuedCount} Queued
          </div>
          <span className="text-[10px] font-mono text-slate-400 underline">
            Click to open Outbox
          </span>
        </div>

        {/* Metric 4: Google Sheets Isolated Worksheets */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              ISOLATED SHEETS
            </span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white">
            5 Tabs
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Auto-routing per campus
          </span>
        </div>
      </div>

      {/* Main Dynamic View Content */}
      <div className="pt-2">
        {/* Tab 1: Multi-Part Concurrent Ingestion Matrix */}
        {activeTab === 'multi-part' && (
          <MultiPartIngestionTerminal
            onConsolidationSuccess={onConsolidationSuccess}
            defaultUniversity={selectedUniversity}
          />
        )}

        {/* Tab 2: Rapid Single Entry Field Terminal */}
        {activeTab === 'single' && (
          <div className="space-y-4">
            {selectedUniversity ? (
              <MobilizationForm
                selectedUniversity={selectedUniversity}
                onSwitchUniversity={onSwitchUniversity}
                onEntrySaved={(entry, isOffline) => onConsolidationSuccess([entry], isOffline)}
              />
            ) : (
              <div className="p-6 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                <Building2 className="w-8 h-8 text-cyan-400 mx-auto" />
                <p className="text-sm font-mono text-white">
                  Please select an active university stream to launch Single Entry Terminal:
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {UNIVERSITIES.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onSelectUniversity(u.name)}
                      className="px-3 py-1.5 text-xs font-mono font-bold rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition cursor-pointer"
                    >
                      {u.acronym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: University Multi-Method Summation Engine */}
        {activeTab === 'summation' && (
          <DataSummation
            selectedUniversity={selectedUniversity}
            onSelectUniversity={onSelectUniversity}
            sessionCount={recentEntries.length}
            lastSavedEntry={recentEntries[0] || null}
          />
        )}

        {/* Tab 4: Detailed Telemetry & Campus Stream Breakdown */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Individual Campus Stream Health & Milestones
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UNIVERSITIES.map((univ) => {
                const isSelected = selectedUniversity === univ.name;
                const countForUniv = recentEntries.filter((e) => e.university === univ.name).length;

                return (
                  <div
                    key={univ.id}
                    onClick={() => onSelectUniversity(univ.name)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-900/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">
                        {univ.acronym} - {univ.shortName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 border border-slate-800">
                        {univ.campus}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Recent Stream Intake:</span>
                      <span className="font-bold text-cyan-400">{countForUniv} registered</span>
                    </div>

                    {/* Progress Bar towards 50 milestone */}
                    <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (countForUniv / 50) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Arriving Consolidated Stream Feed */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter consolidated records by name, phone, or university..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => OfflineQueueService.exportAllKeptData('csv')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-800/60 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                  title="Export all kept records"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Kept (CSV)</span>
                </button>

                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {filteredEntries.length} records
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  No consolidated records match your filter query.
                </div>
              ) : (
                filteredEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-md bg-slate-950 text-cyan-300 border border-cyan-900 shrink-0">
                        #{item.id}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-bold text-white block truncate">
                          {item.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block truncate">
                          {item.telephone} • {item.university}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {item.time || 'Today'}
                      </span>
                      {item.queuedOffline ? (
                        <span className="text-[10px] font-mono text-amber-400">
                          Offline Outbox
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400">
                          Synced
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
