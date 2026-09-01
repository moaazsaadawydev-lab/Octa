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
  Flame,
  List,
  FolderTree,
  FileCode,
  Hash,
  ListOrdered,
  Tag,
  BarChart2,
  Eye,
  EyeOff,
  MoreVertical,
  X,
  ExternalLink,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlignLeft,
  Minimize2,
  PlusCircle,
  Scissors
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import {
  RedisConnectionConfig,
  RedisServerInfo,
  RedisKeyInfo,
  RedisKeyDetail,
  RedisKeyType,
  ZSetMember,
} from '../types/redis';
import {
  loadRedisConnections,
  saveRedisConnections,
  connectRedis,
  scanRedisKeys,
  getRedisKeyDetails,
  createRedisKey,
  updateRedisKey,
  deleteRedisKey,
  deleteRedisKeysBatch,
  setRedisTTL,
  flushRedisDB,
} from '../services/api';
import { NewRedisConnectionModal } from './NewRedisConnectionModal';

interface RedisWorkspaceProps {
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

const DEFAULT_REDIS_CONN: RedisConnectionConfig = {
  id: 'redis-default',
  name: 'Local Redis',
  host: '127.0.0.1',
  port: 6379,
  db: 0,
  ssl: false,
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

export const RedisWorkspace: React.FC<RedisWorkspaceProps> = ({ showToast }) => {
  // Connections state
  const [connections, setConnections] = useState<RedisConnectionConfig[]>([DEFAULT_REDIS_CONN]);
  const [activeConnId, setActiveConnId] = useState<string>(DEFAULT_REDIS_CONN.id);
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<RedisConnectionConfig | null>(null);

  // Connection & Server info state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverInfo, setServerInfo] = useState<RedisServerInfo | null>(null);
  const [isServerInfoOpen, setIsServerInfoOpen] = useState(false);

  // Active DB state (0-15)
  const [activeDb, setActiveDb] = useState<number>(0);

  // Keys & scanning state
  const [keys, setKeys] = useState<RedisKeyInfo[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchPattern, setSearchPattern] = useState<string>('*');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

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

  // Selected key & details
  const [selectedKeyName, setSelectedKeyName] = useState<string | null>(null);
  const [selectedKeyDetail, setSelectedKeyDetail] = useState<RedisKeyDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local draft state for editing values
  const [draftString, setDraftString] = useState<string>('');
  const [draftHash, setDraftHash] = useState<Array<{ field: string; value: string }>>([]);
  const [draftList, setDraftList] = useState<string[]>([]);
  const [draftSet, setDraftSet] = useState<string[]>([]);
  const [draftZSet, setDraftZSet] = useState<ZSetMember[]>([]);
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
    if (!found) return connections[0] || DEFAULT_REDIS_CONN;
    return { ...found, db: activeDb };
  }, [connections, activeConnId, activeDb]);

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

