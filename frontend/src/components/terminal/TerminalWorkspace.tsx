import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab, TerminalPane, SplitDirection } from '../../types/terminal';
import { ProjectWorkspace, getProjectRootDir } from '../../types/project';
import { XTermInstance } from './XTermInstance';
import { TabsHeader } from './TabsHeader';
import { closeTerminalSession } from '../../services/api';
import { AppSettings } from '../../types/settings';

interface TerminalWorkspaceProps {
  activeProject?: ProjectWorkspace | null;
  projectFilePath?: string | null;
  isVisible?: boolean;
  settings?: AppSettings;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
  activeProject,
  projectFilePath,
  isVisible = true,
  settings,
  showToast,
}) => {
  // Derive project root directory
  const defaultWorkDir = getProjectRootDir(projectFilePath);
  const projectId = activeProject?.id || 'global';
  const storageKey = 'octa_terminal_tabs_' + projectId;
  const activeTabKey = 'octa_active_terminal_tab_id_' + projectId;

  // Tabs State (Scoped per project)
  const [tabs, setTabs] = useState<TerminalTab[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved terminal tabs:', e);
    }
    const initialTabId = 'tab-initial-1';
    const initialPaneId = 'pane-initial-1';
    return [
      {
        id: initialTabId,
        title: 'PowerShell 1',
        workDir: defaultWorkDir,
        createdAt: Date.now(),
        splitDirection: 'none',
        panes: [
          {
            id: initialPaneId,
            title: 'PowerShell 1',
            workDir: defaultWorkDir,
            createdAt: Date.now(),
          },
        ],
        activePaneId: initialPaneId,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem(activeTabKey);
    return savedActiveId && tabs.some((t) => t.id === savedActiveId)
      ? savedActiveId
      : tabs[0]?.id || null;
  });

  // Reload tabs when active project changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
          const savedActive = localStorage.getItem(activeTabKey);
          setActiveTabId(savedActive && parsed.some((t: any) => t.id === savedActive) ? savedActive : parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to reload terminal tabs for project:', e);
    }

    const initialTabId = 'tab-' + Date.now();
    const initialPaneId = 'pane-' + Date.now();
    const initialTab: TerminalTab = {
      id: initialTabId,
      title: 'PowerShell 1',
      workDir: defaultWorkDir,
      createdAt: Date.now(),
      splitDirection: 'none',
      panes: [
        {
          id: initialPaneId,
          title: 'PowerShell 1',
          workDir: defaultWorkDir,
          createdAt: Date.now(),
        },
      ],
      activePaneId: initialPaneId,
    };
    setTabs([initialTab]);
    setActiveTabId(initialTabId);
  }, [projectId, defaultWorkDir, storageKey, activeTabKey]);

  // Persist Tabs in scoped localStorage
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(tabs));
    }
    if (activeTabId) {
      localStorage.setItem(activeTabKey, activeTabId);
    }
  }, [tabs, activeTabId, storageKey, activeTabKey]);

  // Ensure an activeTabId exists if tabs are present
  useEffect(() => {
    if (tabs.length > 0 && (!activeTabId || !tabs.some((t) => t.id === activeTabId))) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Add New Tab
  const handleAddTab = useCallback(() => {
    const newTabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newPaneId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setTabs((prev) => {
      const newTabNum = prev.length + 1;
      const newTab: TerminalTab = {
        id: newTabId,
        title: 'PowerShell ' + newTabNum,
        workDir: defaultWorkDir,
        createdAt: Date.now(),
        splitDirection: 'none',
        panes: [
          {
            id: newPaneId,
            title: 'PowerShell ' + newTabNum,
            workDir: defaultWorkDir,
            createdAt: Date.now(),
          },
        ],
        activePaneId: newPaneId,
      };
      return [...prev, newTab];
    });
    setActiveTabId(newTabId);
    if (showToast) showToast('Opened new PowerShell terminal', 'info');
  }, [defaultWorkDir, showToast]);

  // Close Tab (closes all panes inside)
  const handleCloseTab = useCallback(
    (tabId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      const tabToClose = tabs.find((t) => t.id === tabId);
      if (tabToClose) {
        tabToClose.panes.forEach((p) => closeTerminalSession(p.id));
      }

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
    [activeTabId, tabs]
  );

  // Rename Tab (updates metadata without modifying session IDs or recreating PTY instances)
  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, title: newTitle.trim() || tab.title } : tab
      )
    );
  }, []);

  // Split Active Tab (Horizontal or Vertical)
  const handleSplitTab = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      if (!activeTabId) return;

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId) return tab;

          // If already 2 panes, switch direction
          if (tab.panes.length >= 2) {
            return {
              ...tab,
              splitDirection: direction,
            };
          }

          // Add 2nd pane with persistent ID
          const newPaneId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const newPane: TerminalPane = {
            id: newPaneId,
            title: tab.title + ' (Pane 2)',
            workDir: tab.workDir || defaultWorkDir,
            createdAt: Date.now(),
          };

          return {
            ...tab,
            splitDirection: direction,
            panes: [...tab.panes, newPane],
            activePaneId: newPaneId,
          };
        })
      );

      if (showToast) {
        showToast(
          direction === 'horizontal' ? 'Split terminal horizontally' : 'Split terminal vertically',
          'info'
        );
      }
    },
    [activeTabId, defaultWorkDir, showToast]
  );

  // Close Single Pane
  const handleClosePane = useCallback(
    (tabId: string, paneId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      closeTerminalSession(paneId);

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab;

          const nextPanes = tab.panes.filter((p) => p.id !== paneId);
          if (nextPanes.length <= 1) {
            return {
              ...tab,
              splitDirection: 'none',
              panes: nextPanes,
              activePaneId: nextPanes[0]?.id || tab.id,
            };
          }

          return {
            ...tab,
            panes: nextPanes,
            activePaneId: tab.activePaneId === paneId ? nextPanes[0].id : tab.activePaneId,
          };
        })
      );
    },
    []
  );

  // Set Focused Pane (guarded against redundant state updates)
  const handleSelectPane = useCallback((tabId: string, paneId: string) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (!tab || tab.activePaneId === paneId) return prev;
      return prev.map((t) => (t.id === tabId ? { ...t, activePaneId: paneId } : t));
    });
  }, []);

  // Restart Active Pane Session
  const handleRestartSession = useCallback(() => {
    if (!activeTabId) return;
    const curTab = tabs.find((t) => t.id === activeTabId);
    if (!curTab) return;

    const targetPaneId = curTab.activePaneId || curTab.panes[0]?.id;
    if (!targetPaneId) return;

    const newSessionId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    closeTerminalSession(targetPaneId);

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        return {
          ...t,
          panes: t.panes.map((p) =>
            p.id === targetPaneId ? { ...p, id: newSessionId } : p
          ),
          activePaneId: t.activePaneId === targetPaneId ? newSessionId : t.activePaneId,
        };
      })
    );

    if (showToast) showToast('Restarted terminal session', 'info');
  }, [activeTabId, tabs, showToast]);

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
          {/* 1. Top Multi-Tab Header Bar with Inline Rename & Context Menu */}
          <TabsHeader
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onAddTab={handleAddTab}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
            onSplitTab={handleSplitTab}
            onRestartSession={handleRestartSession}
          />

          {/* 2. Main Terminal Viewport Area */}
          <div className="flex-1 relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-slate-50 dark:bg-[#090a0f] transition-colors">
            {tabs.map((tab) => {
              const isTabActive = tab.id === activeTabId;
              const isSplit = tab.splitDirection !== 'none' && tab.panes.length > 1;

              return (
                <div
                  key={tab.id}
                  className={clsx(
                    'absolute inset-0 w-full h-full min-h-0 min-w-0',
                    isTabActive ? 'block z-10' : 'hidden z-0 pointer-events-none'
                  )}
                >
                  {isSplit ? (
                    <div
                      className={clsx(
                        'w-full h-full min-h-0 min-w-0 flex',
                        tab.splitDirection === 'horizontal' ? 'flex-row divide-x' : 'flex-col divide-y',
                        'divide-slate-200 dark:divide-zinc-800'
                      )}
                    >
                      {tab.panes.map((pane, pIdx) => {
                        const isPaneActive = (tab.activePaneId || tab.panes[0]?.id) === pane.id;

                        return (
                          <div
                            key={pane.id}
                            onClick={() => handleSelectPane(tab.id, pane.id)}
                            className={clsx(
                              'flex-1 flex flex-col min-h-0 min-w-0 relative transition-all',
                              tab.splitDirection === 'horizontal' ? 'w-1/2 h-full' : 'w-full h-1/2',
                              isPaneActive
                                ? 'bg-slate-50 dark:bg-[#090a0f]'
                                : 'bg-slate-100/40 dark:bg-[#07080b]'
                            )}
                          >
                            {/* Slim Pane Header */}
                            <div className="h-6 bg-slate-100/80 dark:bg-[#0f1016] border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between px-2 text-[10px] text-slate-500 dark:text-zinc-400 select-none flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={clsx(
                                    'w-1.5 h-1.5 rounded-full',
                                    isPaneActive
                                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                      : 'bg-slate-400 dark:bg-zinc-600'
                                  )}
                                />
                                <span className="font-mono">{pane.title || 'Pane ' + (pIdx + 1)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleClosePane(tab.id, pane.id, e)}
                                title="Close Pane"
                                className="p-0.5 rounded text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Pane Viewport */}
                            <div className="flex-1 relative w-full h-full min-h-0 min-w-0 overflow-hidden">
                              <XTermInstance
                                sessionId={pane.id}
                                workDir={pane.workDir}
                                isActive={isVisible && isTabActive && isPaneActive}
                                settings={settings}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single Pane Viewport */
                    <div className="w-full h-full min-h-0 min-w-0">
                      {tab.panes[0] && (
                        <XTermInstance
                          sessionId={tab.panes[0].id}
                          workDir={tab.panes[0].workDir}
                          isActive={isVisible && isTabActive}
                          settings={settings}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
