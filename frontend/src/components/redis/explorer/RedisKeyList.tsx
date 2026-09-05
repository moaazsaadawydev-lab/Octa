import React from 'react';
import { FolderOpen, Key, Loader2, Trash2 } from 'lucide-react';
import { KeyTreeNode, RedisKeyInfo } from '../types';
import { KeyTypeBadge } from '../viewers/KeyTypeBadge';
import { RedisKeyTreeItem } from './RedisKeyTreeItem';

interface RedisKeyListProps {
  isLoading: boolean;
  keys: RedisKeyInfo[];
  searchPattern: string;
  viewMode: 'tree' | 'flat';
  keyTree: KeyTreeNode;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  activeTabKey: string | null;
  openTabs: string[];
  onOpenKey: (key: string) => void;
  onDeleteKey: (key: string) => void;
  onTriggerNodeDelete: (node: KeyTreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: KeyTreeNode) => void;
}

export const RedisKeyList: React.FC<RedisKeyListProps> = ({
  isLoading,
  keys,
  searchPattern,
  viewMode,
  keyTree,
  expandedFolders,
  onToggleFolder,
  activeTabKey,
  openTabs,
  onOpenKey,
  onDeleteKey,
  onTriggerNodeDelete,
  onContextMenu,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-zinc-500 space-y-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-400" />
        <span className="text-xs">Scanning keys...</span>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="text-center py-10 px-4 text-slate-400 dark:text-zinc-500 space-y-2">
        <FolderOpen className="w-8 h-8 mx-auto text-slate-400 dark:text-zinc-600 opacity-50" />
        <p className="text-xs font-medium text-slate-700 dark:text-zinc-400">No keys found</p>
        <p className="text-[11px] text-slate-400 dark:text-zinc-600">
          {searchPattern !== '*' ? 'Try another filter pattern' : 'Database is currently empty'}
        </p>
      </div>
    );
  }

  if (viewMode === 'tree') {
    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <RedisKeyTreeItem
          node={keyTree}
          depth={0}
          expandedFolders={expandedFolders}
          onToggleFolder={onToggleFolder}
          activeTabKey={activeTabKey}
          openTabs={openTabs}
          onOpenKey={onOpenKey}
          onTriggerDelete={onTriggerNodeDelete}
          onContextMenu={onContextMenu}
        />
      </div>
    );
  }

  // Flat list view
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {keys.map((k) => {
        const isTabActive = activeTabKey === k.key;
        const isTabOpen = openTabs.includes(k.key);
        return (
          <div
            key={k.key}
            onClick={() => onOpenKey(k.key)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group select-none ${
              isTabActive
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-white font-medium border-l-2 border-blue-500 dark:border-blue-400 shadow-sm'
                : isTabOpen
                ? 'bg-slate-100 dark:bg-zinc-800/40 text-blue-700 dark:text-blue-300'
                : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1a1a1e]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
              <Key className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span className="text-xs font-mono truncate text-slate-800 dark:text-zinc-200">
                {k.key}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <KeyTypeBadge type={k.type} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteKey(k.key);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
