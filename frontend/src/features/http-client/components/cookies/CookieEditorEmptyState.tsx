import React from 'react';
import { Cookie as CookieIcon, Plus } from 'lucide-react';

export interface CookieEditorEmptyStateProps {
  onCreateNew: () => void;
}

export const CookieEditorEmptyState: React.FC<CookieEditorEmptyStateProps> = ({ onCreateNew }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#0d1117] select-none">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <CookieIcon className="w-7 h-7 text-amber-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-200">
        No Cookie Selected
      </h3>
      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1 mb-5">
        Select a cookie from the left panel to inspect and edit its token value, or create a new session cookie.
      </p>
      <button
        type="button"
        onClick={onCreateNew}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Create New Cookie</span>
      </button>
    </div>
  );
};
