import React, { useState } from 'react';
import {
  ScrollText,
  Copy,
  Check,
  Play,
  Square,
  RotateCw,
  Trash2,
  Clock,
  HardDrive,
  Network,
  Layers,
  Terminal as TerminalIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { DockerContainer } from '../../types/docker';

interface DockerHeaderToolbarProps {
  container: DockerContainer;
  activeTab: 'logs' | 'terminal';
  setActiveTab: (tab: 'logs' | 'terminal') => void;
  actionLoading: string | null;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDeleteClick: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DockerHeaderToolbar: React.FC<DockerHeaderToolbarProps> = ({
  container,
  activeTab,
  setActiveTab,
  actionLoading,
  onStart,
  onStop,
  onRestart,
  onDeleteClick,
  showToast,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const isRunning = container.state === 'running';

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(container.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      if (showToast) showToast('Container ID copied', 'info');
    } catch (e) {
      console.warn('Failed to copy container ID:', e);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-3 flex-shrink-0 select-none transition-colors">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Service & Container Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={clsx(
              'w-3 h-3 rounded-full flex-shrink-0',
              isRunning
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                : 'bg-slate-400 dark:bg-zinc-600'
            )}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 truncate">
                {container.service || container.name}
              </h2>
              {container.service !== container.name && (
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                  ({container.name})
                </span>
              )}
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider',
                  isRunning
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                )}
              >
                {container.state}
              </span>
            </div>

            {/* ID & Compose Meta */}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={handleCopyId}
                title="Click to copy full Container ID"
                className="flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <span>{container.id.substring(0, 12)}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                )}
              </button>

              <div className="flex items-center gap-1 truncate max-w-xs font-mono text-[11px]">
                <Layers className="w-3 h-3 text-brand-500 flex-shrink-0" />
                <span className="truncate">{container.image}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons & Tab Switcher */}
        <div className="flex items-center gap-3">
          {/* View Switcher: Logs vs Exec Shell */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                activeTab === 'logs'
                  ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              )}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Logs</span>
            </button>

            <button
              type="button"
              disabled={!isRunning}
              onClick={() => setActiveTab('terminal')}
              title={isRunning ? 'Interactive Terminal (Exec)' : 'Container must be running to open terminal'}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all',
                !isRunning
                  ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-zinc-600'
                  : activeTab === 'terminal'
                  ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm cursor-pointer'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer'
              )}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Exec Shell</span>
            </button>
          </div>

          {/* Lifecycle Buttons */}
          {isRunning ? (
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={onStop}
              title="Stop Container"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={onStart}
              title="Start Container"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          )}

          <button
            type="button"
            disabled={actionLoading !== null}
            onClick={onRestart}
            title="Restart Container"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={clsx('w-3.5 h-3.5', actionLoading === 'restart' && 'animate-spin')} />
            <span>Restart</span>
          </button>

          <button
            type="button"
            disabled={actionLoading !== null}
            onClick={onDeleteClick}
            title="Delete Container"
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status / Ports Badges Row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-zinc-800/80 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span className="font-mono text-[11px]">{container.status}</span>
        </div>

        {container.portsRaw && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Network className="w-3.5 h-3.5 text-brand-500" />
            <span className="font-mono text-[11px] text-brand-600 dark:text-brand-400 font-medium">
              {container.portsRaw}
            </span>
          </div>
        )}

        {container.size && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <span className="font-mono text-[11px]">{container.size}</span>
          </div>
        )}
      </div>
    </div>
  );
};
