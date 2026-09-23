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
      <div className="bg-[#2c1c50]/80 backdrop-blur-xl text-white rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/15">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-950/40 border border-rose-400/30">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-purple-200/70 uppercase tracking-wider">
              Entries Added This Session
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
              <span>{count}</span>
              <span className="text-xs text-[#ff8f8f] font-bold">contacts mobilized</span>
            </div>
          </div>
        </div>

        <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 flex items-center justify-between sm:justify-end gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-purple-300/70 block">
              Active University
            </span>
            <span className="text-xs font-extrabold text-white truncate max-w-[200px] block">
              {selectedUniversity}
            </span>
          </div>

          {count > 0 && onResetCounter && (
            <button
              onClick={onResetCounter}
              className="text-purple-300 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer"
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
