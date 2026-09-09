import React from 'react';
import { Award, School, RotateCcw } from 'lucide-react';
import { UniversityName } from '../types';

interface SessionCounterProps {
  count: number;
  selectedUniversity: UniversityName;
  onResetCounter?: () => void;
}

export const SessionCounter: React.FC<SessionCounterProps> = ({
  count,
  selectedUniversity,
  onResetCounter,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-0 py-2">
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Entries Added This Session
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
              <span>{count}</span>
              <span className="text-xs text-blue-400 font-medium">contacts mobilized</span>
            </div>
          </div>
        </div>

        <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex items-center justify-between sm:justify-end gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Selected University
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px] block">
              {selectedUniversity}
            </span>
          </div>

          {count > 0 && onResetCounter && (
            <button
              onClick={onResetCounter}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Reset session counter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
