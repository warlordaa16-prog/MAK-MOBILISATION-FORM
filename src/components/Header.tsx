import React from 'react';
import { Building2, Shield } from 'lucide-react';
import { UniversityName } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  selectedUniversity?: UniversityName | null;
  onSwitchUniversity?: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
  onOpenOutbox?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  isAdminLoggedIn,
}) => {
  return (
    <header className="bg-[#1f1338]/90 backdrop-blur-xl text-white border-b border-purple-400/20 sticky top-0 z-40 shadow-lg shadow-black/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Clean App Branding */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white flex items-center justify-center shadow-md shadow-rose-950/40">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
              Student Mobilization
            </h1>
            <p className="text-[11px] text-purple-200/70 font-medium">
              Data Entry Portal
            </p>
          </div>
        </div>

        {/* Right Actions: Admin Portal & PWA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />

          <button
            id="admin-dashboard-btn"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer border active:scale-95 backdrop-blur-md shadow-sm ${
              isAdminLoggedIn
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title="Administrator Portal"
          >
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>Admin Portal</span>
          </button>
        </div>
      </div>
    </header>
  );
};
