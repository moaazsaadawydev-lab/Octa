import React from 'react';
import clsx from 'clsx';
import { WelcomeScreen } from './WelcomeScreen';
import { Sidebar } from './Sidebar';
import { Workspace } from '../database/Workspace';
import { QueryPlayground } from '../database/QueryPlayground';
import { ErdVisualizer } from '../database/ErdVisualizer';
import { DatabaseHeader } from '../../features/database/components/DatabaseHeader';
import { RedisWorkspace } from '../redis/RedisWorkspace';
import { HttpClientWorkspace } from '../http/HttpClientWorkspace';
import { TerminalWorkspace } from '../terminal';
import { DockerWorkspace } from '../docker';
import { GitWorkspace } from '../git/GitWorkspace';
import { EditorWorkspace } from '../../features/editor/EditorWorkspace';
import { BrowserWorkspace } from '../../features/browser/BrowserWorkspace';
import { SettingsView } from './SettingsView';
import { AppSettings } from '../../types/settings';
import { getProjectRootDir } from '../../types/project';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';

export interface WorkspaceViewRendererProps {
  state: ReturnType<typeof useWorkspaceState>;
  settings: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
}

export const WorkspaceViewRenderer: React.FC<WorkspaceViewRendererProps> = ({
  state,
  settings,
  onUpdateSettings,
}) => {
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

  const server = state.activeSession?.connection;
  const activeConnKey = server ? (server.id || server.name || `${server.host}:${server.port}`) : '';
  const currentDatabases = (activeConnKey && state.databasesMap[activeConnKey]) || [];
  const activeQueryTab = state.queryTabs.find((t) => t.id === state.activeQueryTabId);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* 0. Code Editor & Reviewer Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'editor' ? 'flex flex-col' : 'hidden')}>
        <EditorWorkspace
          initialRootPath={getProjectRootDir(state.projectFilePath) || undefined}
          isVisible={state.activeModule === 'editor'}
          settings={settings}
          showToast={state.showToast}
        />
      </div>

      {/* 1. Terminal Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'terminal' ? 'flex flex-col' : 'hidden')}>
        <TerminalWorkspace
          activeProject={state.activeProject}
          projectFilePath={state.projectFilePath}
          isVisible={state.activeModule === 'terminal'}
          settings={settings}
          showToast={state.showToast}
        />
      </div>

      {/* 2. Redis Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'redis' ? 'flex flex-col' : 'hidden')}>
        <RedisWorkspace
          connections={state.redisConnections}
          onUpdateConnections={state.setRedisConnections}
          showToast={state.showToast}
          isVisible={state.activeModule === 'redis'}
        />
      </div>

      {/* 3. HTTP Client Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'http' ? 'flex flex-col' : 'hidden')}>
        <HttpClientWorkspace
          key={state.activeProject?.id || 'standalone'}
          data={state.httpData}
          onUpdateData={state.setHttpData}
          showToast={state.showToast}
          isVisible={state.activeModule === 'http'}
        />
      </div>

      {/* 4. Git Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'git' ? 'flex flex-col' : 'hidden')}>
        <GitWorkspace
          activeProject={state.activeProject}
          projectFilePath={state.projectFilePath}
          activeProjectPath={getProjectRootDir(state.projectFilePath) || undefined}
          isVisible={state.activeModule === 'git'}
          onUpdateGitConfig={(gitConfig) => {
            if (state.activeProject) {
              state.setActiveProject((prev) => (prev ? { ...prev, git: gitConfig } : prev));
            }
          }}
          showToast={state.showToast}
        />
      </div>

      {/* 5. Docker Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'docker' ? 'flex flex-col' : 'hidden')}>
        <DockerWorkspace
          isVisible={state.activeModule === 'docker'}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          showToast={state.showToast}
        />
      </div>

      {/* 6. Settings View */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'settings' ? 'flex flex-col' : 'hidden')}>
        <SettingsView showToast={state.showToast} />
      </div>

      {/* 8. Integrated Localhost Browser Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'browser' ? 'flex flex-col' : 'hidden')}>
        <BrowserWorkspace
          isVisible={state.activeModule === 'browser'}
          showToast={state.showToast}
        />
      </div>

      {/* 7. Database Workspace */}
      <div className={clsx('w-full h-full min-h-0 min-w-0', state.activeModule === 'databases' ? 'flex-1 flex overflow-hidden' : 'hidden')}>
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

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <DatabaseHeader
            activeSession={state.activeSession}
            activeProject={state.activeProject}
            dbSubView={state.dbSubView}
            setDbSubView={state.setDbSubView}
            connections={state.connections}
            onSelectConnection={(conn) => state.handleConnectDirect(conn)}
            databases={currentDatabases}
            onSelectDatabase={(dbName) => state.handleConnectToDatabase(state.activeSession!.connection, dbName)}
            onNavigateHome={() => state.setActiveModule('welcome')}
            activeQueryTitle={activeQueryTab?.title}
          />

          <div className={clsx('flex-1 min-h-0 overflow-hidden', state.dbSubView === 'playground' ? 'flex flex-col' : 'hidden')}>
            <QueryPlayground
              activeSession={state.activeSession}
              databases={currentDatabases}
              onOpenNewModal={() => state.setIsModalOpen(true)}
              showToast={state.showToast}
              tabs={state.queryTabs}
              activeTabId={state.activeQueryTabId}
              onTabsChange={state.setQueryTabs}
              onActiveTabChange={state.setActiveQueryTabId}
              queriesTree={state.queriesTree}
              onSaveQueriesTree={state.handleSaveQueriesTree}
            />
          </div>

          {state.dbSubView === 'erd' && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ErdVisualizer
                activeSession={state.activeSession}
                onOpenNewModal={() => state.setIsModalOpen(true)}
                showToast={state.showToast}
              />
            </div>
          )}

          <div className={clsx('flex-1 min-h-0 overflow-hidden', state.dbSubView === 'tables' ? 'flex flex-col' : 'hidden')}>
            <Workspace
              activeSession={state.activeSession}
              onOpenNewModal={() => state.setIsModalOpen(true)}
              showToast={state.showToast}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
