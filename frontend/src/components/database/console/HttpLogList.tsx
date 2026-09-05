import React from 'react';
import { Copy, Check } from 'lucide-react';

export interface HttpLog {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  status: number;
  durationMs: number;
  timestamp: string;
}

export interface HttpLogListProps {
  logs: HttpLog[];
  copiedId: string | null;
  onCopy: (e: React.MouseEvent, id: string, query: string) => void;
}

export const HttpLogList: React.FC<HttpLogListProps> = ({
  logs,
  copiedId,
  onCopy,
}) => {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-zinc-600 text-xs italic">
        No HTTP requests captured yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/40 font-mono text-[11px]">
      {logs.map((log) => {
        const is2xx = log.status >= 200 && log.status < 300;
        return (
          <div
            key={log.id}
            className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-zinc-850/60 transition-colors group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  is2xx
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {log.status}
              </span>

              <span className="font-bold text-slate-700 dark:text-zinc-300">
                {log.method}
              </span>

              <span className="truncate text-slate-600 dark:text-zinc-400 select-text">
                {log.url}
              </span>

              <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-auto flex-shrink-0">
                {log.durationMs}ms
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => onCopy(e, log.id, log.url)}
              title="Copy URL"
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
