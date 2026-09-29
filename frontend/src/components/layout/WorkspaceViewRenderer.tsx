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

      {/* 3. Persistent HTTP Client Workspace (Kept alive in DOM across module switches) */}
      <div
        className={clsx(
          'w-full h-full min-h-0 min-w-0',
          state.activeModule === 'http' ? 'flex flex-col' : 'hidden'
        )}
      >
        <HttpClientWorkspace
          data={state.httpData}
          onUpdateData={state.setHttpData}
          showToast={state.showToast}
          isVisible={state.activeModule === 'http'}
        />
      </div>

      {/* 4. Persistent Git Workspace (Kept alive in DOM across module switches) */}
      <div
        className={clsx(
          'w-full h-full min-h-0 min-w-0',
          state.activeModule === 'git' ? 'flex flex-col' : 'hidden'
        )}
      >
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

      {/* 5. Persistent Docker Workspace (Kept alive in DOM across module switches) */}
      <div
        className={clsx(
          'w-full h-full min-h-0 min-w-0',
          state.activeModule === 'docker' ? 'flex flex-col' : 'hidden'
        )}
      >
        <DockerWorkspace
          isVisible={state.activeModule === 'docker'}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          showToast={state.showToast}
        />
      </div>

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
            <DatabaseHeader
              activeSession={state.activeSession}
              dbSubView={state.dbSubView}
              setDbSubView={state.setDbSubView}
            />

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
