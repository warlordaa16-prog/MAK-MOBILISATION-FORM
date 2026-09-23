import React from 'react';
import { Clock, CheckCircle2, CloudUpload, User, Phone, Building } from 'lucide-react';
import { MobilizationEntry, UNIVERSITIES } from '../types';

interface RecentEntriesListProps {
  entries: MobilizationEntry[];
}

export const RecentEntriesList: React.FC<RecentEntriesListProps> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-3 sm:px-0 py-3">
        <div className="bg-[#2c1c50]/60 backdrop-blur-xl rounded-3xl p-6 border border-white/15 text-center text-white">
          <Clock className="w-8 h-8 text-purple-300/60 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No Recent Entries Yet</h3>
          <p className="text-xs text-purple-200/70 mt-0.5">
            Entries saved during your session will appear here instantly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-0 py-3">
      <div className="bg-[#2c1c50]/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/15 shadow-2xl text-white">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Recent Entries
            </h3>
          </div>
          <span className="text-xs font-bold text-purple-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            Latest {entries.length}
          </span>
        </div>

        <div className="divide-y divide-white/10">
          {entries.map((item) => {
            const univMatch = UNIVERSITIES.find((u) => u.name === item.university);
            const acronym = univMatch ? univMatch.acronym : item.university.slice(0, 4);

            return (
              <div
                key={item.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-white/5 px-2 rounded-2xl transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff4d46] to-[#e63548] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-rose-950/40">
                    {acronym}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-purple-200 bg-white/10 px-1.5 py-0.5 rounded border border-white/15 shrink-0">
                        #{item.id}
                      </span>
                      <span className="text-sm font-bold text-white truncate">
                        {item.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-purple-300/80 font-mono mt-0.5">
                      <span>{item.telephone}</span>
                      <span>•</span>
                      <span className="font-sans text-[11px] font-medium text-purple-200">
                        {acronym}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] text-purple-300 font-medium">
                    {item.time || 'Just now'}
                  </div>
                  {item.queuedOffline ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ff8f8f] bg-[#ff4d46]/20 px-2 py-0.5 rounded-lg border border-[#ff4d46]/40 mt-1">
                      <CloudUpload className="w-2.5 h-2.5 animate-pulse" />
                      <span>Queued</span>
                    </span>
                  ) : item.syncedToGoogleSheets ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-400/30 mt-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Sheets</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-200 bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mt-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Saved</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
