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
    if (saved === 'Kampala International University (KIU)') {
      return saved;
    }
    return 'Kampala International University (KIU)';
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
    <div className="min-h-screen bg-[#24173d] text-slate-100 font-sans flex flex-col relative selection:bg-[#ff4f46] selection:text-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,53,178,0.35),rgba(36,23,61,0))]">
      {/* App Header */}
      <Header
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Fast Mobilizer Workspace */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-6 py-6 space-y-4">
        {/* Rapid-Fire Data Entry Form (Only Student Name and Phone Number) */}
        <MobilizationForm
          selectedUniversity={selectedUniversity || 'Kampala International University (KIU)'}
          onSwitchUniversity={handleSwitchUniversity}
          onEntrySaved={handleEntrySaved}
        />

        {/* Clean Session Mobilization Counter */}
        <SessionCounter
          count={sessionCount}
          selectedUniversity={selectedUniversity || 'Kampala International University (KIU)'}
          onResetCounter={() => {
            OfflineQueueService.resetSessionCounter();
            setSessionCount(0);
          }}
        />

        {/* Recently Mobilized Students */}
        <RecentEntriesList entries={recentEntries} />
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="w-full border-t border-purple-900/40 bg-[#1a112e]/90 backdrop-blur-md py-4 text-center text-xs text-purple-200/60">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between text-[11px]">
          <span>Mobilization Portal</span>
          <button
            onClick={() => setIsAdminOpen(true)}
            className="text-purple-300 hover:text-white font-semibold transition cursor-pointer"
          >
            Admin Portal Access
          </button>
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
