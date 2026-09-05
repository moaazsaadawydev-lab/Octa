import React, { useState } from 'react';
import { FileCode, Plus, X } from 'lucide-react';
import { QueryTab } from '../types';

export interface SqlQueryTabBarProps {
  tabs: QueryTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  onAddTab: () => void;
  onRenameTab: (tabId: string, newTitle: string) => void;
}

export const SqlQueryTabBar: React.FC<SqlQueryTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onRenameTab,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartRename = (tabId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (tabId: string) => {
    if (editingTitle.trim()) {
      let finalTitle = editingTitle.trim();
      if (!finalTitle.endsWith('.sql')) {
        finalTitle += '.sql';
      }
      onRenameTab(tabId, finalTitle);
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  return (
    <div className="bg-white dark:bg-[#0d0e14] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between pl-2 pr-4 flex-shrink-0 select-none min-h-[38px] z-30">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) onCloseTab(tab.id, e);
              }}
              title={tab.title + (tab.isDirty ? ' (Unsaved)' : '')}
              className={
                'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[240px] ' +
                (isActive
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-slate-300 dark:border-zinc-700/80 shadow-sm font-medium'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#18181c] border-transparent')
              }
            >
              <FileCode
                className={
                  'w-3.5 h-3.5 flex-shrink-0 ' +
                  (isActive ? 'text-amber-400' : 'text-zinc-500 group-hover/tab:text-zinc-400')
                }
              />

              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveRename(tab.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleSaveRename(tab.id)}
                    className="bg-slate-100 dark:bg-zinc-800 border border-brand-500 text-slate-900 dark:text-white px-1 py-0.5 rounded text-xs outline-none font-mono w-28"
                  />
                </form>
              ) : (
                <span
                  onDoubleClick={(e) => handleStartRename(tab.id, tab.title, e)}
                  className="truncate font-mono text-[11px] flex-1"
                >
                  {tab.title}
                </span>
              )}

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0 animate-pulse" title="Unsaved changes" />
              )}

              <button
                type="button"
                onClick={(e) => onCloseTab(tab.id, e)}
                title="Close Tab (Ctrl+W)"
                className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAddTab}
          title="New SQL Query Tab (Ctrl+T)"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
