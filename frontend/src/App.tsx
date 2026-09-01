import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { ActivityBar, ActiveModule } from './components/layout/ActivityBar';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { Sidebar } from './components/layout/Sidebar';
import { Workspace } from './components/database/Workspace';
import { QueryPlayground } from './components/database/QueryPlayground';
import { ErdVisualizer } from './components/database/ErdVisualizer';
import { RedisWorkspace } from './components/redis/RedisWorkspace';
import { HttpClientWorkspace } from './components/http/HttpClientWorkspace';
import { SettingsView } from './components/layout/SettingsView';
import { NewConnectionModal } from './components/database/NewConnectionModal';
import { ImportSqlModal } from './components/database/ImportSqlModal';
import {
  ConnectionConfig,
  ActiveSession,
  QueryTab,
  SqlQueryItem,
  SqlQueryFolder
} from './types/connection';
import {
  ProjectWorkspace,
  RecentProject,
  ProjectHttpClient
} from './types/project';
import { RedisConnectionConfig } from './types/redis';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS
} from './types/settings';
import { SettingsModal } from './components/layout/SettingsModal';
import {
  getDatabases,
  deleteConnection,
  saveConnection,
  exportDatabaseSQL,
  saveSQLDumpDialog,
  downloadSQLFile,
  createProjectFileDialog,
  openProjectFileDialog,
  readProjectFile,
  saveProjectFile,
  closeProjectConnections,
  wipeLegacyStorage
} from './services/api';
import { AlertCircle, CheckCircle2, X, Table, Terminal, Layers } from 'lucide-react';

const DEFAULT_PLAYGROUND_QUERY = `-- Octa SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'Octa' AS application,
  'Database Management & SQL Workspace' AS milestone,
  NOW() AS executed_at;
`;

