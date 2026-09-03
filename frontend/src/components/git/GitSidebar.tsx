import React, { useState } from 'react';
import {
  GitBranch,
  FolderSync,
  GitCommit,
  Plus,
  Minus,
  Check,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Folder,
  FileCode,
  FilePlus,
  FileMinus,
  FileEdit,
  ChevronDown,
  ChevronRight,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';
import clsx from 'clsx';
import { GitStatusResult, GitFileChange } from '../../types/git';

interface GitSidebarProps {
  status: GitStatusResult | null;
  selectedFile: GitFileChange | null;
  onSelectFile: (file: GitFileChange) => void;
  onStageFile: (filePath: string) => void;
  onUnstageFile: (filePath: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;
  onPull: () => void;
  onFetch: () => void;
  onRefresh: () => void;
  onSwitchRepo?: () => void;
  isActionLoading: string | null;
  width?: number;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GitSidebar: React.FC<GitSidebarProps> = ({
  status,
  selectedFile,
  onSelectFile,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onCommit,
  onPush,
  onPull,
  onFetch,
  onRefresh,
  onSwitchRepo,
  isActionLoading,
  width,
  showToast,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedExpanded, setStagedExpanded] = useState(true);
  const [changesExpanded, setChangesExpanded] = useState(true);

  const stagedFiles = status?.stagedFiles || [];
  const unstagedFiles = status?.unstagedFiles || [];
  const untrackedFiles = status?.untrackedFiles || [];
  const allChanges = [...unstagedFiles, ...untrackedFiles];

  const hasStaged = stagedFiles.length > 0;
  const hasUnstaged = unstagedFiles.length > 0 || untrackedFiles.length > 0;
  const hasMessage = commitMessage.trim().length > 0;
  const canCommit = hasMessage && (hasStaged || hasUnstaged);

  const handleCommitSubmit = () => {
    if (!canCommit) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'modified':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-amber-500 bg-amber-500/10">
            M
          </span>
        );
      case 'added':
      case 'untracked':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-emerald-500 bg-emerald-500/10">
            {status === 'untracked' ? 'U' : 'A'}
          </span>
        );
      case 'deleted':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-rose-500 bg-rose-500/10">
            D
          </span>
        );
      case 'renamed':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-sky-500 bg-sky-500/10">
            R
          </span>
        );
      default:
        return null;
    }
  };

  const repoName = status?.repoPath
    ? status.repoPath.split(/[\\/]/).filter(Boolean).pop() || status.repoPath
    : 'Repository';

  return (
    <div
      style={width ? { width: `${width}px`, minWidth: '240px', maxWidth: '600px' } : undefined}
      className={clsx(
        'h-full flex flex-col bg-white dark:bg-[#0c0d12] border-r border-slate-200 dark:border-zinc-800 flex-shrink-0 select-none font-sans transition-colors',
        !width && 'w-80'
      )}
    >
      {/* 1. Header Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800 space-y-2.5 flex-shrink-0">
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

        {/* 2. Commit Message Box */}
        <div className="space-y-1.5 pt-1">
          <textarea
            rows={2}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCommitSubmit();
              }
            }}
            placeholder="Message (Ctrl+Enter to commit)"
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-brand-500 resize-none font-sans transition-colors"
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isActionLoading !== null || !canCommit}
              onClick={handleCommitSubmit}
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
                  : stagedFiles.length > 0
                  ? `Commit (${stagedFiles.length})`
                  : 'Commit'}
              </span>
            </button>

            <button
              type="button"
              disabled={isActionLoading !== null || (status?.ahead || 0) === 0}
              onClick={onPush}
              title={status?.ahead ? `Push ${status.ahead} commit(s) to remote` : 'No local commits to push'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Push</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Changes Scrollable Tree / List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {/* STAGED CHANGES ACCORDION */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 dark:text-zinc-400 font-semibold group">
            <button
              type="button"
              onClick={() => setStagedExpanded(!stagedExpanded)}
              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
            >
              {stagedExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>Staged Changes</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-600 dark:text-zinc-400">
                {stagedFiles.length}
              </span>
            </button>

            {stagedFiles.length > 0 && (
              <button
                type="button"
                onClick={onUnstageAll}
                title="Unstage All Changes"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
            )}
          </div>

          {stagedExpanded && (
            <div className="space-y-0.5 mt-1">
              {stagedFiles.length === 0 ? (
                <div className="px-6 py-2 text-[11px] text-slate-400 dark:text-zinc-600 italic">
                  No staged changes
                </div>
              ) : (
                stagedFiles.map((file) => {
                  const isSelected = selectedFile?.path === file.path && selectedFile?.staged === true;
                  const filename = file.path.split(/[\\/]/).pop() || file.path;
                  const dir = file.path.substring(0, file.path.length - filename.length);

                  return (
                    <div
                      key={`staged-${file.path}`}
                      onClick={() => onSelectFile(file)}
                      className={clsx(
                        'group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border-l-2',
                        isSelected
                          ? 'bg-slate-200/90 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 border-l-blue-600 dark:border-l-blue-500 font-medium shadow-xs'
                          : 'border-l-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusBadge(file.status)}
                        <div className="min-w-0 truncate">
                          <span className="font-mono text-xs">{filename}</span>
                          {dir && (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-1.5 font-mono truncate">
                              {dir}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnstageFile(file.path);
                        }}
                        title="Unstage File (-)"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* UNSTAGED & UNTRACKED CHANGES ACCORDION */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 dark:text-zinc-400 font-semibold group">
            <button
              type="button"
              onClick={() => setChangesExpanded(!changesExpanded)}
              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
            >
              {changesExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>Changes</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-600 dark:text-zinc-400">
                {allChanges.length}
              </span>
            </button>

            {allChanges.length > 0 && (
              <button
                type="button"
                onClick={onStageAll}
                title="Stage All Changes"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          {changesExpanded && (
            <div className="space-y-0.5 mt-1">
              {allChanges.length === 0 ? (
                <div className="px-6 py-2 text-[11px] text-slate-400 dark:text-zinc-600 italic">
                  No changes detected
                </div>
              ) : (
                allChanges.map((file) => {
                  const isSelected = selectedFile?.path === file.path && selectedFile?.staged === false;
                  const filename = file.path.split(/[\\/]/).pop() || file.path;
                  const dir = file.path.substring(0, file.path.length - filename.length);

                  return (
                    <div
                      key={`changes-${file.path}`}
                      onClick={() => onSelectFile(file)}
                      className={clsx(
                        'group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border-l-2',
                        isSelected
                          ? 'bg-slate-200/90 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 border-l-blue-600 dark:border-l-blue-500 font-medium shadow-xs'
                          : 'border-l-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusBadge(file.status)}
                        <div className="min-w-0 truncate">
                          <span className="font-mono text-xs">{filename}</span>
                          {dir && (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-1.5 font-mono truncate">
                              {dir}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStageFile(file.path);
                        }}
                        title="Stage File (+)"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
