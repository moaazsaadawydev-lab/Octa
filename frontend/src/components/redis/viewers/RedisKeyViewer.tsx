import React from 'react';
import { FolderTree, Loader2, Plus } from 'lucide-react';
import { RedisTab, ZSetMember } from '../types';
import { KeyDetailHeader } from './KeyDetailHeader';
import { StringKeyViewer } from './StringKeyViewer';
import { HashKeyViewer } from './HashKeyViewer';
import { ListKeyViewer } from './ListKeyViewer';
import { SetKeyViewer } from './SetKeyViewer';
import { ZSetKeyViewer } from './ZSetKeyViewer';

interface RedisKeyViewerProps {
  activeTab: RedisTab | null;
  monacoTheme: string;
  isSaving: boolean;
  onSave: () => void;
  onDelete: (key: string) => void;
  onUpdateTTL: (ttl: number) => void;
  onChangeDraftString: (val: string) => void;
  onChangeDraftHash: (hash: Array<{ field: string; value: string }>) => void;
  onChangeDraftList: (list: string[]) => void;
  onChangeDraftSet: (set: string[]) => void;
  onChangeDraftZSet: (zset: ZSetMember[]) => void;
  onOpenNewKey: () => void;
  isConnected: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RedisKeyViewer: React.FC<RedisKeyViewerProps> = ({
  activeTab,
  monacoTheme,
  isSaving,
  onSave,
  onDelete,
  onUpdateTTL,
  onChangeDraftString,
  onChangeDraftHash,
  onChangeDraftList,
  onChangeDraftSet,
  onChangeDraftZSet,
  onOpenNewKey,
  isConnected,
  showToast,
}) => {
  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-zinc-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/40 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-4 shadow-inner">
          <FolderTree className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-300 mb-1">
          No Key Selected
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mb-4">
          Select a key from the left explorer to view and edit its value, inspect TTL, or create a new key.
        </p>
        <button
          type="button"
          disabled={!isConnected}
          onClick={onOpenNewKey}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700/80 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>Create Key</span>
        </button>
      </div>
    );
  }

  if (activeTab.isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-zinc-500 space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 dark:text-blue-400" />
        <span className="text-xs font-mono">Loading "{activeTab.key}"...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <KeyDetailHeader
        activeTab={activeTab}
        isSaving={isSaving}
        onSave={onSave}
        onDelete={onDelete}
        onUpdateTTL={onUpdateTTL}
        showToast={showToast}
      />
      <div className="flex-1 overflow-hidden p-4">
        {activeTab.type === 'string' ? (
          <StringKeyViewer
            value={activeTab.draftString}
            monacoTheme={monacoTheme}
            onChange={onChangeDraftString}
            showToast={showToast}
          />
        ) : activeTab.type === 'hash' ? (
          <HashKeyViewer items={activeTab.draftHash} onChange={onChangeDraftHash} />
        ) : activeTab.type === 'list' ? (
          <ListKeyViewer items={activeTab.draftList} onChange={onChangeDraftList} />
        ) : activeTab.type === 'set' ? (
          <SetKeyViewer members={activeTab.draftSet} onChange={onChangeDraftSet} />
        ) : (
          <ZSetKeyViewer members={activeTab.draftZSet} onChange={onChangeDraftZSet} />
        )}
      </div>
    </div>
  );
};
