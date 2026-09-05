import React from 'react';
import { ChevronRight, Plus, HardDrive } from 'lucide-react';
import { HomeLanding } from '../layout/HomeLanding';
import { NewRedisConnectionModal } from './NewRedisConnectionModal';
import { RedisConnectionConfig } from './types';

interface RedisZeroStateProps {
  sidebarWidth: number;
  isResizing: boolean;
  onStartResizing: (e: React.MouseEvent) => void;
  isConnModalOpen: boolean;
  onCloseConnModal: () => void;
  onOpenConnModal: () => void;
  onSaveConnection: (savedConfig: RedisConnectionConfig) => void;
  editingConn: RedisConnectionConfig | null;
}

export const RedisZeroState: React.FC<RedisZeroStateProps> = ({
  sidebarWidth,
  isResizing,
  onStartResizing,
  isConnModalOpen,
  onCloseConnModal,
  onOpenConnModal,
  onSaveConnection,
  editingConn,
}) => {
  return (
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-zinc-100 font-sans overflow-hidden select-none transition-colors">
      <div
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
        className="bg-white dark:bg-surface-900 border-r border-slate-200 dark:border-border-subtle flex flex-col h-full select-none flex-shrink-0 font-sans transition-colors"
      >
        <div className="p-2 border-b border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-850/50">
          <div className="px-2 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 rotate-90" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                Explorer
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-border/50 font-mono">
                0
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenConnModal}
              title="Add New Connection"
              className="p-1 rounded-md bg-brand-500/10 dark:bg-brand-600/20 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white border border-brand-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="p-4 text-center my-2 flex flex-col items-center justify-center flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 dark:text-gray-400 mb-2">
            <HardDrive className="w-5 h-5 text-slate-400 dark:text-gray-400" />
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-gray-200 mb-1">
            No connections
          </div>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed mb-3">
            Add your Redis server to start exploring.
          </p>
          <button
            type="button"
            onClick={onOpenConnModal}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Connection</span>
          </button>
        </div>
      </div>
      <div
        onMouseDown={onStartResizing}
        className={`w-1 hover:w-1.5 cursor-col-resize select-none transition-colors ${
          isResizing ? 'bg-blue-500 w-1.5' : 'bg-slate-200 dark:bg-zinc-800/80 hover:bg-blue-500/50'
        }`}
      />
      <HomeLanding onOpenNewModal={onOpenConnModal} />
      <NewRedisConnectionModal
        isOpen={isConnModalOpen}
        onClose={onCloseConnModal}
        onSaved={onSaveConnection}
        initialConfig={editingConn}
      />
    </div>
  );
};
