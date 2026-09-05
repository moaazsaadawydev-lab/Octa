import React from 'react';
import { X, Save, Folder } from 'lucide-react';

export interface SaveQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryName: string;
  setQueryName: (name: string) => void;
  folderId: string;
  setFolderId: (id: string) => void;
  folders: { id: string; name: string }[];
  onConfirm: (e: React.FormEvent) => void;
}

export const SaveQueryModal: React.FC<SaveQueryModalProps> = ({
  isOpen,
  onClose,
  queryName,
  setQueryName,
  folderId,
  setFolderId,
  folders,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-zinc-100 font-sans">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold">Save Query to Explorer</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onConfirm} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
              Query Name (.sql)
            </label>
            <input
              type="text"
              required
              autoFocus
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder="e.g. active_users.sql"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              <span>Target Folder</span>
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">Root / Top Level</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow"
            >
              Save Query
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
