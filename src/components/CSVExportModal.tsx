import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  Filter,
  FileSpreadsheet,
  Calendar,
  Building2,
  X,
  ExternalLink,
  Table,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Lock,
} from 'lucide-react';
import { UNIVERSITIES, AdminRole, UniversityName } from '../types';

interface CSVExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken?: string;
  adminRole?: AdminRole;
  userUniversity?: string | null;
  defaultUniversity?: string;
}

interface ColumnOption {
  key: string;
  label: string;
  defaultSelected: boolean;
  description: string;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { key: 'id', label: 'Record ID', defaultSelected: true, description: 'Orderly sequential identifier (1, 2, 3... to infinity)' },
  { key: 'fullName', label: 'Full Name', defaultSelected: true, description: 'Mobilized candidate name' },
  { key: 'telephone', label: 'Telephone Number', defaultSelected: true, description: 'Normalized Uganda phone number' },
  { key: 'university', label: 'University', defaultSelected: true, description: 'Target mobilization institution' },
  { key: 'date', label: 'Date', defaultSelected: true, description: 'Mobilization date (DD/MM/YYYY)' },
  { key: 'time', label: 'Time', defaultSelected: true, description: 'Mobilization local time (HH:MM)' },
  { key: 'timestamp', label: 'Timestamp (EAT)', defaultSelected: true, description: 'ISO-8601 East Africa timestamp' },
  { key: 'syncedToGoogleSheets', label: 'Sheets Synced', defaultSelected: true, description: 'Central Google Sheets sync status' },
  { key: 'createdAt', label: 'Created At (UTC)', defaultSelected: false, description: 'Server system creation time' },
];

const SLUG_MAP: Record<string, string> = {
  'Kampala International University (KIU)': 'kiu',
};

