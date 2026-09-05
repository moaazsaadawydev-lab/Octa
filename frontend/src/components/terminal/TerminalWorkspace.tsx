import React, { useEffect } from 'react';
import { Terminal as TerminalIcon, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { ProjectWorkspace, getProjectRootDir } from '../../types/project';
import { AppSettings } from '../../types/settings';
import { XTermInstance } from './XTermInstance';
import { TabsHeader } from './TabsHeader';
import { useTerminalManager, getShellDisplayName } from '../../hooks/useTerminalManager';

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
  const defaultWorkDir = getProjectRootDir(projectFilePath);
  const projectId = activeProject?.id || 'global';

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    availableShells,
    handleAddTab,
    handleCloseTab,
    handleRenameTab,
    handleSplitTab,
    handleClosePane,
    handleSelectPane,
    handleRestartSession,
  } = useTerminalManager({
    projectId,
    defaultWorkDir,
    settings,
    showToast,
  });

  // Global Keyboard Shortcuts for active terminal (Ctrl+Shift+T, Ctrl+Shift+W)
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
          <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
            No active terminals
          </span>
          <span className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Open a new tab to start an interactive ConPTY session with your preferred shell.
          </span>
          <button
            type="button"
            onClick={() => handleAddTab()}
            className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              New Terminal Session (
              {getShellDisplayName(settings?.terminalShell || 'powershell', availableShells)})
            </span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 min-w-0 overflow-hidden">
          {/* Top Multi-Tab Header Bar */}
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

          {/* Main Terminal Viewport Area */}
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

                            <div className="flex-1 relative w-full h-full min-h-0 min-w-0 overflow-hidden">
                              <XTermInstance
                                sessionId={pane.id}
                                workDir={pane.workDir}
                                shell={
                                  pane.shellPath ||
                                  pane.shell ||
                                  pane.shellId ||
                                  tab.shellPath ||
                                  tab.shell ||
                                  settings?.terminalShell ||
                                  'powershell'
                                }
                                isActive={isVisible && isTabActive && isPaneActive}
                                settings={settings}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-full min-h-0 min-w-0">
                      {tab.panes[0] && (
                        <XTermInstance
                          sessionId={tab.panes[0].id}
                          workDir={tab.panes[0].workDir}
                          shell={
                            tab.panes[0].shellPath ||
                            tab.panes[0].shell ||
                            tab.panes[0].shellId ||
                            tab.shellPath ||
                            tab.shell ||
                            settings?.terminalShell ||
                            'powershell'
                          }
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
