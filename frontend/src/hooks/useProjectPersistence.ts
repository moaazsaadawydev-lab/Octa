import { useState, useEffect, useCallback } from 'react';
import { ConnectionConfig, ActiveSession, SqlQueryFolder, SqlQueryItem } from '../types/connection';
import { ProjectWorkspace, ProjectHttpClient } from '../types/project';
import { RedisConnectionConfig } from '../types/redis';
import { AppSettings } from '../types/settings';
import { ActiveModule } from '../components/layout/ActivityBar';
import { saveProjectFile, closeProjectConnections } from '../services/api';
import { saveHttpClientData } from '../services/httpApi';
import { useRecentProjects } from './useRecentProjects';
import { useProjectFileOps } from './useProjectFileOps';
import { useStartupProject } from './useStartupProject';

const DEFAULT_PLAYGROUND_QUERY = `-- Octa SQL Playground\n-- Press Ctrl + Enter to run selected text or full query\n\nSELECT \n  'Octa' AS application,\n  'Database Management & SQL Workspace' AS milestone,\n  NOW() AS executed_at;\n`;

interface UseProjectPersistenceOptions {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings> | AppSettings) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  connections: ConnectionConfig[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionConfig[]>>;
  queriesTree: (SqlQueryFolder | SqlQueryItem)[];
  setQueriesTree: React.Dispatch<React.SetStateAction<(SqlQueryFolder | SqlQueryItem)[]>>;
  redisConnections: RedisConnectionConfig[];
  setRedisConnections: React.Dispatch<React.SetStateAction<RedisConnectionConfig[]>>;
  httpData: ProjectHttpClient;
  setHttpData: React.Dispatch<React.SetStateAction<ProjectHttpClient>>;
  setActiveSession: React.Dispatch<React.SetStateAction<ActiveSession | null>>;
  activeModule: ActiveModule;
  setActiveModule: (mod: ActiveModule) => void;
  dbSubView: 'tables' | 'playground' | 'erd';
  setDbSubView: (view: 'tables' | 'playground' | 'erd') => void;
  isSidebarVisible: boolean;
  setIsSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  queryTabs: any[];
  setQueryTabs: React.Dispatch<React.SetStateAction<any[]>>;
  activeQueryTabId: string | null;
  setActiveQueryTabId: (id: string | null) => void;
}

