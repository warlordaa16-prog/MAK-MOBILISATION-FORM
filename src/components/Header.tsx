import React, { useEffect, useState } from 'react';
import { Building2, Shield, RefreshCw, CheckCircle2, Wifi, WifiOff, CloudUpload } from 'lucide-react';
import { UniversityName } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useFullConnectivity } from '../hooks/useOnlineStatus';
import { OfflineQueueService } from '../services/offlineQueue';

interface HeaderProps {
  selectedUniversity: UniversityName | null;
  onSwitchUniversity: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
  onOpenOutbox?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedUniversity,
  onSwitchUniversity,
  onOpenAdmin,
  isAdminLoggedIn,
  onOpenOutbox,
}) => {
  const { isOnline, isPhysicalOnline, isManualOffline } = useFullConnectivity();
  const [queuedCount, setQueuedCount] = useState<number>(() => OfflineQueueService.getQueue().length);

  useEffect(() => {
    const updateQueue = () => {
      setQueuedCount(OfflineQueueService.getQueue().length);
    };
    updateQueue();
    const unsubscribe = OfflineQueueService.subscribe(updateQueue);
    return () => unsubscribe();
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: App Title & Status */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Campus Mobilization
              </h1>
              {isOnline ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-2.5 h-2.5" />
                  Offline Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Central Google Sheets Data Collection • 5 Campuses
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Outbox Badge Pill */}
          {queuedCount > 0 && onOpenOutbox && (
            <button
              id="header-outbox-btn"
              onClick={onOpenOutbox}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/90 hover:bg-amber-900/90 px-3 py-1.5 rounded-xl border border-amber-600/80 transition cursor-pointer active:scale-95 animate-pulse"
              title="Open Offline Outbox"
            >
              <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
              <span>{queuedCount} Queued</span>
            </button>
          )}

          <PWAInstallButton />

          {selectedUniversity && (
            <button
              id="switch-univ-header-btn"
              onClick={onSwitchUniversity}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl border border-slate-700 transition cursor-pointer active:scale-95"
              title="Change your active campus"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Switch Campus</span>
            </button>
          )}

          <button
            id="admin-dashboard-btn"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer border active:scale-95 ${
              isAdminLoggedIn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Administrator Portal"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAdminLoggedIn ? 'Admin Portal' : 'Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
