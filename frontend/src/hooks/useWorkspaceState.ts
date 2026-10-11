import { useState } from 'react';
import { ConnectionConfig, ActiveSession } from '../types/connection';
import { ProjectHttpClient } from '../types/project';
import { RedisConnectionConfig } from '../types/redis';
import { AppSettings } from '../types/settings';
import { ActiveModule } from '../components/layout/ActivityBar';
import { useToastState } from './useToastState';
import { useProjectPersistence } from './useProjectPersistence';
import { useDatabaseServers } from './useDatabaseServers';
import { useWorkspaceQueries } from '../features/database/hooks/useWorkspaceQueries';

interface UseWorkspaceStateOptions {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings> | AppSettings) => void;
}

export function useWorkspaceState({ settings, updateSettings }: UseWorkspaceStateOptions) {
  // Toast notifications
  const { toast, setToast, showToast } = useToastState();

  // Layout modals & navigation
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeModule, setActiveModule] = useState<ActiveModule>('welcome');
  const [dbSubView, setDbSubView] = useState<'tables' | 'playground' | 'erd'>('tables');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Database Connections & Sessions
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [redisConnections, setRedisConnections] = useState<RedisConnectionConfig[]>([]);
  const [httpData, setHttpData] = useState<ProjectHttpClient>({
    collections: [],
    environments: [],
    globalVariables: [],
    activeEnvironmentId: null,
  });
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sidebarImportSession, setSidebarImportSession] = useState<ActiveSession | null>(null);

  // Database server operations and expand states
  const dbServers = useDatabaseServers({
    connections,
    setConnections,
    activeSession,
    setActiveSession,
    setSidebarImportSession,
    setIsModalOpen,
    showToast,
  });

  // Queries & Tabs state with persistence and auto-activating DB
  const workspaceQueries = useWorkspaceQueries({
    connections,
    activeSession,
    databasesMap: dbServers.databasesMap,
    handleConnectToDatabase: dbServers.handleConnectToDatabase,
    setActiveModule,
    setDbSubView,
    showToast,
  });

  // Project persistence & lifecycle
  const persistence = useProjectPersistence({
    settings,
    updateSettings,
    showToast,
    connections,
    setConnections,
    queriesTree: workspaceQueries.queriesTree,
    setQueriesTree: workspaceQueries.setQueriesTree,
    redisConnections,
    setRedisConnections,
    httpData,
    setHttpData,
    setActiveSession,
    setActiveModule,
  });

  return {
    activeProject: persistence.activeProject,
    setActiveProject: persistence.setActiveProject,
    projectFilePath: persistence.projectFilePath,
    setProjectFilePath: persistence.setProjectFilePath,
    isSavingProject: persistence.isSavingProject,
    isOpeningProject: persistence.isOpeningProject,
    recentProjects: persistence.recentProjects,
    activeModule,
    setActiveModule,
    dbSubView,
    setDbSubView,
    isModalOpen,
    setIsModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isSidebarVisible,
    setIsSidebarVisible,
    toast,
    setToast,
    showToast,
    connections,
    setConnections,
    redisConnections,
    setRedisConnections,
    httpData,
    setHttpData,
    activeSession,
    setActiveSession,
    sidebarImportSession,
    setSidebarImportSession,
    queriesTree: workspaceQueries.queriesTree,
    setQueriesTree: workspaceQueries.setQueriesTree,
    queryTabs: workspaceQueries.queryTabs,
    setQueryTabs: workspaceQueries.setQueryTabs,
    activeQueryTabId: workspaceQueries.activeQueryTabId,
    setActiveQueryTabId: workspaceQueries.setActiveQueryTabId,
    handleSaveQueriesTree: workspaceQueries.handleSaveQueriesTree,
    handleSelectQueryFromSidebar: workspaceQueries.handleSelectQueryFromSidebar,
    activateQueryDatabase: workspaceQueries.activateQueryDatabase,
    handleCreateProject: persistence.handleCreateProject,
    handleOpenProject: persistence.handleOpenProject,
    handleSelectRecent: persistence.handleSelectRecent,
    handleRemoveRecent: persistence.handleRemoveRecent,
    handleClearRecents: persistence.handleClearRecents,
    handleCloseProject: persistence.handleCloseProject,
    handleSaveProject: persistence.handleSaveProject,
    handleSaveProjectAs: persistence.handleSaveProjectAs,
    handleSavedConnection: dbServers.handleSavedConnection,
    handleConnectDirect: dbServers.handleConnectDirect,
    handleExportDatabase: dbServers.handleExportDatabase,
    handleImportSQL: dbServers.handleImportSQL,
    databasesMap: dbServers.databasesMap,
    loadingMap: dbServers.loadingMap,
    expandedServers: dbServers.expandedServers,
    handleToggleExpand: dbServers.handleToggleExpand,
    handleConnectToDatabase: dbServers.handleConnectToDatabase,
    handleDeleteConnection: dbServers.handleDeleteConnection,
  };
}
