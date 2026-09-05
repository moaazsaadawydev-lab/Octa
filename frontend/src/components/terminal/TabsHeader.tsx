import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  ChevronDown,
  X,
  Edit2,
  Columns2,
  Rows2,
  Folder,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab, ShellInfo } from '../../types/terminal';

interface TabsHeaderProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  availableShells?: ShellInfo[];
  defaultShellId?: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: (shell?: ShellInfo | string) => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  onRenameTab: (tabId: string, newTitle: string) => void;
  onSplitTab: (direction: 'horizontal' | 'vertical') => void;
  onRestartSession: () => void;
}

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

export const TabsHeader: React.FC<TabsHeaderProps> = ({
  tabs,
  activeTabId,
  availableShells = [],
  defaultShellId = 'powershell',
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  onSplitTab,
  onRestartSession,
}) => {
  // Inline Renaming State
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic Shell Launcher Dropdown State
  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false);
  const shellMenuRef = useRef<HTMLDivElement>(null);

  // Close shell dropdown on click outside or Escape
  useEffect(() => {
    if (!isShellMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (shellMenuRef.current && !shellMenuRef.current.contains(e.target as Node)) {
        setIsShellMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShellMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isShellMenuOpen]);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
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

  // Focus and select text when entering rename mode
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // Start Inline Rename
  const handleStartRename = (tab: TerminalTab, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setContextMenu(null);
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  // Commit Inline Rename
  const handleSaveRename = (tab: TerminalTab) => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== tab.title) {
      onRenameTab(tab.id, trimmed);
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  // Cancel Inline Rename
  const handleCancelRename = () => {
    setEditingTabId(null);
    setEditingTitle('');
  };

  // Open Tab Context Menu
  const handleTabContextMenu = (e: React.MouseEvent, tab: TerminalTab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      tabId: tab.id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const contextMenuTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;

  return (
    <div className="bg-white dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between pl-2 pr-4 flex-shrink-0 select-none min-h-[38px] z-30 transition-colors relative">
      {/* Scrollable Tabs List and Dynamic Launcher Container */}
      <div className="flex items-center min-w-0 flex-1 py-1.5 overflow-visible">
        {/* Scrollable Tabs List */}
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

                {/* Tab Title or Inline Editing */}
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
                    {tab.title || (tab.shellName ? `${tab.shellName} ${idx + 1}` : 'Terminal ' + (idx + 1))}
                    {tab.panes.length > 1 && (
                      <span className="ml-1 text-[10px] text-slate-400 dark:text-zinc-500 font-sans">
                        ({tab.panes.length})
                      </span>
                    )}
                  </span>
                )}

                {/* Close Tab Button */}
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

        {/* Dynamic Multi-Shell Tab Launcher (Outside overflow-x-auto, with z-50 so dropdown is NEVER clipped) */}
        {(() => {
          const shellList: ShellInfo[] =
            availableShells && availableShells.length > 0
              ? availableShells
              : [
                  { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
                  { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
                ];
          const defaultShell =
            shellList.find((s) => s.id === (defaultShellId || 'powershell')) || shellList[0];

          return (
            <div ref={shellMenuRef} className="relative flex items-center ml-1.5 z-50 flex-shrink-0">
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-100/80 dark:bg-zinc-800/80 p-0.5 shadow-2xs">
                {/* 1. Primary '+' Button: Spawns default shell directly */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShellMenuOpen(false);
                    onAddTab(defaultShell);
                  }}
                  title={`New Terminal Tab (${defaultShell.name}) (Ctrl+Shift+T)`}
                  className="p-1 rounded-md text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* 2. Chevron Dropdown Trigger: Presents all discovered shells */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShellMenuOpen((prev) => !prev);
                  }}
                  title="Choose Shell to Launch (PowerShell, CMD, Git Bash)"
                  className={clsx(
                    'p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer',
                    isShellMenuOpen && 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white'
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* 3. Discovered Shells Dropdown Menu */}
              {isShellMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-white dark:bg-[#14151b] border border-slate-200 dark:border-zinc-700 shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-100 font-sans"
                >
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800/60 mb-1 flex items-center justify-between">
                    <span>Available Shells</span>
                    <span className="font-mono text-[9px] lowercase font-normal">{shellList.length} found</span>
                  </div>
                  <div className="space-y-0.5 px-1">
                    {shellList.map((sh) => {
                      const isDefault = sh.id === defaultShell.id;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsShellMenuOpen(false);
                            onAddTab(sh);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <TerminalIcon className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-brand-500 flex-shrink-0" />
                            <div className="truncate">
                              <div className="font-medium text-slate-800 dark:text-zinc-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                {sh.name}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono truncate max-w-[150px]">
                                {sh.path}
                              </div>
                            </div>
                          </div>
                          {isDefault && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 flex-shrink-0 ml-1.5">
                              Default
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Right Toolbar Actions */}
      <div className="flex items-center gap-1.5">
        {activeTab && (
          <>
            {/* Split Right (Horizontal) Button */}
            <button
              type="button"
              onClick={() => onSplitTab('horizontal')}
              title="Split Terminal Right (Side by side)"
              className={clsx(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                activeTab.splitDirection === 'horizontal'
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-300 dark:border-brand-800/80'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
              )}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>

            {/* Split Down (Vertical) Button */}
            <button
              type="button"
              onClick={() => onSplitTab('vertical')}
              title="Split Terminal Down (Stacked)"
              className={clsx(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                activeTab.splitDirection === 'vertical'
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-300 dark:border-brand-800/80'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
              )}
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>

            {/* Working Directory Indicator */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 font-mono max-w-[220px] truncate"
              title={activeTab.workDir || 'Home Directory'}
            >
              <Folder className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <span className="truncate">{activeTab.workDir || '~'}</span>
            </div>

            {/* Restart Active Session */}
            <button
              type="button"
              onClick={onRestartSession}
              title="Restart PowerShell Session"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
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
          {/* Rename Tab Option */}
          <button
            type="button"
            onClick={() => handleStartRename(contextMenuTab)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Rename Tab</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

          {/* Split Right Option */}
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

          {/* Split Down Option */}
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

          {/* Close Tab Option */}
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
    </div>
  );
};
