import React, { useState, useRef } from 'react';
import { 
  GitBranch, 
  Sparkles, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  CloudUpload, 
  Layers, 
  Radio, 
  RefreshCw,
  FileSpreadsheet,
  Zap,
  ArrowRight
} from 'lucide-react';
import { UniversityName, UNIVERSITIES, MobilizationEntry } from '../types';
import { validateAndNormalizeUgandanPhone } from '../utils/phone';
import { OfflineQueueService } from '../services/offlineQueue';
import { useFullConnectivity } from '../hooks/useOnlineStatus';

export interface MultiPartRow {
  id: string;
  partName: string;
  fullName: string;
  telephone: string;
  university: UniversityName;
  carrier: string | null;
  isValid: boolean;
  status: 'idle' | 'valid' | 'duplicate' | 'error';
  errorMsg?: string;
}

interface MultiPartIngestionProps {
  onConsolidationSuccess: (entries: MobilizationEntry[], isOffline: boolean) => void;
  defaultUniversity?: UniversityName | null;
}

const INITIAL_PARTS: MultiPartRow[] = [
  {
    id: 'part-1',
    partName: 'Part 1: KIU Kansanga Gate',
    fullName: '',
    telephone: '',
    university: 'Kampala International University (KIU)',
    carrier: null,
    isValid: false,
    status: 'idle',
  },
  {
    id: 'part-2',
    partName: 'Part 2: Cavendish Law Quad',
    fullName: '',
    telephone: '',
    university: 'Cavendish University Uganda',
    carrier: null,
    isValid: false,
    status: 'idle',
  },
  {
    id: 'part-3',
    partName: 'Part 3: IUEA Tech Pavilion',
    fullName: '',
    telephone: '',
    university: 'International University of East Africa (IUEA)',
    carrier: null,
    isValid: false,
    status: 'idle',
  },
  {
    id: 'part-4',
    partName: 'Part 4: CIU Health Desk',
    fullName: '',
    telephone: '',
    university: 'Clarke International University (CIU)',
    carrier: null,
    isValid: false,
    status: 'idle',
  },
  {
    id: 'part-5',
    partName: 'Part 5: KCU Bunga Entry',
    fullName: '',
    telephone: '',
    university: 'King Caesar University (KCU)',
    carrier: null,
    isValid: false,
    status: 'idle',
  },
];

const SAMPLE_NAMES = [
  'Grace Ainembabazi',
  'Ronald Kato Mukasa',
  'Brenda Namubiru',
  'Samuel Okello',
  'Patricia Akello',
  'Brian Sserwadda',
  'Diana Kyomugisha',
  'Emmanuel Otim',
];

const SAMPLE_PREFIXES = ['0702', '0753', '0774', '0785', '0761', '0740'];

