import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Edit2, Columns2, Rows2 } from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab } from '../../types/terminal';

interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  onRenameTab: (tabId: string, newTitle: string) => void;
  onSplitTab: (direction: 'horizontal' | 'vertical') => void;
}

interface ContextMenuState {
  tabId: string;
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
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartRename = (tab: TerminalTab, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
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
      tabId: tab.id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const contextMenuTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;

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
              <TerminalIcon
                className={clsx(
                  'w-3.5 h-3.5 flex-shrink-0',
                  isActive
                    ? 'text-brand-500 dark:text-brand-400'
                    : 'text-slate-400 dark:text-zinc-500 group-hover/tab:text-zinc-300'
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
                  onDoubleClick={(e) => handleStartRename(tab, e)}
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
      {contextMenu && contextMenuTab && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          className="z-50 min-w-[160px] py-1 bg-white dark:bg-[#14151d] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl select-none text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleStartRename(contextMenuTab)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Rename Tab</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

          <button
            type="button"
            onClick={() => {
              onSelectTab(contextMenuTab.id);
              onSplitTab('horizontal');
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Columns2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Split Right</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab(contextMenuTab.id);
              onSplitTab('vertical');
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Rows2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Split Down</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

          <button
            type="button"
            onClick={(e) => {
              onCloseTab(contextMenuTab.id, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Tab</span>
            <span className="ml-auto text-[10px] text-slate-400 dark:text-zinc-500">Ctrl+W</span>
          </button>
        </div>
      )}
    </>
  );
};
