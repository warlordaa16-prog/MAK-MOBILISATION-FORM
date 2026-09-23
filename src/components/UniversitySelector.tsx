import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ArrowRight, 
  School, 
  MapPin, 
  Users, 
  Calendar, 
  Flame, 
  Sparkles,
  ShieldCheck,
  Wifi,
  FileSpreadsheet
} from 'lucide-react';
import { UNIVERSITIES, UniversityName, UniversityOption, SchoolSummationTier } from '../types';

interface UniversitySelectorProps {
  selectedUniversity: UniversityName | null;
  onSelect: (university: UniversityName) => void;
  schoolTiers?: Record<string, SchoolSummationTier> | null;
}

export const UniversitySelector: React.FC<UniversitySelectorProps> = ({
  selectedUniversity,
  onSelect,
  schoolTiers,
}) => {
  const [localTiers, setLocalTiers] = useState<Record<string, SchoolSummationTier> | null>(schoolTiers || null);

  useEffect(() => {
    if (schoolTiers) {
      setLocalTiers(schoolTiers);
    } else {
      // Fetch live counts for campus cards
      fetch('/api/entries/summation')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.schoolTiers) {
            setLocalTiers(json.schoolTiers);
          }
        })
        .catch(() => {});
    }
  }, [schoolTiers]);

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 text-white">
      {/* Hero Welcome Section */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff4d46]/20 border border-[#ff4d46]/40 text-[#ff8f8f] text-xs font-bold mb-3 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#ff6666]" />
          <span>KIU Mobilization Portal</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Kampala International University
        </h2>
        <p className="text-sm sm:text-base text-purple-200/70 mt-2 leading-relaxed">
          Record mobilization contacts for Kansanga Main Campus & Ishaka Campus. Submissions sync directly to the dedicated KIU worksheet in Google Sheets.
        </p>

        {/* Feature Badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-purple-200">
          <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Dedicated KIU Worksheet
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
            <Wifi className="w-3.5 h-3.5 text-[#ff7575]" />
            Offline Auto-Sync
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            50 Daily Milestone Goal
          </span>
        </div>
      </div>

      {/* University Selection Grid (Single KIU Focus) */}
      <div className="max-w-xl mx-auto">
        {UNIVERSITIES.map((univ: UniversityOption) => {
          const isSelected = selectedUniversity === univ.name;
          const tier = localTiers ? localTiers[univ.name] : null;
          const todayCount = tier?.todaySum ?? 0;
          const totalCount = tier?.totalSum ?? 0;
          const progressPct = Math.min(100, Math.round((todayCount / 50) * 100));

          return (
            <div
              key={univ.id}
              id={`select-univ-${univ.id}`}
              onClick={() => onSelect(univ.name)}
              className={`relative bg-gradient-to-br from-[#352159]/90 via-[#271847]/95 to-[#1c1a4b]/90 backdrop-blur-2xl rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:shadow-2xl ${
                isSelected
                  ? 'border-[#ff4d46] ring-2 ring-[#ff4d46]/40 shadow-xl'
                  : 'border-white/15 shadow-xl hover:border-white/30'
              }`}
            >
              <div>
                {/* Top Row: Acronym Badge & Milestone Status */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base text-white shadow-lg bg-gradient-to-tr from-[#ff4d46] to-[#e63548] shrink-0 border border-rose-400/30">
                      {univ.acronym}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#ff8f8f] transition leading-snug">
                        {univ.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-purple-300/80 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{univ.campus}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Live Campus Metric Counters */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                  <div className="bg-[#1e1338]/80 rounded-2xl p-3 border border-white/10">
                    <span className="text-[11px] font-bold text-purple-300/70 uppercase tracking-wider block">
                      Total Mobilized
                    </span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {totalCount}
                    </span>
                  </div>

                  <div className="bg-[#1e1338]/80 rounded-2xl p-3 border border-white/10">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                      Today's Count
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-emerald-300">
                        {todayCount}
                      </span>
                      <span className="text-xs text-purple-300/60 font-medium">/ 50</span>
                    </div>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-medium text-purple-200/80 mb-1.5">
                    <span>Daily 50 Target</span>
                    <span className={todayCount >= 50 ? 'text-emerald-300 font-bold' : 'text-purple-200 font-bold'}>
                      {todayCount >= 50 ? 'Target Reached! 🎉' : `${progressPct}%`}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/10">
                    <div
                      style={{ width: `${progressPct}%` }}
                      className={`h-full transition-all duration-300 ${
                        todayCount >= 50
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-[#ff4d46] to-[#e63548]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-purple-300/70 font-medium">
                  Dedicated tab: <strong className="text-white">{univ.acronym}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 font-black text-[#ff7575] group-hover:translate-x-1 transition-transform">
                  <span>Start Mobilizing</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
