import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OfflineOutboxModal } from './components/OfflineOutboxModal';
import { AdminDashboard } from './components/AdminDashboard';
import { UniversitySelector } from './components/UniversitySelector';
import { MobilizationForm } from './components/MobilizationForm';
import { SessionCounter } from './components/SessionCounter';
import { RecentEntriesList } from './components/RecentEntriesList';
import { DataSummation } from './components/DataSummation';
import { UniversityName, MobilizationEntry } from './types';
import { OfflineQueueService } from './services/offlineQueue';
import { useFullConnectivity } from './hooks/useOnlineStatus';

export default function App() {
  const { isOnline } = useFullConnectivity();
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityName | null>(() => {
    const saved = OfflineQueueService.getSelectedUniversity();
    return (saved as UniversityName) || null;
  });

  const [sessionCount, setSessionCount] = useState<number>(() => {
    return OfflineQueueService.getSessionCounter();
  });

  const [recentEntries, setRecentEntries] = useState<MobilizationEntry[]>(() => {
    return OfflineQueueService.getRecentEntries();
  });

  const [totalEntriesCount, setTotalEntriesCount] = useState<number>(() => {
    return OfflineQueueService.getRecentEntries().length;
  });

  const [queuedCount, setQueuedCount] = useState<number>(() => {
    return OfflineQueueService.getQueue().length;
  });

  const [isOutboxOpen, setIsOutboxOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('univmob_admin_token');
  });

  // Load telemetry stats and recent entries from server on mount
  useEffect(() => {
    fetchTelemetry();

    const unsubscribe = OfflineQueueService.subscribe(() => {
      setSessionCount(OfflineQueueService.getSessionCounter());
      const recents = OfflineQueueService.getRecentEntries();
      setRecentEntries(recents);
      setQueuedCount(OfflineQueueService.getQueue().length);
    });

    return () => unsubscribe();
  }, []);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/entries/consolidation-telemetry');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.totalEntries === 'number') {
          setTotalEntriesCount(data.totalEntries);
        }
        if (data.recentConsolidated && Array.isArray(data.recentConsolidated)) {
          const queue = OfflineQueueService.getQueue();
          const queuedTemporary = queue.map((q) => q.temporaryEntry);
          const combined = [...queuedTemporary, ...data.recentConsolidated];
          setRecentEntries(combined.slice(0, 20));
        }
      }
    } catch {
      // Offline fallback: rely on local queue and cached recent entries
      const recents = OfflineQueueService.getRecentEntries();
      setRecentEntries(recents);
      setTotalEntriesCount(recents.length);
    }
  };

  const handleUniversitySelect = (univ: UniversityName) => {
    setSelectedUniversity(univ);
    OfflineQueueService.setSelectedUniversity(univ);
  };

  const handleSwitchUniversity = () => {
    setSelectedUniversity(null);
  };

  // Called whenever an entry is saved via the mobilization form
  const handleEntrySaved = (entry: MobilizationEntry, _isOffline: boolean) => {
    setRecentEntries((prev) => [entry, ...prev].slice(0, 25));
    setTotalEntriesCount((prev) => prev + 1);
    setQueuedCount(OfflineQueueService.getQueue().length);
    setSessionCount(OfflineQueueService.getSessionCounter());
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('univmob_admin_token');
    localStorage.removeItem('univmob_admin_user');
    setIsAdminLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative selection:bg-blue-600 selection:text-white">
      {/* App Header */}
      <Header
        selectedUniversity={selectedUniversity}
        onSwitchUniversity={handleSwitchUniversity}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenOutbox={() => setIsOutboxOpen(true)}
      />

      {/* Offline Alert & Background Sync Banner */}
      <OfflineIndicator onSyncComplete={fetchTelemetry} />

      {/* Offline Outbox Modal */}
      <OfflineOutboxModal
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
        onSyncSuccess={fetchTelemetry}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {!selectedUniversity ? (
          /* Step 1: Select University Once */
          <UniversitySelector
            selectedUniversity={selectedUniversity}
            onSelect={handleUniversitySelect}
          />
        ) : (
          /* Step 2: High-Speed Mobilization Workflow */
          <div className="space-y-6">
            {/* Session Counter */}
            <SessionCounter
              count={sessionCount}
              selectedUniversity={selectedUniversity}
              onResetCounter={() => {
                OfflineQueueService.resetSessionCounter();
                setSessionCount(0);
              }}
            />

            {/* Rapid-Fire Data Entry Form */}
            <MobilizationForm
              selectedUniversity={selectedUniversity}
              onSwitchUniversity={handleSwitchUniversity}
              onEntrySaved={handleEntrySaved}
            />

            {/* Multi-Method University Summation */}
            <DataSummation
              selectedUniversity={selectedUniversity}
              onSelectUniversity={handleUniversitySelect}
              sessionCount={sessionCount}
              lastSavedEntry={recentEntries[0] || null}
            />

            {/* Recent Entries List */}
            <RecentEntriesList entries={recentEntries} />
          </div>
        )}
      </main>

      {/* Clean Original Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium">University Mobilization System • 5 Partner Campuses</span>
          <span>Central Real-Time Google Sheets Integration</span>
        </div>
      </footer>

      {/* Administrator Portal Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isAdminLoggedIn={isAdminLoggedIn}
        onLoginSuccess={handleAdminLoginSuccess}
        onLogout={handleAdminLogout}
      />
    </div>
  );
}
