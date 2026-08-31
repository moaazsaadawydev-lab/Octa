import React, { useState, useRef } from 'react';
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
  FileCode
} from 'lucide-react';
import { ConnectionConfig, ActiveSession } from '../types/connection';

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Resizable sidebar width state (persisted in localStorage)
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('octa_sidebar_width') || localStorage.getItem('devcockpit_sidebar_width');
    const num = saved ? Number(saved) : 260;
    return isNaN(num) ? 260 : Math.min(450, Math.max(200, num));
  });

  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

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

  // Filter connections by search query
  const filteredConnections = connections.filter((conn) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    // Search in server name, host, or databases list
    const matchesServer =
      conn.name.toLowerCase().includes(q) ||
      conn.host.toLowerCase().includes(q) ||
      conn.database.toLowerCase().includes(q);

    const dbs = databasesMap[conn.id || ''] || [];
    const matchesDb = dbs.some((db) => db.toLowerCase().includes(q));

    return matchesServer || matchesDb;
  });

  return (
    <div
      style={{ width, minWidth: width, maxWidth: width }}
      className="bg-surface-900 border-r border-border-subtle flex flex-col h-full select-none flex-shrink-0 relative group/sidebar"
    >
      {/* Sidebar Header */}
      <div className="px-3.5 py-3 border-b border-border-subtle flex items-center justify-between bg-surface-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Explorer
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-surface-800 text-gray-400 border border-border/50">
            {connections.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onRefreshConnections}
            title="Refresh Connections"
            className="p-1 rounded-md text-gray-400 hover:text-gray-200 hover:bg-surface-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenNewModal}
            title="Add New Connection"
            className="p-1 rounded-md bg-brand-600/20 text-brand-400 hover:bg-brand-600 hover:text-white border border-brand-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="p-2 border-b border-border-subtle bg-surface-850/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter servers & databases..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-surface-800 border border-border/60 rounded-md text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Empty State: No Saved Connections */}
        {connections.length === 0 && (
          <div className="p-4 text-center my-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-surface-800 border border-border flex items-center justify-center text-gray-400 mb-3">
              <HardDrive className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-xs font-semibold text-gray-200 mb-1">No connections yet</div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
              Add your PostgreSQL server to start exploring schemas and databases.
            </p>
            <button
              onClick={onOpenNewModal}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Connection</span>
            </button>
          </div>
        )}

        {/* Empty State: Search Has No Matches */}
        {connections.length > 0 && filteredConnections.length === 0 && (
          <div className="p-4 text-center text-xs text-gray-400">
            No servers matching "{searchQuery}"
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
                className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                  isServerConnected
                    ? 'bg-brand-500/10 text-brand-300 font-medium'
                    : 'text-gray-300 hover:bg-surface-800 hover:text-gray-100'
                }`}
                onClick={() => onToggleExpand(conn)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {/* Expand / Collapse Icon */}
                  <span className="text-gray-400 hover:text-gray-200 flex-shrink-0">
                    {isLoadingDbs ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                    ) : isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>

                  {/* Server Icon with status dot */}
                  <div className="relative flex-shrink-0">
                    <Server className={`w-3.5 h-3.5 ${isServerConnected ? 'text-brand-400' : 'text-gray-400'}`} />
                    {isServerConnected && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full ring-1 ring-surface-900" />
                    )}
                  </div>

                  {/* Server Name & Host */}
                  <div className="truncate flex-1">
                    <span className="truncate">{conn.name}</span>
                    <span className="text-[10px] text-gray-500 ml-1 font-mono">
                      {conn.host}:{conn.port}
                    </span>
                  </div>
                </div>

                {/* Server Quick Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/server:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectToDatabase(conn, conn.database || 'postgres');
                    }}
                    title="Connect to default database"
                    className="p-1 rounded text-gray-400 hover:text-brand-400 hover:bg-surface-750"
                  >
                    <Plug className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConnection(conn.id || '', conn.name);
                    }}
                    title="Delete connection"
                    className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-surface-750"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Databases Sub-Tree */}
              {isExpanded && (
                <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-3.5 my-0.5">
                  {isLoadingDbs && (
                    <div className="flex items-center gap-2 py-1 text-[11px] text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
                      <span>Loading databases...</span>
                    </div>
                  )}

                  {!isLoadingDbs && databases.length === 0 && (
                    <div className="py-1 text-[11px] text-gray-500 italic">
                      No databases found
                    </div>
                  )}

                  {!isLoadingDbs &&
                    databases.map((dbName) => {
                      const isActiveDb =
                        isServerConnected && activeSession?.activeDatabase === dbName;

                      return (
                        <div
                          key={dbName}
                          onClick={() => onConnectToDatabase(conn, dbName)}
                          className={`group/db flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs transition-colors ${
                            isActiveDb
                              ? 'bg-brand-600 text-white font-medium shadow-sm'
                              : 'text-gray-400 hover:bg-surface-800 hover:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 truncate flex-1">
                            <Database
                              className={`w-3 h-3 flex-shrink-0 ${
                                isActiveDb ? 'text-white' : 'text-gray-400'
                              }`}
                            />
                            <span className="truncate">{dbName}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isActiveDb && (
                              <span className="text-[9px] bg-brand-700/80 text-white px-1 rounded uppercase font-semibold tracking-wider">
                                Active
                              </span>
                            )}

                            {/* Database Export & Import Actions */}
                            <div className="hidden group-hover/db:flex items-center gap-0.5 ml-1">
                              {onImportSQL && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onImportSQL(conn, dbName);
                                  }}
                                  title={`Import SQL into ${dbName}`}
                                  className={`p-0.5 rounded transition-colors ${
                                    isActiveDb
                                      ? 'text-white/80 hover:text-white hover:bg-brand-700'
                                      : 'text-gray-400 hover:text-cyan-400 hover:bg-surface-700'
                                  }`}
                                >
                                  <Upload className="w-3 h-3" />
                                </button>
                              )}

                              {onExportDatabase && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExportDatabase(conn, dbName, true);
                                  }}
                                  title={`Export ${dbName} Dump (Structure + Data)`}
                                  className={`p-0.5 rounded transition-colors ${
                                    isActiveDb
                                      ? 'text-white/80 hover:text-white hover:bg-brand-700'
                                      : 'text-gray-400 hover:text-emerald-400 hover:bg-surface-700'
                                  }`}
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer Status */}
      <div className="p-2.5 border-t border-border-subtle bg-surface-950 text-[11px] text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <div
            className={`w-2 h-2 rounded-full ${
              activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'
            }`}
          />
          <span className="truncate">
            {activeSession
              ? `${activeSession.connection.name} (${activeSession.activeDatabase})`
              : 'Disconnected'}
          </span>
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
