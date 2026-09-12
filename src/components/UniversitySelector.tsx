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
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      {/* Hero Welcome Section */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Campus Mobilization System</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Select Your Campus
        </h2>
        <p className="text-sm sm:text-base text-slate-500 mt-2 leading-relaxed">
          Choose the university you are mobilizing from. Submissions sync directly to your institution's dedicated worksheet.
        </p>

        {/* Feature Badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Dedicated Worksheets
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
            <Wifi className="w-3.5 h-3.5 text-blue-600" />
            Offline Auto-Sync
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            50 Daily Milestone Goal
          </span>
        </div>
      </div>

      {/* University Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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
              className={`relative bg-white rounded-2xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:shadow-md hover:border-slate-300 ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md bg-blue-50/30'
                  : 'border-slate-200/90 shadow-xs'
              }`}
            >
              <div>
                {/* Top Row: Acronym Badge & Milestone Status */}
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base text-white shadow-sm shrink-0 ${univ.accentBg}`}
                    >
                      {univ.acronym}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                        {univ.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{univ.campus}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Live Campus Metric Counters */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Total Mobilized
                    </span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      {totalCount}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                      Today's Count
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-black text-emerald-700">
                        {todayCount}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ 50</span>
                    </div>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                    <span>Daily 50 Target</span>
                    <span className={todayCount >= 50 ? 'text-emerald-600 font-bold' : 'text-slate-700 font-semibold'}>
                      {todayCount >= 50 ? 'Target Reached! 🎉' : `${progressPct}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${progressPct}%` }}
                      className={`h-full transition-all duration-300 ${
                        todayCount >= 50 ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Dedicated tab: <strong>{univ.acronym}</strong>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Start Mobilizing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
