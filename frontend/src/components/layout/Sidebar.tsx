import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Server,
  Database,
  ChevronRight,
  ChevronDown,
  Trash2,
  MoreVertical,
  Layers,
  AlertCircle,
  Loader2,
  Plug,
  CheckCircle,
  HardDrive,
  Download,
  Upload,
  FileCode,
  Folder,
  FolderOpen,
  FolderPlus,
  Edit2,
  Files,
  Terminal
} from 'lucide-react';
import {
  ConnectionConfig,
  ActiveSession,
  SqlQueryItem,
  SqlQueryFolder,
  SqlTreeItem
} from '../../types/connection';
import { saveSqlQueriesData, loadSqlQueriesData } from '../../services/api';

interface SidebarProps {
  connections: ConnectionConfig[];
  activeSession: ActiveSession | null;
  databasesMap: Record<string, string[]>;
  loadingMap: Record<string, boolean>;
  expandedServers: Record<string, boolean>;
  onToggleExpand: (server: ConnectionConfig) => void;
  onOpenNewModal: () => void;
  onRefreshConnections: () => void;
  onConnectToDatabase: (server: ConnectionConfig, databaseName: string) => void;
  onDeleteConnection: (id: string, name: string) => void;
  onExportDatabase?: (server: ConnectionConfig, databaseName: string, exportData: boolean) => void;
  onImportSQL?: (server: ConnectionConfig, databaseName: string) => void;
  onSelectQuery?: (query: SqlQueryItem) => void;
  activeQueryId?: string | null;
  queriesTree?: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
}

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

const createDefaultQuery = (name: string = 'Untitled.sql'): SqlQueryItem => ({
  id: 'query-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'query',
  name: name.endsWith('.sql') ? name : name + '.sql',
  content: `-- New SQL Query
SELECT NOW();`,
  createdAt: Date.now(),
});

const createDefaultFolder = (name: string = 'New Folder'): SqlQueryFolder => ({
  id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'folder',
  name,
  isOpen: true,
  items: [],
});

function countQueriesInTree(item: SqlTreeItem): number {
  if (item.type === 'query') return 1;
  return item.items.reduce((sum, child) => sum + countQueriesInTree(child), 0);
}

