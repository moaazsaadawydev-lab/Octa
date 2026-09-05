import React from 'react';
import { AlertTriangle, Trash2, Edit2, X } from 'lucide-react';

export interface DataGridModalsProps {
  // Delete rows modal
  showDeleteModal: boolean;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  selectedCount: number;
  isAllTable: boolean;
  setIsAllTable: (all: boolean) => void;
  tableName: string;
  deletingRows: boolean;

  // Drop column modal
  columnToDrop: string | null;
  onCloseDropModal: () => void;
  onConfirmDrop: () => void;

  // Rename column modal
  columnToRename: { oldName: string; newName: string } | null;
  setColumnToRename: React.Dispatch<React.SetStateAction<{ oldName: string; newName: string } | null>>;
  onCloseRenameModal: () => void;
  onConfirmRename: () => void;
}

export const DataGridModals: React.FC<DataGridModalsProps> = ({
  showDeleteModal,
  onCloseDeleteModal,
  onConfirmDelete,
  selectedCount,
  isAllTable,
  setIsAllTable,
  tableName,
  deletingRows,
  columnToDrop,
  onCloseDropModal,
  onConfirmDrop,
  columnToRename,
  setColumnToRename,
  onCloseRenameModal,
  onConfirmRename,
}) => {
  return (
    <>
      {/* Delete Rows Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-5 text-slate-900 dark:text-zinc-100 font-sans">
            <div className="flex items-center gap-2.5 text-rose-500 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold">Confirm Row Deletion</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4 leading-relaxed">
              {isAllTable
                ? `Are you sure you want to TRUNCATE / delete all records in "${tableName}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedCount} selected record(s) from "${tableName}"?`}
            </p>

            <div className="mb-4 p-2 rounded bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllTable}
                  onChange={(e) => setIsAllTable(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0"
                />
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  Delete ALL records in table
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCloseDeleteModal}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRows}
                onClick={onConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow"
              >
                {deletingRows ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop Column Confirmation Modal */}
      {columnToDrop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-5 text-slate-900 dark:text-zinc-100 font-sans">
            <div className="flex items-center gap-2.5 text-rose-500 mb-3">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-semibold">Drop Column</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4 leading-relaxed">
              Are you sure you want to drop column <span className="font-mono font-semibold text-rose-500">"{columnToDrop}"</span>? All data stored in this column will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCloseDropModal}
                className="px-3 py-1.5 text-xs rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDrop}
                className="px-3.5 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow"
              >
                Drop Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Column Modal */}
      {columnToRename && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-5 text-slate-900 dark:text-zinc-100 font-sans">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-semibold">Rename Column</h3>
              </div>
              <button type="button" onClick={onCloseRenameModal}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onConfirmRename();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  New Column Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={columnToRename.newName}
                  onChange={(e) =>
                    setColumnToRename((prev) => (prev ? { ...prev, newName: e.target.value } : null))
                  }
                  className="w-full px-3 py-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseRenameModal}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
