import { useState, useCallback } from 'react';
import {
  ConnectionConfig,
  ActiveSession,
  QueryTab,
  SqlQueryItem,
  SqlQueryFolder,
} from '../types/connection';
import { ProjectHttpClient } from '../types/project';
import { RedisConnectionConfig } from '../types/redis';
import { AppSettings } from '../types/settings';
import { ActiveModule } from '../components/layout/ActivityBar';
import { useToastState } from './useToastState';
import { useProjectPersistence } from './useProjectPersistence';
import { useDatabaseServers } from './useDatabaseServers';

const DEFAULT_PLAYGROUND_QUERY = `-- Octa SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'Octa' AS application,
  'Database Management & SQL Workspace' AS milestone,
  NOW() AS executed_at;
`;

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

  // SQL Queries Tree State
  const [queriesTree, setQueriesTree] = useState<(SqlQueryFolder | SqlQueryItem)[]>([]);

  // Query Playground Tabs State
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      title: 'Query 1.sql',
      query: DEFAULT_PLAYGROUND_QUERY,
      isDirty: false,
      results: null,
      activeResultIndex: 0,
      isExecuting: false,
    },
  ]);
  const [activeQueryTabId, setActiveQueryTabId] = useState<string | null>('tab-1');

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

  // Project persistence & lifecycle
  const persistence = useProjectPersistence({
    settings,
    updateSettings,
    showToast,
    connections,
    setConnections,
    queriesTree,
    setQueriesTree,
    redisConnections,
    setRedisConnections,
    httpData,
    setHttpData,
    setActiveSession,
    setActiveModule,
  });

  const handleSaveQueriesTree = useCallback((nextTree: (SqlQueryFolder | SqlQueryItem)[]) => {
    setQueriesTree(nextTree);
  }, []);

  const handleSelectQueryFromSidebar = (query: SqlQueryItem) => {
    setActiveModule('databases');
    setDbSubView('playground');

    setQueryTabs((prev) => {
      const existing = prev.find((t) => t.id === query.id || t.savedQueryId === query.id);
      if (existing) {
        return prev;
      }
      const newTab: QueryTab = {
        id: query.id,
        savedQueryId: query.id,
        title: query.name,
        query: query.content,
        isDirty: false,
        results: null,
        activeResultIndex: 0,
        isExecuting: false,
        activeConnectionName: activeSession?.connection.name || 'Local Postgres',
        activeDatabaseName: activeSession?.activeDatabase || 'postgres',
      };
      return [...prev, newTab];
    });

    setActiveQueryTabId(query.id);
  };

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
    queriesTree,
    setQueriesTree,
    queryTabs,
    setQueryTabs,
    activeQueryTabId,
    setActiveQueryTabId,
    databasesMap: dbServers.databasesMap,
    loadingMap: dbServers.loadingMap,
    expandedServers: dbServers.expandedServers,
    toast,
    setToast,
    showToast,
    handleCreateProject: persistence.handleCreateProject,
    handleOpenProject: persistence.handleOpenProject,
    handleSelectRecent: persistence.handleSelectRecent,
    handleRemoveRecent: persistence.handleRemoveRecent,
    handleClearRecents: persistence.handleClearRecents,
    handleCloseProject: persistence.handleCloseProject,
    handleSaveProject: persistence.handleSaveProject,
    handleSaveProjectAs: persistence.handleSaveProjectAs,
    handleSaveQueriesTree,
    handleToggleExpand: dbServers.handleToggleExpand,
    handleConnectToDatabase: dbServers.handleConnectToDatabase,
    handleConnectDirect: dbServers.handleConnectDirect,
    handleDeleteConnection: dbServers.handleDeleteConnection,
    handleSavedConnection: dbServers.handleSavedConnection,
    handleExportDatabase: dbServers.handleExportDatabase,
    handleImportSQL: dbServers.handleImportSQL,
    handleSelectQueryFromSidebar,
  };
}
