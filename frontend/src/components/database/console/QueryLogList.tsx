import React from 'react';
import { CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { QueryLog } from '../../../types/connection';

export interface QueryLogListProps {
  logs: QueryLog[];
  copiedId: string | null;
  onCopy: (e: React.MouseEvent, id: string, query: string) => void;
}

export const QueryLogList: React.FC<QueryLogListProps> = ({
  logs,
  copiedId,
  onCopy,
}) => {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-zinc-600 text-xs italic">
        No SQL queries executed yet. Run queries from the table or playground to see them here.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/40 font-mono text-[11px]">
      {logs.map((log) => {
        const isSuccess = log.status === 'SUCCESS';
        return (
          <div
            key={log.id}
            className="flex items-start justify-between p-2 hover:bg-slate-50 dark:hover:bg-zinc-850/60 transition-colors group"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className="mt-0.5 flex-shrink-0">
                {isSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
              </span>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500">
                  <span>{log.timestamp}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-600 dark:text-zinc-400">
                    {log.durationMs.toFixed(1)}ms
                  </span>
                </div>

                <div className="break-all whitespace-pre-wrap text-slate-800 dark:text-zinc-200 select-text">
                  {log.query}
                </div>

                {log.error && (
                  <div className="text-rose-500 text-[10px] mt-0.5 break-all">
                    {log.error}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => onCopy(e, log.id, log.query)}
              title="Copy Query"
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all flex-shrink-0 ml-2"
            >
              {copiedId === log.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
