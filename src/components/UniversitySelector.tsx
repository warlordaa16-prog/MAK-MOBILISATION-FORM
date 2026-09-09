import React from 'react';
import { Check, ChevronRight, School } from 'lucide-react';
import { UNIVERSITIES, UniversityName, UniversityOption } from '../types';

interface UniversitySelectorProps {
  selectedUniversity: UniversityName | null;
  onSelect: (university: UniversityName) => void;
}

export const UniversitySelector: React.FC<UniversitySelectorProps> = ({
  selectedUniversity,
  onSelect,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto py-4 px-2">
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <School className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Select Your University
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Choose the university you are mobilizing from. This will remain active for all subsequent submissions.
          </p>
        </div>

        {/* 5 University Selection Cards */}
        <div className="space-y-2.5">
          {UNIVERSITIES.map((univ: UniversityOption) => {
            const isSelected = selectedUniversity === univ.name;
            return (
              <button
                key={univ.id}
                id={`select-univ-${univ.id}`}
                onClick={() => onSelect(univ.name)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs ${univ.accentBg}`}
                  >
                    {univ.acronym}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition leading-snug">
                      {univ.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {univ.campus}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center group-hover:border-blue-500 group-hover:text-blue-600">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <span>Each university writes strictly to its own dedicated worksheet in the central database.</span>
        </div>
      </div>
    </div>
  );
};
