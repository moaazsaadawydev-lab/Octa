import { useState, useEffect, useCallback, useRef } from 'react';
import { TerminalTab, ShellInfo } from '../types/terminal';
import { AppSettings } from '../types/settings';
import { closeTerminalSession, getAvailableShells } from '../services/api';
import {
  getShellDisplayName,
  resolveShellInfo,
  getNextTabTitle,
  normalizeTab,
  createInitialTerminalTab,
} from '../utils/terminalHelpers';
import { useTerminalPanes } from './useTerminalPanes';

export { getShellDisplayName, resolveShellInfo, getNextTabTitle, normalizeTab };

interface UseTerminalManagerOptions {
  projectId: string;
  defaultWorkDir: string;
  settings?: AppSettings;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useTerminalManager({
  projectId,
  defaultWorkDir,
  settings,
  showToast,
}: UseTerminalManagerOptions) {
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

  // Stable refs for default shell and shells list
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
    return [createInitialTerminalTab(initialShell, defaultWorkDir)];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem(activeTabKey);
    return savedActiveId && tabs.some((t) => t.id === savedActiveId)
      ? savedActiveId
      : tabs[0]?.id || null;
  });

  // Reload tabs when active project changes ONLY
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizeTab);
          setTabs(normalized);
          const savedActive = localStorage.getItem(activeTabKey);
          setActiveTabId(
            savedActive && normalized.some((t) => t.id === savedActive)
              ? savedActive
              : normalized[0].id
          );
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to reload terminal tabs for project:', e);
    }

    const initialShell = resolveShellInfo(
      defaultShellRef.current,
      'powershell',
      availableShellsRef.current
    );
    const initialTab = createInitialTerminalTab(initialShell, defaultWorkDir);
    setTabs([initialTab]);
    setActiveTabId(initialTab.id);
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

  // Close Tab
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

  // Rename Tab
  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, title: newTitle.trim() || tab.title } : tab
      )
    );
  }, []);

  // Pane operations
  const panesOps = useTerminalPanes({
    tabs,
    setTabs,
    activeTabId,
    defaultWorkDir,
    settings,
    showToast,
  });

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    availableShells,
    handleAddTab,
    handleCloseTab,
    handleRenameTab,
    handleSplitTab: panesOps.handleSplitTab,
    handleClosePane: panesOps.handleClosePane,
    handleSelectPane: panesOps.handleSelectPane,
    handleRestartSession: panesOps.handleRestartSession,
  };
}
