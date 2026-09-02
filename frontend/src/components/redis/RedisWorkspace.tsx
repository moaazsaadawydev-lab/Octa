import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Layers,
  Database,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Save,
  Clock,
  HardDrive,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Info,
  Server,
  AlertTriangle,
  List,
  FolderTree,
  FileCode,
  Hash,
  ListOrdered,
  Tag,
  X,
  ExternalLink,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Terminal,
  Zap,
  Code2,
  Play
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import {
  RedisConnectionConfig,
  RedisServerInfo,
  RedisKeyInfo,
  RedisKeyDetail,
  RedisKeyType,
  ZSetMember,
} from '../../types/redis';
import {
  connectRedis,
  scanRedisKeys,
  getRedisKeyDetails,
  createRedisKey,
  updateRedisKey,
  deleteRedisKey,
  deleteRedisKeysBatch,
  setRedisTTL,
  flushRedisDB,
} from '../../services/api';
import { NewRedisConnectionModal } from './NewRedisConnectionModal';
import { RedisWorkbench } from './RedisWorkbench';
import { HomeLanding } from '../layout/HomeLanding';
import { useTheme } from '../../context/ThemeContext';
import { defineOctaTheme } from '../../types/http';

interface RedisWorkspaceProps {
  connections: RedisConnectionConfig[];
  onUpdateConnections: (connections: RedisConnectionConfig[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Tree node definition for hierarchical namespace grouping
interface KeyTreeNode {
  name: string;
  fullPath: string;
  isLeaf: boolean;
  keyInfo?: RedisKeyInfo;
  children: Record<string, KeyTreeNode>;
  isOpen?: boolean;
}

// Multi-Tab definition for active key inspection
interface RedisTab {
  id: string; // key string
  key: string;
  type: RedisKeyType;
  detail: RedisKeyDetail | null;
  isLoading: boolean;
  isDirty: boolean;
  draftString: string;
  draftHash: Array<{ field: string; value: string }>;
  draftList: string[];
  draftSet: string[];
  draftZSet: ZSetMember[];
}

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Helper to recursively collect all key strings under a tree node
const getAllKeysInNode = (node: KeyTreeNode): string[] => {
  if (node.isLeaf && node.keyInfo) {
    return [node.keyInfo.key];
  }
  let result: string[] = [];
  for (const child of Object.values(node.children)) {
    result = result.concat(getAllKeysInNode(child));
  }
  return result;
};

export const RedisWorkspace: React.FC<RedisWorkspaceProps> = ({
  connections,
  onUpdateConnections,
  showToast,
}) => {
  // Active Connection state
  const [activeConnId, setActiveConnId] = useState<string>(() => {
    return connections.length > 0 ? connections[0].id : '';
  });
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const { monacoTheme } = useTheme();
  const [editingConn, setEditingConn] = useState<RedisConnectionConfig | null>(null);

  // Sync activeConnId if connections list changes
  useEffect(() => {
    if (connections.length > 0) {
      if (!connections.some((c) => c.id === activeConnId)) {
        setActiveConnId(connections[0].id);
      }
    } else {
      setActiveConnId('');
    }
  }, [connections]);

  // Connection & Server info state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverInfo, setServerInfo] = useState<RedisServerInfo | null>(null);
  const [isServerInfoOpen, setIsServerInfoOpen] = useState(false);

  // Active DB state (0-15)
  const [activeDb, setActiveDb] = useState<number>(0);

  // Workspace View Mode: Explorer vs Workbench / Playground
  const [workspaceMode, setWorkspaceMode] = useState<'explorer' | 'workbench'>('explorer');

  // Resizable sidebar state (persisted)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('octa_redis_sidebar_width');
      const n = saved ? parseInt(saved) : 280;
      return isNaN(n) ? 280 : Math.max(220, Math.min(550, n));
    } catch {
      return 280;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  // Keys & scanning state
  const [keys, setKeys] = useState<RedisKeyInfo[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchPattern, setSearchPattern] = useState<string>('*');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Tabs state
  const [tabs, setTabs] = useState<RedisTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: KeyTreeNode;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Namespace deletion modal state
  const [namespaceDeleteModal, setNamespaceDeleteModal] = useState<{
    namespace: string;
    keys: string[];
  } | null>(null);
  const [isDeletingNamespace, setIsDeletingNamespace] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Quick TTL editor state
  const [isEditingTTL, setIsEditingTTL] = useState(false);
  const [customTTLInput, setCustomTTLInput] = useState<string>('');

  // Modals state
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState<{
    key: string;
    type: RedisKeyType;
    stringValue: string;
    ttl: number;
  }>({
    key: '',
    type: 'string',
    stringValue: '',
    ttl: -1,
  });

  const [isFlushConfirmOpen, setIsFlushConfirmOpen] = useState(false);

  // Active connection object
  const activeConn = useMemo(() => {
    const found = connections.find((c) => c.id === activeConnId);
    if (!found) return null;
    return { ...found, db: activeDb };
  }, [connections, activeConnId, activeDb]);

  // Active tab object
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.key === activeTabKey) || null;
  }, [tabs, activeTabKey]);