export const CSVExportModal: React.FC<CSVExportModalProps> = ({
  isOpen,
  onClose,
  adminToken = '',
  adminRole = 'SYSTEM_ADMIN',
  userUniversity = null,
  defaultUniversity = 'all',
}) => {
  const isUniversityAdmin = adminRole === 'UNIVERSITY_ADMIN' && !!userUniversity;

  const [selectedUniversity, setSelectedUniversity] = useState<string>(
    isUniversityAdmin && userUniversity ? userUniversity : defaultUniversity
  );
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [syncFilter, setSyncFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key)
  );

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Live preview entries & count
  const [previewData, setPreviewData] = useState<{
    entries: any[];
    total: number;
  }>({ entries: [], total: 0 });

  // Update token fallback from localStorage if not passed
  const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('univmob_admin_token') || '' : '');

  // Keep selected university synchronized with role
  useEffect(() => {
    if (isUniversityAdmin && userUniversity) {
      setSelectedUniversity(userUniversity);
    } else if (defaultUniversity) {
      setSelectedUniversity(defaultUniversity);
    }
  }, [isUniversityAdmin, userUniversity, defaultUniversity, isOpen]);

  // Fetch preview count & sample entries whenever filters change
  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const queryParams = new URLSearchParams();

        const univToQuery = isUniversityAdmin && userUniversity ? userUniversity : selectedUniversity;
        if (univToQuery && univToQuery !== 'all') {
          queryParams.set('university', univToQuery);
        }

        if (dateFilter === 'today') {
          const now = new Date();
          const d = String(now.getDate()).padStart(2, '0');
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const y = now.getFullYear();
          queryParams.set('date', `${d}/${m}/${y}`);
        } else if (dateFilter === 'custom' && customDate) {
          queryParams.set('date', customDate);
        }

        if (syncFilter !== 'all') {
          queryParams.set('synced', syncFilter);
        }

        queryParams.set('limit', '5'); // Sample for preview

        const res = await fetch(`/api/admin/entries?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setPreviewData({
            entries: data.entries || [],
            total: data.total || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load export preview:', err);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 150);
    return () => clearTimeout(timer);
  }, [isOpen, selectedUniversity, isUniversityAdmin, userUniversity, dateFilter, customDate, syncFilter, token]);

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map((c) => c.key));
  };

  const selectEssentialColumns = () => {
    setSelectedColumns(['id', 'fullName', 'telephone', 'university', 'date']);
  };

  // Generate CSV text for preview or copy
  const generatedCsvString = useMemo(() => {
    const colLabels = selectedColumns
      .map((k) => AVAILABLE_COLUMNS.find((c) => c.key === k)?.label || k)
      .join(',');

    const rows = previewData.entries.map((entry) => {
      return selectedColumns
        .map((k) => {
          let val = entry[k];
          if (k === 'syncedToGoogleSheets') val = val ? 'Yes' : 'No';
          if (val === undefined || val === null) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    return [colLabels, ...rows].join('\n');
  }, [previewData.entries, selectedColumns]);

  const estimatedFileSizeKB = useMemo(() => {
    const avgRowBytes = selectedColumns.length * 24;
    const totalBytes = avgRowBytes * previewData.total;
    return (totalBytes / 1024).toFixed(1);
  }, [selectedColumns.length, previewData.total]);

  // Build expected filename
  const targetFilename = useMemo(() => {
    const safeDate = new Date().toISOString().slice(0, 10);
    const effectiveUniv = isUniversityAdmin && userUniversity ? userUniversity : selectedUniversity;
    if (effectiveUniv && effectiveUniv !== 'all') {
      const slug = SLUG_MAP[effectiveUniv] || 'university';
      return `${slug}_mobilization_${safeDate}.csv`;
    }
    return `all_universities_mobilization_${safeDate}.csv`;
  }, [isUniversityAdmin, userUniversity, selectedUniversity]);

  // Build full export URL
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    const effectiveUniv = isUniversityAdmin && userUniversity ? userUniversity : selectedUniversity;
    if (effectiveUniv && effectiveUniv !== 'all') {
      params.set('university', effectiveUniv);
    }
    if (dateFilter === 'today') {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      params.set('date', `${d}/${m}/${y}`);
    } else if (dateFilter === 'custom' && customDate) {
      params.set('date', customDate);
    }
    if (syncFilter !== 'all') {
      params.set('synced', syncFilter);
    }
    params.set('columns', selectedColumns.join(','));
    if (token) {
      params.set('token', token);
    }
    return `/api/admin/export?${params.toString()}`;
  }, [isUniversityAdmin, userUniversity, selectedUniversity, dateFilter, customDate, syncFilter, selectedColumns, token]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const res = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to download CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetFilename;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate CSV export file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyClipboard = () => {
    if (!generatedCsvString) return;
    navigator.clipboard.writeText(generatedCsvString);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      id="csv-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div
        id="csv-export-modal-container"
        className="relative w-full max-w-4xl bg-[#080c16] text-slate-100 rounded-3xl border border-red-500/40 shadow-[0_0_50px_rgba(220,38,38,0.25)] overflow-hidden my-4 flex flex-col max-h-[92vh]"
      >
        {/* Top Japanese Tablet Header Bar */}
        <div className="relative px-6 py-4 bg-slate-950/90 border-b border-red-500/20 flex items-center justify-between shrink-0 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 border border-red-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(220,38,38,0.4)]">
              <Table className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-white">
                  MOBILIZATION INTEL • CSV EXPORT
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/40">
                  {isUniversityAdmin ? `${SLUG_MAP[userUniversity || '']?.toUpperCase()} ADMIN` : 'SYSTEM ADMIN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isUniversityAdmin
                  ? `Direct dataset extraction isolated to ${userUniversity}`
                  : 'Multi-university data pipeline & custom column extractor'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-900 rounded-xl transition cursor-pointer"
            title="Close Exporter"
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Target File Info Banner */}
          <div className="p-3 bg-red-950/40 rounded-2xl border border-red-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-slate-300">
                Target Export File:{' '}
                <strong className="font-mono text-white bg-slate-900/90 px-2 py-0.5 rounded border border-red-500/20">
                  {targetFilename}
                </strong>
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
              {previewData.total} record(s) in scope
            </span>
          </div>

          {/* Section 1: Scope & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* University Filter */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-red-500/20">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-red-400" />
                <span>Target University</span>
                {isUniversityAdmin && <Lock className="w-3 h-3 text-amber-400 ml-auto" />}
              </label>

              {isUniversityAdmin ? (
                <div className="p-2.5 bg-slate-950 rounded-xl border border-red-500/30 text-xs">
                  <div className="font-bold text-white leading-tight">{userUniversity}</div>
                  <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Strict university isolation active (Locked)</span>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-red-500/30 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-red-400 cursor-pointer"
                >
                  <option value="all">All Participating Universities (Central)</option>
                  {UNIVERSITIES.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.acronym} - {u.shortName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-red-500/20">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span>Date Range</span>
              </label>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDateFilter('all')}
                    className={`py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                      dateFilter === 'all' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('today')}
                    className={`py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                      dateFilter === 'today' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('custom')}
                    className={`py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                      dateFilter === 'custom' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {dateFilter === 'custom' && (
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-red-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-red-400"
                  />
                )}
              </div>
            </div>

            {/* Sync State Filter */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-red-500/20">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-red-400" />
                <span>Google Sheets Sync</span>
              </label>

              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSyncFilter('all')}
                  className={`py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer ${
                    syncFilter === 'all' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSyncFilter('yes')}
                  className={`py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer ${
                    syncFilter === 'yes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Synced
                </button>
                <button
                  type="button"
                  onClick={() => setSyncFilter('no')}
                  className={`py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer ${
                    syncFilter === 'no' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Columns Selection */}
          <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-red-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Columns to Include ({selectedColumns.length}/{AVAILABLE_COLUMNS.length})
                </h4>
                <p className="text-[11px] text-slate-400">Standard spreadsheet columns for statistical analysis</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectEssentialColumns}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={selectAllColumns}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  Select All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_COLUMNS.map((col) => {
                const isChecked = selectedColumns.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                      isChecked
                        ? 'bg-red-950/60 border-red-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isChecked ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="truncate">
                      <span className="font-bold block truncate leading-tight">{col.label}</span>
                      <span className="text-[10px] text-slate-500 truncate block">{col.key}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Preview & Monospace Terminal */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <span className="font-mono text-slate-400">CSV Structure Sample (First 5 Rows)</span>
              <span className="text-[11px] font-mono text-slate-500">
                Est. Size: ~{estimatedFileSizeKB} KB
              </span>
            </div>

            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre p-2 bg-black/60 rounded-xl border border-slate-900 max-h-36">
              {isLoadingPreview
                ? 'Generating real-time CSV preview...'
                : generatedCsvString || 'No data matching selected criteria.'}
            </pre>
          </div>

          {/* Section 4: Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                {copiedToClipboard ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copy Raw CSV</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="modal-download-csv-action-btn"
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || previewData.total === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition active:scale-[0.99] cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Download className="w-4 h-4 text-white" />
                <span>
                  {isDownloading
                    ? 'Preparing Download...'
                    : downloadSuccess
                    ? 'CSV File Downloaded!'
                    : `Download ${targetFilename}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