export const MultiPartIngestionTerminal: React.FC<MultiPartIngestionProps> = ({
  onConsolidationSuccess,
  defaultUniversity,
}) => {
  const { isOnline } = useFullConnectivity();
  const [rows, setRows] = useState<MultiPartRow[]>(INITIAL_PARTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [consolidationReport, setConsolidationReport] = useState<{
    totalSubmitted: number;
    totalConsolidated: number;
    duplicatesPrevented: number;
    isOffline: boolean;
    timestamp: string;
  } | null>(null);

  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Handle row changes with real-time validation and carrier detection
  const handleRowChange = (id: string, field: 'fullName' | 'telephone' | 'university' | 'partName', value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

        if (field === 'telephone') {
          const valResult = validateAndNormalizeUgandanPhone(value);
          updated.carrier = valResult.carrier;
          updated.isValid = updated.fullName.trim().length >= 2 && valResult.isValid;
          updated.status = valResult.isValid ? 'valid' : value.length > 0 ? 'error' : 'idle';
          updated.errorMsg = valResult.error;
        } else if (field === 'fullName') {
          const valResult = validateAndNormalizeUgandanPhone(updated.telephone);
          updated.isValid = value.trim().length >= 2 && valResult.isValid;
          if (updated.telephone) {
            updated.status = updated.isValid ? 'valid' : 'error';
          }
        }

        return updated;
      })
    );
  };

  const handleAddRow = () => {
    const nextNum = rows.length + 1;
    const fallbackUniv = defaultUniversity || UNIVERSITIES[(nextNum - 1) % UNIVERSITIES.length].name;
    const newRow: MultiPartRow = {
      id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      partName: `Part ${nextNum}: Mobilizer Unit ${String.fromCharCode(64 + nextNum)}`,
      fullName: '',
      telephone: '',
      university: fallbackUniv,
      carrier: null,
      isValid: false,
      status: 'idle',
    };
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  // Populate realistic sample stream across all parts
  const handlePopulateSampleStream = () => {
    const populated = rows.map((row, idx) => {
      const name = SAMPLE_NAMES[idx % SAMPLE_NAMES.length];
      const prefix = SAMPLE_PREFIXES[idx % SAMPLE_PREFIXES.length];
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const phone = `${prefix}${randomDigits}`;
      const val = validateAndNormalizeUgandanPhone(phone);

      return {
        ...row,
        fullName: name,
        telephone: phone,
        carrier: val.carrier,
        isValid: true,
        status: 'valid' as const,
        errorMsg: undefined,
      };
    });

    setRows(populated);
  };

  // Parse pasted multi-line text (e.g. Name, Phone, University or Name Phone)
  const handleApplyPastedRoster = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText.split('\n').filter((l) => l.trim().length > 0);
    const newRows: MultiPartRow[] = lines.map((line, idx) => {
      // Split by comma, tab, or semicolon
      const parts = line.split(/[,;\t]+/).map((s) => s.trim());
      const fullName = parts[0] || `Student ${idx + 1}`;
      const rawPhone = parts[1] || '';
      const rawUniv = parts[2];

      let university: UniversityName = defaultUniversity || UNIVERSITIES[idx % UNIVERSITIES.length].name;
      if (rawUniv) {
        const found = UNIVERSITIES.find(
          (u) =>
            u.name.toLowerCase().includes(rawUniv.toLowerCase()) ||
            u.acronym.toLowerCase() === rawUniv.toLowerCase()
        );
        if (found) university = found.name;
      }

      const val = validateAndNormalizeUgandanPhone(rawPhone);

      return {
        id: `part-pasted-${idx}-${Date.now()}`,
        partName: `Part ${idx + 1}: Field Stream`,
        fullName,
        telephone: rawPhone,
        university,
        carrier: val.carrier,
        isValid: fullName.length >= 2 && val.isValid,
        status: val.isValid ? 'valid' : 'error',
        errorMsg: val.error,
      };
    });

    setRows(newRows);
    setPastedText('');
    setPasteModalOpen(false);
  };

  // Core Concurrent Consolidation Action
  const executeConcurrentConsolidation = async () => {
    const validRows = rows.filter((r) => r.fullName.trim().length >= 2 && r.telephone.trim().length >= 8);
    if (validRows.length === 0) {
      alert('Please enter at least one valid participant with full name and Ugandan telephone number.');
      return;
    }

    setIsSubmitting(true);
    setConsolidationReport(null);

    // If offline (or manual offline mode), save all parts concurrently to local outbox
    const effectivelyOffline = OfflineQueueService.isEffectivelyOffline();

    if (effectivelyOffline) {
      const payloads = validRows.map((r) => {
        const val = validateAndNormalizeUgandanPhone(r.telephone);
        return {
          fullName: r.fullName.trim(),
          telephone: val.normalized || r.telephone,
          university: r.university,
          allowDuplicate: true,
          mobilizerName: r.partName || 'Station Mobilizer',
          mobilizationMethod: 'Campus Gate / Main Entrance',
          intakeMethod: 'multi-part' as const,
        };
      });

      const added = OfflineQueueService.addMultipleToQueue(payloads);
      const consolidated = added.map((a) => a.temporaryEntry);

      setIsSubmitting(false);
      setConsolidationReport({
        totalSubmitted: validRows.length,
        totalConsolidated: consolidated.length,
        duplicatesPrevented: 0,
        isOffline: true,
        timestamp: new Date().toLocaleTimeString(),
      });

      onConsolidationSuccess(consolidated, true);

      // Reset rows to ready state
      setRows(INITIAL_PARTS);
      return;
    }

    // Online execution: Post to /api/entries/concurrent-ingest
    try {
      const payloadEntries = validRows.map((r) => {
        const val = validateAndNormalizeUgandanPhone(r.telephone);
        return {
          partId: r.id,
          station: r.partName,
          fullName: r.fullName.trim(),
          telephone: val.normalized || r.telephone,
          university: r.university,
          mobilizerName: r.partName || 'Station Mobilizer',
          mobilizationMethod: 'Campus Gate / Main Entrance',
          intakeMethod: 'multi-part' as const,
        };
      });

      const res = await fetch('/api/entries/concurrent-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: payloadEntries,
          streamSource: 'multi-part-concurrent-terminal',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      OfflineQueueService.playSuccessChime(false);

      setConsolidationReport({
        totalSubmitted: data.totalSubmitted || validRows.length,
        totalConsolidated: data.totalConsolidated || 0,
        duplicatesPrevented: data.duplicatesPrevented || 0,
        isOffline: false,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (data.consolidatedEntries && data.consolidatedEntries.length > 0) {
        onConsolidationSuccess(data.consolidatedEntries, false);
      }

      // Reset rows to empty initial state
      setRows(INITIAL_PARTS);
    } catch (err: any) {
      console.warn('Concurrent online ingest failed, saving to offline outbox buffer:', err);
      // Fallback to offline outbox
      const payloads = validRows.map((r) => {
        const val = validateAndNormalizeUgandanPhone(r.telephone);
        return {
          fullName: r.fullName.trim(),
          telephone: val.normalized || r.telephone,
          university: r.university,
          allowDuplicate: true,
        };
      });

      const added = OfflineQueueService.addMultipleToQueue(payloads);
      const consolidated = added.map((a) => a.temporaryEntry);

      setConsolidationReport({
        totalSubmitted: validRows.length,
        totalConsolidated: consolidated.length,
        duplicatesPrevented: 0,
        isOffline: true,
        timestamp: new Date().toLocaleTimeString(),
      });

      onConsolidationSuccess(consolidated, true);
      setRows(INITIAL_PARTS);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate concurrent 5-part stream arrival
  const handleSimulateConcurrentStream = async () => {
    setIsSimulating(true);
    handlePopulateSampleStream();
    setTimeout(async () => {
      await executeConcurrentConsolidation();
      setIsSimulating(false);
    }, 1200);
  };

  return (
    <div className="w-full space-y-4">
      {/* Terminal Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 rounded-2xl border border-cyan-800/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Multi-Part Concurrent Ingestion Matrix
            </h3>
            <p className="text-[11px] font-mono text-cyan-300/80">
              Input and consolidate from {rows.length} stations simultaneously • Online & Offline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePopulateSampleStream}
            className="px-2.5 py-1.5 text-[11px] font-mono font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 rounded-xl border border-cyan-700/50 transition cursor-pointer flex items-center gap-1.5"
            title="Auto-populate sample Ugandan data to test concurrent submission"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setPasteModalOpen(true)}
            className="px-2.5 py-1.5 text-[11px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            title="Paste multi-line roster from spreadsheet or clipboard"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Paste Roster</span>
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="px-2.5 py-1.5 text-[11px] font-mono font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 rounded-xl border border-emerald-700/50 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Station</span>
          </button>
        </div>
      </div>

      {/* Success Consolidation Report Card */}
      {consolidationReport && (
        <div className="p-3 bg-cyan-950/90 border border-cyan-500/60 rounded-2xl animate-fade-in text-cyan-100 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-mono font-bold text-white block">
                ✓ Consolidated {consolidationReport.totalConsolidated} Records across Parallel Stations
              </span>
              <span className="text-[11px] font-mono text-cyan-300">
                {consolidationReport.isOffline ? 'Queued to Offline Outbox (0ms zero-loss)' : 'Synced directly to Core & Google Sheets'}{' '}
                {consolidationReport.duplicatesPrevented > 0 && `• ${consolidationReport.duplicatesPrevented} duplicate phone(s) blocked`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-cyan-900/80 text-cyan-300 shrink-0">
            {consolidationReport.timestamp}
          </span>
        </div>
      )}

      {/* Parallel Multi-Station Rows Matrix */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {rows.map((row, index) => {
          return (
            <div
              key={row.id}
              className="p-3 bg-slate-900/70 hover:bg-slate-900 rounded-xl border border-slate-800 transition shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800">
                    PART {index + 1}
                  </span>
                  <input
                    type="text"
                    value={row.partName}
                    onChange={(e) => handleRowChange(row.id, 'partName', e.target.value)}
                    className="text-xs font-mono font-medium text-slate-300 bg-transparent border-none focus:outline-none hover:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {row.carrier && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                      ✓ {row.carrier}
                    </span>
                  )}
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                      title="Remove station row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Full Name Input */}
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={row.fullName}
                    onChange={(e) => handleRowChange(row.id, 'fullName', e.target.value)}
                    placeholder="Full Name (e.g. John Mukasa)"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Telephone Number Input */}
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={row.telephone}
                    onChange={(e) => handleRowChange(row.id, 'telephone', e.target.value)}
                    placeholder="0700123456"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* University Target Selector */}
                <div className="sm:col-span-4">
                  <select
                    value={row.university}
                    onChange={(e) => handleRowChange(row.id, 'university', e.target.value as UniversityName)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-slate-200 focus:outline-none"
                  >
                    {UNIVERSITIES.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.acronym} - {u.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Concurrent Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={executeConcurrentConsolidation}
          disabled={isSubmitting || isSimulating}
          className="w-full sm:flex-1 py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>CONSOLIDATING {rows.length} STREAMS...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-black" />
              <span>CONSOLIDATE ALL {rows.length} PARTS NOW</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSimulateConcurrentStream}
          disabled={isSubmitting || isSimulating}
          className="w-full sm:w-auto py-3.5 px-4 rounded-xl font-mono font-semibold text-xs text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-cyan-700/60 transition cursor-pointer flex items-center justify-center gap-2"
          title="Simulate 5 field mobilizers clicking submit at the exact same millisecond"
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate 5 Parallel Hits</span>
            </>
          )}
        </button>
      </div>

      {/* Paste Roster Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-800 rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white uppercase">
                Paste Multi-Line Roster
              </h3>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Close ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Paste rows from Excel, WhatsApp, or roster. Format per line: <br />
              <code className="text-cyan-300">FullName, Telephone, University (optional)</code>
            </p>
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Sarah Nalubega, 0701234567, KIU\nJohn Mukasa, 0772345678, CUU\nEmmanuel Otim, 0783456789, IUEA`}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPastedRoster}
                className="px-4 py-2 text-xs font-mono font-bold bg-cyan-400 text-black hover:bg-cyan-300 rounded-xl"
              >
                Parse into Grid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
