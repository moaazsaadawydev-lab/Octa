import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { ActiveSession, QueryResult } from '../types';

export interface QueryExecutionFooterProps {
  activeSession: ActiveSession | null;
  isExecuting: boolean;
  currentResult: QueryResult | null;
}

export const QueryExecutionFooter: React.FC<QueryExecutionFooterProps> = ({
  activeSession,
  isExecuting,
  currentResult,
}) => {
  return (
    <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-[#121214] border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs select-none flex-shrink-0 z-20">
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
        {activeSession && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span className="text-slate-700 dark:text-zinc-300 font-medium truncate max-w-sm">
              {activeSession.activeDatabase} @ {activeSession.connection.name || activeSession.connection.host}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-slate-500 dark:text-zinc-500 text-[11px] font-mono">
        {isExecuting ? (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Executing query...</span>
          </div>
        ) : currentResult ? (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>
              {currentResult.durationMs?.toFixed(1)}ms (
              {currentResult.isSelect ? currentResult.rows?.length ?? 0 : currentResult.rowsAffected ?? 0} rows)
            </span>
          </div>
        ) : (
          <span className="text-slate-500 dark:text-zinc-500">Ready</span>
        )}

        <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800" />
        <span className="hidden md:inline text-slate-500 dark:text-zinc-500">
          Run: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">Ctrl+↵</kbd>
        </span>
        <span className="hidden md:inline text-slate-500 dark:text-zinc-500">
          Save: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700">Ctrl+S</kbd>
        </span>
      </div>
    </div>
  );
};
