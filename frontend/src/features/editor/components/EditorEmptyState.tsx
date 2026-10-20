import React from 'react';
import { Code2, FolderOpen } from 'lucide-react';

interface EditorEmptyStateProps {
  rootPath: string | null;
  onSelectRoot: () => void;
}

export const EditorEmptyState: React.FC<EditorEmptyStateProps> = ({ rootPath, onSelectRoot }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center select-none text-slate-400 dark:text-zinc-500">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-brand-500 shadow-sm">
        <Code2 className="w-7 h-7" />
      </div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
        Octa Code Reviewer & Editor
      </h2>
      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
        Select any file from the sidebar to review, compare git changes, or make quick edits.
      </p>
      {!rootPath && (
        <button
          type="button"
          onClick={onSelectRoot}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Open Project Folder</span>
        </button>
      )}
    </div>
  );
};