  // Handle Drag Resizing of Sidebar
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(220, Math.min(550, e.clientX - 52)); // 52px for activity rail
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('octa_redis_sidebar_width', String(sidebarWidth));
      } catch { }
    };
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  // Connect & Scan keys
  const handleConnect = useCallback(
    async (connToUse = activeConn) => {
      if (!connToUse) {
        setIsConnected(false);
        setServerInfo(null);
        setKeys([]);
        return;
      }
      setIsConnecting(true);
      try {
        const res = await connectRedis(connToUse);
        if (res.success) {
          setIsConnected(true);
          setServerInfo(res.serverInfo);
          showToast(`Connected to Redis ${connToUse.host}:${connToUse.port} (DB ${connToUse.db})`, 'success');
          loadKeys(connToUse, searchPattern);
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
    [activeConn, searchPattern, showToast]
  );

  // Scan keys function
  const loadKeys = async (conn = activeConn, pattern = searchPattern) => {
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
  };

  // Connect when user changes activeConnId or activeDb IF connection exists
  useEffect(() => {
    if (activeConn) {
      handleConnect(activeConn);
    } else {
      setIsConnected(false);
      setKeys([]);
      setTabs([]);
      setActiveTabKey(null);
    }
  }, [activeConnId, activeDb]);

  // Open key in Tab (Multi-Tab Support)
  const handleOpenKeyInTab = async (keyName: string) => {
    const existingIndex = tabs.findIndex((t) => t.key === keyName);
    if (existingIndex >= 0) {
      setActiveTabKey(keyName);
      return;
    }

    if (!activeConn) return;

    // Create loading tab
    const newTab: RedisTab = {
      id: keyName,
      key: keyName,
      type: 'string',
      detail: null,
      isLoading: true,
      isDirty: false,
      draftString: '',
      draftHash: [],
      draftList: [],
      draftSet: [],
      draftZSet: [],
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabKey(keyName);
    setIsEditingTTL(false);

    try {
      const detail = await getRedisKeyDetails(activeConn, keyName);
      if (detail) {
        setTabs((prev) =>
          prev.map((t) => {
            if (t.key !== keyName) return t;
            return {
              ...t,
              type: detail.type,
              detail: detail,
              isLoading: false,
              draftString: detail.stringValue || '',
              draftHash: detail.hashValue
                ? Object.entries(detail.hashValue).map(([field, value]) => ({ field, value }))
                : [],
              draftList: detail.listValue || [],
              draftSet: detail.setValue || [],
              draftZSet: detail.zsetValue || [],
            };
          })
        );
      } else {
        showToast(`Key "${keyName}" no longer exists or expired`, 'info');
        handleCloseTab(keyName);
      }
    } catch (err: any) {
      showToast(`Failed to fetch key details: ${err?.message || err}`, 'error');
      setTabs((prev) =>
        prev.map((t) => (t.key === keyName ? { ...t, isLoading: false } : t))
      );
    }
  };

  // Close Tab
  const handleCloseTab = (keyToClose: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setTabs((prev) => {
      const filtered = prev.filter((t) => t.key !== keyToClose);
      if (activeTabKey === keyToClose) {
        if (filtered.length > 0) {
          const closingIdx = prev.findIndex((t) => t.key === keyToClose);
          const nextIdx = Math.max(0, closingIdx - 1);
          setActiveTabKey(filtered[nextIdx]?.key || null);
        } else {
          setActiveTabKey(null);
        }
      }
      return filtered;
    });
  };

  // Build Hierarchical Namespace Tree
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
            isLeaf: isLeaf,
            keyInfo: isLeaf ? k : undefined,
            children: {},
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }, [keys]);

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: prev[folderPath] === undefined ? false : !prev[folderPath],
    }));
  };

  // Save changes to current active tab key
  const handleSaveActiveTabKey = async () => {
    if (!activeTab || !activeTab.detail || !activeConn) return;
    setIsSaving(true);
    try {
      let payload: any = activeTab.draftString;
      if (activeTab.type === 'hash') {
        const hashObj: Record<string, string> = {};
        activeTab.draftHash.forEach((item) => {
          if (item.field.trim()) {
            hashObj[item.field] = item.value;
          }
        });
        payload = hashObj;
      } else if (activeTab.type === 'list') {
        payload = activeTab.draftList;
      } else if (activeTab.type === 'set') {
        payload = activeTab.draftSet;
      } else if (activeTab.type === 'zset') {
        payload = activeTab.draftZSet;
      }

      const ok = await updateRedisKey(
        activeConn,
        activeTab.key,
        activeTab.type,
        payload,
        activeTab.detail.ttl
      );

      if (ok) {
        showToast(`Key "${activeTab.key}" saved successfully`, 'success');
        setTabs((prev) =>
          prev.map((t) => (t.key === activeTab.key ? { ...t, isDirty: false } : t))
        );
        loadKeys();
      } else {
        showToast('Failed to save key changes', 'error');
      }
    } catch (err: any) {
      showToast(`Error saving key: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete single key
  const handleDeleteKey = async (keyToDelete: string) => {
    if (!keyToDelete || !activeConn) return;
    if (!confirm(`Are you sure you want to delete key "${keyToDelete}"?`)) return;

    try {
      const ok = await deleteRedisKey(activeConn, keyToDelete);
      if (ok) {
        showToast(`Deleted key "${keyToDelete}"`, 'info');
        handleCloseTab(keyToDelete);
        loadKeys();
      } else {
        showToast('Failed to delete key', 'error');
      }
    } catch (err: any) {
      showToast(`Error deleting key: ${err?.message || err}`, 'error');
    }
  };

  // Delete entire folder namespace
  const handleDeleteNamespace = async () => {
    if (!namespaceDeleteModal || namespaceDeleteModal.keys.length === 0 || !activeConn) return;
    setIsDeletingNamespace(true);
    try {
      const deletedCount = await deleteRedisKeysBatch(activeConn, namespaceDeleteModal.keys);
      showToast(`Deleted namespace "${namespaceDeleteModal.namespace}" (${deletedCount} keys)`, 'info');

      namespaceDeleteModal.keys.forEach((k) => handleCloseTab(k));
      setNamespaceDeleteModal(null);
      loadKeys();
    } catch (err: any) {
      showToast(`Error deleting namespace: ${err?.message || err}`, 'error');
    } finally {
      setIsDeletingNamespace(false);
    }
  };

  // Trigger delete from tree row (leaf vs folder)
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

  // Set TTL
  const handleUpdateTTL = async (ttlSec: number) => {
    if (!activeTab || !activeTab.detail || !activeConn) return;
    try {
      const ok = await setRedisTTL(activeConn, activeTab.key, ttlSec);
      if (ok) {
        showToast(
          ttlSec === -1 ? `Key "${activeTab.key}" is now persistent` : `TTL set to ${ttlSec}s`,
          'success'
        );
        setIsEditingTTL(false);
        setTabs((prev) =>
          prev.map((t) =>
            t.key === activeTab.key && t.detail
              ? { ...t, detail: { ...t.detail, ttl: ttlSec } }
              : t
          )
        );
      } else {
        showToast('Failed to update TTL', 'error');
      }
    } catch (err: any) {
      showToast(`Error setting TTL: ${err?.message || err}`, 'error');
    }
  };

  // Create Key Submit
  const handleCreateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyForm.key.trim() || !activeConn) return;

    try {
      let initialPayload: any = newKeyForm.stringValue;
      if (newKeyForm.type === 'hash') {
        initialPayload = { field1: 'value1' };
      } else if (newKeyForm.type === 'list') {
        initialPayload = ['item1'];
      } else if (newKeyForm.type === 'set') {
        initialPayload = ['member1'];
      } else if (newKeyForm.type === 'zset') {
        initialPayload = [{ member: 'member1', score: 1 }];
      }

      const ok = await createRedisKey(
        activeConn,
        newKeyForm.key.trim(),
        newKeyForm.type,
        initialPayload,
        newKeyForm.ttl
      );

      if (ok) {
        showToast(`Created key "${newKeyForm.key}" (${newKeyForm.type.toUpperCase()})`, 'success');
        setIsNewKeyModalOpen(false);
        loadKeys();
        handleOpenKeyInTab(newKeyForm.key.trim());
      } else {
        showToast('Failed to create key', 'error');
      }
    } catch (err: any) {
      showToast(`Error creating key: ${err?.message || err}`, 'error');
    }
  };

  // Flush DB
  const handleFlushDB = async () => {
    if (!activeConn) return;
    try {
      const ok = await flushRedisDB(activeConn);
      if (ok) {
        showToast(`Flushed all keys in DB ${activeDb}`, 'info');
        setIsFlushConfirmOpen(false);
        setTabs([]);
        setActiveTabKey(null);
        loadKeys();
      } else {
        showToast('Failed to flush database', 'error');
      }
    } catch (err: any) {
      showToast(`Error flushing DB: ${err?.message || err}`, 'error');
    }
  };

  // Save new / edited connection
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

  // Delete connection
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

  // Format Helper for JSON in String View
  const handlePrettifyJSON = () => {
    if (!activeTab) return;
    try {
      const parsed = JSON.parse(activeTab.draftString);
      const formatted = JSON.stringify(parsed, null, 2);
      setTabs((prev) =>
        prev.map((t) =>
          t.key === activeTab.key ? { ...t, draftString: formatted, isDirty: true } : t
        )
      );
      showToast('Formatted JSON', 'info');
    } catch {
      showToast('Value is not valid JSON', 'error');
    }
  };

  const handleMinifyJSON = () => {
    if (!activeTab) return;
    try {
      const parsed = JSON.parse(activeTab.draftString);
      const minified = JSON.stringify(parsed);
      setTabs((prev) =>
        prev.map((t) =>
          t.key === activeTab.key ? { ...t, draftString: minified, isDirty: true } : t
        )
      );
      showToast('Minified JSON', 'info');
    } catch {
      showToast('Value is not valid JSON', 'error');
    }
  };

  // Type badge helper
  const renderTypeBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'string':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-500/40 text-blue-400 font-mono">
            STRING
          </span>
        );
      case 'hash':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-400 font-mono">
            HASH
          </span>
        );
      case 'list':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-400 font-mono">
            LIST
          </span>
        );
      case 'set':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-950/70 border border-orange-500/40 text-orange-400 font-mono">
            SET
          </span>
        );
      case 'zset':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 font-mono">
            ZSET
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
            {(type || 'UNKNOWN').toUpperCase()}
          </span>
        );
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: KeyTreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders[node.fullPath] !== false; // default open
    const hasChildren = Object.keys(node.children).length > 0;

    if (node.name === 'root') {
      return (
        <div className="space-y-0.5">
          {Object.values(node.children).map((child) => renderTreeNode(child, 0))}
        </div>
      );
    }

    if (!node.isLeaf || hasChildren) {
      const childCount = getAllKeysInNode(node).length;
      return (
        <div key={node.fullPath} className="select-none">
          <div
            onClick={() => toggleFolder(node.fullPath)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY, node });
            }}
            style={{ paddingLeft: depth * 14 + 8 }}
            className="w-full pr-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left transition-all cursor-pointer text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1e] group"
          >
            <button type="button" className="p-0.5 text-zinc-500 hover:text-zinc-300">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-blue-400/90 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-blue-400/70 flex-shrink-0" />
            )}
            <span className="text-xs font-mono font-medium truncate flex-1 text-zinc-200">
              {node.name}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono mr-1">
              {childCount}
            </span>

            {/* Hover Delete Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerNodeDelete(node);
              }}
              title={`Delete namespace "${node.fullPath}" (${childCount} keys)`}
              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-all cursor-pointer flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {isExpanded && hasChildren && (
            <div className="space-y-0.5">
              {Object.values(node.children).map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf Key Node
    const isTabActive = activeTabKey === node.fullPath;
    const isTabOpen = tabs.some((t) => t.key === node.fullPath);

    return (
      <div
        key={node.fullPath}
        onClick={() => handleOpenKeyInTab(node.fullPath)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, node });
        }}
        style={{ paddingLeft: depth * 14 + 22 }}
        className={`w-full pr-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group select-none ${isTabActive
          ? 'bg-blue-600/20 text-white font-medium border-l-2 border-blue-400 shadow-sm'
          : isTabOpen
            ? 'bg-zinc-800/40 text-blue-300'
            : 'text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1e]'
          }`}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
          <Key className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs font-mono truncate text-zinc-200">{node.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {node.keyInfo && renderTypeBadge(node.keyInfo.type)}

          {/* Hover Delete Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerNodeDelete(node);
            }}
            title={`Delete key "${node.fullPath}"`}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-all cursor-pointer ml-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // ZERO-STATE SCREEN (When zero Redis connections exist)
  // Matches Database Workspace exactly: Sidebar with "+ Add Connection" & Center HomeLanding
  // =========================================================================
  if (connections.length === 0) {
    return (
      <div className="flex-1 flex h-full bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-zinc-100 font-sans overflow-hidden select-none transition-colors">
        {/* Left Sidebar (Matching Database Workspace Sidebar Zero-State) */}
        <div
          style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
          className="bg-white dark:bg-surface-900 border-r border-slate-200 dark:border-border-subtle flex flex-col h-full select-none flex-shrink-0 font-sans transition-colors"
        >
          {/* Header */}
          <div className="p-2 border-b border-slate-200 dark:border-border-subtle bg-slate-50/70 dark:bg-surface-850/50">
            <div className="px-2 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 rotate-90" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                  Explorer
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-border/50 font-mono">
                  0
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingConn(null);
                    setIsConnModalOpen(true);
                  }}
                  title="Add New Connection"
                  className="p-1 rounded-md bg-brand-500/10 dark:bg-brand-600/20 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white border border-brand-500/30 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Empty State Body */}
          <div className="p-4 text-center my-2 flex flex-col items-center justify-center flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 dark:text-gray-400 mb-2">
              <HardDrive className="w-5 h-5 text-slate-400 dark:text-gray-400" />
            </div>
            <div className="text-xs font-semibold text-slate-800 dark:text-gray-200 mb-1">No connections</div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed mb-3">
              Add your Redis server to start exploring.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingConn(null);
                setIsConnModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Connection</span>
            </button>
          </div>
        </div>

        {/* Resizable Handle Divider in Zero State */}
        <div
          onMouseDown={startResizing}
          className={`w-1 hover:w-1.5 cursor-col-resize select-none transition-colors ${isResizing ? 'bg-blue-500 w-1.5' : 'bg-slate-200 dark:bg-zinc-800/80 hover:bg-blue-500/50'
            }`}
        />

        {/* Center Viewport (Central Graphic with "+ Create New Connection") */}
        <HomeLanding
          onOpenNewModal={() => {
            setEditingConn(null);
            setIsConnModalOpen(true);
          }}
        />

        {/* Connection Modal */}
        <NewRedisConnectionModal
          isOpen={isConnModalOpen}
          onClose={() => {
            setIsConnModalOpen(false);
            setEditingConn(null);
          }}
          onSaved={handleSaveConnection}
          initialConfig={editingConn}
        />
      </div>
    );
  }

  // =========================================================================
  // MAIN WORKSPACE LAYOUT (Active Connection Tree + Multi-Tab Center Panel)
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0e0e11] text-slate-900 dark:text-zinc-100 font-sans overflow-hidden select-none transition-colors">
      {/* Top Global Toolbar */}
      <div className="h-12 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#141418] px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Left: Active Connection & DB Switcher */}
        <div className="flex items-center gap-3">
          {/* Connection Selector */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <select
              value={activeConnId}
              onChange={(e) => setActiveConnId(e.target.value)}
              className="bg-slate-100 dark:bg-[#1b1b20] border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none hover:border-slate-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.host}:{c.port})
                </option>
              ))}
            </select>
          </div>

          {/* Database Switcher (db0 - db15) */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1b1b20] border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2 py-0.5">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">DB:</span>
            <select
              value={activeDb}
              onChange={(e) => setActiveDb(parseInt(e.target.value) || 0)}
              className="bg-transparent text-xs font-mono font-bold text-blue-600 dark:text-blue-400 outline-none cursor-pointer"
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i} value={i} className="bg-white dark:bg-[#1b1b20] text-slate-800 dark:text-zinc-100">
                  db{i}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1b1b20] border border-slate-200 dark:border-zinc-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-400 dark:bg-zinc-600'
                }`}
            />
            <span className="text-slate-700 dark:text-zinc-300 font-medium">
              {isConnecting
                ? 'Connecting...'
                : isConnected
                  ? `Online (${keys.length} keys)`
                  : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher (Explorer vs Workbench) */}
        <div className="flex items-center bg-slate-100 dark:bg-[#18181d] border border-slate-200 dark:border-zinc-700/80 rounded-lg p-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => setWorkspaceMode('explorer')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${workspaceMode === 'explorer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Keys Explorer</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('workbench')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${workspaceMode === 'workbench'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Workbench / CLI</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Server Info Button */}
          {serverInfo && (
            <button
              type="button"
              onClick={() => setIsServerInfoOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1b20] dark:hover:bg-zinc-700/50 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title="Server Info"
            >
              <Server className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>v{serverInfo.redisVersion || 'unknown'}</span>
            </button>
          )}

          {/* New Key Button */}
          <button
            type="button"
            disabled={!isConnected}
            onClick={() => {
              setNewKeyForm({
                key: '',
                type: 'string',
                stringValue: '',
                ttl: -1,
              });
              setIsNewKeyModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Key</span>
          </button>

          {/* Connection Settings */}
          <button
            type="button"
            onClick={() => {
              setEditingConn(activeConn);
              setIsConnModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Edit Connection Settings"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Flush DB */}
          <button
            type="button"
            disabled={!isConnected || keys.length === 0}
            onClick={() => setIsFlushConfirmOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Flush Current Database"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {workspaceMode === 'workbench' ? (
        <RedisWorkbench
          activeConn={activeConn}
          activeDb={activeDb}
          showToast={showToast}
        />
      ) : (
        /* Main Body: Left Sidebar + Divider + Center Tabs / Content */
        <div className="flex-1 flex overflow-hidden">
          {/* =========================================================================
            STANDARDIZED RESIZABLE LEFT EXPLORER
           ========================================================================= */}
          <div
            style={{ width: sidebarWidth }}
            className="flex flex-col bg-white dark:bg-[#111114] border-r border-slate-200 dark:border-[#242429] flex-shrink-0 overflow-hidden select-none transition-colors"
          >
            {/* Explorer Header */}
            <div className="p-3 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#141418]/60">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  Explorer
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  {keys.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleConnect()}
                  disabled={isLoadingKeys}
                  className="p-1 rounded-md text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Refresh Keys"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingConn(null);
                    setIsConnModalOpen(true);
                  }}
                  className="p-1 rounded-md text-slate-400 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="New Redis Connection"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Bar & View Mode Toggle */}
            <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800/80 space-y-2 bg-slate-50/50 dark:bg-[#121215]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPattern}
                  onChange={(e) => setSearchPattern(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadKeys(activeConn, searchPattern);
                    }
                  }}
                  placeholder="Search keys (e.g. users:*)"
                  className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-700/60 focus:border-blue-500 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all"
                />
                {searchPattern !== '*' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchPattern('*');
                      loadKeys(activeConn, '*');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-zinc-800 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => setViewMode('tree')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${viewMode === 'tree'
                      ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                  >
                    <FolderTree className="w-3 h-3" />
                    <span>Tree</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${viewMode === 'flat'
                      ? 'bg-blue-600/15 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                  >
                    <List className="w-3 h-3" />
                    <span>Flat</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
                  {keys.length} key{keys.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Keys Tree / Flat List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {isLoadingKeys ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-zinc-500 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-400" />
                  <span className="text-xs">Scanning keys...</span>
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-400 dark:text-zinc-500 space-y-2">
                  <FolderOpen className="w-8 h-8 mx-auto text-slate-400 dark:text-zinc-600 opacity-50" />
                  <p className="text-xs font-medium text-slate-700 dark:text-zinc-400">No keys found</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                    {searchPattern !== '*' ? 'Try another filter pattern' : 'Database is currently empty'}
                  </p>
                </div>
              ) : viewMode === 'tree' ? (
                renderTreeNode(keyTree)
              ) : (
                // Flat view
                <div className="space-y-0.5">
                  {keys.map((k) => {
                    const isTabActive = activeTabKey === k.key;
                    const isTabOpen = tabs.some((t) => t.key === k.key);
                    return (
                      <div
                        key={k.key}
                        onClick={() => handleOpenKeyInTab(k.key)}
                        className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group select-none ${isTabActive
                          ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-white font-medium border-l-2 border-blue-500 dark:border-blue-400 shadow-sm'
                          : isTabOpen
                            ? 'bg-slate-100 dark:bg-zinc-800/40 text-blue-700 dark:text-blue-300'
                            : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1a1a1e]'
                          }`}
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                          <Key className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-xs font-mono truncate text-slate-800 dark:text-zinc-200">{k.key}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {renderTypeBadge(k.type)}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteKey(k.key);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resizable Handle Divider */}
          <div
            onMouseDown={startResizing}
            className={`w-1 hover:w-1.5 cursor-col-resize select-none transition-colors ${isResizing ? 'bg-blue-500 w-1.5' : 'bg-slate-200 dark:bg-zinc-800/80 hover:bg-blue-500/50'
              }`}
          />

          {/* =========================================================================
            MAIN CENTER PANEL WITH MULTI-TAB ARCHITECTURE
           ========================================================================= */}
          <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0d0d10] overflow-hidden transition-colors">
            {/* Top Multi-Tab Bar */}
            {tabs.length > 0 && (
              <div className="h-10 border-b border-slate-200 dark:border-[#242429] bg-slate-100/70 dark:bg-[#121216] flex items-center px-2 gap-1 overflow-x-auto select-none flex-shrink-0">
                {tabs.map((tab) => {
                  const isActive = tab.key === activeTabKey;
                  return (
                    <div
                      key={tab.key}
                      onClick={() => setActiveTabKey(tab.key)}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-mono cursor-pointer transition-all border-b-2 max-w-[220px] flex-shrink-0 ${isActive
                        ? 'bg-white dark:bg-[#18181d] text-slate-900 dark:text-zinc-100 border-blue-500 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40 border-transparent'
                        }`}
                    >
                      {renderTypeBadge(tab.type)}
                      <span className="truncate flex-1" title={tab.key}>
                        {tab.key}
                      </span>
                      {tab.isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleCloseTab(tab.key, e)}
                        className="p-0.5 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700/50 opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab Content / Zero State */}
            {!activeTab ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-zinc-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/40 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-4 shadow-inner">
                  <FolderTree className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-300 mb-1">No Key Selected</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mb-4">
                  Select a key from the left explorer to view and edit its value, inspect TTL, or create a new key.
                </p>
                <button
                  type="button"
                  disabled={!isConnected}
                  onClick={() => setIsNewKeyModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700/80 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Create Key</span>
                </button>
              </div>
            ) : activeTab.isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-zinc-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-mono">Loading "{activeTab.key}"...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Key Meta Action Header */}
                <div className="p-4 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#141418] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      <Key className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {activeTab.key}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeTab.key);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 1500);
                          }}
                          className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Copy Key Name"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderTypeBadge(activeTab.type)}
                        {activeTab.detail && (
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                            Size: {formatBytes(activeTab.detail.memoryUsage)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: TTL Editor & Save Action */}
                  <div className="flex items-center gap-2">
                    {/* TTL Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEditingTTL(!isEditingTTL)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 hover:border-slate-400 dark:hover:border-zinc-500 text-xs font-mono text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>
                          TTL:{' '}
                          {activeTab.detail?.ttl === -1 || activeTab.detail?.ttl === undefined
                            ? 'Persistent (-1)'
                            : activeTab.detail.ttl === -2
                              ? 'Expired'
                              : `${activeTab.detail.ttl}s`}
                        </span>
                      </button>

                      {/* Quick TTL Dropdown */}
                      {isEditingTTL && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl p-2 z-50 space-y-1.5 animate-in fade-in zoom-in-95">
                          <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-400 px-1">
                            Set Expiration
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateTTL(-1)}
                            className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            Persistent (-1)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTTL(60)}
                            className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            1 Minute (60s)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTTL(3600)}
                            className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            1 Hour (3600s)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTTL(86400)}
                            className="w-full text-left px-2 py-1 rounded text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            1 Day (86400s)
                          </button>
                          <div className="flex gap-1 pt-1 border-t border-slate-200 dark:border-zinc-800">
                            <input
                              type="number"
                              value={customTTLInput}
                              onChange={(e) => setCustomTTLInput(e.target.value)}
                              placeholder="Secs"
                              className="w-full px-2 py-0.5 bg-slate-100 dark:bg-[#121215] border border-slate-200 dark:border-zinc-700 rounded text-xs text-slate-900 dark:text-zinc-100 font-mono outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = parseInt(customTTLInput);
                                if (!isNaN(val)) handleUpdateTTL(val);
                              }}
                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete Key */}
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(activeTab.key)}
                      className="p-2 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Save Key Changes */}
                    <button
                      type="button"
                      onClick={handleSaveActiveTabKey}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>

                {/* Value Editor Body */}
                <div className="flex-1 overflow-hidden p-4">
                  {activeTab.type === 'string' ? (
                    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#18181c]/50">
                        <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Value (String / JSON)</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handlePrettifyJSON}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 cursor-pointer"
                          >
                            Prettify JSON
                          </button>
                          <button
                            type="button"
                            onClick={handleMinifyJSON}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 cursor-pointer"
                          >
                            Minify JSON
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 bg-white dark:bg-[#141416]">
                        <Editor
                          height="100%"
                          language="json"
                          theme={monacoTheme}
                          beforeMount={(monaco) => defineOctaTheme(monaco)}
                          value={activeTab.draftString}
                          onChange={(val) => {
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.key === activeTab.key
                                  ? { ...t, draftString: val || '', isDirty: true }
                                  : t
                              )
                            );
                          }}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </div>
                  ) : activeTab.type === 'hash' ? (
                    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Hash Fields ({activeTab.draftHash.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.key === activeTab.key
                                  ? {
                                    ...t,
                                    draftHash: [
                                      ...t.draftHash,
                                      { field: `field_${t.draftHash.length + 1}`, value: '' },
                                    ],
                                    isDirty: true,
                                  }
                                  : t
                              )
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Field</span>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {activeTab.draftHash.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.field}
                              onChange={(e) => {
                                const newField = e.target.value;
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    const nextHash = [...t.draftHash];
                                    nextHash[idx] = { ...nextHash[idx], field: newField };
                                    return { ...t, draftHash: nextHash, isDirty: true };
                                  })
                                );
                              }}
                              placeholder="Field Name"
                              className="w-1/3 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                            />
                            <input
                              type="text"
                              value={item.value}
                              onChange={(e) => {
                                const newVal = e.target.value;
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    const nextHash = [...t.draftHash];
                                    nextHash[idx] = { ...nextHash[idx], value: newVal };
                                    return { ...t, draftHash: nextHash, isDirty: true };
                                  })
                                );
                              }}
                              placeholder="Value"
                              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    return {
                                      ...t,
                                      draftHash: t.draftHash.filter((_, i) => i !== idx),
                                      isDirty: true,
                                    };
                                  })
                                );
                              }}
                              className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeTab.type === 'list' ? (
                    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          List Elements ({activeTab.draftList.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.key === activeTab.key
                                  ? { ...t, draftList: [...t.draftList, ''], isDirty: true }
                                  : t
                              )
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Push Item</span>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {activeTab.draftList.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 w-8">{idx}</span>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    const nextList = [...t.draftList];
                                    nextList[idx] = val;
                                    return { ...t, draftList: nextList, isDirty: true };
                                  })
                                );
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    return {
                                      ...t,
                                      draftList: t.draftList.filter((_, i) => i !== idx),
                                      isDirty: true,
                                    };
                                  })
                                );
                              }}
                              className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeTab.type === 'set' ? (
                    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Set Members ({activeTab.draftSet.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.key === activeTab.key
                                  ? { ...t, draftSet: [...t.draftSet, ''], isDirty: true }
                                  : t
                              )
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Member</span>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {activeTab.draftSet.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    const nextSet = [...t.draftSet];
                                    nextSet[idx] = val;
                                    return { ...t, draftSet: nextSet, isDirty: true };
                                  })
                                );
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    return {
                                      ...t,
                                      draftSet: t.draftSet.filter((_, i) => i !== idx),
                                      isDirty: true,
                                    };
                                  })
                                );
                              }}
                              className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // ZSET View
                    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Sorted Set Members ({activeTab.draftZSet.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTabs((prev) =>
                              prev.map((t) =>
                                t.key === activeTab.key
                                  ? {
                                    ...t,
                                    draftZSet: [...t.draftZSet, { member: '', score: 1 }],
                                    isDirty: true,
                                  }
                                  : t
                              )
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Member</span>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {activeTab.draftZSet.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="number"
                              value={item.score}
                              onChange={(e) => {
                                const score = parseFloat(e.target.value) || 0;
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    const nextZ = [...t.draftZSet];
                                    nextZ[idx] = { ...nextZ[idx], score };
                                    return { ...t, draftZSet: nextZ, isDirty: true };
                                  })
                                );
                              }}
                              placeholder="Score"
                              className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                            />
                            <input
                              type="text"
                              value={item.member}
                              onChange={(e) => {
                                const member = e.target.value;
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    const nextZ = [...t.draftZSet];
                                    nextZ[idx] = { ...nextZ[idx], member };
                                    return { ...t, draftZSet: nextZ, isDirty: true };
                                  })
                                );
                              }}
                              placeholder="Member"
                              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setTabs((prev) =>
                                  prev.map((t) => {
                                    if (t.key !== activeTab.key) return t;
                                    return {
                                      ...t,
                                      draftZSet: t.draftZSet.filter((_, i) => i !== idx),
                                      isDirty: true,
                                    };
                                  })
                                );
                              }}
                              className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS & DIALOGS
         ========================================================================= */}
      {/* New / Edit Connection Modal */}
      <NewRedisConnectionModal
        isOpen={isConnModalOpen}
        onClose={() => {
          setIsConnModalOpen(false);
          setEditingConn(null);
        }}
        onSaved={handleSaveConnection}
        initialConfig={editingConn}
      />

      {/* New Key Modal */}
      {isNewKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181b]/60">
              <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Create New Redis Key</h3>
              <button
                type="button"
                onClick={() => setIsNewKeyModalOpen(false)}
                className="text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateKeySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Key Name</label>
                <input
                  type="text"
                  required
                  value={newKeyForm.key}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, key: e.target.value })}
                  placeholder="e.g. users:session:102"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Data Type</label>
                <select
                  value={newKeyForm.type}
                  onChange={(e) =>
                    setNewKeyForm({ ...newKeyForm, type: e.target.value as RedisKeyType })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-zinc-100 outline-none cursor-pointer"
                >
                  <option value="string">STRING</option>
                  <option value="hash">HASH</option>
                  <option value="list">LIST</option>
                  <option value="set">SET</option>
                  <option value="zset">ZSET</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  TTL in Seconds (-1 for Persistent)
                </label>
                <input
                  type="number"
                  value={newKeyForm.ttl}
                  onChange={(e) =>
                    setNewKeyForm({ ...newKeyForm, ttl: parseInt(e.target.value) || -1 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewKeyModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md cursor-pointer"
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Namespace Delete Confirmation Modal */}
      {namespaceDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Delete Namespace?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to delete all <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{namespaceDeleteModal.keys.length} keys</span> inside namespace <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono">"{namespaceDeleteModal.namespace}"</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNamespaceDeleteModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingNamespace}
                onClick={handleDeleteNamespace}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isDeletingNamespace ? 'Deleting...' : 'Delete All Keys'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flush DB Confirmation */}
      {isFlushConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Flush Database {activeDb}?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              This will permanently remove all keys in <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">db{activeDb}</span>. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFlushConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFlushDB}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Flush DB {activeDb}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Info Modal */}
      {isServerInfoOpen && serverInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181b]/60">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Redis Server Statistics</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsServerInfoOpen(false)}
                className="text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Redis Version</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                    v{serverInfo.redisVersion || 'unknown'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Connected Clients</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                    {serverInfo.connectedClients}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Memory Usage</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {serverInfo.usedMemoryHuman || '0 B'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Total Keys</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {serverInfo.totalKeys}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
