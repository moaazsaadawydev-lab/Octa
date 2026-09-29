import { useState, useCallback, useEffect } from 'react';
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
import { loadSqlQueriesData, saveSqlQueriesData } from '../services/api';

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
  const [queriesTree, setQueriesTree] = useState<(SqlQueryFolder | SqlQueryItem)[]>(() => {
    try {
      const saved = localStorage.getItem('octa_sql_queries_tree');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    loadSqlQueriesData()
      .then((diskData) => {
        if (diskData && diskData.trim()) {
          const parsed = JSON.parse(diskData);
          if (Array.isArray(parsed)) setQueriesTree(parsed);
        }
      })
      .catch(() => {});
  }, []);

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
    try {
      const json = JSON.stringify(nextTree);
      localStorage.setItem('octa_sql_queries_tree', json);
      saveSqlQueriesData(json).catch((err) => console.warn('Failed saveSqlQueriesData:', err));
    } catch (e) {
      console.warn('Failed saving sql queries:', e);
    }
  }, []);

  const handleSelectQueryFromSidebar = (query: SqlQueryItem) => {
    setActiveModule('databases');
    setDbSubView('playground');

    let targetTabId = query.id;

    setQueryTabs((prev) => {
      const existing = prev.find((t) => t.id === query.id || t.savedQueryId === query.id);
      if (existing) {
        targetTabId = existing.id;
        return prev;
      }

      if (
        prev.length === 1 &&
        prev[0].title === 'Query 1.sql' &&
        !prev[0].isDirty &&
        !prev[0].savedQueryId &&
        prev[0].results === null
      ) {
        targetTabId = query.id;
        return [
          {
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
          },
        ];
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

    setActiveQueryTabId(targetTabId);
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
    queriesTree,
    setQueriesTree,
    queryTabs,
    setQueryTabs,
    activeQueryTabId,
    setActiveQueryTabId,
    handleSaveQueriesTree,
    handleSelectQueryFromSidebar,
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
