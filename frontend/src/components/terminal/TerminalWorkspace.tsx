import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab, TerminalPane, SplitDirection, ShellInfo } from '../../types/terminal';
import { ProjectWorkspace, getProjectRootDir } from '../../types/project';
import { XTermInstance } from './XTermInstance';
import { TabsHeader } from './TabsHeader';
import { closeTerminalSession, getAvailableShells } from '../../services/api';
import { AppSettings } from '../../types/settings';

const getShellDisplayName = (shellId: string, availableShells: ShellInfo[]): string => {
  const found = availableShells.find((s) => s.id === shellId || s.path === shellId);
  if (found) return found.name;
  if (shellId === 'cmd') return 'Command Prompt';
  if (shellId === 'git-bash') return 'Git Bash';
  if (shellId === 'pwsh') return 'PowerShell Core';
  return 'PowerShell';
};

const resolveShellInfo = (
  shellOrId: ShellInfo | string | undefined,
  defaultShellId: string,
  availableShells: ShellInfo[]
): ShellInfo => {
  if (shellOrId && typeof shellOrId === 'object' && shellOrId.id) {
    return shellOrId;
  }
  const idToFind = typeof shellOrId === 'string' && shellOrId ? shellOrId : defaultShellId;
  const found = availableShells.find((s) => s.id === idToFind || s.path === idToFind);
  if (found) return found;
  if (idToFind === 'cmd') return { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' };
  if (idToFind === 'git-bash') return { id: 'git-bash', name: 'Git Bash', path: 'bash.exe' };
  if (idToFind === 'pwsh') return { id: 'pwsh', name: 'PowerShell Core', path: 'pwsh.exe' };
  return { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' };
};

const getNextTabTitle = (shellInfo: ShellInfo, existingTabs: TerminalTab[]): string => {
  const count = existingTabs.filter((t) => t.shellId === shellInfo.id).length + 1;
  return `${shellInfo.name} ${count}`;
};

const normalizeTab = (t: any): TerminalTab => {
  const shellId = t.shellId || t.shell || 'powershell';
  const shellName =
    t.shellName ||
    (shellId === 'cmd' ? 'Command Prompt' : shellId === 'git-bash' ? 'Git Bash' : 'PowerShell');
  const shellPath =
    t.shellPath ||
    (shellId === 'cmd' ? 'cmd.exe' : shellId === 'git-bash' ? 'bash.exe' : 'powershell.exe');
  return {
    ...t,
    shellId,
    shellName,
    shellPath,
    shell: shellPath || shellId,
    title: t.title || `${shellName} 1`,
    panes: Array.isArray(t.panes)
      ? t.panes.map((p: any) => ({
          ...p,
          shellId: p.shellId || shellId,
          shellName: p.shellName || shellName,
          shellPath: p.shellPath || shellPath,
          shell: p.shellPath || p.shellId || shellPath || shellId,
          title: p.title || t.title || `${shellName} 1`,
        }))
      : [],
  };
};

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

  // Available Windows Shells
  const [availableShells, setAvailableShells] = useState<ShellInfo[]>([
    { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
    { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
  ]);

  useEffect(() => {
    getAvailableShells()
      .then((shells) => {
        if (Array.isArray(shells) && shells.length > 0) {
          setAvailableShells(shells);
        }
      })
      .catch((e) => console.warn('Failed to load available shells:', e));
  }, []);

  // Stable refs for default shell and shells list so settings changes do NOT restart active tabs
  const defaultShellRef = useRef(settings?.terminalShell || 'powershell');
  defaultShellRef.current = settings?.terminalShell || 'powershell';

  const availableShellsRef = useRef(availableShells);
  availableShellsRef.current = availableShells;

  // Tabs State (Scoped per project)
  const [tabs, setTabs] = useState<TerminalTab[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeTab);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved terminal tabs:', e);
    }
    const initialShell = resolveShellInfo(settings?.terminalShell, 'powershell', []);
    const initialTabId = 'tab-initial-1';
    const initialPaneId = 'pane-initial-1';
    const initialTitle = `${initialShell.name} 1`;
    return [
      {
        id: initialTabId,
        title: initialTitle,
        workDir: defaultWorkDir,
        shellId: initialShell.id,
        shellName: initialShell.name,
        shellPath: initialShell.path,
        shell: initialShell.path || initialShell.id,
        createdAt: Date.now(),
        splitDirection: 'none',
        panes: [
          {
            id: initialPaneId,
            title: initialTitle,
            workDir: defaultWorkDir,
            shellId: initialShell.id,
            shellName: initialShell.name,
            shellPath: initialShell.path,
            shell: initialShell.path || initialShell.id,
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

  // Reload tabs when active project changes ONLY (decoupled from live settings changes)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizeTab);
          setTabs(normalized);
          const savedActive = localStorage.getItem(activeTabKey);
          setActiveTabId(savedActive && normalized.some((t) => t.id === savedActive) ? savedActive : normalized[0].id);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to reload terminal tabs for project:', e);
    }

    const initialShell = resolveShellInfo(defaultShellRef.current, 'powershell', availableShellsRef.current);
    const initialTabId = 'tab-' + Date.now();
    const initialPaneId = 'pane-' + Date.now();
    const initialTitle = `${initialShell.name} 1`;
    const initialTab: TerminalTab = {
      id: initialTabId,
      title: initialTitle,
      workDir: defaultWorkDir,
      shellId: initialShell.id,
      shellName: initialShell.name,
      shellPath: initialShell.path,
      shell: initialShell.path || initialShell.id,
      createdAt: Date.now(),
      splitDirection: 'none',
      panes: [
        {
          id: initialPaneId,
          title: initialTitle,
          workDir: defaultWorkDir,
          shellId: initialShell.id,
          shellName: initialShell.name,
          shellPath: initialShell.path,
          shell: initialShell.path || initialShell.id,
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

  // Add New Tab (takes ShellInfo object or shell ID)
  const handleAddTab = useCallback(
    (shellTarget?: ShellInfo | string) => {
      const targetShell = resolveShellInfo(
        shellTarget,
        defaultShellRef.current,
        availableShellsRef.current
      );
      const newTabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newPaneId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      setTabs((prev) => {
        const title = getNextTabTitle(targetShell, prev);
        const newTab: TerminalTab = {
          id: newTabId,
          title: title,
          workDir: defaultWorkDir,
          shellId: targetShell.id,
          shellName: targetShell.name,
          shellPath: targetShell.path,
          shell: targetShell.path || targetShell.id,
          createdAt: Date.now(),
          splitDirection: 'none',
          panes: [
            {
              id: newPaneId,
              title: title,
              workDir: defaultWorkDir,
              shellId: targetShell.id,
              shellName: targetShell.name,
              shellPath: targetShell.path,
              shell: targetShell.path || targetShell.id,
              createdAt: Date.now(),
            },
          ],
          activePaneId: newPaneId,
        };
        return [...prev, newTab];
      });
      setActiveTabId(newTabId);
      if (showToast) showToast(`Opened new ${targetShell.name} terminal`, 'info');
    },
    [defaultWorkDir, showToast]
  );

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

          // Add 2nd pane with persistent ID, inheriting the active tab's shell
          const newPaneId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
          const paneShell = tab.shellPath || tab.shell || settings?.terminalShell || 'powershell';
          const newPane: TerminalPane = {
            id: newPaneId,
            title: tab.title + ' (Pane 2)',
            workDir: tab.workDir || defaultWorkDir,
            shellId: tab.shellId || 'powershell',
            shellName: tab.shellName || 'PowerShell',
            shellPath: tab.shellPath || paneShell,
            shell: tab.shellPath || paneShell,
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

    const targetPane = curTab.panes.find((p) => p.id === targetPaneId);
    const preservedShell = targetPane?.shell || curTab.shell || settings?.terminalShell || 'powershell';
    const newSessionId = 'pane-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    closeTerminalSession(targetPaneId);

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        return {
          ...t,
          panes: t.panes.map((p) =>
            p.id === targetPaneId ? { ...p, id: newSessionId, shell: preservedShell } : p
          ),
          activePaneId: t.activePaneId === targetPaneId ? newSessionId : t.activePaneId,
        };
      })
    );

    if (showToast) showToast('Restarted terminal session', 'info');
  }, [activeTabId, tabs, settings?.terminalShell, showToast]);

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
            Open a new tab to start an interactive ConPTY session with your preferred shell.
          </span>
          <button
            type="button"
            onClick={() => handleAddTab()}
            className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Terminal Session ({getShellDisplayName(settings?.terminalShell || 'powershell', availableShells)})</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 overflow-hidden">
          {/* 1. Top Multi-Tab Header Bar with Inline Rename & Context Menu */}
          <TabsHeader
            tabs={tabs}
            activeTabId={activeTabId}
            availableShells={availableShells}
            defaultShellId={settings?.terminalShell || 'powershell'}
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
                                shell={pane.shell || tab.shell || settings?.terminalShell || 'powershell'}
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
                          shell={tab.panes[0].shell || tab.shell || settings?.terminalShell || 'powershell'}
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
