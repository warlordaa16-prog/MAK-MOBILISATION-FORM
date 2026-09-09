import React from 'react';
import { Building2, Shield, RefreshCw } from 'lucide-react';
import { UniversityName } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  selectedUniversity: UniversityName | null;
  onSwitchUniversity: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedUniversity,
  onSwitchUniversity,
  onOpenAdmin,
  isAdminLoggedIn,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: App Title */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-wide uppercase leading-tight text-white">
              University Mobilization
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Rapid Data Collection System
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {selectedUniversity && (
            <button
              id="switch-univ-header-btn"
              onClick={onSwitchUniversity}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Change your active university"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Switch Campus</span>
            </button>
          )}

          <button
            id="admin-dashboard-btn"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition cursor-pointer border ${
              isAdminLoggedIn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Administrator Portal & Google Sheets Stats"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{isAdminLoggedIn ? 'Admin Portal' : 'Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
