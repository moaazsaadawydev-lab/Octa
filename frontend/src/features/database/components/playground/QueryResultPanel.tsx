import React from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { QueryResult, ExplainPlanResult } from '../../types';
import { QueryResultsTable } from '../QueryResultsTable';
import { ExplainPlanViewer } from '../../../../components/database/ExplainPlanViewer';

export interface QueryResultPanelProps {
  explainPlan?: ExplainPlanResult | null;
  currentResult: QueryResult | null;
  isExecuting: boolean;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QueryResultPanel: React.FC<QueryResultPanelProps> = ({
  explainPlan,
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

  if (currentResult) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#0c0d12]">
        <QueryResultsTable
          result={currentResult}
          page={page}
          limit={limit}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-[#0c0d12] text-slate-400 dark:text-zinc-500 font-sans select-none p-4 text-center">
      <Terminal className="w-8 h-8 stroke-1 mb-2 text-slate-300 dark:text-zinc-700" />
      <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
        No query executed yet
      </p>
      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
        Click <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Run</span> or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px]">Ctrl+Enter</kbd> to execute
      </p>
    </div>
  );
};
