/**
 * University Mobilization Data Collection System
 * Rapid, mobile-first data-collection platform for university mobilizers
 * contributing to a central Google Sheet.
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UniversitySelector } from './components/UniversitySelector';
import { MobilizationForm } from './components/MobilizationForm';
import { SessionCounter } from './components/SessionCounter';
import { RecentEntriesList } from './components/RecentEntriesList';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OfflineOutboxModal } from './components/OfflineOutboxModal';
import { AdminDashboard } from './components/AdminDashboard';
import { DataSummation } from './components/DataSummation';
import { UniversityName, MobilizationEntry } from './types';
import { OfflineQueueService } from './services/offlineQueue';
import { FileSpreadsheet, ShieldCheck, Wifi, CloudUpload } from 'lucide-react';

export default function App() {
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

  const [lastSavedEntry, setLastSavedEntry] = useState<MobilizationEntry | null>(null);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('univmob_admin_token');
  });

  // Load server recent entries on mount
  useEffect(() => {
    fetchRecentEntries();

    const unsubscribe = OfflineQueueService.subscribe(() => {
      setSessionCount(OfflineQueueService.getSessionCounter());
      setRecentEntries(OfflineQueueService.getRecentEntries());
    });

    return () => unsubscribe();
  }, []);

  const fetchRecentEntries = async () => {
    try {
      const res = await fetch('/api/entries/recent?limit=10');
      if (res.ok) {
        const data = await res.json();
        if (data.entries && Array.isArray(data.entries)) {
          // Merge with any unsynced offline items from local queue
          const queue = OfflineQueueService.getQueue();
          const queuedTemporary = queue.map((q) => q.temporaryEntry);
          const combined = [...queuedTemporary, ...data.entries].slice(0, 10);
          setRecentEntries(combined);
        }
      }
    } catch {
      // Offline fallback already loaded from localStorage
    }
  };

  const handleUniversitySelect = (univ: UniversityName) => {
    setSelectedUniversity(univ);
    OfflineQueueService.setSelectedUniversity(univ);
  };

  const handleSwitchUniversity = () => {
    setSelectedUniversity(null);
  };

  const handleEntrySaved = (entry: MobilizationEntry, isOffline: boolean) => {
    // Increment session counter
    const nextCount = OfflineQueueService.incrementSessionCounter();
    setSessionCount(nextCount);

    // Track last saved entry for auto summation trigger
    setLastSavedEntry(entry);

    // Add to recent entries
    OfflineQueueService.addRecentEntry(entry);
    setRecentEntries((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, 10));
  };

  const handleResetSessionCounter = () => {
    OfflineQueueService.resetSessionCounter();
    setSessionCount(0);
  };

  const handleAdminLoginSuccess = (token: string, admin?: any) => {
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('univmob_admin_token');
    localStorage.removeItem('univmob_admin_user');
    setIsAdminLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* App Header */}
      <Header
        selectedUniversity={selectedUniversity}
        onSwitchUniversity={handleSwitchUniversity}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenOutbox={() => setIsOutboxOpen(true)}
      />

      {/* Offline & Queue Sync Alerts */}
      <OfflineIndicator onSyncComplete={fetchRecentEntries} />

      {/* Offline Outbox Modal */}
      <OfflineOutboxModal
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
        onSyncSuccess={fetchRecentEntries}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto pb-16 pt-4 sm:pt-6 px-4 sm:px-6">
        {!selectedUniversity ? (
          /* Homepage: Campus Selection Grid & Live Progress */
          <div className="space-y-8">
            <UniversitySelector
              selectedUniversity={selectedUniversity}
              onSelect={handleUniversitySelect}
            />

            {/* Independent School Tallies */}
            <DataSummation
              selectedUniversity={null}
              sessionCount={sessionCount}
              lastSavedEntry={lastSavedEntry}
            />
          </div>
        ) : (
          /* Mobilization Entry Mode */
          <div className="max-w-2xl mx-auto space-y-4">
            {/* The Rapid Entry Form */}
            <MobilizationForm
              selectedUniversity={selectedUniversity}
              onSwitchUniversity={handleSwitchUniversity}
              onEntrySaved={handleEntrySaved}
            />

            {/* Live Summation for Current Campus */}
            <DataSummation
              selectedUniversity={selectedUniversity}
              sessionCount={sessionCount}
              lastSavedEntry={lastSavedEntry}
            />

            {/* Session Activity Counter */}
            <SessionCounter
              count={sessionCount}
              selectedUniversity={selectedUniversity}
              onResetCounter={handleResetSessionCounter}
            />

            {/* Recent Mobilized Contacts */}
            <RecentEntriesList entries={recentEntries} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Campus Mobilization System • Live Google Sheets Sync</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-slate-600 hover:text-slate-900 transition font-medium cursor-pointer"
            >
              Admin Portal
            </button>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Wifi className="w-3 h-3 text-emerald-600" />
              PWA & Offline Ready
            </span>
          </div>
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
