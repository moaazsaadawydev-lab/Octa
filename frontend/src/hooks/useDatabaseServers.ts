import { useState } from 'react';
import { ConnectionConfig, ActiveSession } from '../types/connection';
import {
  getDatabases,
  exportDatabaseSQL,
  saveSQLDumpDialog,
  downloadSQLFile,
} from '../services/api';

interface UseDatabaseServersOptions {
  connections: ConnectionConfig[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionConfig[]>>;
  activeSession: ActiveSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<ActiveSession | null>>;
  setSidebarImportSession: React.Dispatch<React.SetStateAction<ActiveSession | null>>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useDatabaseServers({
  connections,
  setConnections,
  activeSession,
  setActiveSession,
  setSidebarImportSession,
  setIsModalOpen,
  showToast,
}: UseDatabaseServersOptions) {
  const [databasesMap, setDatabasesMap] = useState<Record<string, string[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const getServerKey = (server: ConnectionConfig): string => {
    return server.id || server.name || `${server.host}:${server.port}`;
  };

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

    setExpandedServers((prev) => ({ ...prev, [connId]: true }));

    if (!databasesMap[connId] || databasesMap[connId].length === 0) {
      fetchDatabasesForServer(server);
    }

    showToast(`Connected to database "${databaseName}" on ${server.name}`, 'success');
  };

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

  return {
    databasesMap,
    loadingMap,
    expandedServers,
    handleToggleExpand,
    handleConnectToDatabase,
    handleConnectDirect,
    handleDeleteConnection,
    handleSavedConnection,
    handleExportDatabase,
    handleImportSQL,
  };
}
