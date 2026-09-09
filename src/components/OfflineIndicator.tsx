import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OfflineQueueService } from '../services/offlineQueue';

interface OfflineIndicatorProps {
  onSyncComplete?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSyncComplete }) => {
  const isOnline = useOnlineStatus();
  const [queuedCount, setQueuedCount] = useState<number>(() => OfflineQueueService.getQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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
    if (isOnline && queuedCount > 0 && !isSyncing) {
      handleSyncNow();
    }
  }, [isOnline]);

  const handleSyncNow = async () => {
    const queue = OfflineQueueService.getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/entries/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: queue }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((res: any) => {
            if (res.success && res.queueId) {
              OfflineQueueService.removeFromQueue(res.queueId);
              if (res.entry) {
                OfflineQueueService.updateRecentEntryStatus(res.queueId, res.entry);
              }
            }
          });
        }
        setSyncFeedback(`Successfully synchronized ${data.syncedCount || queue.length} record(s).`);
        setTimeout(() => setSyncFeedback(null), 4000);
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncFeedback('Synchronization error. Will retry automatically.');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('Sync attempt failed, retaining queue:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && queuedCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <aside aria-label="Network and synchronization alerts" className="w-full">
      {!isOnline && (
        <div id="offline-banner" className="bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-2xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              <strong>Offline</strong> — entries will be synchronized when connection returns. ({queuedCount} in queue)
            </span>
          </div>
        </div>
      )}

      {isOnline && queuedCount > 0 && (
        <div id="queue-sync-banner" className="bg-blue-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs">
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                <strong>{queuedCount}</strong> offline record{queuedCount > 1 ? 's' : ''} waiting to synchronize to Google Sheets.
              </span>
            </div>
            <button
              id="sync-now-btn"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-3 py-1 bg-white text-blue-700 rounded-md font-semibold text-xs hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      )}

      {syncFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-xs text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncFeedback}</span>
        </div>
      )}
    </aside>
  );
};
