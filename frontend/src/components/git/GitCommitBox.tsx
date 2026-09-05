import React from 'react';
import { GitCommit, ArrowUp } from 'lucide-react';

interface GitCommitBoxProps {
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  canCommit: boolean;
  hasStaged: boolean;
  hasUnstaged: boolean;
  stagedFilesCount: number;
  aheadCount: number;
  isActionLoading: string | null;
  onCommitSubmit: () => void;
  onPush: () => void;
}

export const GitCommitBox: React.FC<GitCommitBoxProps> = ({
  commitMessage,
  setCommitMessage,
  canCommit,
  hasStaged,
  hasUnstaged,
  stagedFilesCount,
  aheadCount,
  isActionLoading,
  onCommitSubmit,
  onPush,
}) => {
  return (
    <div className="space-y-1.5 pt-1">
      <textarea
        rows={2}
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onCommitSubmit();
          }
        }}
        placeholder="Message (Ctrl+Enter to commit)"
        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-brand-500 resize-none font-sans transition-colors"
      />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={isActionLoading !== null || !canCommit}
          onClick={onCommitSubmit}
          title={
            !hasStaged && hasUnstaged
              ? 'Automatically stage and commit all changes (Ctrl+Enter)'
              : 'Commit staged changes (Ctrl+Enter)'
          }
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>
            {isActionLoading === 'commit'
              ? 'Committing...'
              : !hasStaged && hasUnstaged
              ? 'Commit All Changes'
              : stagedFilesCount > 0
              ? `Commit (${stagedFilesCount})`
              : 'Commit'}
          </span>
        </button>

        <button
          type="button"
          disabled={isActionLoading !== null || aheadCount === 0}
          onClick={onPush}
          title={aheadCount > 0 ? `Push ${aheadCount} commit(s) to remote` : 'No local commits to push'}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
          <span>Push</span>
        </button>
      </div>
    </div>
  );
};
