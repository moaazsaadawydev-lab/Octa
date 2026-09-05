import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab } from '../../types/terminal';
import { ShellIcon } from './ShellIcon';
import { TabContextMenu } from './TabContextMenu';

interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  onRenameTab: (tabId: string, newTitle: string) => void;
  onSplitTab: (direction: 'horizontal' | 'vertical') => void;
}

interface ContextMenuState {
  tab: TerminalTab;
  x: number;
  y: number;
}

export const TerminalTabBar: React.FC<TerminalTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onSplitTab,
}) => {
  // Inline Renaming State
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartRename = (tab: TerminalTab) => {
    setContextMenu(null);
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleSaveRename = (tab: TerminalTab) => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== tab.title) {
      onRenameTab(tab.id, trimmed);
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingTabId(null);
    setEditingTitle('');
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: TerminalTab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      tab,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 max-w-fit">
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => {
                if (!isEditing) onSelectTab(tab.id);
              }}
              onContextMenu={(e) => handleTabContextMenu(e, tab)}
              onAuxClick={(e) => {
                if (e.button === 1) onCloseTab(tab.id, e);
              }}
              title={tab.title}
              className={clsx(
                'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[240px]',
                isActive
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white border-slate-300 dark:border-zinc-700/80 shadow-sm font-medium'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#18181c] border-transparent'
              )}
            >
              {/* Shell Profile Icon (Linux Tux for WSL, Git for Git-Bash, Terminal for PowerShell/CMD) */}
              <ShellIcon
                shellId={tab.shellId || tab.shell}
                className={clsx(
                  'w-3.5 h-3.5 flex-shrink-0',
                  isActive ? '' : 'opacity-70 group-hover/tab:opacity-100'
                )}
              />

              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveRename(tab);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancelRename();
                      }
                    }}
                    onBlur={() => handleSaveRename(tab)}
                    className="bg-slate-100 dark:bg-zinc-900 border border-brand-500 text-slate-900 dark:text-white px-1.5 py-0.5 rounded text-xs outline-none font-mono w-28 shadow-sm"
                  />
                </form>
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(tab);
                  }}
                  className="truncate font-mono text-[11px] flex-1 select-none"
                >
                  {tab.title ||
                    (tab.shellName ? `${tab.shellName} ${idx + 1}` : 'Terminal ' + (idx + 1))}
                  {tab.panes.length > 1 && (
                    <span className="ml-1 text-[10px] text-slate-400 dark:text-zinc-500 font-sans">
                      ({tab.panes.length})
                    </span>
                  )}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => onCloseTab(tab.id, e)}
                title="Close Tab (Ctrl+Shift+W)"
                className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Tab Right-Click Context Menu Popup */}
      {contextMenu && (
        <TabContextMenu
          tab={contextMenu.tab}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onStartRename={handleStartRename}
          onSelectTab={onSelectTab}
          onSplitTab={onSplitTab}
          onCloseTab={onCloseTab}
        />
      )}
    </>
  );
};
