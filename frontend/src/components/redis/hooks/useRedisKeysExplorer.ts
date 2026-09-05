import { useState, useMemo, useCallback } from 'react';
import {
  RedisConnectionConfig,
  RedisKeyInfo,
  RedisKeyType,
  KeyTreeNode,
  getAllKeysInNode,
} from '../types';
import {
  scanRedisKeys,
  createRedisKey,
  deleteRedisKey,
  deleteRedisKeysBatch,
  flushRedisDB,
} from '../../../services/api';

interface UseRedisKeysExplorerProps {
  activeConn: (RedisConnectionConfig & { db: number }) | null;
  activeDb: number;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onCloseTab: (key: string) => void;
  onOpenKeyInTab: (key: string) => void;
}

export function useRedisKeysExplorer({
  activeConn,
  activeDb,
  showToast,
  onCloseTab,
  onOpenKeyInTab,
}: UseRedisKeysExplorerProps) {
  const [keys, setKeys] = useState<RedisKeyInfo[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchPattern, setSearchPattern] = useState<string>('*');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [namespaceDeleteModal, setNamespaceDeleteModal] = useState<{
    namespace: string;
    keys: string[];
  } | null>(null);
  const [isDeletingNamespace, setIsDeletingNamespace] = useState(false);
  const [isFlushConfirmOpen, setIsFlushConfirmOpen] = useState(false);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);

  const loadKeys = useCallback(
    async (conn = activeConn, pattern = searchPattern) => {
      if (!conn) return;
      setIsLoadingKeys(true);
      try {
        const res = await scanRedisKeys(conn, pattern || '*', 0, 1000);
        setKeys(res.keys || []);
      } catch (err: any) {
        showToast(`Error scanning keys: ${err?.message || err}`, 'error');
      } finally {
        setIsLoadingKeys(false);
      }
    },
    [activeConn, searchPattern, showToast]
  );

  const keyTree = useMemo(() => {
    const root: KeyTreeNode = {
      name: 'root',
      fullPath: '',
      isLeaf: false,
      children: {},
    };

    keys.forEach((k) => {
      const parts = k.key.split(':');
      let current = root;

      parts.forEach((part, index) => {
        const isLeaf = index === parts.length - 1;
        const subPath = parts.slice(0, index + 1).join(':');

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: subPath,
            isLeaf,
            keyInfo: isLeaf ? k : undefined,
            children: {},
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }, [keys]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: prev[folderPath] === undefined ? false : !prev[folderPath],
    }));
  };

  const handleDeleteKey = async (keyToDelete: string) => {
    if (!keyToDelete || !activeConn) return;
    if (!confirm(`Are you sure you want to delete key "${keyToDelete}"?`)) return;

    try {
      const ok = await deleteRedisKey(activeConn, keyToDelete);
      if (ok) {
        showToast(`Deleted key "${keyToDelete}"`, 'info');
        onCloseTab(keyToDelete);
        loadKeys();
      } else {
        showToast('Failed to delete key', 'error');
      }
    } catch (err: any) {
      showToast(`Error deleting key: ${err?.message || err}`, 'error');
    }
  };

  const handleDeleteNamespace = async () => {
    if (!namespaceDeleteModal || namespaceDeleteModal.keys.length === 0 || !activeConn) return;
    setIsDeletingNamespace(true);
    try {
      const deletedCount = await deleteRedisKeysBatch(activeConn, namespaceDeleteModal.keys);
      showToast(`Deleted namespace "${namespaceDeleteModal.namespace}" (${deletedCount} keys)`, 'info');

      namespaceDeleteModal.keys.forEach((k) => onCloseTab(k));
      setNamespaceDeleteModal(null);
      loadKeys();
    } catch (err: any) {
      showToast(`Error deleting namespace: ${err?.message || err}`, 'error');
    } finally {
      setIsDeletingNamespace(false);
    }
  };

  const handleTriggerNodeDelete = (node: KeyTreeNode) => {
    if (node.isLeaf) {
      handleDeleteKey(node.fullPath);
    } else {
      const childKeys = getAllKeysInNode(node);
      setNamespaceDeleteModal({
        namespace: node.fullPath,
        keys: childKeys,
      });
    }
  };

  const handleFlushDB = async () => {
    if (!activeConn) return;
    try {
      const ok = await flushRedisDB(activeConn);
      if (ok) {
        showToast(`Flushed all keys in DB ${activeDb}`, 'info');
        setIsFlushConfirmOpen(false);
        loadKeys();
      } else {
        showToast('Failed to flush database', 'error');
      }
    } catch (err: any) {
      showToast(`Error flushing DB: ${err?.message || err}`, 'error');
    }
  };

  const handleCreateKey = async (
    keyName: string,
    type: RedisKeyType,
    ttl: number,
    initialPayload: any
  ) => {
    if (!activeConn) return;
    const ok = await createRedisKey(activeConn, keyName, type, initialPayload, ttl);
    if (ok) {
      showToast(`Created key "${keyName}" (${type.toUpperCase()})`, 'success');
      setIsNewKeyModalOpen(false);
      loadKeys();
      onOpenKeyInTab(keyName);
    } else {
      showToast('Failed to create key', 'error');
    }
  };

  return {
    keys,
    setKeys,
    isLoadingKeys,
    searchPattern,
    setSearchPattern,
    viewMode,
    setViewMode,
    expandedFolders,
    toggleFolder,
    keyTree,
    loadKeys,
    handleDeleteKey,
    handleDeleteNamespace,
    namespaceDeleteModal,
    setNamespaceDeleteModal,
    isDeletingNamespace,
    handleTriggerNodeDelete,
    isFlushConfirmOpen,
    setIsFlushConfirmOpen,
    handleFlushDB,
    isNewKeyModalOpen,
    setIsNewKeyModalOpen,
    handleCreateKey,
  };
}
