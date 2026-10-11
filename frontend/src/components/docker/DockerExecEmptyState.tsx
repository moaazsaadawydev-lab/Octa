import React from 'react';
import { Terminal as TerminalIcon, Play } from 'lucide-react';
import clsx from 'clsx';

interface DockerExecEmptyStateProps {
  onStartContainer?: () => void;
  isStarting?: boolean;
}

export const DockerExecEmptyState: React.FC<DockerExecEmptyStateProps> = ({
  onStartContainer,
  isStarting = false,
}) => {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50/50 dark:bg-[#090a0f] transition-colors">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-400 shadow-sm">
        <TerminalIcon className="w-7 h-7 text-brand-500 dark:text-brand-400" />
      </div>
      <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
        Container is Not Running
      </span>
      <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
        Interactive Exec terminal is only available for running containers. Start the container to attach an interactive shell.
      </span>

      {onStartContainer && (
        <button
          type="button"
          disabled={isStarting}
          onClick={onStartContainer}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className={clsx('w-3.5 h-3.5 fill-current', isStarting && 'animate-spin')} />
          <span>{isStarting ? 'Starting Container...' : 'Start Container'}</span>
        </button>
      )}
    </div>
  );
};
