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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Recent Entries Yet</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Entries saved during your session will appear here instantly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-0 py-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Recent Entries
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            Latest {entries.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {entries.map((item) => {
            const univMatch = UNIVERSITIES.find((u) => u.name === item.university);
            const acronym = univMatch ? univMatch.acronym : item.university.slice(0, 4);

            return (
              <div
                key={item.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-1 rounded-lg transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                    {acronym}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                        #{item.id}
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {item.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span>{item.telephone}</span>
                      <span>•</span>
                      <span className="font-sans text-[11px] font-medium text-slate-600">
                        {acronym}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-600 font-medium">
                    {item.time || 'Just now'}
                  </div>
                  {item.queuedOffline ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 mt-0.5">
                      <CloudUpload className="w-2.5 h-2.5 animate-pulse" />
                      <span>Queued</span>
                    </span>
                  ) : item.syncedToGoogleSheets ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 mt-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Sheets</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 mt-0.5">
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
