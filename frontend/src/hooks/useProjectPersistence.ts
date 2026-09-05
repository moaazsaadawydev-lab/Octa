import { useState, useEffect, useCallback } from 'react';
import { ConnectionConfig, ActiveSession, SqlQueryFolder, SqlQueryItem } from '../types/connection';
import { ProjectWorkspace, ProjectHttpClient } from '../types/project';
import { RedisConnectionConfig } from '../types/redis';
import { AppSettings } from '../types/settings';
import { ActiveModule } from '../components/layout/ActivityBar';
import {
  readProjectFile,
  saveProjectFile,
  closeProjectConnections,
  wipeLegacyStorage,
} from '../services/api';
import { useRecentProjects } from './useRecentProjects';
import { useProjectFileOps } from './useProjectFileOps';

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
  setActiveModule: (mod: ActiveModule) => void;
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
  setActiveModule,
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

  const loadProjectIntoWorkspace = useCallback(
    (proj: ProjectWorkspace, filePath: string) => {
      setActiveProject(proj);
      setProjectFilePath(filePath);
      setConnections(proj.databases || []);
      setQueriesTree(proj.sqlQueries || []);
      setRedisConnections(proj.redis || []);
      setHttpData(
        proj.httpClient || {
          collections: [],
          environments: [],
          globalVariables: [],
          activeEnvironmentId: null,
        }
      );
      setActiveSession(null);
      setActiveModule('databases');
      recordRecentProject(proj.name, filePath);
      updateSettings({ lastOpenedProjectFilePath: filePath });
    },
    [recordRecentProject, updateSettings, setConnections, setQueriesTree, setRedisConnections, setHttpData, setActiveSession, setActiveModule]
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
  });

  useEffect(() => {
    const hasResetLegacy = localStorage.getItem('octa_legacy_wiped_v2');
    if (!hasResetLegacy) {
      wipeLegacyStorage();
      localStorage.removeItem('octa_connections');
      localStorage.removeItem('octa_sql_queries_tree');
      localStorage.removeItem('octa_redis_connections');
      localStorage.removeItem('octa_http_client_data');
      localStorage.removeItem('octa_http_environments');
      localStorage.setItem('octa_legacy_wiped_v2', 'true');
    }

    if (settings.onStartup === 'last_project' && settings.lastOpenedProjectFilePath) {
      (async () => {
        setIsOpeningProject(true);
        try {
          const res = await readProjectFile(settings.lastOpenedProjectFilePath!);
          if (res.project && res.filePath) {
            loadProjectIntoWorkspace(res.project, res.filePath);
            showToast(`Restored "${res.project.name}"`, 'info');
          } else {
            showToast('Previous project not found, opened Welcome Screen', 'info');
          }
        } catch {
          showToast('Previous project not found, opened Welcome Screen', 'info');
        } finally {
          setIsOpeningProject(false);
        }
      })();
    }
  }, []);

  const handleCloseProject = async () => {
    try {
      await closeProjectConnections();
    } catch (e) {
      console.warn('Error closing connections:', e);
    }
    setActiveProject(null);
    setProjectFilePath(null);
    setActiveSession(null);
    setConnections([]);
    setQueriesTree([]);
    setRedisConnections([]);
    setHttpData({
      collections: [],
      environments: [],
      globalVariables: [],
      activeEnvironmentId: null,
    });
    setActiveModule('welcome');
    showToast('Project closed', 'info');
  };

  useEffect(() => {
    if (!activeProject || !projectFilePath) return;

    const timer = setTimeout(async () => {
      setIsSavingProject(true);
      try {
        const updatedProj: ProjectWorkspace = {
          ...activeProject,
          updatedAt: new Date().toISOString(),
          databases: connections,
          sqlQueries: queriesTree,
          redis: redisConnections,
          httpClient: httpData,
        };
        await saveProjectFile(projectFilePath, updatedProj);
      } catch (err) {
        console.warn('Auto-save error:', err);
      } finally {
        setIsSavingProject(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [activeProject, projectFilePath, connections, queriesTree, redisConnections, httpData]);

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
