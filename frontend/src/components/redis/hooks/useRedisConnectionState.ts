import { useState, useEffect, useMemo, useCallback } from 'react';
import { RedisConnectionConfig, RedisServerInfo } from '../types';
import { connectRedis } from '../../../services/api';

interface UseRedisConnectionStateProps {
  connections: RedisConnectionConfig[];
  onUpdateConnections: (connections: RedisConnectionConfig[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onConnected?: (conn: RedisConnectionConfig) => void;
}

export function useRedisConnectionState({
  connections,
  onUpdateConnections,
  showToast,
  onConnected,
}: UseRedisConnectionStateProps) {
  const [activeConnId, setActiveConnId] = useState<string>(() => {
    return connections.length > 0 ? connections[0].id : '';
  });
  const [activeDb, setActiveDb] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverInfo, setServerInfo] = useState<RedisServerInfo | null>(null);
  const [isServerInfoOpen, setIsServerInfoOpen] = useState(false);

  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<RedisConnectionConfig | null>(null);

  useEffect(() => {
    if (connections.length > 0) {
      if (!connections.some((c) => c.id === activeConnId)) {
        setActiveConnId(connections[0].id);
      }
    } else {
      setActiveConnId('');
      setIsConnected(false);
    }
  }, [connections, activeConnId]);

  const activeConn = useMemo(() => {
    const found = connections.find((c) => c.id === activeConnId);
    if (!found) return null;
    return { ...found, db: activeDb };
  }, [connections, activeConnId, activeDb]);

  const handleConnect = useCallback(
    async (connToUse = activeConn) => {
      if (!connToUse) {
        setIsConnected(false);
        setServerInfo(null);
        return;
      }
      setIsConnecting(true);
      try {
        const res = await connectRedis(connToUse);
        if (res.success) {
          setIsConnected(true);
          setServerInfo(res.serverInfo);
          showToast(
            `Connected to Redis ${connToUse.host}:${connToUse.port} (DB ${connToUse.db})`,
            'success'
          );
          if (onConnected) onConnected(connToUse);
        } else {
          setIsConnected(false);
          setServerInfo(null);
          showToast(res.error || 'Failed to connect to Redis', 'error');
        }
      } catch (err: any) {
        setIsConnected(false);
        setServerInfo(null);
        showToast(err?.message || 'Connection error', 'error');
      } finally {
        setIsConnecting(false);
      }
    },
    [activeConn, onConnected, showToast]
  );

  const handleSaveConnection = (savedConfig: RedisConnectionConfig) => {
    const existingIndex = connections.findIndex((c) => c.id === savedConfig.id);
    let updated: RedisConnectionConfig[];
    if (existingIndex >= 0) {
      updated = [...connections];
      updated[existingIndex] = savedConfig;
    } else {
      updated = [...connections, savedConfig];
    }
    onUpdateConnections(updated);
    setActiveConnId(savedConfig.id);
    setActiveDb(savedConfig.db || 0);
    showToast(`Saved Redis connection "${savedConfig.name}"`, 'success');
  };

  const handleDeleteConnection = (connId: string) => {
    const target = connections.find((c) => c.id === connId);
    if (!confirm(`Remove Redis connection "${target?.name || connId}"?`)) return;

    const updated = connections.filter((c) => c.id !== connId);
    onUpdateConnections(updated);
    if (activeConnId === connId) {
      if (updated.length > 0) {
        setActiveConnId(updated[0].id);
        setActiveDb(updated[0].db || 0);
      } else {
        setActiveConnId('');
        setIsConnected(false);
      }
    }
    showToast('Removed Redis connection profile', 'info');
  };

  return {
    activeConnId,
    setActiveConnId,
    activeDb,
    setActiveDb,
    activeConn,
    isConnected,
    isConnecting,
    serverInfo,
    isServerInfoOpen,
    setIsServerInfoOpen,
    isConnModalOpen,
    setIsConnModalOpen,
    editingConn,
    setEditingConn,
    handleConnect,
    handleSaveConnection,
    handleDeleteConnection,
  };
}
