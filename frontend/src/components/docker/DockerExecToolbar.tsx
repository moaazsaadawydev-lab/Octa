import React from 'react';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { DockerContainer } from '../../types/docker';

interface DockerExecToolbarProps {
  container: DockerContainer;
  isConnected: boolean;
  onReconnect: () => void;
  onClear: () => void;
}

export const DockerExecToolbar: React.FC<DockerExecToolbarProps> = ({
  container,
  isConnected,
  onReconnect,
  onClear,
}) => {
  return (
    <div className="px-4 py-2 bg-slate-100/70 dark:bg-[#08090d] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={clsx(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'
          )}
        />
        <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">
          {isConnected ? `exec shell: ${container.service || container.name}` : 'Connecting shell...'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReconnect}
          title="Restart / Reconnect Shell"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reconnect</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          title="Clear Terminal Canvas"
          className="px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
