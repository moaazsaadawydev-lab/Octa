import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  RotateCcw,
  Folder,
} from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab } from '../../types/terminal';
import { ProjectWorkspace } from '../../types/project';
import { XTermInstance } from './XTermInstance';
import { closeTerminalSession } from '../../services/api';

interface TerminalWorkspaceProps {
  activeProject?: ProjectWorkspace | null;
  projectFilePath?: string | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
  activeProject,
  projectFilePath,
  showToast,
}) => {
  // Derive default working directory from open project file path or empty
  const defaultWorkDir = projectFilePath
    ? projectFilePath.substring(0, Math.max(projectFilePath.lastIndexOf('\\'), projectFilePath.lastIndexOf('/')))
    : '';

  // Tabs State
  const [tabs, setTabs] = useState<TerminalTab[]>(() => {
    try {
      const saved = localStorage.getItem('octa_terminal_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved terminal tabs:', e);
    }
    return [
      {
        id: 'term-' + Date.now(),
        title: 'PowerShell 1',
        workDir: defaultWorkDir,
        createdAt: Date.now(),
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem('octa_active_terminal_tab_id');
    return savedActiveId && tabs.some((t) => t.id === savedActiveId)
      ? savedActiveId
      : tabs[0]?.id || null;
  });

  // Inline Tab Rename State
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Persist Tabs in localStorage
  useEffect(() => {
    localStorage.setItem('octa_terminal_tabs', JSON.stringify(tabs));
    if (activeTabId) {
      localStorage.setItem('octa_active_terminal_tab_id', activeTabId);
    }
  }, [tabs, activeTabId]);

  // Ensure an activeTabId exists if tabs are present
  useEffect(() => {
    if (tabs.length > 0 && (!activeTabId || !tabs.some((t) => t.id === activeTabId))) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Add New Tab
  const handleAddTab = useCallback(() => {
    const newId = 'term-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setTabs((prev) => {
      const newTabNum = prev.length + 1;
      const newTab: TerminalTab = {
        id: newId,
        title: 'PowerShell ' + newTabNum,
        workDir: defaultWorkDir,
        createdAt: Date.now(),
      };
      return [...prev, newTab];
    });
    setActiveTabId(newId);
    if (showToast) showToast('Opened new PowerShell terminal', 'info');
  }, [defaultWorkDir, showToast]);

  // Close Tab
  const handleCloseTab = useCallback(
    (tabId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      closeTerminalSession(tabId);

      setTabs((prev) => {
        const nextTabs = prev.filter((t) => t.id !== tabId);
        if (nextTabs.length === 0) {
          setActiveTabId(null);
        } else if (activeTabId === tabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const nextActive = nextTabs[Math.max(0, idx - 1)];
          setActiveTabId(nextActive.id);
        }
        return nextTabs;
      });
    },
    [activeTabId]
  );

  // Restart Active Session
  const handleRestartSession = () => {
    if (!activeTabId) return;
    const curTab = tabs.find((t) => t.id === activeTabId);
    if (!curTab) return;

    // Generate fresh session ID to trigger fresh ConPTY process
    const newSessionId = 'term-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    closeTerminalSession(activeTabId);

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, id: newSessionId } : t))
    );
    setActiveTabId(newSessionId);

    if (showToast) showToast('Restarted ' + curTab.title, 'info');
  };

  // Start Rename Tab
  const handleStartRename = (tab: TerminalTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  // Save Rename Tab
  const handleSaveRename = (tabId: string) => {
    if (editingTitle.trim()) {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, title: editingTitle.trim() } : t))
      );
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  // Global Keyboard Shortcuts (Ctrl+Shift+T, Ctrl+Shift+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        handleAddTab();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
        if (activeTabId) {
          e.preventDefault();
          handleCloseTab(activeTabId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddTab, handleCloseTab, activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden select-none font-sans relative transition-colors">
      {tabs.length === 0 ? (
        /* Zero State Viewport */
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-400 shadow-sm">
            <TerminalIcon className="w-6 h-6 text-brand-500 dark:text-brand-400" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">No active terminals</span>
          <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Open a new tab to start an interactive PowerShell ConPTY session with Oh My Posh support.
          </span>
          <button
            type="button"
            onClick={handleAddTab}
            className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Terminal Session</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 overflow-hidden">
          {/* 1. Top Multi-Tab Header Bar */}
          <div className="bg-white dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between pl-2 pr-4 flex-shrink-0 select-none min-h-[38px] z-30 transition-colors">
            {/* Scrollable Tabs List */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isEditing = editingTabId === tab.id;

                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    onAuxClick={(e) => {
                      if (e.button === 1) handleCloseTab(tab.id, e);
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
                          className="bg-white dark:bg-zinc-900 border border-brand-500 text-slate-900 dark:text-white px-1 py-0.5 rounded text-xs outline-none font-mono w-28"
                        />
                      </form>
                    ) : (
                      <span
                        onDoubleClick={(e) => handleStartRename(tab, e)}
                        className="truncate font-mono text-[11px] flex-1"
                      >
                        {tab.title}
                      </span>
                    )}

                    {/* Close Tab Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      title="Close Terminal (Ctrl+Shift+W)"
                      className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add Terminal Tab Button */}
              <button
                type="button"
                onClick={handleAddTab}
                title="New PowerShell Terminal Tab (Ctrl+Shift+T)"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Toolbar Actions */}
            <div className="flex items-center gap-2">
              {activeTab && (
                <>
                  {/* Working Directory Indicator */}
                  <div
                    className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 font-mono max-w-[280px] truncate"
                    title={activeTab.workDir || 'Home Directory'}
                  >
                    <Folder className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <span className="truncate">{activeTab.workDir || '~'}</span>
                  </div>

                  {/* Restart Session */}
                  <button
                    type="button"
                    onClick={handleRestartSession}
                    title="Restart PowerShell Session"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 2. Main Terminal Viewport Area */}
          <div className="flex-1 relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-slate-50 dark:bg-[#090a0f] transition-colors">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={clsx(
                  'absolute inset-0 w-full h-full min-h-0 min-w-0',
                  tab.id === activeTabId ? 'block z-10' : 'hidden z-0 pointer-events-none'
                )}
              >
                <XTermInstance
                  sessionId={tab.id}
                  workDir={tab.workDir}
                  isActive={tab.id === activeTabId}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
