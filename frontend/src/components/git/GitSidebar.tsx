import React, { useState } from 'react';
import {
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { GitStatusResult, GitFileChange } from '../../types/git';
import { GitSidebarHeader } from './GitSidebarHeader';
import { GitCommitBox } from './GitCommitBox';
import { GitFileItem } from './GitFileItem';

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
        <GitSidebarHeader
          status={status}
          onSwitchRepo={onSwitchRepo}
          onPull={onPull}
          onPush={onPush}
          onRefresh={onRefresh}
          isActionLoading={isActionLoading}
        />

        {/* 2. Commit Message Box */}
        <GitCommitBox
          repoPath={status?.repoPath || ''}
          commitMessage={commitMessage}
          setCommitMessage={setCommitMessage}
          canCommit={canCommit}
          hasStaged={hasStaged}
          hasUnstaged={hasUnstaged}
          stagedFilesCount={stagedFiles.length}
          aheadCount={status?.ahead || 0}
          isActionLoading={isActionLoading}
          onCommitSubmit={handleCommitSubmit}
          onPush={onPush}
          showToast={showToast}
        />
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
                stagedFiles.map((file) => (
                  <GitFileItem
                    key={`staged-${file.path}`}
                    file={file}
                    isSelected={selectedFile?.path === file.path && selectedFile?.staged === true}
                    onSelect={() => onSelectFile(file)}
                    onAction={() => onUnstageFile(file.path)}
                    isStaged={true}
                  />
                ))
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
                allChanges.map((file) => (
                  <GitFileItem
                    key={`changes-${file.path}`}
                    file={file}
                    isSelected={selectedFile?.path === file.path && selectedFile?.staged === false}
                    onSelect={() => onSelectFile(file)}
                    onAction={() => onStageFile(file.path)}
                    isStaged={false}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
