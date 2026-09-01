import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { ActivityBar, ActiveModule } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { QueryPlayground } from './components/QueryPlayground';
import { ErdVisualizer } from './components/ErdVisualizer';
import { RedisWorkspace } from './components/RedisWorkspace';
import { HttpClientWorkspace } from './components/HttpClientWorkspace';
import { SettingsView } from './components/SettingsView';
import { NewConnectionModal } from './components/NewConnectionModal';
import { ImportSqlModal } from './components/ImportSqlModal';
import {
  ConnectionConfig,
  ActiveSession,
  QueryTab,
  SqlQueryItem,
  SqlQueryFolder
} from './types/connection';
import {
  getSavedConnections,
  getDatabases,
  deleteConnection,
  exportDatabaseSQL,
  saveSQLDumpDialog,
  downloadSQLFile,
  saveSqlQueriesData,
  loadSqlQueriesData,
} from './services/api';
import { AlertCircle, CheckCircle2, X, Table, Terminal, Layers } from 'lucide-react';

const DEFAULT_INITIAL_QUERIES: (SqlQueryFolder | SqlQueryItem)[] = [
  {
    id: 'folder-general',
    type: 'folder',
    name: 'General Queries',
    isOpen: true,
    items: [
      {
        id: 'q-table-info',
        type: 'query',
        name: 'Get Table Info.sql',
        content: `-- Check all tables and row counts in public schema
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;`,
      },
      {
        id: 'q-activity',
        type: 'query',
        name: 'Active Connections.sql',
        content: `-- List current running queries and connections
SELECT 
  pid,
  usename,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;`,
      },
    ],
  },
];

const DEFAULT_PLAYGROUND_QUERY = `-- Octa SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'Octa' AS application,
  'Database Management & SQL Workspace' AS milestone,
  NOW() AS executed_at;
`;

export function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('databases');
  const [dbSubView, setDbSubView] = useState<'tables' | 'playground' | 'erd'>('tables');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sidebarImportSession, setSidebarImportSession] = useState<ActiveSession | null>(null);

  // Queries Tree State (Shared between Sidebar and QueryPlayground)
  const [queriesTree, setQueriesTree] = useState<(SqlQueryFolder | SqlQueryItem)[]>(() => {
    try {
      const saved = localStorage.getItem('octa_sql_queries_tree');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse SQL queries from localStorage', e);
    }
    return DEFAULT_INITIAL_QUERIES;
  });

  // Load queries from Go backend disk on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const diskData = await loadSqlQueriesData();
        if (diskData && diskData.trim() && isMounted) {
          const parsed = JSON.parse(diskData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQueriesTree(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load SQL queries from disk:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save queries tree callback
  const handleSaveQueriesTree = useCallback((nextTree: (SqlQueryFolder | SqlQueryItem)[]) => {
    setQueriesTree(nextTree);
    try {
      const jsonStr = JSON.stringify(nextTree);
      localStorage.setItem('octa_sql_queries_tree', jsonStr);
      saveSqlQueriesData(jsonStr).catch((err) => {
        console.warn('Failed to save SQL queries to backend disk:', err);
      });
    } catch (e) {
      console.warn('Failed to persist SQL queries tree:', e);
    }
  }, []);

  // Query Playground Tabs State
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>(() => {
    try {
      const saved = localStorage.getItem('octa_query_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any) => ({
            ...t,
            isDirty: false,
            results: null,
            isExecuting: false,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to parse query tabs from localStorage', e);
    }
    return [
      {
        id: 'tab-1',
        title: 'Query 1.sql',
        query: DEFAULT_PLAYGROUND_QUERY,
        isDirty: false,
        results: null,
        activeResultIndex: 0,
        isExecuting: false,
      },
    ];
  });

  const [activeQueryTabId, setActiveQueryTabId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem('octa_active_query_tab_id');
    return savedActiveId || (queryTabs[0]?.id || null);
  });

  // Cached databases per connection ID: { [connId]: ["postgres", "mydb", ...] }
  const [databasesMap, setDatabasesMap] = useState<Record<string, string[]>>({});
  // Loading states for database fetching per connection ID
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  // Expanded server tree state
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

  // Load saved connections from disk
  const loadConnections = useCallback(async () => {
    try {
      const list = await getSavedConnections();
      setConnections(list);
    } catch (err) {
      console.error('Failed to load connections:', err);
      showToast('Failed to load saved connections', 'error');
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Fetch databases for a specific server connection
  const fetchDatabasesForServer = async (server: ConnectionConfig) => {
    const connId = server.id || server.name;
    setLoadingMap((prev) => ({ ...prev, [connId]: true }));
    try {
      const dbs = await getDatabases(server);
      setDatabasesMap((prev) => ({ ...prev, [connId]: dbs }));
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
    const connId = server.id || server.name;
    const isCurrentlyExpanded = Boolean(expandedServers[connId]);

    setExpandedServers((prev) => ({
      ...prev,
      [connId]: !isCurrentlyExpanded,
    }));

    if (!isCurrentlyExpanded && !databasesMap[connId]) {
      await fetchDatabasesForServer(server);
    }
  };

  // Switch database connection
  const handleConnectToDatabase = (server: ConnectionConfig, databaseName: string) => {
    const connId = server.id || server.name;
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

    // If databases not loaded yet, fetch in background
    if (!databasesMap[connId]) {
      fetchDatabasesForServer(server);
    }

    showToast(`Connected to database "${databaseName}" on ${server.name}`, 'success');
  };

  // Direct connection from modal test/connect
  const handleConnectDirect = (config: ConnectionConfig) => {
    setActiveSession({
      connection: config,
      activeDatabase: config.database || 'postgres',
      connectedAt: new Date(),
    });
    showToast(`Connected to ${config.database || 'postgres'}`, 'success');
  };

  // Delete saved connection
  const handleDeleteConnection = async (id: string, name: string) => {
    try {
      await deleteConnection(id);
      showToast(`Deleted connection "${name}"`, 'info');

      // If active session was this connection, disconnect
      if (activeSession?.connection.id === id) {
        setActiveSession(null);
      }

      await loadConnections();
    } catch (err: any) {
      console.error('Failed to delete connection:', err);
      showToast(`Failed to delete connection: ${err?.message || err}`, 'error');
    }
  };

  const handleSaved = async () => {
    setIsModalOpen(false);
    showToast('Connection configuration saved', 'success');
    await loadConnections();
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

  // Global Keyboard Shortcuts for Module Switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveModule('databases');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveModule('redis');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveModule('http');
        } else if (e.key === ',') {
          e.preventDefault();
          setActiveModule('settings');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-950 text-gray-100 font-sans overflow-hidden select-none">
      {/* Top Frameless TitleBar with Brand & Drag Handle */}
      <TitleBar activeModule={activeModule} activeSession={activeSession} />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (VS Code style slim left rail) */}
        <ActivityBar activeModule={activeModule} setActiveModule={setActiveModule} />

        {/* Dynamic Module Content */}
        {activeModule === 'redis' ? (
          <RedisWorkspace showToast={showToast} />
        ) : activeModule === 'http' ? (
          <HttpClientWorkspace showToast={showToast} />
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
              onRefreshConnections={loadConnections}
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
        onSaved={handleSaved}
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
              // If current active session is same DB, refresh it
              showToast('SQL imported successfully', 'success');
            }
          }}
          showToast={showToast}
        />
      )}

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
