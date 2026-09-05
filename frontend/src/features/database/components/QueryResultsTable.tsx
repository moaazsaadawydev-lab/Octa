import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { QueryResult } from '../types';

export interface QueryResultsTableProps {
  result: QueryResult | null;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export const QueryResultsTable: React.FC<QueryResultsTableProps> = ({
  result,
  page,
  limit,
  onPageChange,
}) => {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="p-4 text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-500 m-2 rounded">
        {result.error}
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="p-4 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
        Statement completed successfully. ({result.rowsAffected ?? 0} rows affected)
      </div>
    );
  }

  const rows = result.rows || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto bg-white dark:bg-[#111113]">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#18181c] border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10">
              <th className="p-2 text-slate-500 dark:text-zinc-500 font-normal w-10 text-center">#</th>
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="p-2 text-slate-700 dark:text-zinc-300 font-semibold border-r border-slate-200 dark:border-zinc-800/40 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rIdx) => {
              const rowNum = (page - 1) * limit + rIdx + 1;
              return (
                <tr
                  key={rIdx}
                  className="border-b border-slate-200/80 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                >
                  <td className="p-2 text-slate-400 dark:text-zinc-600 text-center select-none font-mono">
                    {rowNum}
                  </td>
                  {result.columns.map((col) => {
                    const val = row[col];
                    return (
                      <td
                        key={col}
                        className="p-2 text-slate-800 dark:text-zinc-200 border-r border-slate-200/80 dark:border-zinc-800/20 whitespace-nowrap select-text"
                      >
                        {val === null || val === undefined ? (
                          <span className="text-slate-400 dark:text-zinc-600 italic">null</span>
                        ) : typeof val === 'object' ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#151518] border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs select-none">
          <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, rows.length)} of {rows.length} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded bg-slate-200 dark:bg-zinc-800 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-zinc-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded bg-slate-200 dark:bg-zinc-800 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-zinc-700"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
