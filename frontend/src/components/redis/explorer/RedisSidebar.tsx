import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  RefreshCw,
  Plus,
  Search,
  X,
  FolderTree,
  List,
  Copy,
  Trash2,
} from 'lucide-react';
import { KeyTreeNode, RedisKeyInfo } from '../types';
import { RedisKeyList } from './RedisKeyList';

interface RedisSidebarProps {
  sidebarWidth: number;
  keys: RedisKeyInfo[];
  isLoadingKeys: boolean;
  searchPattern: string;
  onChangePattern: (val: string) => void;
  onSearch: (pattern: string) => void;
  viewMode: 'tree' | 'flat';
  onToggleViewMode: (mode: 'tree' | 'flat') => void;
  keyTree: KeyTreeNode;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  activeTabKey: string | null;
  openTabs: string[];
  onOpenKey: (key: string) => void;
  onDeleteKey: (key: string) => void;
  onTriggerNodeDelete: (node: KeyTreeNode) => void;
  onRefresh: () => void;
  onNewConnection: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RedisSidebar: React.FC<RedisSidebarProps> = ({
  sidebarWidth,
  keys,
  isLoadingKeys,
  searchPattern,
  onChangePattern,
  onSearch,
  viewMode,
  onToggleViewMode,
  keyTree,
  expandedFolders,
  onToggleFolder,
  activeTabKey,
  openTabs,
  onOpenKey,
  onDeleteKey,
  onTriggerNodeDelete,
  onRefresh,
  onNewConnection,
  showToast,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: KeyTreeNode;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div
      style={{ width: sidebarWidth }}
      className="flex flex-col bg-white dark:bg-[#111114] border-r border-slate-200 dark:border-[#242429] flex-shrink-0 overflow-hidden select-none transition-colors relative"
    >
      {/* Explorer Header */}
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#141418]/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            Explorer
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
            {keys.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingKeys}
            className="p-1 rounded-md text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh Keys"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoadingKeys ? 'animate-spin text-blue-500 dark:text-blue-400' : ''
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onNewConnection}
            className="p-1 rounded-md text-slate-400 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="New Redis Connection"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Bar & View Mode Toggle */}
      <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800/80 space-y-2 bg-slate-50/50 dark:bg-[#121215]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchPattern}
            onChange={(e) => onChangePattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch(searchPattern);
            }}
            placeholder="Search keys (e.g. users:*)"
            className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-700/60 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all"
          />
          {searchPattern !== '*' && (
            <button
              type="button"
              onClick={() => {
                onChangePattern('*');
                onSearch('*');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => onToggleViewMode('tree')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <FolderTree className="w-3 h-3" />
              <span>Tree</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('flat')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Flat</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
            {keys.length} key{keys.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Keys List */}
      <RedisKeyList
        isLoading={isLoadingKeys}
        keys={keys}
        searchPattern={searchPattern}
        viewMode={viewMode}
        keyTree={keyTree}
        expandedFolders={expandedFolders}
        onToggleFolder={onToggleFolder}
        activeTabKey={activeTabKey}
        openTabs={openTabs}
        onOpenKey={onOpenKey}
        onDeleteKey={onDeleteKey}
        onTriggerNodeDelete={onTriggerNodeDelete}
        onContextMenu={(e, node) => setContextMenu({ x: e.clientX, y: e.clientY, node })}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px] text-xs font-sans"
        >
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.node.fullPath);
              showToast('Copied to clipboard', 'info');
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Path</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onTriggerNodeDelete(contextMenu.node);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