function findQueryById(tree: SqlTreeItem[], id: string): SqlTreeItem | null {
  for (const item of tree) {
    if (item.id === id) return item;
    if (item.type === 'folder') {
      const found = findQueryById(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

function isDescendantQuery(tree: SqlTreeItem[], parentId: string, targetId: string): boolean {
  for (const item of tree) {
    if (item.id === parentId) {
      if (item.type === 'query') return false;
      const search = (children: SqlTreeItem[]): boolean => {
        for (const child of children) {
          if (child.id === targetId) return true;
          if (child.type === 'folder' && search(child.items)) return true;
        }
        return false;
      };
      return search(item.items);
    }
    if (item.type === 'folder') {
      if (isDescendantQuery(item.items, parentId, targetId)) return true;
    }
  }
  return false;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeSession,
  databasesMap,
  loadingMap,
  expandedServers,
  onToggleExpand,
  onOpenNewModal,
  onRefreshConnections,
  onConnectToDatabase,
  onDeleteConnection,
  onExportDatabase,
  onImportSQL,
  onSelectQuery,
  activeQueryId,
  queriesTree: propQueriesTree,
  onSaveQueriesTree,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Collapsible Section Toggles
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isQueriesOpen, setIsQueriesOpen] = useState(true);

  // Queries Tree State (Controlled with Fallback)
  const [internalQueriesTree, setInternalQueriesTree] = useState<(SqlQueryFolder | SqlQueryItem)[]>(() => {
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

  const queriesTree = propQueriesTree !== undefined ? propQueriesTree : internalQueriesTree;

  // Queries In-place Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Queries 3-dot context menu
  const [queryMenuOpenId, setQueryMenuOpenId] = useState<string | null>(null);
  const queryMenuRef = useRef<HTMLDivElement>(null);

  // Drag and Drop for Queries
  const [draggedQueryId, setDraggedQueryId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    id: string;
    position: 'inside' | 'before' | 'after';
  } | null>(null);

  // Resizable sidebar width state (persisted in localStorage)
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('octa_sidebar_width');
    const num = saved ? Number(saved) : 260;
    return isNaN(num) ? 260 : Math.min(450, Math.max(200, num));
  });

  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Load queries from Go backend on mount if not controlled from props
  useEffect(() => {
    if (propQueriesTree !== undefined) return;
    let isMounted = true;
    (async () => {
      try {
        const diskData = await loadSqlQueriesData();
        if (diskData && diskData.trim() && isMounted) {
          const parsed = JSON.parse(diskData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInternalQueriesTree(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load SQL queries data from backend disk:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [propQueriesTree]);

  // Save queries tree helper
  const saveQueries = useCallback((nextTree: (SqlQueryFolder | SqlQueryItem)[]) => {
    if (onSaveQueriesTree) {
      onSaveQueriesTree(nextTree);
    } else {
      setInternalQueriesTree(nextTree);
      try {
        const jsonStr = JSON.stringify(nextTree);
        localStorage.setItem('octa_sql_queries_tree', jsonStr);
        saveSqlQueriesData(jsonStr).catch((err) => {
          console.warn('Backend saveSqlQueriesData failed:', err);
        });
      } catch (e) {
        console.warn('Failed to persist SQL queries tree:', e);
      }
    }
  }, [onSaveQueriesTree]);

  // Auto-focus and select all text on edit
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (queryMenuRef.current && !queryMenuRef.current.contains(e.target as Node)) {
        setQueryMenuOpenId(null);
      }
      if (activeMenuId) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { startX: e.clientX, startWidth: width };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaX = moveEvent.clientX - resizingRef.current.startX;
      const nextWidth = Math.min(450, Math.max(200, resizingRef.current.startWidth + deltaX));
      setWidth(nextWidth);
      localStorage.setItem('octa_sidebar_width', String(nextWidth));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Commit name change for query/folder
  const commitQueryRename = () => {
    if (!editingId) return;
    let finalName = editingName.trim();
    if (!finalName) {
      setEditingId(null);
      return;
    }

    const renameInTree = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      return items.map((item) => {
        if (item.id === editingId) {
          if (item.type === 'query' && !finalName.endsWith('.sql')) {
            finalName += '.sql';
          }
          return { ...item, name: finalName };
        }
        if (item.type === 'folder') {
          return {
            ...item,
            items: renameInTree(item.items),
          };
        }
        return item;
      });
    };

    saveQueries(renameInTree(queriesTree));
    setEditingId(null);
  };

  // Add Query
  const handleAddQuery = (parentId?: string | null) => {
    const newQ = createDefaultQuery('Untitled.sql');
    if (!parentId || queriesTree.length === 0) {
      saveQueries([...queriesTree, newQ]);
    } else {
      const insertRecursively = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
        return items.map((item) => {
          if (item.id === parentId && item.type === 'folder') {
            return {
              ...item,
              isOpen: true,
              items: [newQ, ...item.items],
            };
          }
          if (item.type === 'folder') {
            return {
              ...item,
              items: insertRecursively(item.items),
            };
          }
          return item;
        });
      };
      saveQueries(insertRecursively(queriesTree));
    }

    setEditingId(newQ.id);
    setEditingName(newQ.name);
    setQueryMenuOpenId(null);
    if (onSelectQuery) {
      onSelectQuery(newQ);
    }
  };

  // Add Folder
  const handleAddFolder = (parentId?: string | null) => {
    const newFolder = createDefaultFolder('New Folder');
    if (!parentId || queriesTree.length === 0) {
      saveQueries([...queriesTree, newFolder]);
    } else {
      const insertRecursively = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
        return items.map((item) => {
          if (item.id === parentId && item.type === 'folder') {
            return {
              ...item,
              isOpen: true,
              items: [...item.items, newFolder],
            };
          }
          if (item.type === 'folder') {
            return {
              ...item,
              items: insertRecursively(item.items),
            };
          }
          return item;
        });
      };
      saveQueries(insertRecursively(queriesTree));
    }

    setEditingId(newFolder.id);
    setEditingName(newFolder.name);
    setQueryMenuOpenId(null);
  };

  // Duplicate Query
  const handleDuplicateQuery = (queryId: string) => {
    const item = findQueryById(queriesTree, queryId) as SqlQueryItem;
    if (!item || item.type !== 'query') return;

    const baseName = item.name.replace(/.sql$/, '');
    const duplicated: SqlQueryItem = {
      ...item,
      id: 'query-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: baseName + ' (Copy).sql',
      createdAt: Date.now(),
    };

    const duplicateInTree = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      const next: (SqlQueryFolder | SqlQueryItem)[] = [];
      for (const it of items) {
        next.push(it);
        if (it.id === queryId) {
          next.push(duplicated);
        } else if (it.type === 'folder') {
          it.items = duplicateInTree(it.items);
        }
      }
      return next;
    };

    saveQueries(duplicateInTree(queriesTree));
    setQueryMenuOpenId(null);
    if (onSelectQuery) {
      onSelectQuery(duplicated);
    }
  };

  // Delete Query or Folder
  const handleDeleteQueryItem = (id: string) => {
    const deleteRecursively = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      return items
        .filter((it) => it.id !== id)
        .map((it) => {
          if (it.type === 'folder') {
            return {
              ...it,
              items: deleteRecursively(it.items),
            };
          }
          return it;
        });
    };

    saveQueries(deleteRecursively(queriesTree));
    setQueryMenuOpenId(null);
  };

  // Toggle Folder open/close
  const toggleQueryFolder = (folderId: string) => {
    const toggleInTree = (items: (SqlQueryFolder | SqlQueryItem)[]): (SqlQueryFolder | SqlQueryItem)[] => {
      return items.map((it) => {
        if (it.id === folderId && it.type === 'folder') {
          return { ...it, isOpen: !it.isOpen };
        }
        if (it.type === 'folder') {
          return { ...it, items: toggleInTree(it.items) };
        }
        return it;
      });
    };
    saveQueries(toggleInTree(queriesTree));
  };

  // Filter connections by search query
  const filteredConnections = connections.filter((conn) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchesServer =
      conn.name.toLowerCase().includes(q) ||
      conn.host.toLowerCase().includes(q) ||
      conn.database.toLowerCase().includes(q);
    const dbs = databasesMap[conn.id || ''] || [];
    const matchesDb = dbs.some((db) => db.toLowerCase().includes(q));
    return matchesServer || matchesDb;
  });

  // Filter queries by search query
  const matchesQuerySearch = (item: SqlTreeItem): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (item.name.toLowerCase().includes(q)) return true;
    if (item.type === 'query' && item.content.toLowerCase().includes(q)) return true;
    if (item.type === 'folder') {
      return item.items.some((child) => matchesQuerySearch(child));
    }
    return false;
  };

  // Total query count
  const totalQueriesCount = queriesTree.reduce((sum, it) => sum + countQueriesInTree(it), 0);

  // Render recursive Query Tree item
  const renderQueryTreeItem = (item: SqlTreeItem, depth: number = 0) => {
    if (!matchesQuerySearch(item)) return null;

    const isFolder = item.type === 'folder';
    const isSelected = !isFolder && activeQueryId === item.id;
    const isEditing = editingId === item.id;
    const isMenuOpen = queryMenuOpenId === item.id;

    return (
      <div key={item.id} className="relative select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleQueryFolder(item.id);
            } else if (onSelectQuery) {
              onSelectQuery(item as SqlQueryItem);
            }
          }}
          style={{ paddingLeft: depth * 14 + 8 }}
          className={
            'w-full pr-2 py-1.5 rounded-lg flex items-center gap-1.5 text-left transition-all cursor-pointer group/qrow ' +
            (isSelected
              ? 'bg-amber-50 dark:bg-zinc-800 text-amber-900 dark:text-white font-medium shadow-sm border-l-2 border-amber-500 dark:border-amber-400'
              : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]')
          }
        >
          {/* Chevron for Folders */}
          {isFolder ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleQueryFolder(item.id);
              }}
              className="p-0.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 rounded cursor-pointer"
            >
              {item.isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              )}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          {/* Type Icon */}
          {isFolder ? (
            item.isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400/90 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400/70 flex-shrink-0" />
            )
          ) : (
            <FileCode className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          )}

          {/* Name or In-Place Input */}
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitQueryRename();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center gap-1 min-w-0"
            >
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitQueryRename}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full px-1.5 py-0.5 text-xs font-medium bg-white dark:bg-[#222222] border border-amber-500 rounded text-slate-900 dark:text-white outline-none font-mono"
              />
            </form>
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(item.id);
                setEditingName(item.name);
              }}
              className={
                'text-xs truncate flex-1 font-mono text-[11px] ' +
                (isFolder
                  ? 'font-medium text-slate-800 dark:text-zinc-300'
                  : 'text-slate-700 dark:text-zinc-300 group-hover/qrow:text-slate-900 dark:group-hover/qrow:text-zinc-100')
              }
            >
              {item.name}
            </span>
          )}

          {/* Folder Query Count */}
          {isFolder && !isEditing && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-mono pr-1">
              {countQueriesInTree(item)}
            </span>
          )}

          {/* 3-Dot Action Menu Button */}
          {!isEditing && (
            <div className="relative">              {/* 3-Dot Action Menu Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQueryMenuOpenId(isMenuOpen ? null : item.id);
                }}
                title="Options"
                className="opacity-0 group-hover/qrow:opacity-100 p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* 3-Dot Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={queryMenuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2b2b2b] rounded-lg shadow-2xl py-1 z-50 text-xs text-slate-700 dark:text-zinc-300 backdrop-blur-md"
                >
                  {isFolder ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAddQuery(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>Add Query</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddFolder(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>Add Folder</span>
                      </button>
                      <div className="h-px bg-slate-200 dark:bg-[#262626] my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                          setQueryMenuOpenId(null);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                        <span>Rename</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQueryItem(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuery(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Files className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                          setQueryMenuOpenId(null);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                        <span>Rename</span>
                      </button>
                      <div className="h-px bg-slate-200 dark:bg-[#262626] my-1" />
                      <button
                        type="button"
                        onClick={() => handleDeleteQueryItem(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Children for Open Folders */}
        {isFolder && item.isOpen && item.items.length > 0 && (
          <div className="space-y-0.5">
            {item.items.map((child) => renderQueryTreeItem(child, depth + 1))}
          </div>
        )}

        {isFolder && item.isOpen && item.items.length === 0 && (
          <div
            style={{ paddingLeft: (depth + 1) * 14 + 12 }}
            className="py-1 text-[11px] text-slate-400 dark:text-zinc-600 italic select-none"
          >
            Empty folder
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ width, minWidth: width, maxWidth: width }}
      className="bg-white dark:bg-[#0d0e14] border-r border-slate-200 dark:border-zinc-800 flex flex-col h-full select-none flex-shrink-0 relative group/sidebar font-sans transition-colors"
    >
      {/* Search Filter Input */}
      <div className="p-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter servers & queries..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-md text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono text-[11px]"
          />
        </div>
      </div>

      {/* Main Scrollable Sections Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 dark:divide-zinc-800/60">
        {/* =========================================
            SECTION 1: EXPLORER (Connections & DBs)
           ========================================= */}
        <div className="p-2">
          {/* Explorer Section Header */}
          <div
            onClick={() => setIsExplorerOpen(!isExplorerOpen)}
            className="px-2 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer transition-colors select-none group/expheader mb-1"
          >
            <div className="flex items-center gap-1.5">
              <ChevronRight
                className={'w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ' + (isExplorerOpen ? 'rotate-90' : '')}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Explorer
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 font-mono">
                {connections.length}
              </span>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onRefreshConnections}
                title="Refresh Connections"
                className="p-1 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onOpenNewModal}
                title="Add New Connection"
                className="p-1 rounded-md bg-brand-500/10 dark:bg-brand-600/20 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white border border-brand-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Explorer Body */}
          {isExplorerOpen && (
            <div className="space-y-1">
              {/* Empty State: No Saved Connections */}
              {connections.length === 0 && (
                <div className="p-4 text-center my-2 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-400 mb-2">
                    <HardDrive className="w-5 h-5 text-slate-400 dark:text-zinc-400" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">No connections</div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed mb-3">
                    Add your PostgreSQL server to start exploring.
                  </p>
                  <button
                    onClick={onOpenNewModal}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Connection</span>
                  </button>
                </div>
              )}

              {/* Server Tree Items */}
              {filteredConnections.map((conn) => {
                const connId = conn.id || '';
                const isExpanded = Boolean(expandedServers[connId]);
                const isLoadingDbs = Boolean(loadingMap[connId]);
                const databases = databasesMap[connId] || [];
                const isServerConnected =
                  activeSession?.connection.id === conn.id ||
                  (activeSession?.connection.host === conn.host &&
                    activeSession?.connection.port === conn.port);

                return (
                  <div key={connId || conn.name} className="rounded-lg overflow-hidden group/server">
                    {/* Server Row */}
                    <div
                      onClick={() => onToggleExpand(conn)}
                      className={
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ' +
                        (isServerConnected
                          ? 'bg-brand-50 dark:bg-zinc-800 text-brand-700 dark:text-brand-300 font-medium'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-gray-100')
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight
                          className={'w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ' + (isExpanded ? 'rotate-90' : '')}
                        />
                        <Server
                          className={
                            'w-3.5 h-3.5 flex-shrink-0 ' +
                            (isServerConnected ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-zinc-400')
                          }
                        />
                        <span className="truncate font-medium">{conn.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isServerConnected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConnection(conn.id || '', conn.name);
                          }}
                          title="Delete Connection"
                          className="opacity-0 group-hover/server:opacity-100 p-1 text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200/80 dark:hover:bg-zinc-700 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Databases List */}
                    {isExpanded && (
                      <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-slate-200 dark:border-zinc-800 ml-4 my-0.5">
                        {isLoadingDbs && (
                          <div className="flex items-center gap-2 py-1.5 px-2 text-xs text-slate-400 dark:text-zinc-400">
                            <Loader2 className="w-3 h-3 animate-spin text-brand-500 dark:text-brand-400" />
                            <span>Loading databases...</span>
                          </div>
                        )}

                        {!isLoadingDbs && databases.length === 0 && (
                          <div className="py-1 px-2 text-[11px] text-slate-400 dark:text-zinc-500 italic">
                            No databases found
                          </div>
                        )}

                        {!isLoadingDbs &&
                          databases.map((dbName) => {
                            const isCurrentDb =
                              isServerConnected && activeSession?.activeDatabase === dbName;

                            return (
                              <button
                                key={dbName}
                                onClick={() => onConnectToDatabase(conn, dbName)}
                                className={
                                  'w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors text-left cursor-pointer ' +
                                  (isCurrentDb
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-500/30'
                                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-gray-200')
                                }
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Database
                                    className={
                                      'w-3 h-3 flex-shrink-0 ' +
                                      (isCurrentDb ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500')
                                    }
                                  />
                                  <span className="truncate font-mono text-[11px]">{dbName}</span>
                                </div>
                                {isCurrentDb && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                                    active
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================
            SECTION 2: QUERIES (Saved SQL Queries & Folders)
           ========================================= */}
        <div className="p-2">
          {/* Queries Section Header */}
          <div
            onClick={() => setIsQueriesOpen(!isQueriesOpen)}
            className="px-2 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-lg cursor-pointer transition-colors select-none group/qheader mb-1"
          >
            <div className="flex items-center gap-1.5">
              <ChevronRight
                className={'w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ' + (isQueriesOpen ? 'rotate-90' : '')}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/90">
                Queries
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 font-mono">
                {totalQueriesCount}
              </span>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleAddFolder(null)}
                title="New Folder"
                className="p-1 rounded-md text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAddQuery(null)}
                title="New SQL Query"
                className="p-1 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Queries Tree Body */}
          {isQueriesOpen && (
            <div className="space-y-0.5">
              {queriesTree.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                  No saved queries. Click + to create one.
                </div>
              ) : (
                queriesTree.map((item) => renderQueryTreeItem(item, 0))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vertical Drag-to-Resize Splitter Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none flex items-center justify-center group/resizer z-20 hover:bg-brand-500/10 active:bg-brand-500/20"
      >
        <div className="w-[2px] h-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
      </div>
    </div>
  );
};
