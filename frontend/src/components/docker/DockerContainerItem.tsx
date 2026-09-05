import React from 'react';
import { Play, Square } from 'lucide-react';
import clsx from 'clsx';
import { DockerContainer } from '../../types/docker';

interface DockerContainerItemProps {
  container: DockerContainer;
  isSelected: boolean;
  isLoadingAction: boolean;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
}

export const DockerContainerItem: React.FC<DockerContainerItemProps> = ({
  container,
  isSelected,
  isLoadingAction,
  onSelect,
  onToggle,
}) => {
  const isRunning = container.state === 'running';

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer border',
        isSelected
          ? 'bg-slate-200/90 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 border-l-2 border-l-blue-600 dark:border-l-blue-500 border-t-transparent border-r-transparent border-b-transparent shadow-sm'
          : 'text-slate-700 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-200 border-transparent'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Status Dot */}
        <span
          className={clsx(
            'w-2 h-2 rounded-full flex-shrink-0',
            isRunning
              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
              : 'bg-slate-300 dark:bg-zinc-600'
          )}
        />

        {/* Service / Container Name & Image */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'truncate font-medium text-xs',
                isSelected
                  ? 'text-slate-900 dark:text-zinc-100 font-semibold'
                  : 'text-slate-800 dark:text-zinc-300'
              )}
            >
              {container.service || container.name}
            </span>
          </div>
          <div
            className={clsx(
              'flex items-center gap-2 text-[10px] font-mono truncate',
              isSelected
                ? 'text-slate-600 dark:text-zinc-400'
                : 'text-slate-400 dark:text-zinc-500'
            )}
          >
            <span className="truncate">{container.image}</span>
          </div>
        </div>
      </div>

      {/* Quick Ports Badge & Hover Start/Stop Toggle */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {container.portsRaw && (
          <span
            className={clsx(
              'hidden group-hover:hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded max-w-[85px] truncate border transition-colors',
              isSelected
                ? 'bg-white/80 dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 font-medium'
                : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700/50'
            )}
            title={container.portsRaw}
          >
            {container.portsRaw.split(',')[0]}
          </span>
        )}

        <button
          type="button"
          disabled={isLoadingAction}
          onClick={onToggle}
          title={isRunning ? 'Stop Container' : 'Start Container'}
          className={clsx(
            'opacity-0 group-hover:opacity-100 p-1 rounded transition-all cursor-pointer',
            isRunning
              ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          )}
        >
          {isRunning ? (
            <Square className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
        </button>
      </div>
    </div>
  );
};
