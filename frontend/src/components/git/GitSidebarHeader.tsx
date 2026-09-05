import React from 'react';
import { GitBranch, FolderSync, RefreshCw, DownloadCloud, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import { GitStatusResult } from '../../types/git';

interface GitSidebarHeaderProps {
  status: GitStatusResult | null;
  onSwitchRepo?: () => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  isActionLoading: string | null;
}

export const GitSidebarHeader: React.FC<GitSidebarHeaderProps> = ({
  status,
  onSwitchRepo,
  onPull,
  onPush,
  onRefresh,
  isActionLoading,
}) => {
  const repoName = status?.repoPath
    ? status.repoPath.split(/[\\/]/).filter(Boolean).pop() || status.repoPath
    : 'Repository';

  return (
    <div className="flex items-center justify-between gap-2">
      {/* Branch & Repo Info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
          <GitBranch className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate" title={status?.repoPath}>
              {repoName}
            </span>
            {onSwitchRepo && (
              <button
                type="button"
                onClick={onSwitchRepo}
                title="Switch Repository (Open Folder)"
                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <FolderSync className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            <span className="truncate max-w-[120px] text-brand-600 dark:text-brand-400 font-semibold">
              {status?.branch || 'main'}
            </span>
            {status && (status.ahead > 0 || status.behind > 0) && (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300">
                {status.ahead > 0 && <span className="text-emerald-500">↑{status.ahead}</span>}
                {status.behind > 0 && <span className="text-rose-500">↓{status.behind}</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sync & Refresh Actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isActionLoading !== null}
          onClick={onPull}
          title="Pull changes from remote"
          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <DownloadCloud className={clsx('w-3.5 h-3.5', isActionLoading === 'pull' && 'animate-bounce')} />
        </button>

        <button
          type="button"
          disabled={isActionLoading !== null}
          onClick={onPush}
          title="Push commits to remote"
          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <UploadCloud className={clsx('w-3.5 h-3.5', isActionLoading === 'push' && 'animate-bounce')} />
        </button>

        <button
          type="button"
          disabled={isActionLoading !== null}
          onClick={onRefresh}
          title="Refresh Repository Status"
          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', isActionLoading === 'refresh' && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
};
