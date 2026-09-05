import React from 'react';
import { ChevronRight, Server, Trash2, Database, Loader2, HardDrive, Plus } from 'lucide-react';
import { ConnectionConfig, ActiveSession } from '../types';

export interface ConnectionServerListProps {
  connections: ConnectionConfig[];
  activeSession: ActiveSession | null;
  databasesMap: Record<string, string[]>;
  loadingMap: Record<string, boolean>;
  expandedServers: Record<string, boolean>;
  onToggleExpand: (server: ConnectionConfig) => void;
  onConnectToDatabase: (server: ConnectionConfig, databaseName: string) => void;
  onDeleteConnection: (id: string, name: string) => void;
  onOpenNewModal: () => void;
  searchQuery: string;
}

export const ConnectionServerList: React.FC<ConnectionServerListProps> = ({
  connections,
  activeSession,
  databasesMap,
  loadingMap,
  expandedServers,
  onToggleExpand,
  onConnectToDatabase,
  onDeleteConnection,
  onOpenNewModal,
  searchQuery,
}) => {
  const filteredConnections = connections.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesServer = c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q);
    const dbs = databasesMap[c.id || ''] || [];
    const matchesDb = dbs.some((db) => db.toLowerCase().includes(q));
    return matchesServer || matchesDb;
  });

  if (connections.length === 0) {
    return (
      <div className="p-4 text-center my-2 flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-400 mb-2">
          <HardDrive className="w-5 h-5 text-slate-400 dark:text-zinc-400" />
        </div>
        <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">No connections</div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed mb-3">
          Add your database server to start exploring.
        </p>
        <button
          onClick={onOpenNewModal}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
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
  );
};