export function useProjectPersistence({
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
  activeModule,
  setActiveModule,
  dbSubView,
  setDbSubView,
  isSidebarVisible,
  setIsSidebarVisible,
  queryTabs,
  setQueryTabs,
  activeQueryTabId,
  setActiveQueryTabId,
}: UseProjectPersistenceOptions) {
  const [activeProject, setActiveProject] = useState<ProjectWorkspace | null>(null);
  const [projectFilePath, setProjectFilePath] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isOpeningProject, setIsOpeningProject] = useState(false);

  const {
    recentProjects,
    recordRecentProject,
    handleRemoveRecent,
    handleClearRecents,
  } = useRecentProjects(showToast);

  const buildCurrentProjectWorkspace = useCallback((): ProjectWorkspace | null => {
    if (!activeProject) return null;
    return {
      ...activeProject,
      updatedAt: new Date().toISOString(),
      databases: connections,
      sqlQueries: queriesTree,
      redis: redisConnections,
      httpClient: httpData,
      state: {
        activeModule,
        dbSubView,
        activeQueryTabId,
        queryTabs: (queryTabs || []).map((t) => ({
          id: t.id,
          title: t.title,
          query: t.query,
          savedQueryId: t.savedQueryId,
          activeDatabaseName: t.activeDatabaseName,
          activeConnectionName: t.activeConnectionName,
        })),
        isSidebarVisible,
        http: {
          openTabs: httpData.openTabs || [],
          activeTabId: httpData.activeTabId || null,
        },
      },
    };
  }, [activeProject, connections, queriesTree, redisConnections, httpData, activeModule, dbSubView, activeQueryTabId, queryTabs, isSidebarVisible]);

  const loadProjectIntoWorkspace = useCallback(
    (proj: ProjectWorkspace, filePath: string) => {
      setActiveProject(proj);
      setProjectFilePath(filePath);
      setConnections(proj.databases || []);
      setQueriesTree(proj.sqlQueries || []);
      setRedisConnections(proj.redis || []);

      const loadedOpenTabs = proj.httpClient?.openTabs || proj.state?.http?.openTabs || [];
      const loadedActiveTabId = proj.httpClient?.activeTabId || proj.state?.http?.activeTabId || (loadedOpenTabs[0]?.id ?? null);
      setHttpData({
        collections: proj.httpClient?.collections || [],
        environments: proj.httpClient?.environments || [],
        globalVariables: proj.httpClient?.globalVariables || [],
        activeEnvironmentId: proj.httpClient?.activeEnvironmentId ?? null,
        openTabs: loadedOpenTabs,
        activeTabId: loadedActiveTabId,
      });

      if (proj.state?.queryTabs && proj.state.queryTabs.length > 0) {
        setQueryTabs(proj.state.queryTabs);
        setActiveQueryTabId(proj.state.activeQueryTabId || proj.state.queryTabs[0].id);
      } else {
        const defaultTabId = 'tab-' + Date.now();
        setQueryTabs([{ id: defaultTabId, title: 'Query 1.sql', query: DEFAULT_PLAYGROUND_QUERY, isDirty: false, results: null }]);
        setActiveQueryTabId(defaultTabId);
      }

      setActiveSession(null);
      if (proj.state?.activeModule) setActiveModule(proj.state.activeModule as ActiveModule);
      else setActiveModule('databases');
      if (proj.state?.dbSubView) setDbSubView(proj.state.dbSubView);
      if (proj.state?.isSidebarVisible !== undefined) setIsSidebarVisible(proj.state.isSidebarVisible);

      try {
        localStorage.removeItem('octa_http_open_tabs');
        localStorage.removeItem('octa_http_active_tab_id');
      } catch {}

      recordRecentProject(proj.name, filePath);
      updateSettings({ lastOpenedProjectFilePath: filePath });
    },
    [recordRecentProject, updateSettings, setConnections, setQueriesTree, setRedisConnections, setHttpData, setQueryTabs, setActiveQueryTabId, setActiveSession, setActiveModule, setDbSubView, setIsSidebarVisible]
  );

  const fileOps = useProjectFileOps({
    activeProject,
    setActiveProject,
    projectFilePath,
    setIsOpeningProject,
    setIsSavingProject,
    loadProjectIntoWorkspace,
    showToast,
    connections,
    queriesTree,
    redisConnections,
    httpData,
    buildCurrentWorkspace: buildCurrentProjectWorkspace,
  });

  const { restoreStandaloneHttpData } = useStartupProject({
    settings,
    loadProjectIntoWorkspace,
    setHttpData,
    setIsOpeningProject,
    showToast,
  });

  const handleCloseProject = async () => {
    try {
      if (activeProject && projectFilePath) {
        const current = buildCurrentProjectWorkspace();
        if (current) await saveProjectFile(projectFilePath, current);
      }
      await closeProjectConnections();
    } catch (e) {
      console.warn('Error closing connections:', e);
    }
    setActiveProject(null); setProjectFilePath(null); setActiveSession(null);
    setConnections([]); setQueriesTree([]); setRedisConnections([]);
    setHttpData({ collections: [], environments: [], globalVariables: [], activeEnvironmentId: null, openTabs: [], activeTabId: null });
    setQueryTabs([{ id: 'tab-1', title: 'Query 1.sql', query: DEFAULT_PLAYGROUND_QUERY, isDirty: false, results: null }]);
    setActiveQueryTabId('tab-1'); setActiveModule('welcome');
    try { localStorage.removeItem('octa_http_open_tabs'); localStorage.removeItem('octa_http_active_tab_id'); } catch {}
    restoreStandaloneHttpData();
    showToast('Project closed', 'info');
  };

  useEffect(() => {
    if (!activeProject || !projectFilePath) return;
    const timer = setTimeout(async () => {
      setIsSavingProject(true);
      try {
        const updatedProj = buildCurrentProjectWorkspace();
        if (updatedProj) await saveProjectFile(projectFilePath, updatedProj);
      } catch (err) {
        console.warn('Auto-save error:', err);
      } finally {
        setIsSavingProject(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [buildCurrentProjectWorkspace, activeProject, projectFilePath]);

  useEffect(() => {
    if (activeProject && projectFilePath) return;
    if (!httpData || (!httpData.collections?.length && !httpData.environments?.length)) return;
    const timer = setTimeout(() => {
      try {
        const json = JSON.stringify(httpData);
        localStorage.setItem('octa_http_client_data', json);
        saveHttpClientData(json).catch(() => {});
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [activeProject, projectFilePath, httpData]);

  return {
    activeProject,
    setActiveProject,
    projectFilePath,
    setProjectFilePath,
    isSavingProject,
    isOpeningProject,
    recentProjects,
    handleCreateProject: fileOps.handleCreateProject,
    handleOpenProject: fileOps.handleOpenProject,
    handleSelectRecent: fileOps.handleSelectRecent,
    handleRemoveRecent,
    handleClearRecents,
    handleCloseProject,
    handleSaveProject: fileOps.handleSaveProject,
    handleSaveProjectAs: fileOps.handleSaveProjectAs,
  };
}
