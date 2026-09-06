import React, { useState, useRef } from 'react';
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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const activeColRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  if (!result) return null;

  if (result.error) {
    return (
      <div className="p-4 text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 m-3 rounded">
        <div className="font-semibold mb-1">Execution Error</div>
        <div>{result.error}</div>
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="p-4 text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-2 bg-white dark:bg-[#0c0d12]">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>Statement completed successfully. ({result.rowsAffected ?? 0} rows affected)</span>
      </div>
    );
  }

  const rows = result.rows || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  const handleResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[col] || 150;
    activeColRef.current = { col, startX: e.clientX, startWidth: currentWidth };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!activeColRef.current) return;
      const delta = moveEvent.clientX - activeColRef.current.startX;
      const newWidth = Math.max(90, activeColRef.current.startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [activeColRef.current!.col]: newWidth }));
    };

    const onMouseUp = () => {
      activeColRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleAutoFit = (col: string) => {
    let maxLen = col.length;
    for (const r of paginatedRows.slice(0, 25)) {
      const v = r[col];
      const str = v === null || v === undefined ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (str.length > maxLen) maxLen = str.length;
    }
    const approx = Math.max(100, Math.min(450, maxLen * 8.5 + 32));
    setColumnWidths((prev) => ({ ...prev, [col]: approx }));
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#0c0d12]">
      <div className="flex-1 overflow-auto bg-white dark:bg-[#0c0d12]">
        <table className="w-full min-w-full text-left text-xs font-mono border-collapse bg-white dark:bg-[#0c0d12]">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#161619] border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10 shadow-xs">
              <th className="w-12 px-3 py-2 text-slate-500 dark:text-zinc-500 font-normal text-center border-r border-slate-200 dark:border-zinc-800/40 select-none">
                #
              </th>
              {result.columns.map((col) => {
                const width = columnWidths[col];
                return (
                  <th
                    key={col}
                    style={width ? { width, minWidth: width } : undefined}
                    className="group/th relative px-3 py-2 text-slate-700 dark:text-zinc-200 font-semibold border-r border-slate-200 dark:border-zinc-800/50 whitespace-nowrap select-none"
                    title={col}
                  >
                    <span className="truncate block pr-2">{col}</span>
                    <div
                      onMouseDown={(e) => handleResizeStart(col, e)}
                      onDoubleClick={() => handleAutoFit(col)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-500/50 active:bg-brand-500 z-10 transition-colors"
                      title="Drag to resize, double-click to auto-fit"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#0c0d12]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length + 1}
                  className="py-12 text-center text-slate-500 dark:text-zinc-400 bg-transparent select-none"
                >
                  <p className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                    0 rows returned
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono mt-1">
                    No rows found matching the query
                  </p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => {
                const rowNum = (page - 1) * limit + rIdx + 1;
                return (
                  <tr
                    key={rIdx}
                    className="h-8 border-b border-slate-200/80 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors bg-white dark:bg-[#0c0d12]"
                  >
                    <td className="px-3 py-1.5 text-slate-400 dark:text-zinc-600 text-center select-none font-mono text-[11px] border-r border-slate-200/60 dark:border-zinc-800/30">
                      {rowNum}
                    </td>
                    {result.columns.map((col) => {
                      const val = row[col];
                      const width = columnWidths[col];
                      const displayVal =
                        val === null || val === undefined
                          ? null
                          : typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val);

                      return (
                        <td
                          key={col}
                          style={width ? { width, minWidth: width } : undefined}
                          title={displayVal !== null ? displayVal : 'NULL'}
                          className="px-3 py-1.5 text-slate-800 dark:text-zinc-200 border-r border-slate-200/80 dark:border-zinc-800/20 whitespace-nowrap select-text text-xs max-w-sm truncate"
                        >
                          {displayVal === null ? (
                            <span className="text-slate-400 dark:text-zinc-600 italic">null</span>
                          ) : (
                            displayVal
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#121316] border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs select-none flex-shrink-0">
          <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, rows.length)} of {rows.length} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded bg-slate-200 dark:bg-zinc-800 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-zinc-700 cursor-pointer"
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
              className="p-1 rounded bg-slate-200 dark:bg-zinc-800 disabled:opacity-30 hover:bg-slate-300 dark:hover:bg-zinc-700 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
