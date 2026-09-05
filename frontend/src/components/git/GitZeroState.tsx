import React from 'react';
import { GitBranch, FolderOpen, PlusSquare } from 'lucide-react';
import { InitRepoOptions } from '../../types/git';
import { InitRepoModal } from './InitRepoModal';

interface GitZeroStateProps {
  onOpenRepo: () => void;
  onInitRepo: () => void;
  isInitModalOpen: boolean;
  onCloseInitModal: () => void;
  pendingInitPath: string;
  onConfirmInit: (opts: InitRepoOptions) => Promise<void>;
  isInitializing: boolean;
}

export const GitZeroState: React.FC<GitZeroStateProps> = ({
  onOpenRepo,
  onInitRepo,
  isInitModalOpen,
  onCloseInitModal,
  pendingInitPath,
  onConfirmInit,
  isInitializing,
}) => {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-[#090a0f] transition-colors">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400 shadow-sm">
        <GitBranch className="w-7 h-7" />
      </div>
      <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
        Source Control & Git
      </h2>
      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm leading-relaxed">
        Open a local Git repository to inspect diffs, stage files, commit changes, and push directly to remote.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={onOpenRepo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Open Repository</span>
        </button>

        <button
          type="button"
          onClick={onInitRepo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer"
        >
          <PlusSquare className="w-4 h-4 text-emerald-500" />
          <span>Initialize Repository</span>
        </button>
      </div>

      <InitRepoModal
        isOpen={isInitModalOpen}
        onClose={onCloseInitModal}
        path={pendingInitPath}
        onConfirm={onConfirmInit}
        isInitializing={isInitializing}
      />
    </div>
  );
};
