import { useCallback } from 'react';
import { TerminalTab, TerminalPane } from '../types/terminal';
import { AppSettings } from '../types/settings';
import { closeTerminalSession } from '../services/api';

interface UseTerminalPanesOptions {
  tabs: TerminalTab[];
  setTabs: React.Dispatch<React.SetStateAction<TerminalTab[]>>;
  activeTabId: string | null;
  defaultWorkDir: string;
  settings?: AppSettings;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useTerminalPanes({
  tabs,
  setTabs,
  activeTabId,
  defaultWorkDir,
  settings,
  showToast,
}: UseTerminalPanesOptions) {
  const handleSplitTab = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      if (!activeTabId) return;

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId) return tab;

          if (tab.panes.length >= 2) {
            return {
              ...tab,
              splitDirection: direction,
            };
          }

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
    [activeTabId, defaultWorkDir, settings?.terminalShell, setTabs, showToast]
  );

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
    [setTabs]
  );

  const handleSelectPane = useCallback(
    (tabId: string, paneId: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.id === tabId);
        if (!tab || tab.activePaneId === paneId) return prev;
        return prev.map((t) => (t.id === tabId ? { ...t, activePaneId: paneId } : t));
      });
    },
    [setTabs]
  );

  const handleRestartSession = useCallback(() => {
    if (!activeTabId) return;
    const curTab = tabs.find((t) => t.id === activeTabId);
    if (!curTab) return;

    const targetPaneId = curTab.activePaneId || curTab.panes[0]?.id;
    if (!targetPaneId) return;

    const targetPane = curTab.panes.find((p) => p.id === targetPaneId);
    const preservedShell =
      targetPane?.shell || curTab.shell || settings?.terminalShell || 'powershell';
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
  }, [activeTabId, tabs, settings?.terminalShell, setTabs, showToast]);

  return {
    handleSplitTab,
    handleClosePane,
    handleSelectPane,
    handleRestartSession,
  };
}
