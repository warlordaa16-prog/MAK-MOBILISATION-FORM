import React, { useState } from 'react';
import { 
  X, 
  CloudUpload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Phone,
  User,
  Building2
} from 'lucide-react';
import { OfflineQueueService, QueuedEntry } from '../services/offlineQueue';
import { useFullConnectivity } from '../hooks/useOnlineStatus';
import { UNIVERSITIES } from '../types';

interface OfflineOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const OfflineOutboxModal: React.FC<OfflineOutboxModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
}) => {
  const { isPhysicalOnline, isManualOffline, toggleManualOffline } = useFullConnectivity();
  const [queue, setQueue] = useState<QueuedEntry[]>(() => OfflineQueueService.getQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const refreshQueue = () => {
    setQueue(OfflineQueueService.getQueue());
  };

  const handleSyncAll = async () => {
    if (!isPhysicalOnline) {
      setFeedback({
        success: false,
        message: 'No internet connection detected. Please connect to Wi-Fi or mobile data to sync.',
      });
      return;
    }

    setIsSyncing(true);
    setFeedback(null);

    const result = await OfflineQueueService.syncQueue();
    setIsSyncing(false);
    refreshQueue();

    setFeedback({
      success: result.success,
      message: result.message || (result.success ? 'Sync completed' : 'Sync encountered an issue'),
    });

    if (result.success && onSyncSuccess) {
      onSyncSuccess();
    }
  };

  const handleExportCSV = () => {
    OfflineQueueService.exportQueueCSV();
  };

  const handleRemoveItem = (queueId: string) => {
    if (confirm('Are you sure you want to remove this record from the offline queue?')) {
      OfflineQueueService.removeFromQueue(queueId);
      refreshQueue();
    }
  };

  const handleClearAll = () => {
    if (confirm('Warning: This will clear all offline queued records that have not been synced yet. Are you sure?')) {
      OfflineQueueService.clearQueue();
      refreshQueue();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="outbox-title"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="outbox-title" className="text-base sm:text-lg font-bold">
                  Offline Outbox
                </h2>
                <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  {queue.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Records captured offline stored safely on this device
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectivity Status & Controls Bar */}
        <div className="bg-slate-50 px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isPhysicalOnline ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Internet Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Off Internet (Offline)</span>
              </span>
            )}

            {isManualOffline && (
              <span className="font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                Manual Offline Mode Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleManualOffline}
              className="text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
            >
              {isManualOffline ? 'Disable Manual Offline' : 'Test Offline Mode'}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 mx-4 sm:mx-5 mt-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
              feedback.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Body: Queue List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {queue.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Outbox is Empty
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1">
                All mobilized participant entries are synchronized with the central Google Sheet.
              </p>
            </div>
          ) : (
            queue.map((item, idx) => {
              const univ = UNIVERSITIES.find((u) => u.name === item.university);
              const acronym = univ ? univ.acronym : item.university.slice(0, 4);
              const timeStr = item.queuedAt ? new Date(item.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={item.queueId || idx}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {acronym}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200">
                          {item.temporaryEntry?.id || `#OFF-${idx + 1}`}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {item.fullName}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.telephone}
                        </span>
                        <span>•</span>
                        <span className="font-sans text-slate-600">
                          {item.university}
                        </span>
                        {timeStr && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-400 font-sans">
                              <Clock className="w-3 h-3" />
                              {timeStr}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRemoveItem(item.queueId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Discard entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {queue.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  title="Export offline entries to CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>

            {queue.length > 0 && (
              <button
                id="outbox-sync-all-btn"
                onClick={handleSyncAll}
                disabled={isSyncing || !isPhysicalOnline}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing to Sheets...' : `Sync All (${queue.length})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
