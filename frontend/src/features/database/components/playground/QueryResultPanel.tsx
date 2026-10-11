import React from 'react';
import { Terminal, Loader2, AlertCircle, CheckCircle2, Layers, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { QueryResult, ExplainPlanResult } from '../../types';
import { QueryResultsTable } from '../QueryResultsTable';
import { ExplainPlanViewer } from '../../../../components/database/ExplainPlanViewer';

export interface QueryResultPanelProps {
  explainPlan?: ExplainPlanResult | null;
  results?: QueryResult[] | null;
  activeResultIndex?: number;
  onSelectResultIndex?: (index: number) => void;
  currentResult: QueryResult | null;
  isExecuting: boolean;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QueryResultPanel: React.FC<QueryResultPanelProps> = ({
  explainPlan,
  results,
  activeResultIndex = -1,
  onSelectResultIndex,
  currentResult,
  isExecuting,
  page,
  limit,
  onPageChange,
  showToast,
}) => {
  if (explainPlan) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#0c0d12]">
        <ExplainPlanViewer planResult={explainPlan} showToast={showToast} />
      </div>
    );
  }

  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-[#0c0d12] text-slate-400 dark:text-zinc-500 font-mono text-xs gap-2 select-none">
        <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
        <span>Executing query against database...</span>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-[#0c0d12] text-slate-400 dark:text-zinc-500 font-sans select-none p-4 text-center">
        <Terminal className="w-8 h-8 stroke-1 mb-2 text-slate-300 dark:text-zinc-700" />
        <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">No query executed yet</p>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
          Click <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Run</span> or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px]">Ctrl+Enter</kbd>
        </p>
      </div>
    );
  }

  const effectiveResult = results[activeResultIndex] || currentResult || results[0];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#0c0d12]">
      {/* Multi-result Tab Bar */}
      {results.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#121216] border-b border-slate-200 dark:border-zinc-800 overflow-x-auto select-none flex-shrink-0">
          <button
            type="button"
            onClick={() => onSelectResultIndex?.(-1)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border',
              activeResultIndex === -1
                ? 'bg-white dark:bg-[#1a1b23] text-brand-600 dark:text-brand-400 border-slate-300 dark:border-zinc-700 shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-zinc-400 border-transparent hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Results</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              {results.length}
            </span>
          </button>

          {results.map((res, idx) => {
            const isActive = idx === activeResultIndex;
            const hasErr = Boolean(res.error);
            const rowCount = res.isSelect ? (res.rows?.length || 0) : (res.rowsAffected || 0);
            const badgeText = hasErr ? 'Error' : res.isSelect ? `${rowCount} rows` : `${rowCount} aff`;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectResultIndex?.(idx)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border',
                  isActive
                    ? 'bg-white dark:bg-[#1a1b23] text-brand-600 dark:text-brand-400 border-slate-300 dark:border-zinc-700 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-zinc-400 border-transparent hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                )}
              >
                {hasErr ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>Result {idx + 1}</span>
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                    hasErr
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold'
                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                  )}
                >
                  {badgeText}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Result Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeResultIndex !== -1 && effectiveResult.notices && effectiveResult.notices.length > 0 && (
          <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs flex flex-col gap-1 flex-shrink-0">
            {effectiveResult.notices.map((n, ni) => (
              <div key={ni} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{n}</span>
              </div>
            ))}
          </div>
        )}

        {activeResultIndex === -1 && results.length > 1 ? (
          /* Stacked All Results View */
          <div className="flex-1 overflow-auto p-3 space-y-3 bg-slate-50 dark:bg-[#08080c]">
            {results.map((res, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d12] overflow-hidden shadow-xs"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 dark:bg-[#141418] border-b border-slate-200 dark:border-zinc-800 text-xs font-mono">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200">
                    {res.error ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>Result {idx + 1}</span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal truncate max-w-md">
                      {res.statement}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {res.durationMs?.toFixed(1)}ms • {res.isSelect ? `${res.rows?.length || 0} rows` : `${res.rowsAffected || 0} affected`}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-auto">
                  {res.error ? (
                    <div className="p-3 text-xs text-rose-600 dark:text-rose-400 font-mono">{res.error}</div>
                  ) : res.columns && res.columns.length > 0 ? (
                    <QueryResultsTable result={res} page={1} limit={limit} onPageChange={() => {}} />
                  ) : (
                    <div className="p-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                      Statement completed successfully. ({res.rowsAffected ?? 0} rows affected)
                    </div>
                  )}
                  {res.notices && res.notices.length > 0 && (
                    <div className="p-2 border-t border-slate-200 dark:border-zinc-800 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] space-y-1">
                      {res.notices.map((n, ni) => (
                        <div key={ni} className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : effectiveResult.error ? (
          /* Error Display */
          <div className="flex-1 p-4 overflow-auto bg-white dark:bg-[#0c0d12]">
            <div className="p-4 text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-lg max-w-3xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Statement {(activeResultIndex >= 0 ? activeResultIndex : 0) + 1} Failed</span>
              </div>
              <div className="text-xs break-words">{effectiveResult.error}</div>
              {effectiveResult.statement && (
                <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                  <span className="text-[10px] uppercase text-rose-500 font-semibold tracking-wider">Statement:</span>
                  <pre className="mt-1 p-2 rounded bg-rose-100/50 dark:bg-black/30 text-slate-800 dark:text-zinc-200 overflow-x-auto text-[11px] whitespace-pre-wrap">
                    {effectiveResult.statement}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : effectiveResult.columns && effectiveResult.columns.length > 0 ? (
          /* Single Result Grid */
          <QueryResultsTable result={effectiveResult} page={page} limit={limit} onPageChange={onPageChange} />
        ) : (
          /* Non-query Success Status */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-[#0c0d12] font-mono select-none">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Statement completed successfully.</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{effectiveResult.rowsAffected ?? 0} rows affected</p>
          </div>
        )}
      </div>
    </div>
  );
};
