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
    <header className="bg-[#1f1338]/85 backdrop-blur-xl text-white border-b border-purple-400/20 sticky top-0 z-40 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: App Title & Status */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white flex items-center justify-center shadow-md shadow-rose-950/40">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
                Campus Mobilization
              </h1>
              {isOnline ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#ff8f8f] bg-[#ff4d46]/20 border border-[#ff4d46]/40 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  <WifiOff className="w-2.5 h-2.5" />
                  Offline Mode
                </span>
              )}
            </div>
            <p className="text-xs text-purple-200/70 font-medium">
              Kampala International University (KIU) • Live Sheets Sync
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#ff4d46] to-[#e63548] px-3.5 py-1.5 rounded-xl shadow-md shadow-rose-950/40 border border-rose-400/30 transition cursor-pointer active:scale-95 animate-pulse"
              title="Open Offline Outbox"
            >
              <CloudUpload className="w-3.5 h-3.5 text-white" />
              <span>{queuedCount} Queued</span>
            </button>
          )}

          <PWAInstallButton />

          {selectedUniversity && (
            <button
              id="switch-univ-header-btn"
              onClick={onSwitchUniversity}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl border border-white/15 backdrop-blur-md transition cursor-pointer active:scale-95"
              title="Change your active campus"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">Switch Campus</span>
            </button>
          )}

          <button
            id="admin-dashboard-btn"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer border active:scale-95 backdrop-blur-md ${
              isAdminLoggedIn
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
            title="Administrator Portal"
          >
            <Shield className="w-3.5 h-3.5 text-purple-300" />
            <span>{isAdminLoggedIn ? 'Admin Portal' : 'Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
