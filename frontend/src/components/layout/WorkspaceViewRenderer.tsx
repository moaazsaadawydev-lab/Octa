import React from 'react';
import clsx from 'clsx';
import { Table, Terminal, Layers } from 'lucide-react';
import { WelcomeScreen } from './WelcomeScreen';
import { Sidebar } from './Sidebar';
import { Workspace } from '../database/Workspace';
import { QueryPlayground } from '../database/QueryPlayground';
import { ErdVisualizer } from '../database/ErdVisualizer';
import { RedisWorkspace } from '../redis/RedisWorkspace';
import { HttpClientWorkspace } from '../http/HttpClientWorkspace';
import { TerminalWorkspace } from '../terminal';
import { DockerWorkspace } from '../docker';
import { GitWorkspace } from '../git/GitWorkspace';
import { SettingsView } from './SettingsView';
import { AppSettings } from '../../types/settings';
import { getProjectRootDir } from '../../types/project';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';

export interface WorkspaceViewRendererProps {
  state: ReturnType<typeof useWorkspaceState>;
  settings: AppSettings;
}

export const WorkspaceViewRenderer: React.FC<WorkspaceViewRendererProps> = ({ state, settings }) => {
  if (state.activeModule === 'welcome') {
    return (
      <WelcomeScreen
        onCreateProject={state.handleCreateProject}
        onOpenProject={state.handleOpenProject}
        onSelectRecent={state.handleSelectRecent}
        onRemoveRecent={state.handleRemoveRecent}
        onClearRecents={state.handleClearRecents}
        recentProjects={state.recentProjects}
        isOpening={state.isOpeningProject}
      />
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* 1. Persistent Terminal Workspace (Kept alive in DOM across module switches) */}
      <div
        className={clsx(
          'w-full h-full min-h-0 min-w-0',
          state.activeModule === 'terminal' ? 'flex flex-col' : 'hidden'
        )}
      >
        <TerminalWorkspace
          activeProject={state.activeProject}
          projectFilePath={state.projectFilePath}
          isVisible={state.activeModule === 'terminal'}
          settings={settings}
          showToast={state.showToast}
        />
      </div>

      {/* 2. Redis Workspace */}
      {state.activeModule === 'redis' && (
        <RedisWorkspace
          connections={state.redisConnections}
          onUpdateConnections={state.setRedisConnections}
          showToast={state.showToast}
        />
      )}

      {/* 3. HTTP Client Workspace */}
      {state.activeModule === 'http' && (
        <HttpClientWorkspace
          data={state.httpData}
          onUpdateData={state.setHttpData}
          showToast={state.showToast}
        />
      )}

      {/* 4. Git Workspace */}
      {state.activeModule === 'git' && (
        <GitWorkspace
          activeProject={state.activeProject}
          projectFilePath={state.projectFilePath}
          activeProjectPath={getProjectRootDir(state.projectFilePath) || undefined}
          onUpdateGitConfig={(gitConfig) => {
            if (state.activeProject) {
              state.setActiveProject((prev) => (prev ? { ...prev, git: gitConfig } : prev));
            }
          }}
          showToast={state.showToast}
        />
      )}

      {/* 5. Docker Workspace */}
      {state.activeModule === 'docker' && <DockerWorkspace showToast={state.showToast} />}

      {/* 6. Settings View */}
      {state.activeModule === 'settings' && <SettingsView showToast={state.showToast} />}

      {/* 7. Database Workspace */}
      {state.activeModule === 'databases' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Secondary Sidebar (Server Explorer & Queries) */}
          {state.isSidebarVisible && (
            <Sidebar
              connections={state.connections}
              activeSession={state.activeSession}
              databasesMap={state.databasesMap}
              loadingMap={state.loadingMap}
              expandedServers={state.expandedServers}
              onToggleExpand={state.handleToggleExpand}
              onOpenNewModal={() => state.setIsModalOpen(true)}
              onRefreshConnections={() => {}}
              onConnectToDatabase={state.handleConnectToDatabase}
              onDeleteConnection={state.handleDeleteConnection}
              onExportDatabase={state.handleExportDatabase}
              onImportSQL={state.handleImportSQL}
              onSelectQuery={state.handleSelectQueryFromSidebar}
              activeQueryId={state.activeQueryTabId}
              queriesTree={state.queriesTree}
              onSaveQueriesTree={state.handleSaveQueriesTree}
            />
          )}

          {/* Database Workspace Views (Tables vs Monaco SQL Playground vs Schema ERD) */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* View Switcher Segmented Pill Toggle (Visible when connected) */}
            {state.activeSession && (
              <div className="absolute right-4 top-2 z-40 flex items-center bg-slate-100 dark:bg-[#141416] border border-slate-300 dark:border-zinc-800 p-0.5 rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => state.setDbSubView('tables')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    state.dbSubView === 'tables'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200/80 dark:border-transparent'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                  <span>Tables</span>
                </button>
                <button
                  type="button"
                  onClick={() => state.setDbSubView('playground')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    state.dbSubView === 'playground'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200/80 dark:border-transparent'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>SQL Playground</span>
                </button>
                <button
                  type="button"
                  onClick={() => state.setDbSubView('erd')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    state.dbSubView === 'erd'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200/80 dark:border-transparent'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                  <span>ERD</span>
                </button>
              </div>
            )}

            {state.dbSubView === 'playground' ? (
              <QueryPlayground
                activeSession={state.activeSession}
                onOpenNewModal={() => state.setIsModalOpen(true)}
                showToast={state.showToast}
                tabs={state.queryTabs}
                activeTabId={state.activeQueryTabId}
                onTabsChange={state.setQueryTabs}
                onActiveTabChange={state.setActiveQueryTabId}
                queriesTree={state.queriesTree}
                onSaveQueriesTree={state.handleSaveQueriesTree}
              />
            ) : state.dbSubView === 'erd' ? (
              <ErdVisualizer
                activeSession={state.activeSession}
                onOpenNewModal={() => state.setIsModalOpen(true)}
                showToast={state.showToast}
              />
            ) : (
              <Workspace
                activeSession={state.activeSession}
                onOpenNewModal={() => state.setIsModalOpen(true)}
                showToast={state.showToast}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
