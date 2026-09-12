import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload, ExternalLink, ShieldCheck } from 'lucide-react';
import { useFullConnectivity } from '../hooks/useOnlineStatus';
import { OfflineQueueService } from '../services/offlineQueue';
import { OfflineOutboxModal } from './OfflineOutboxModal';

interface OfflineIndicatorProps {
  onSyncComplete?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSyncComplete }) => {
  const { isOnline, isPhysicalOnline, isManualOffline, toggleManualOffline } = useFullConnectivity();
  const [queuedCount, setQueuedCount] = useState<number>(() => OfflineQueueService.getQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);

  useEffect(() => {
    const updateQueue = () => {
      setQueuedCount(OfflineQueueService.getQueue().length);
    };

    updateQueue();
    const unsubscribe = OfflineQueueService.subscribe(updateQueue);
    return () => unsubscribe();
  }, []);

  // Automatically trigger sync when coming back online
  useEffect(() => {
    if (isPhysicalOnline && !isManualOffline && queuedCount > 0 && !isSyncing) {
      handleSyncNow();
    }
  }, [isPhysicalOnline, isManualOffline]);

  const handleSyncNow = async () => {
    if (queuedCount === 0 || !isPhysicalOnline) return;

    setIsSyncing(true);
    try {
      const res = await OfflineQueueService.syncQueue();
      if (res.success && res.syncedCount > 0) {
        setSyncFeedback(`✓ Synchronized ${res.syncedCount} record(s) to Google Sheets.`);
        setTimeout(() => setSyncFeedback(null), 4000);
        if (onSyncComplete) onSyncComplete();
      } else if (!res.success) {
        setSyncFeedback(res.message || 'Sync will retry automatically.');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('Sync attempt failed, retaining queue:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <aside aria-label="Network and synchronization alerts" className="w-full">
        {/* Physical Offline or Manual Offline Banner */}
        {!isOnline && (
          <div id="offline-banner" className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm transition">
            <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
                <span>
                  <strong>Off Internet Mode Active</strong> — You can safely add participants. Data is stored on your device and will auto-sync to Google Sheets once reconnected.
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {queuedCount > 0 && (
                  <button
                    onClick={() => setIsOutboxOpen(true)}
                    className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Outbox ({queuedCount})</span>
                  </button>
                )}
                {isManualOffline && (
                  <button
                    onClick={toggleManualOffline}
                    className="px-2 py-1 bg-amber-800/80 hover:bg-amber-900 text-amber-100 rounded-lg text-xs transition cursor-pointer underline"
                  >
                    Switch to Online
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Online but has queued offline items waiting to sync */}
        {isOnline && queuedCount > 0 && (
          <div id="queue-sync-banner" className="bg-blue-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm animate-fade-in">
            <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <CloudUpload className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>
                  <strong>{queuedCount}</strong> offline record{queuedCount > 1 ? 's' : ''} stored locally, ready to synchronize to Google Sheets.
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => setIsOutboxOpen(true)}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
                >
                  View Outbox
                </button>
                <button
                  id="sync-now-btn"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-3.5 py-1 bg-white text-blue-700 hover:bg-blue-50 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Success Feedback Toast */}
        {syncFeedback && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-xs text-center flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </aside>

      {/* Outbox Modal */}
      <OfflineOutboxModal
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
        onSyncSuccess={() => {
          if (onSyncComplete) onSyncComplete();
        }}
      />
    </>
  );
};
