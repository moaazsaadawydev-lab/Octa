import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface DropTableModalProps {
  isOpen: boolean;
  tableName: string | null;
  databaseName?: string;
  onClose: () => void;
  onConfirmDrop: (tableName: string, cascade: boolean) => Promise<boolean | void>;
}

export const DropTableModal: React.FC<DropTableModalProps> = ({
  isOpen,
  tableName,
  databaseName,
  onClose,
  onConfirmDrop,
}) => {
  const [cascade, setCascade] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tableName) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropping(true);
    setError(null);
    try {
      await onConfirmDrop(tableName, cascade);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to drop table');
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-zinc-100 font-sans">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Drop Table</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDropping}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
            Are you sure you want to permanently drop table{' '}
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
              {tableName}
            </span>
            {databaseName ? (
              <>
                {' '}from database{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {databaseName}
                </span>
              </>
            ) : null}
            ?
          </p>

          <div className="p-3 bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
            <Trash2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <span className="font-semibold block">Warning: Irreversible Action</span>
              <p className="text-[11px] opacity-90 leading-tight">
                All records, column definitions, indexes, and triggers will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cascade}
                onChange={(e) => setCascade(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-0 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                  Cascade Drop (DROP TABLE ... CASCADE)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                  Automatically drop objects that depend on this table (such as foreign key constraints or views).
                </span>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDropping}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDropping}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isDropping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{isDropping ? 'Dropping...' : cascade ? 'Drop Table (Cascade)' : 'Drop Table'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
