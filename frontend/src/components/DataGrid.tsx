import React, { useState } from 'react';
import {
  Key,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Database,
  Hash,
  AlertTriangle,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { TableColumn, TableDataResult } from '../types/connection';

interface DataGridProps {
  tableName: string;
  schema: TableColumn[];
  dataResult: TableDataResult | null;
  loading: boolean;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onDropColumn: (colName: string) => Promise<void>;
  onRenameColumn: (oldName: string, newName: string) => Promise<void>;
}

export const DataGrid: React.FC<DataGridProps> = ({
  tableName,
  schema,
  dataResult,
  loading,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onDropColumn,
  onRenameColumn,
}) => {
  // Modal states for column dropping / renaming
  const [columnToDrop, setColumnToDrop] = useState<string | null>(null);
  const [columnToRename, setColumnToRename] = useState<{ oldName: string; newName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Derive column list from schema if available, else from dataResult columns
  const columns: { name: string; type?: string; isPrimaryKey?: boolean; isNullable?: boolean }[] =
    schema.length > 0
      ? schema.map((col) => ({
          name: col.name,
          type: col.type,
          isPrimaryKey: col.isPrimaryKey,
          isNullable: col.isNullable,
        }))
      : (dataResult?.columns || []).map((colName) => ({ name: colName }));

  const rows = dataResult?.rows || [];
  const totalRows = dataResult?.totalRows || 0;
  const totalPages = Math.ceil(totalRows / limit) || 1;
  const startRow = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, totalRows);

  const confirmDrop = async () => {
    if (!columnToDrop) return;
    setActionLoading(true);
    try {
      await onDropColumn(columnToDrop);
      setColumnToDrop(null);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnToRename || !columnToRename.newName.trim() || columnToRename.oldName === columnToRename.newName.trim()) {
      setColumnToRename(null);
      return;
    }
    setActionLoading(true);
    try {
      await onRenameColumn(columnToRename.oldName, columnToRename.newName.trim());
      setColumnToRename(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to render cell value
  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) {
      return (
        <span className="text-[10px] text-gray-500 italic bg-surface-850 px-1.5 py-0.5 rounded border border-border/40 font-mono">
          NULL
        </span>
      );
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="text-[11px] text-emerald-400 font-mono font-medium">true</span>
      ) : (
        <span className="text-[11px] text-rose-400 font-mono font-medium">false</span>
      );
    }
    if (typeof val === 'object') {
      return (
        <span className="font-mono text-gray-300 text-xs truncate max-w-xs block" title={JSON.stringify(val)}>
          {JSON.stringify(val)}
        </span>
      );
    }
    return <span className="truncate text-gray-200">{String(val)}</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-hidden select-none">
      {/* Table Content Container */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-900 border border-border text-xs text-brand-300 shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Fetching records...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left border-collapse text-xs select-text">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-[#1F1F1F] z-20 shadow-sm border-b border-[#2D2D2D]">
            <tr>
              {/* Row Number Sticky Column */}
              <th className="w-12 px-3 py-2.5 text-center text-gray-500 font-mono font-medium text-[11px] border-r border-[#2D2D2D] bg-[#1a1a1a] sticky left-0 z-30">
                #
              </th>

              {columns.map((col) => (
                <th
                  key={col.name}
                  className="px-3.5 py-2.5 font-medium border-r border-[#2D2D2D] text-gray-200 group/col hover:bg-[#252525] transition-colors min-w-[140px] max-w-[280px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      {col.isPrimaryKey && (
                        <span title="Primary Key" className="inline-flex">
                          <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        </span>
                      )}
                      <span className="font-semibold text-gray-100 truncate">{col.name}</span>
                      {col.type && (
                        <span className="text-[10px] text-gray-400 font-mono font-normal">
                          ({col.type})
                        </span>
                      )}
                    </div>

                    {/* Column Header Actions (Rename, Drop) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setColumnToRename({ oldName: col.name, newName: col.name })}
                        title="Rename Column"
                        className="p-1 rounded text-gray-400 hover:text-brand-300 hover:bg-surface-700 transition-colors"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setColumnToDrop(col.name)}
                        title="Drop Column"
                        className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-surface-700 transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#242424]">
            {rows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-16 text-center text-gray-500 italic select-none"
                >
                  No records in "{tableName}"
                </td>
              </tr>
            )}

            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-[#1a1a1a] transition-colors group/row"
              >
                {/* Sticky Row Index */}
                <td className="px-3 py-2 text-center text-gray-500 font-mono text-[10px] border-r border-[#242424] bg-[#141414] group-hover/row:bg-[#1a1a1a] sticky left-0 z-10 select-none">
                  {(page - 1) * limit + rIdx + 1}
                </td>

                {columns.map((col) => (
                  <td
                    key={col.name}
                    className="px-3.5 py-2 border-r border-[#242424] truncate max-w-[280px]"
                  >
                    {renderCellValue(row[col.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-2.5 bg-surface-900 border-t border-border-subtle flex items-center justify-between text-xs text-gray-400 select-none">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-gray-200">{startRow}-{endRow}</strong> of{' '}
            <strong className="text-gray-200">{totalRows.toLocaleString()}</strong> rows
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-surface-800 border border-border text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Dropping Column */}
      {columnToDrop && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-border rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-100">Drop Column</h4>
                <p className="text-xs text-gray-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-gray-300">
              Are you sure you want to drop column <strong className="text-rose-300 font-mono">"{columnToDrop}"</strong> from table <strong className="text-gray-100 font-mono">"{tableName}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setColumnToDrop(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDrop}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20"
              >
                {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Drop Column</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Renaming Column */}
      {columnToRename && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={confirmRename}
            className="bg-surface-900 border border-border rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-100">Rename Column</h4>
                <p className="text-xs text-gray-400">Update column identifier in PostgreSQL</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">New Column Name</label>
              <input
                type="text"
                required
                autoFocus
                value={columnToRename.newName}
                onChange={(e) =>
                  setColumnToRename({ ...columnToRename, newName: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-xs text-gray-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setColumnToRename(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !columnToRename.newName.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-md shadow-brand-600/20"
              >
                {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Rename</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