export function App() {
  // --- Project Workspace Lifecycle State ---
  const [activeProject, setActiveProject] = useState<ProjectWorkspace | null>(null);
  const [projectFilePath, setProjectFilePath] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isOpeningProject, setIsOpeningProject] = useState(false);

  // Global App Settings / Preferences
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('octa_global_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_APP_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse app settings from localStorage:', e);
    }
    return DEFAULT_APP_SETTINGS;
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Recent Projects List
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    try {
      const saved = localStorage.getItem('octa_recent_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse recent projects:', e);
    }
    return [];
  });

  // Active Navigation Module
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

  // Cached databases per connection ID: { [connId]: ["postgres", "mydb", ...] }
  const [databasesMap, setDatabasesMap] = useState<Record<string, string[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  // Notification Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ show: false, type: 'info', message: '' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };


  // Update App Settings Helper
  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('octa_global_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to persist settings to localStorage:', e);
    }
  }, []);
  // Perform Initial Startup Behavior & Legacy Wipe
  useEffect(() => {
    const hasResetLegacy = localStorage.getItem('octa_legacy_wiped_v2');
    if (!hasResetLegacy) {
      wipeLegacyStorage();
      localStorage.removeItem('octa_connections');
      localStorage.removeItem('octa_sql_queries_tree');
      localStorage.removeItem('octa_query_tabs');
      localStorage.removeItem('octa_http_collections');
      localStorage.removeItem('octa_http_environments');
      localStorage.setItem('octa_legacy_wiped_v2', 'true');
    }

    // Auto-reopen last project if enabled in preferences
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
        } catch (e) {
          showToast('Previous project not found, opened Welcome Screen', 'info');
        } finally {
          setIsOpeningProject(false);
        }
      })();
    }
  }, []);

  // Update Recents Helper
  const recordRecentProject = useCallback((name: string, filePath: string) => {
    setRecentProjects((prev) => {
      const filtered = prev.filter((p) => p.filePath !== filePath);
      const next: RecentProject[] = [
        {
          id: 'proj-' + Date.now(),
          name,
          filePath,
          lastOpenedAt: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 15);

      try {
        localStorage.setItem('octa_recent_projects', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save recent projects to localStorage', e);
      }
      return next;
    });
  }, []);

  // Load a parsed Project Workspace into App State
  const loadProjectIntoWorkspace = useCallback(
    (proj: ProjectWorkspace, filePath: string) => {
      setActiveProject(proj);
      setProjectFilePath(filePath);
      setConnections(proj.databases || []);
      setQueriesTree(proj.sqlQueries || []);
      setRedisConnections(proj.redis || []);
      setHttpData(proj.httpClient || {
        collections: [],
        environments: [],
        globalVariables: [],
        activeEnvironmentId: null,
      });
      setActiveSession(null);
      setActiveModule('databases');
      recordRecentProject(proj.name, filePath);

      // Persist last opened project in preferences
      setSettings((prev) => {
        const next: AppSettings = {
          ...prev,
          lastOpenedProjectFilePath: filePath,
        };
        try {
          localStorage.setItem('octa_global_settings', JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to update settings in localStorage:', e);
        }
        return next;
      });
    },
    [recordRecentProject]
  );

  // 1. Create New Project Action
  const handleCreateProject = async () => {
    setIsOpeningProject(true);
    try {
      const res = await createProjectFileDialog('my-workspace');
      if (res.cancelled) return;
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      if (res.project && res.filePath) {
        loadProjectIntoWorkspace(res.project, res.filePath);
        showToast(`Created project "${res.project.name}"`, 'success');
      }
    } catch (err: any) {
      showToast(`Failed to create project: ${err?.message || err}`, 'error');
    } finally {
      setIsOpeningProject(false);
    }
  };

  // 2. Open Existing Project Action
  const handleOpenProject = async () => {
    setIsOpeningProject(true);
    try {
      const res = await openProjectFileDialog();
      if (res.cancelled) return;
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      if (res.project && res.filePath) {
        loadProjectIntoWorkspace(res.project, res.filePath);
        showToast(`Opened project "${res.project.name}"`, 'success');
      }
    } catch (err: any) {
      showToast(`Failed to open project: ${err?.message || err}`, 'error');
    } finally {
      setIsOpeningProject(false);
    }
  };

  // 3. Select from Recent Projects
  const handleSelectRecent = async (filePath: string) => {
    setIsOpeningProject(true);
    try {
      const res = await readProjectFile(filePath);
      if (res.error) {
        showToast(`Could not open project: ${res.error}`, 'error');
        return;
      }
      if (res.project && res.filePath) {
        loadProjectIntoWorkspace(res.project, res.filePath);
        showToast(`Opened project "${res.project.name}"`, 'success');
      }
    } catch (err: any) {
      showToast(`Error reading file: ${err?.message || err}`, 'error');
    } finally {
      setIsOpeningProject(false);
    }
  };

  // 4. Remove from Recents
  const handleRemoveRecent = (filePath: string) => {
    setRecentProjects((prev) => {
      const next = prev.filter((p) => p.filePath !== filePath);
      try {
        localStorage.setItem('octa_recent_projects', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to update recent projects in localStorage', e);
      }
      return next;
    });
    showToast('Removed from recents', 'info');
  };

  // 5. Clear All Recents
  const handleClearRecents = () => {
    setRecentProjects([]);
    try {
      localStorage.removeItem('octa_recent_projects');
    } catch (e) {
      console.warn('Failed to clear recents in localStorage', e);
    }
    showToast('Cleared recent projects history', 'info');
  };

  // 6. Close Project
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

  // 7. Manual Save Project
  const handleSaveProject = async () => {
    if (!activeProject || !projectFilePath) return;
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
      const ok = await saveProjectFile(projectFilePath, updatedProj);
      if (ok) {
        setActiveProject(updatedProj);
        showToast(`Saved "${activeProject.name}"`, 'success');
      } else {
        showToast('Failed to save project file', 'error');
      }
    } catch (err: any) {
      showToast(`Save error: ${err?.message || err}`, 'error');
    } finally {
      setIsSavingProject(false);
    }
  };

  // 8. Save Project As / Export
  const handleSaveProjectAs = async () => {
    if (!activeProject) return;
    try {
      const res = await createProjectFileDialog(activeProject.name + '-copy');
      if (res.cancelled || !res.filePath) return;
      const updatedProj: ProjectWorkspace = {
        ...activeProject,
        id: 'octa-' + Date.now(),
        name: res.filePath.replace(/^.*[\\\/]/, '').replace(/\.octa$/, ''),
        updatedAt: new Date().toISOString(),
        databases: connections,
        sqlQueries: queriesTree,
        redis: redisConnections,
        httpClient: httpData,
      };
      await saveProjectFile(res.filePath, updatedProj);
      loadProjectIntoWorkspace(updatedProj, res.filePath);
      showToast(`Project saved as "${updatedProj.name}"`, 'success');
    } catch (err: any) {
      showToast(`Save As error: ${err?.message || err}`, 'error');
    }
  };

  // Debounced Auto-Save Pipeline (500ms debounce when project state changes)
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

  // Save queries tree callback
  const handleSaveQueriesTree = useCallback((nextTree: (SqlQueryFolder | SqlQueryItem)[]) => {
    setQueriesTree(nextTree);
  }, []);

  // Helper to consistently identify a server connection
  const getServerKey = (server: ConnectionConfig): string => {
    return server.id || server.name || `${server.host}:${server.port}`;
  };

  // Fetch databases for a specific server connection
  const fetchDatabasesForServer = async (server: ConnectionConfig) => {
    const connId = getServerKey(server);
    setLoadingMap((prev) => ({ ...prev, [connId]: true }));
    try {
      const dbs = await getDatabases(server);
      setDatabasesMap((prev) => ({ ...prev, [connId]: dbs || [] }));
    } catch (err: any) {
      console.error(`Failed to load databases for ${server.name}:`, err);
      showToast(`Could not list databases for ${server.name}: ${err?.message || err}`, 'error');
      setDatabasesMap((prev) => ({ ...prev, [connId]: [] }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [connId]: false }));
    }
  };

  // Expand / collapse server in the sidebar
  const handleToggleExpand = async (server: ConnectionConfig) => {
    const connId = getServerKey(server);
    const isCurrentlyExpanded = Boolean(expandedServers[connId]);

    setExpandedServers((prev) => ({
      ...prev,
      [connId]: !isCurrentlyExpanded,
    }));

    if (!isCurrentlyExpanded) {
      await fetchDatabasesForServer(server);
    }
  };

  // Switch database connection
  const handleConnectToDatabase = (server: ConnectionConfig, databaseName: string) => {
    const connId = getServerKey(server);
    const sessionConfig: ConnectionConfig = {
      ...server,
      database: databaseName,
    };

    setActiveSession({
      connection: sessionConfig,
      activeDatabase: databaseName,
      connectedAt: new Date(),
    });

    // Make sure server node is expanded
    setExpandedServers((prev) => ({ ...prev, [connId]: true }));

    if (!databasesMap[connId] || databasesMap[connId].length === 0) {
      fetchDatabasesForServer(server);
    }

    showToast(`Connected to database "${databaseName}" on ${server.name}`, 'success');
  };

  // Direct connection from modal test/connect
  const handleConnectDirect = (config: ConnectionConfig) => {
    const configWithId: ConnectionConfig = {
      ...config,
      id: config.id || 'conn-' + Date.now(),
    };
    const connId = getServerKey(configWithId);

    setActiveSession({
      connection: configWithId,
      activeDatabase: configWithId.database || 'postgres',
      connectedAt: new Date(),
    });

    setConnections((prev) => {
      const idx = prev.findIndex(
        (c) => (c.id && c.id === configWithId.id) || (c.host === configWithId.host && c.port === configWithId.port)
      );
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = configWithId;
        return next;
      }
      return [...prev, configWithId];
    });

    setExpandedServers((prev) => ({ ...prev, [connId]: true }));
    fetchDatabasesForServer(configWithId);

    showToast(`Connected to ${configWithId.database || 'postgres'}`, 'success');
  };

  // Delete saved connection from active project
  const handleDeleteConnection = async (id: string, name: string) => {
    try {
      setConnections((prev) => prev.filter((c) => c.id !== id && c.name !== name));
      showToast(`Deleted connection "${name}"`, 'info');

      if (activeSession?.connection.id === id || activeSession?.connection.name === name) {
        setActiveSession(null);
      }
    } catch (err: any) {
      showToast(`Failed to delete connection: ${err?.message || err}`, 'error');
    }
  };

  // Add / Save connection to active project
  const handleSavedConnection = async (newConfig: ConnectionConfig) => {
    setIsModalOpen(false);
    const configWithId: ConnectionConfig = {
      ...newConfig,
      id: newConfig.id || 'conn-' + Date.now(),
    };
    const connId = getServerKey(configWithId);

    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.id === configWithId.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = configWithId;
        return next;
      }
      return [...prev, configWithId];
    });

    setExpandedServers((prev) => ({ ...prev, [connId]: true }));
    fetchDatabasesForServer(configWithId);

    showToast(`Saved connection "${configWithId.name}"`, 'success');
  };

  // Handle Export Database Trigger from Sidebar
  const handleExportDatabase = async (
    server: ConnectionConfig,
    databaseName: string,
    exportData: boolean
  ) => {
    const sessionConfig: ConnectionConfig = {
      ...server,
      database: databaseName,
    };

    try {
      showToast(`Exporting database "${databaseName}"...`, 'info');
      const sql = await exportDatabaseSQL(sessionConfig, databaseName, exportData);
      const filename = `db_${databaseName}_${exportData ? 'dump' : 'schema'}_${Date.now()}.sql`;

      try {
        const savedPath = await saveSQLDumpDialog(filename, sql);
        if (savedPath) {
          showToast(`Exported database dump to ${savedPath}`, 'success');
          return;
        }
      } catch {
        // browser fallback
      }

      downloadSQLFile(filename, sql);
      showToast(
        `Exported database "${databaseName}" (${exportData ? 'Structure + Data' : 'Structure Only'})`,
        'success'
      );
    } catch (err: any) {
      console.error('Database export failed:', err);
      showToast(`Database export failed: ${err?.message || err}`, 'error');
    }
  };

  // Handle Import SQL Trigger from Sidebar
  const handleImportSQL = (server: ConnectionConfig, databaseName: string) => {
    const sessionConfig: ConnectionConfig = {
      ...server,
      database: databaseName,
    };
    setSidebarImportSession({
      connection: sessionConfig,
      activeDatabase: databaseName,
      connectedAt: new Date(),
    });
  };

  // Handle opening a saved query from Sidebar into QueryPlayground
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSaveProject();
        } else if (e.key === '1' && activeProject) {
          e.preventDefault();
          setActiveModule('databases');
        } else if (e.key === '2' && activeProject) {
          e.preventDefault();
          setActiveModule('redis');
        } else if (e.key === '3' && activeProject) {
          e.preventDefault();
          setActiveModule('http');
        } else if (e.key === ',') {
          e.preventDefault();
          setIsSettingsModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, projectFilePath, connections, queriesTree]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-surface-950 text-slate-900 dark:text-gray-100 font-sans overflow-hidden select-none transition-colors">
      {/* Top Frameless TitleBar with Brand, Project Info & Actions */}
      <TitleBar
        activeModule={activeModule}
        activeSession={activeSession}
        activeProject={activeProject}
        projectFilePath={projectFilePath}
        isSavingProject={isSavingProject}
        onSaveProject={handleSaveProject}
        onSaveProjectAs={handleSaveProjectAs}
        onCloseProject={handleCloseProject}
        onOpenProject={handleOpenProject}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (Slim left rail) */}
        <ActivityBar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          hasProject={Boolean(activeProject)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Dynamic Module Content */}
        {activeModule === 'welcome' || !activeProject ? (
          <WelcomeScreen
            onCreateProject={handleCreateProject}
            onOpenProject={handleOpenProject}
            onSelectRecent={handleSelectRecent}
            onRemoveRecent={handleRemoveRecent}
            onClearRecents={handleClearRecents}
            recentProjects={recentProjects}
            isOpening={isOpeningProject}
          />
        ) : activeModule === 'redis' ? (
          <RedisWorkspace
            connections={redisConnections}
            onUpdateConnections={(conns) => {
              setRedisConnections(conns);
            }}
            showToast={showToast}
          />
        ) : activeModule === 'http' ? (
          <HttpClientWorkspace
            data={httpData}
            onUpdateData={(newData) => {
              setHttpData(newData);
            }}
            showToast={showToast}
          />
        ) : activeModule === 'settings' ? (
          <SettingsView showToast={showToast} />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Main Secondary Sidebar (Server Explorer & Queries) */}
            <Sidebar
              connections={connections}
              activeSession={activeSession}
              databasesMap={databasesMap}
              loadingMap={loadingMap}
              expandedServers={expandedServers}
              onToggleExpand={handleToggleExpand}
              onOpenNewModal={() => setIsModalOpen(true)}
              onRefreshConnections={() => {}}
              onConnectToDatabase={handleConnectToDatabase}
              onDeleteConnection={handleDeleteConnection}
              onExportDatabase={handleExportDatabase}
              onImportSQL={handleImportSQL}
              onSelectQuery={handleSelectQueryFromSidebar}
              activeQueryId={activeQueryTabId}
              queriesTree={queriesTree}
              onSaveQueriesTree={handleSaveQueriesTree}
            />

            {/* Database Workspace Views (Tables vs Monaco SQL Playground vs Schema ERD) */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* View Switcher Segmented Pill Toggle (Visible when connected) */}
              {activeSession && (
                <div className="absolute right-4 top-2 z-40 flex items-center bg-[#141414] border border-[#2b2b2b] p-0.5 rounded-lg shadow-md">
                  <button
                    type="button"
                    onClick={() => setDbSubView('tables')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      dbSubView === 'tables'
                        ? 'bg-zinc-700 text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5 text-brand-400" />
                    <span>Tables</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDbSubView('playground')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      dbSubView === 'playground'
                        ? 'bg-zinc-700 text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>SQL Playground</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDbSubView('erd')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      dbSubView === 'erd'
                        ? 'bg-zinc-700 text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ERD</span>
                  </button>
                </div>
              )}

              {dbSubView === 'playground' ? (
                <QueryPlayground
                  activeSession={activeSession}
                  onOpenNewModal={() => setIsModalOpen(true)}
                  showToast={showToast}
                  tabs={queryTabs}
                  activeTabId={activeQueryTabId}
                  onTabsChange={setQueryTabs}
                  onActiveTabChange={setActiveQueryTabId}
                  queriesTree={queriesTree}
                  onSaveQueriesTree={handleSaveQueriesTree}
                />
              ) : dbSubView === 'erd' ? (
                <ErdVisualizer
                  activeSession={activeSession}
                  onOpenNewModal={() => setIsModalOpen(true)}
                  showToast={showToast}
                />
              ) : (
                <Workspace
                  activeSession={activeSession}
                  onOpenNewModal={() => setIsModalOpen(true)}
                  showToast={showToast}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Connection Modal */}
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSavedConnection}
        onConnectDirect={handleConnectDirect}
      />

      {/* Sidebar Triggered Import SQL Modal */}
      {sidebarImportSession && (
        <ImportSqlModal
          isOpen={Boolean(sidebarImportSession)}
          onClose={() => setSidebarImportSession(null)}
          activeSession={sidebarImportSession}
          onImportSuccess={() => {
            if (
              activeSession?.connection.id === sidebarImportSession.connection.id &&
              activeSession?.activeDatabase === sidebarImportSession.activeDatabase
            ) {
              showToast('SQL imported successfully', 'success');
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Settings / Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-in select-none">
          <div
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-zinc-900/95 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
                : toast.type === 'error'
                ? 'bg-zinc-900/95 border-rose-500/50 text-rose-300 shadow-rose-950/40'
                : 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100 shadow-black/50'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            <span className="max-w-sm text-zinc-100 font-medium select-text">{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded transition-colors cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
