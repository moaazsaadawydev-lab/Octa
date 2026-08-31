import React, { useState, useEffect, useCallback } from 'react';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { QueryPlayground } from './components/QueryPlayground';
import { ErdVisualizer } from './components/ErdVisualizer';
import { NewConnectionModal } from './components/NewConnectionModal';
import { ImportSqlModal } from './components/ImportSqlModal';
import { ConnectionConfig, ActiveSession } from './types/connection';
import {
  getSavedConnections,
  getDatabases,
  deleteConnection,
  exportDatabaseSQL,
  saveSQLDumpDialog,
  downloadSQLFile,
} from './services/api';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'explorer' | 'editor' | 'erd' | 'settings'>('explorer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sidebarImportSession, setSidebarImportSession] = useState<ActiveSession | null>(null);

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
      showToast(
        `Failed to query databases on ${server.name}: ${err?.message || err}`,
        'error'
      );
    } finally {
      setLoadingMap((prev) => ({ ...prev, [connId]: false }));
    }
  };

  // Toggle expand / collapse server node in explorer
  const handleToggleExpand = async (server: ConnectionConfig) => {
    const connId = server.id || server.name;
    const nextState = !expandedServers[connId];

    setExpandedServers((prev) => ({ ...prev, [connId]: nextState }));

    // If expanding and databases haven't been fetched yet, fetch them
    if (nextState && !databasesMap[connId]) {
      await fetchDatabasesForServer(server);
    }
  };

  // Connect to a specific database on a server
  const handleConnectToDatabase = async (server: ConnectionConfig, databaseName: string) => {
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

    showToast(`Connected to ${server.name} (${databaseName})`, 'success');
  };

  // Delete saved connection profile
  const handleDeleteConnection = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete connection "${name}"?`)) {
      return;
    }

    const success = await deleteConnection(id);
    if (success) {
      showToast(`Deleted connection "${name}"`, 'info');
      if (activeSession?.connection.id === id) {
        setActiveSession(null);
      }
      loadConnections();
    } else {
      showToast(`Failed to delete connection "${name}"`, 'error');
    }
  };

  // Handle saving from Modal
  const handleSaved = async (savedConfig: ConnectionConfig) => {
    await loadConnections();
    showToast(`Connection "${savedConfig.name}" saved successfully`, 'success');

    // Auto expand and fetch databases
    const connId = savedConfig.id || savedConfig.name;
    setExpandedServers((prev) => ({ ...prev, [connId]: true }));
    fetchDatabasesForServer(savedConfig);
  };

  // Handle direct connect from Modal
  const handleConnectDirect = async (config: ConnectionConfig) => {
    await loadConnections();
    const connId = config.id || config.name;

    setActiveSession({
      connection: config,
      activeDatabase: config.database || 'postgres',
      connectedAt: new Date(),
    });

    setExpandedServers((prev) => ({ ...prev, [connId]: true }));
    fetchDatabasesForServer(config);
    showToast(`Connected to ${config.name}`, 'success');
  };

  // Handle Export Database Dump from Sidebar
  const handleExportDatabase = async (
    server: ConnectionConfig,
    databaseName: string,
    exportData: boolean
  ) => {
    try {
      showToast(`Generating SQL dump for "${databaseName}"...`, 'info');
      const sql = await exportDatabaseSQL(server, databaseName, exportData);
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

  return (
    <div className="flex h-screen w-screen bg-surface-950 text-gray-100 font-sans overflow-hidden select-none">
      {/* Activity Bar (VS Code style slim left rail) */}
      <ActivityBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Secondary Sidebar (Server Explorer) */}
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
      />

      {/* Main Workspace / Playground / ERD Visualizer View */}
      {activeTab === 'editor' ? (
        <QueryPlayground
          activeSession={activeSession}
          onOpenNewModal={() => setIsModalOpen(true)}
          showToast={showToast}
        />
      ) : activeTab === 'erd' ? (
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
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-in">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-surface-850/95 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-surface-850/95 border-rose-500/40 text-rose-300'
                : 'bg-surface-850/95 border-border text-gray-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="max-w-xs truncate">{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-gray-200 p-0.5 rounded"
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