  // Load saved connections from backend disk on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await loadRedisConnections();
        if (data && data.trim()) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setConnections(parsed);
            setActiveConnId(parsed[0].id);
            setActiveDb(parsed[0].db || 0);
          }
        }
      } catch (err) {
        console.warn('Failed to load Redis connections from disk:', err);
      }
    })();
  }, []);

  // Save connections helper
  const persistConnections = useCallback((list: RedisConnectionConfig[]) => {
    setConnections(list);
    try {
      const jsonStr = JSON.stringify(list);
      saveRedisConnections(jsonStr);
    } catch (e) {
      console.warn('Failed to persist Redis connections:', e);
    }
  }, []);

  // Connect & Scan keys
  const handleConnect = useCallback(
    async (connToUse = activeConn) => {
      setIsConnecting(true);
      try {
        const res = await connectRedis(connToUse);
        if (res.success) {
          setIsConnected(true);
          setServerInfo(res.serverInfo);
          showToast(`Connected to Redis ${connToUse.host}:${connToUse.port} (DB ${connToUse.db})`, 'success');
          // Scan keys
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

  // Auto-connect on active connection or DB change
  useEffect(() => {
    handleConnect();
  }, [activeConnId, activeDb]);

  // Load key details when a key is selected
  const handleSelectKey = async (keyName: string) => {
    setSelectedKeyName(keyName);
    setIsLoadingDetail(true);
    setIsEditingTTL(false);
    try {
      const detail = await getRedisKeyDetails(activeConn, keyName);
      if (detail) {
        setSelectedKeyDetail(detail);
        // Initialize draft values
        setDraftString(detail.stringValue || '');
        if (detail.hashValue) {
          setDraftHash(
            Object.entries(detail.hashValue).map(([field, value]) => ({ field, value }))
          );
        } else {
          setDraftHash([]);
        }
        setDraftList(detail.listValue || []);
        setDraftSet(detail.setValue || []);
        setDraftZSet(detail.zsetValue || []);
      } else {
        setSelectedKeyDetail(null);
        showToast(`Key "${keyName}" no longer exists or expired`, 'info');
      }
    } catch (err: any) {
      showToast(`Failed to fetch key details: ${err?.message || err}`, 'error');
    } finally {
      setIsLoadingDetail(false);
    }
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

  // Save changes to current key
  const handleSaveKey = async () => {
    if (!selectedKeyDetail) return;
    setIsSaving(true);
    try {
      let payload: any = draftString;
      if (selectedKeyDetail.type === 'hash') {
        const hashObj: Record<string, string> = {};
        draftHash.forEach((item) => {
          if (item.field.trim()) {
            hashObj[item.field] = item.value;
          }
        });
        payload = hashObj;
      } else if (selectedKeyDetail.type === 'list') {
        payload = draftList;
      } else if (selectedKeyDetail.type === 'set') {
        payload = draftSet;
      } else if (selectedKeyDetail.type === 'zset') {
        payload = draftZSet;
      }

      const ok = await updateRedisKey(
        activeConn,
        selectedKeyDetail.key,
        selectedKeyDetail.type,
        payload,
        selectedKeyDetail.ttl
      );

      if (ok) {
        showToast(`Key "${selectedKeyDetail.key}" saved successfully`, 'success');
        // Refresh details
        handleSelectKey(selectedKeyDetail.key);
        // Refresh memory usage in tree
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
  const handleDeleteKey = async (keyToDelete = selectedKeyName) => {
    if (!keyToDelete) return;
    if (!confirm(`Are you sure you want to delete key "${keyToDelete}"?`)) return;

    try {
      const ok = await deleteRedisKey(activeConn, keyToDelete);
      if (ok) {
        showToast(`Deleted key "${keyToDelete}"`, 'info');
        if (selectedKeyName === keyToDelete) {
          setSelectedKeyName(null);
          setSelectedKeyDetail(null);
        }
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
    if (!namespaceDeleteModal || namespaceDeleteModal.keys.length === 0) return;
    setIsDeletingNamespace(true);
    try {
      const deletedCount = await deleteRedisKeysBatch(activeConn, namespaceDeleteModal.keys);
      showToast(`Deleted namespace "${namespaceDeleteModal.namespace}" (${deletedCount} keys)`, 'info');

      if (selectedKeyName && namespaceDeleteModal.keys.includes(selectedKeyName)) {
        setSelectedKeyName(null);
        setSelectedKeyDetail(null);
      }

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
    if (!selectedKeyDetail) return;
    try {
      const ok = await setRedisTTL(activeConn, selectedKeyDetail.key, ttlSec);
      if (ok) {
        showToast(
          ttlSec === -1
            ? `Key "${selectedKeyDetail.key}" is now persistent`
            : `TTL set to ${ttlSec}s`,
          'success'
        );
        setIsEditingTTL(false);
        handleSelectKey(selectedKeyDetail.key);
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
    if (!newKeyForm.key.trim()) return;

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
        handleSelectKey(newKeyForm.key.trim());
      } else {
        showToast('Failed to create key', 'error');
      }
    } catch (err: any) {
      showToast(`Error creating key: ${err?.message || err}`, 'error');
    }
  };

  // Flush DB
  const handleFlushDB = async () => {
    try {
      const ok = await flushRedisDB(activeConn);
      if (ok) {
        showToast(`Flushed all keys in DB ${activeDb}`, 'info');
        setIsFlushConfirmOpen(false);
        setSelectedKeyName(null);
        setSelectedKeyDetail(null);
        loadKeys();
      } else {
        showToast('Failed to flush database', 'error');
      }
    } catch (err: any) {
      showToast(`Error flushing DB: ${err?.message || err}`, 'error');
    }
  };

  // Format Helper for JSON in String View
  const handlePrettifyJSON = () => {
    try {
      const parsed = JSON.parse(draftString);
      setDraftString(JSON.stringify(parsed, null, 2));
      showToast('Formatted JSON', 'info');
    } catch {
      showToast('Value is not valid JSON', 'error');
    }
  };

  const handleMinifyJSON = () => {
    try {
      const parsed = JSON.parse(draftString);
      setDraftString(JSON.stringify(parsed));
      showToast('Minified JSON', 'info');
    } catch {
      showToast('Value is not valid JSON', 'error');
    }
  };

  // Type badge helper
  const renderTypeBadge = (type: string) => {
    const t = type.toLowerCase();
    switch (t) {
      case 'string':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950/70 border border-sky-500/40 text-sky-400 font-mono">
            STRING
          </span>
        );
      case 'hash':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-mono">
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
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-400 font-mono">
            ZSET
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
            {type.toUpperCase()}
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
              <FolderOpen className="w-3.5 h-3.5 text-brand-400/90 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-brand-400/70 flex-shrink-0" />
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
    const isSelected = selectedKeyName === node.fullPath;
    return (
      <div
        key={node.fullPath}
        onClick={() => handleSelectKey(node.fullPath)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, node });
        }}
        style={{ paddingLeft: depth * 14 + 22 }}
        className={`w-full pr-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group select-none ${
          isSelected
            ? 'bg-brand-600/15 text-white font-medium border-l-2 border-brand-400 shadow-sm'
            : 'text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1e]'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
          <FileCode className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0e11] text-zinc-100 font-sans overflow-hidden select-none">
      {/* =========================================================================
          TOP TOOLBAR & CONNECTION BAR
         ========================================================================= */}
      <div className="h-12 border-b border-[#242429] bg-[#141418] px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Left: Active Connection & DB Switcher */}
        <div className="flex items-center gap-3">
          {/* Connection Selector */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-400">
              <Layers className="w-4 h-4" />
            </div>
            <select
              value={activeConnId}
              onChange={(e) => setActiveConnId(e.target.value)}
              className="bg-[#1b1b20] border border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-100 outline-none hover:border-zinc-500 transition-colors cursor-pointer"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.host}:{c.port})
                </option>
              ))}
            </select>
          </div>

          {/* Database Switcher (db0 - db15) */}
          <div className="flex items-center gap-1.5 bg-[#1b1b20] border border-zinc-700/80 rounded-lg px-2 py-0.5">
            <span className="text-[11px] text-zinc-400 font-mono">DB:</span>
            <select
              value={activeDb}
              onChange={(e) => setActiveDb(parseInt(e.target.value) || 0)}
              className="bg-transparent text-xs font-mono font-bold text-brand-400 outline-none cursor-pointer"
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i} value={i} className="bg-[#1b1b20] text-zinc-100">
                  db{i}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1b1b20] border border-zinc-800 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'
              }`}
            />
            <span className="text-zinc-300 font-medium">
              {isConnecting
                ? 'Connecting...'
                : isConnected
                ? `Redis ${serverInfo?.redisVersion || ''}`
                : 'Disconnected'}
            </span>
          </div>

          {/* Server Info Modal Trigger */}
          {serverInfo && (
            <button
              type="button"
              onClick={() => setIsServerInfoOpen(true)}
              title="View Server Telemetry & Memory"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Right: Actions (New Conn, Refresh, Flush) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleConnect()}
            disabled={isConnecting || isLoadingKeys}
            title="Refresh Keys"
            className="px-2.5 py-1.5 rounded-lg bg-[#1b1b20] hover:bg-zinc-700/80 border border-zinc-700/80 text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-zinc-400 ${isLoadingKeys ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingConn(null);
              setIsConnModalOpen(true);
            }}
            title="Add New Redis Connection"
            className="px-2.5 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-brand-400 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connection</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFlushConfirmOpen(true)}
            title="Flush All Keys in Current Database"
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Flush DB</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE (SPLIT VIEW: LEFT KEY TREE, RIGHT INSPECTOR)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* =========================================
            LEFT PANE: KEY TREE EXPLORER (~320px)
           ========================================= */}
        <div className="w-80 border-r border-[#242429] bg-[#111114] flex flex-col h-full flex-shrink-0">
          {/* Search & Pattern Filter */}
          <div className="p-2.5 border-b border-[#242429] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchPattern}
                onChange={(e) => setSearchPattern(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadKeys();
                }}
                placeholder="Search pattern (e.g. users:*, *)"
                className="w-full pl-8 pr-7 py-1.5 bg-[#18181c] border border-zinc-700/80 focus:border-brand-500 rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
              />
              {searchPattern && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchPattern('*');
                    loadKeys(activeConn, '*');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode & Add Key Bar */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-1 bg-[#18181c] border border-zinc-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  title="Hierarchical Tree View"
                  className={`px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
                    viewMode === 'tree' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FolderTree className="w-3 h-3 text-brand-400" />
                  <span>Tree</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('flat')}
                  title="Flat List View"
                  className={`px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
                    viewMode === 'flat' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <List className="w-3 h-3 text-brand-400" />
                  <span>Flat</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewKeyForm({ key: '', type: 'string', stringValue: '', ttl: -1 });
                  setIsNewKeyModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>+ Key</span>
              </button>
            </div>
          </div>

          {/* Keys Summary Banner */}
          <div className="px-3 py-1.5 border-b border-[#242429] bg-[#141418]/60 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Keys: {keys.length}</span>
            <span>Total DB: {serverInfo?.totalKeys || keys.length}</span>
          </div>

          {/* Key List / Tree Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isLoadingKeys ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                <span className="text-xs">Scanning keys...</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <Layers className="w-8 h-8 text-zinc-600 mb-2" />
                <span className="text-xs font-semibold text-zinc-400">No keys found</span>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Database {activeDb} has no keys matching pattern "{searchPattern}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewKeyForm({ key: '', type: 'string', stringValue: '', ttl: -1 });
                    setIsNewKeyModalOpen(true);
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium cursor-pointer shadow-md"
                >
                  Create First Key
                </button>
              </div>
            ) : viewMode === 'tree' ? (
              renderTreeNode(keyTree)
            ) : (
              keys.map((k) => {
                const isSelected = selectedKeyName === k.key;
                return (
                  <div
                    key={k.key}
                    onClick={() => handleSelectKey(k.key)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        node: { name: k.key, fullPath: k.key, isLeaf: true, keyInfo: k, children: {} },
                      });
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-brand-600/15 text-white font-medium border-l-2 border-brand-400 shadow-sm'
                        : 'text-zinc-300 hover:text-zinc-100 hover:bg-[#1a1a1e]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                      <FileCode className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      <span className="text-xs font-mono truncate text-zinc-200">{k.key}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {renderTypeBadge(k.type)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteKey(k.key);
                        }}
                        title={`Delete key "${k.key}"`}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-all cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================
            RIGHT PANE: KEY INSPECTOR & ADAPTIVE EDITOR
           ========================================= */}
        <div className="flex-1 flex flex-col h-full bg-[#121215] overflow-hidden">
          {!selectedKeyName ? (
            /* Splash / Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 shadow-xl">
                <Layers className="w-8 h-8 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100">Redis Cache Explorer</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1.5 leading-relaxed">
                Select a key from the tree to inspect its TTL, memory usage, and live data
                structures (STRING, HASH, LIST, SET, ZSET).
              </p>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setNewKeyForm({ key: '', type: 'string', stringValue: '', ttl: -1 });
                    setIsNewKeyModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Key</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsServerInfoOpen(true)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-4 h-4 text-zinc-400" />
                  <span>Server Telemetry</span>
                </button>
              </div>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              <span className="text-xs font-medium">Fetching key data...</span>
            </div>
          ) : !selectedKeyDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-6">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
              <span className="text-sm font-semibold text-zinc-200">Key Not Found</span>
              <p className="text-xs text-zinc-500 mt-1">
                The key "{selectedKeyName}" may have expired or been deleted.
              </p>
            </div>
          ) : (
            /* Active Key Inspector */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Key Header & Metadata Bar */}
              <div className="p-4 border-b border-[#242429] bg-[#16161a] flex-shrink-0 space-y-3">
                {/* Top Row: Full Key Name & Primary Actions */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {renderTypeBadge(selectedKeyDetail.type)}
                    <span className="text-sm font-mono font-bold text-zinc-100 truncate select-all">
                      {selectedKeyDetail.key}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedKeyDetail.key);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      title="Copy Key Name"
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer flex-shrink-0"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectKey(selectedKeyDetail.key)}
                      title="Reload Key Data"
                      className="p-1.5 rounded-lg bg-[#1e1e24] hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteKey(selectedKeyDetail.key)}
                      title="Delete Key"
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 text-xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveKey}
                      className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: TTL & Memory Telemetry */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  {/* TTL Pill */}
                  <div className="flex items-center gap-1.5 bg-[#1b1b20] border border-zinc-800 rounded-lg px-2.5 py-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-zinc-400">TTL:</span>
                    <span
                      className={`font-bold ${
                        selectedKeyDetail.ttl === -1
                          ? 'text-emerald-400'
                          : selectedKeyDetail.ttl > 0
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {selectedKeyDetail.ttl === -1
                        ? 'Persistent (No Expiry)'
                        : selectedKeyDetail.ttl > 0
                        ? `${selectedKeyDetail.ttl}s`
                        : 'Expired'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingTTL(!isEditingTTL)}
                      className="ml-1 text-[10px] text-brand-400 hover:underline cursor-pointer"
                    >
                      {isEditingTTL ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {/* Memory Usage */}
                  <div className="flex items-center gap-1.5 bg-[#1b1b20] border border-zinc-800 rounded-lg px-2.5 py-1">
                    <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-zinc-400">Memory:</span>
                    <span className="text-zinc-200 font-semibold">
                      {selectedKeyDetail.memoryUsage > 0
                        ? `${selectedKeyDetail.memoryUsage} bytes`
                        : '< 1 KB'}
                    </span>
                  </div>
                </div>

                {/* Inline TTL Quick Editor */}
                {isEditingTTL && (
                  <div className="p-3 bg-[#1b1b20] border border-zinc-700/80 rounded-xl space-y-2 animate-in fade-in duration-100">
                    <div className="text-[11px] font-semibold text-zinc-300">
                      Quick Set Key Expiration (TTL):
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleUpdateTTL(-1)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs font-mono font-medium cursor-pointer"
                      >
                        Persist (-1)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTTL(60)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono cursor-pointer"
                      >
                        1 min (60s)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTTL(300)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono cursor-pointer"
                      >
                        5 min (300s)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTTL(3600)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono cursor-pointer"
                      >
                        1 hour (3600s)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTTL(86400)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono cursor-pointer"
                      >
                        1 day (86400s)
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        value={customTTLInput}
                        onChange={(e) => setCustomTTLInput(e.target.value)}
                        placeholder="Custom seconds..."
                        className="w-40 px-2 py-1 bg-[#121215] border border-zinc-700 rounded text-xs font-mono text-zinc-100 outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(customTTLInput);
                          if (!isNaN(val)) handleUpdateTTL(val);
                        }}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-medium cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================
                  ADAPTIVE VALUE EDITORS (STRING, HASH, LIST, SET, ZSET)
                 ========================================================= */}
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {/* 1. STRING TYPE EDITOR (Monaco Editor) */}
                {selectedKeyDetail.type === 'string' && (
                  <div className="flex-1 flex flex-col bg-[#16161a] border border-[#242429] rounded-xl overflow-hidden shadow-inner">
                    <div className="px-3 py-2 border-b border-[#242429] bg-[#1b1b20] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-300">String Value</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {draftString.length} characters
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePrettifyJSON}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <AlignLeft className="w-3 h-3 text-sky-400" />
                          <span>Format JSON</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleMinifyJSON}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Minimize2 className="w-3 h-3 text-sky-400" />
                          <span>Minify</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <Editor
                        theme="vs-dark"
                        language="json"
                        value={draftString}
                        onChange={(val) => setDraftString(val || '')}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          fontFamily: 'JetBrains Mono, Fira Code, monospace',
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 2. HASH TYPE EDITOR (Key-Value Grid) */}
                {selectedKeyDetail.type === 'hash' && (
                  <div className="flex-1 flex flex-col bg-[#16161a] border border-[#242429] rounded-xl overflow-hidden shadow-inner">
                    <div className="px-4 py-2.5 border-b border-[#242429] bg-[#1b1b20] flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">
                        Hash Fields ({draftHash.length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftHash([...draftHash, { field: `field_${draftHash.length + 1}`, value: '' }])
                        }
                        className="px-2.5 py-1 rounded bg-brand-600/20 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-brand-400 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Field</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-[#242429]">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-[#141418]">
                        <div className="col-span-4">Field Name</div>
                        <div className="col-span-7">Value</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>

                      {draftHash.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-[#1b1b20]">
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={item.field}
                              onChange={(e) => {
                                const next = [...draftHash];
                                next[idx].field = e.target.value;
                                setDraftHash(next);
                              }}
                              className="w-full px-2 py-1 bg-[#121215] border border-zinc-700/80 rounded text-xs font-mono text-emerald-400 outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="col-span-7">
                            <input
                              type="text"
                              value={item.value}
                              onChange={(e) => {
                                const next = [...draftHash];
                                next[idx].value = e.target.value;
                                setDraftHash(next);
                              }}
                              className="w-full px-2 py-1 bg-[#121215] border border-zinc-700/80 rounded text-xs font-mono text-zinc-100 outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => setDraftHash(draftHash.filter((_, i) => i !== idx))}
                              className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LIST TYPE EDITOR (Ordered Items) */}
                {selectedKeyDetail.type === 'list' && (
                  <div className="flex-1 flex flex-col bg-[#16161a] border border-[#242429] rounded-xl overflow-hidden shadow-inner">
                    <div className="px-4 py-2.5 border-b border-[#242429] bg-[#1b1b20] flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">
                        List Elements ({draftList.length})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDraftList(['new_item', ...draftList])}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-medium cursor-pointer"
                        >
                          + LPush
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftList([...draftList, 'new_item'])}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-medium cursor-pointer"
                        >
                          + RPush
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-[#242429]">
                      {draftList.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2 hover:bg-[#1b1b20]">
                          <span className="text-xs font-mono text-zinc-500 w-8">[{idx}]</span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const next = [...draftList];
                              next[idx] = e.target.value;
                              setDraftList(next);
                            }}
                            className="flex-1 px-2.5 py-1 bg-[#121215] border border-zinc-700/80 rounded text-xs font-mono text-zinc-100 outline-none focus:border-brand-500"
                          />
                          <button
                            type="button"
                            onClick={() => setDraftList(draftList.filter((_, i) => i !== idx))}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. SET TYPE EDITOR (Members) */}
                {selectedKeyDetail.type === 'set' && (
                  <div className="flex-1 flex flex-col bg-[#16161a] border border-[#242429] rounded-xl overflow-hidden shadow-inner">
                    <div className="px-4 py-2.5 border-b border-[#242429] bg-[#1b1b20] flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">
                        Set Members ({draftSet.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraftSet([...draftSet, `member_${draftSet.length + 1}`])}
                        className="px-2.5 py-1 rounded bg-brand-600/20 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-brand-400 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Member</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-[#242429]">
                      {draftSet.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2 hover:bg-[#1b1b20]">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const next = [...draftSet];
                              next[idx] = e.target.value;
                              setDraftSet(next);
                            }}
                            className="flex-1 px-2.5 py-1 bg-[#121215] border border-zinc-700/80 rounded text-xs font-mono text-orange-300 outline-none focus:border-brand-500"
                          />
                          <button
                            type="button"
                            onClick={() => setDraftSet(draftSet.filter((_, i) => i !== idx))}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. ZSET TYPE EDITOR (Score & Member) */}
                {selectedKeyDetail.type === 'zset' && (
                  <div className="flex-1 flex flex-col bg-[#16161a] border border-[#242429] rounded-xl overflow-hidden shadow-inner">
                    <div className="px-4 py-2.5 border-b border-[#242429] bg-[#1b1b20] flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">
                        Sorted Set Members ({draftZSet.length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftZSet([
                            ...draftZSet,
                            { member: `member_${draftZSet.length + 1}`, score: draftZSet.length + 1 },
                          ])
                        }
                        className="px-2.5 py-1 rounded bg-brand-600/20 hover:bg-brand-600 hover:text-white border border-brand-500/30 text-brand-400 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Member</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-[#242429]">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-[#141418]">
                        <div className="col-span-3">Score</div>
                        <div className="col-span-8">Member</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>

                      {draftZSet.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-[#1b1b20]">
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={item.score}
                              onChange={(e) => {
                                const next = [...draftZSet];
                                next[idx].score = parseFloat(e.target.value) || 0;
                                setDraftZSet(next);
                              }}
                              className="w-full px-2 py-1 bg-[#121215] border border-zinc-700/80 rounded text-xs font-mono text-purple-400 outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="col-span-8">
                            <input
                              type="text"
                              value={item.member}
                              onChange={(e) => {
                                const next = [...draftZSet];
                                next[idx].member = e.target.value;
                                setDraftZSet(next);
                              }}
                              className="w-full px-2 py-1 bg-[#121215] border border-zinc-700/80 rounded text-xs font-mono text-zinc-100 outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => setDraftZSet(draftZSet.filter((_, i) => i !== idx))}
                              className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* =========================================================================
          RIGHT-CLICK CONTEXT MENU
         ========================================================================= */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-52 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl py-1 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
        >
          {contextMenu.node.isLeaf ? (
            <>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.node.fullPath);
                  showToast('Copied key name', 'info');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Key Name</span>
              </button>
              <div className="h-px bg-zinc-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  const keyToDelete = contextMenu.node.fullPath;
                  setContextMenu(null);
                  handleDeleteKey(keyToDelete);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Key</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.node.fullPath);
                  showToast('Copied namespace prefix', 'info');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Prefix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleFolder(contextMenu.node.fullPath);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
                <span>Toggle Folder</span>
              </button>
              <div className="h-px bg-zinc-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  const node = contextMenu.node;
                  setContextMenu(null);
                  handleTriggerNodeDelete(node);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  Delete Namespace ({getAllKeysInNode(contextMenu.node).length})
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          NAMESPACE BATCH DELETION MODAL
         ========================================================================= */}
      {namespaceDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans">
          <div className="bg-[#141416] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Delete Namespace "{namespaceDeleteModal.namespace}"?
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                This will permanently delete{' '}
                <strong className="text-rose-400 font-semibold">
                  {namespaceDeleteModal.keys.length} keys
                </strong>{' '}
                under this namespace in DB {activeDb}.
              </p>
            </div>

            {/* Keys Preview Box */}
            <div className="p-2.5 bg-[#101013] border border-zinc-800 rounded-xl max-h-36 overflow-y-auto text-left font-mono text-[11px] text-zinc-400 space-y-1">
              {namespaceDeleteModal.keys.slice(0, 10).map((k) => (
                <div key={k} className="truncate text-zinc-300">
                  • {k}
                </div>
              ))}
              {namespaceDeleteModal.keys.length > 10 && (
                <div className="text-zinc-500 italic">
                  ...and {namespaceDeleteModal.keys.length - 10} more keys
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNamespaceDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingNamespace}
                onClick={handleDeleteNamespace}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingNamespace && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Delete {namespaceDeleteModal.keys.length} Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW KEY CREATION MODAL
         ========================================================================= */}
      {isNewKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans">
          <div className="bg-[#141416] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18181b]/60">
              <h3 className="text-sm font-semibold text-zinc-100">Create New Redis Key</h3>
              <button
                type="button"
                onClick={() => setIsNewKeyModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKeySubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1.5">
                  Key Name (e.g. users:session:102)
                </label>
                <input
                  type="text"
                  required
                  value={newKeyForm.key}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, key: e.target.value })}
                  placeholder="namespace:key"
                  className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700 focus:border-brand-500 rounded-lg font-mono text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1.5">Data Type</label>
                <select
                  value={newKeyForm.type}
                  onChange={(e) =>
                    setNewKeyForm({ ...newKeyForm, type: e.target.value as RedisKeyType })
                  }
                  className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700 focus:border-brand-500 rounded-lg text-zinc-100 outline-none cursor-pointer"
                >
                  <option value="string">STRING (Text / JSON)</option>
                  <option value="hash">HASH (Key-Value Map)</option>
                  <option value="list">LIST (Ordered Array)</option>
                  <option value="set">SET (Unique Members)</option>
                  <option value="zset">ZSET (Sorted Set with Scores)</option>
                </select>
              </div>

              {newKeyForm.type === 'string' && (
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1.5">Initial Value</label>
                  <textarea
                    rows={3}
                    value={newKeyForm.stringValue}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, stringValue: e.target.value })}
                    placeholder="Enter string value or JSON..."
                    className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700 focus:border-brand-500 rounded-lg font-mono text-zinc-100 outline-none resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-300 mb-1.5">
                  Expiration / TTL in seconds (-1 for Persistent)
                </label>
                <input
                  type="number"
                  value={newKeyForm.ttl}
                  onChange={(e) =>
                    setNewKeyForm({ ...newKeyForm, ttl: parseInt(e.target.value) || -1 })
                  }
                  className="w-full px-3 py-2 bg-[#1a1a1d] border border-zinc-700 focus:border-brand-500 rounded-lg font-mono text-zinc-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewKeyModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 cursor-pointer"
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SERVER TELEMETRY INFO MODAL
         ========================================================================= */}
      {isServerInfoOpen && serverInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans">
          <div className="bg-[#141416] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18181b]/60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-brand-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Redis Server Telemetry & Info
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsServerInfoOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Telemetry Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#1b1b20] border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Version</div>
                  <div className="text-sm font-mono font-bold text-brand-400 mt-0.5">
                    v{serverInfo.redisVersion || 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#1b1b20] border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Used Memory</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    {serverInfo.usedMemoryHuman || '0B'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#1b1b20] border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    Connected Clients
                  </div>
                  <div className="text-sm font-mono font-bold text-sky-400 mt-0.5">
                    {serverInfo.connectedClients || '0'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#1b1b20] border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Uptime</div>
                  <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                    {serverInfo.uptimeInDays} days
                  </div>
                </div>
              </div>

              {/* Raw INFO Key-Values */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-300 mb-2 block">
                  Detailed Parameters:
                </span>
                <div className="p-3 bg-[#111114] border border-zinc-800 rounded-xl max-h-56 overflow-y-auto font-mono text-[11px] divide-y divide-zinc-800/60">
                  {Object.entries(serverInfo.rawInfo).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1 px-1">
                      <span className="text-zinc-400">{k}</span>
                      <span className="text-zinc-200 font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLUSH CONFIRMATION DIALOG
         ========================================================================= */}
      {isFlushConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4 font-sans">
          <div className="bg-[#141416] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Flush Database {activeDb}?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This will permanently delete all {keys.length} keys in DB {activeDb}. This action
                cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFlushConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFlushDB}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/20"
              >
                Yes, Flush All Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Connection Modal */}
      <NewRedisConnectionModal
        isOpen={isConnModalOpen}
        initialConfig={editingConn}
        onClose={() => setIsConnModalOpen(false)}
        onSaved={(newConn) => {
          const exists = connections.findIndex((c) => c.id === newConn.id);
          let nextList = [...connections];
          if (exists !== -1) {
            nextList[exists] = newConn;
          } else {
            nextList.push(newConn);
          }
          persistConnections(nextList);
          setActiveConnId(newConn.id);
          setActiveDb(newConn.db || 0);
          showToast(`Saved connection "${newConn.name}"`, 'success');
        }}
      />
    </div>
  );
};
