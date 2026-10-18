import React from 'react';
import { Filter, Save, RotateCcw, Trash2, X, Play, RefreshCw } from 'lucide-react';

export interface DataGridToolbarProps {
  tableName: string;
  filterActive: boolean;
  filterColumn?: string;
  filterOp?: string;
  filterValue?: string;
  onToggleFilter: () => void;
  onClearFilter?: () => void;
  stagedCount: number;
  savingUpdates: boolean;
  onSaveUpdates: () => void;
  onDiscardUpdates: () => void;
  selectedRowCount: number;
  onOpenDeleteModal: () => void;
  onDropTable?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  isLive?: boolean;
  onToggleLive?: () => void;
}

export const DataGridToolbar: React.FC<DataGridToolbarProps> = ({
  tableName,
  filterActive,
  filterColumn,
  filterOp,
  filterValue,
  onToggleFilter,
  onClearFilter,
  stagedCount,
  savingUpdates,
  onSaveUpdates,
  onDiscardUpdates,
  selectedRowCount,
  onOpenDeleteModal,
  onDropTable,
  onRefresh,
  loading = false,
  isLive = false,
  onToggleLive,
}) => {
  return (
    <div className="px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#121318] flex items-center justify-between gap-3 flex-shrink-0 select-none text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title={`Re-read table "${tableName}" from database (Ctrl+R / F5)`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-60"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Play</span>
          </button>
        )}

        {onToggleLive && (
          <button
            type="button"
            onClick={onToggleLive}
            title={
              isLive
                ? 'Live Sync Active: Automatically fetching new writes every 3s. Click to pause.'
                : 'Live Sync Inactive: Click to enable real-time auto-refresh (every 3s).'
            }
            className={
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ' +
              (isLive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700')
            }
          >
            <span
              className={
                'w-2 h-2 rounded-full ' +
                (isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-zinc-500')
              }
            />
            <span>{isLive ? 'Live: ON (3s)' : 'Live: OFF'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleFilter}
          className={
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ' +
            (filterActive
              ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-300 border-brand-300 dark:border-brand-700'
              : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700')
          }
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>

        {filterActive && filterColumn && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-[11px] font-mono text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            <span>{filterColumn} {filterOp} "{filterValue}"</span>
            {onClearFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="hover:text-rose-500 rounded p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {selectedRowCount > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-zinc-700">
            <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
              {selectedRowCount} selected
            </span>
            <button
              type="button"
              onClick={onOpenDeleteModal}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 font-medium cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {stagedCount > 0 && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
            <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
              {stagedCount} unsaved change(s)
            </span>
            <button
              type="button"
              onClick={onDiscardUpdates}
              title="Discard all pending changes"
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={savingUpdates}
              onClick={onSaveUpdates}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingUpdates ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}

        {onDropTable && (
          <button
            type="button"
            onClick={onDropTable}
            title={`Drop table "${tableName}"`}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-900/40 text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Drop Table</span>
          </button>
        )}
      </div>
    </div>
  );
};
