import { useState, useCallback } from 'react';
import { ConnectionConfig, ActiveSession } from '../types';
import { getDatabases, testConnection as apiTestConnection } from '../../../services/api';

export function getServerKey(server: ConnectionConfig): string {
  return server.id || server.name || `${server.host}:${server.port}`;
}

export interface UseDatabaseConnectionOptions {
  initialConnections?: ConnectionConfig[];
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useDatabaseConnection(options: UseDatabaseConnectionOptions = {}) {
  const { initialConnections = [], showToast = () => {} } = options;

  const [connections, setConnections] = useState<ConnectionConfig[]>(initialConnections);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [databasesMap, setDatabasesMap] = useState<Record<string, string[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const fetchDatabasesForServer = useCallback(async (server: ConnectionConfig) => {
    const connId = getServerKey(server);
    setLoadingMap((prev) => ({ ...prev, [connId]: true }));
    try {
      const dbs = await getDatabases(server);
      setDatabasesMap((prev) => ({ ...prev, [connId]: dbs || [] }));
      return dbs;
    } catch (err: any) {
      console.error(`Failed to load databases for ${server.name}:`, err);
      showToast(`Could not list databases for ${server.name}: ${err?.message || err}`, 'error');
      setDatabasesMap((prev) => ({ ...prev, [connId]: [] }));
      return [];
    } finally {
      setLoadingMap((prev) => ({ ...prev, [connId]: false }));
    }
  }, [showToast]);

  const handleToggleExpand = useCallback(async (server: ConnectionConfig) => {
    const connId = getServerKey(server);
    const isCurrentlyExpanded = Boolean(expandedServers[connId]);

    setExpandedServers((prev) => ({
      ...prev,
      [connId]: !isCurrentlyExpanded,
    }));

    if (!isCurrentlyExpanded) {
      await fetchDatabasesForServer(server);
    }
  }, [expandedServers, fetchDatabasesForServer]);

  const handleConnectToDatabase = useCallback((server: ConnectionConfig, databaseName: string) => {
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
  }, [databasesMap, fetchDatabasesForServer, showToast]);

  const handleDisconnect = useCallback(() => {
    setActiveSession(null);
    showToast('Disconnected from database session', 'info');
  }, [showToast]);

  const handleTestConnection = useCallback(async (config: ConnectionConfig) => {
    try {
      const res = await apiTestConnection(config);
      return res;
    } catch (err: any) {
      throw err;
    }
  }, []);

  const handleDeleteConnection = useCallback((id: string, name: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id && c.name !== name));
    if (activeSession?.connection?.id === id) {
      setActiveSession(null);
    }
    showToast(`Deleted connection "${name}"`, 'info');
  }, [activeSession, showToast]);

  return {
    connections,
    setConnections,
    activeSession,
    setActiveSession,
    databasesMap,
    setDatabasesMap,
    loadingMap,
    expandedServers,
    setExpandedServers,
    fetchDatabasesForServer,
    handleToggleExpand,
    handleConnectToDatabase,
    handleDisconnect,
    handleTestConnection,
    handleDeleteConnection,
  };
}
