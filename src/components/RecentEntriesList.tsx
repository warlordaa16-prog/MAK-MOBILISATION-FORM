import React from 'react';
import { UserCheck, Phone, CheckCircle2 } from 'lucide-react';
import { MobilizationEntry } from '../types';

interface RecentEntriesListProps {
  entries: MobilizationEntry[];
}

export const RecentEntriesList: React.FC<RecentEntriesListProps> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-3 sm:px-0 py-2">
        <div className="bg-[#2c1c50]/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 text-center text-white">
          <UserCheck className="w-7 h-7 text-purple-300/60 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No Mobilized Students Yet</h3>
          <p className="text-xs text-purple-200/70 mt-0.5">
            Students you record will appear here immediately.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-0 py-2">
      <div className="bg-[#2c1c50]/80 backdrop-blur-xl rounded-3xl p-5 border border-white/15 shadow-2xl text-white">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#ff7575]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Recently Mobilized Students
            </h3>
          </div>
          <span className="text-xs font-bold text-purple-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
            {entries.length} Recorded
          </span>
        </div>

        <div className="divide-y divide-white/10">
          {entries.map((item, idx) => {
            return (
              <div
                key={item.id || idx}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-white/5 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-white/15">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-white truncate block">
                      {item.fullName}
                    </span>
                    <span className="text-xs text-purple-200/80 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-[#ff8f8f]" />
                      <span>{item.telephone}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-purple-300 font-medium">
                    {item.time || 'Saved'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
