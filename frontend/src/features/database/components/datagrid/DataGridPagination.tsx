import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataGridPaginationProps {
  page: number;
  limit: number;
  totalRows: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
}

export const DataGridPagination: React.FC<DataGridPaginationProps> = ({
  page,
  limit,
  totalRows,
  onPageChange,
  onLimitChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const startRow = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, totalRows);

  return (
    <div className="px-4 py-2 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#121318] flex items-center justify-between text-xs select-none flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
          Showing {startRow} - {endRow} of {totalRows} rows
        </span>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-xs font-mono"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-zinc-700"
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
          className="p-1 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-zinc-700"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
