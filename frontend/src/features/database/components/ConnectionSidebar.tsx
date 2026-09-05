import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { ConnectionConfig, ActiveSession, SqlQueryItem, SqlQueryFolder } from '../types';
import { ConnectionServerList } from './ConnectionServerList';
import { SavedQueriesTree } from './SavedQueriesTree';
import { useSavedQueries } from '../hooks/useSavedQueries';

export interface ConnectionSidebarProps {
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
  onSelectQuery?: (query: SqlQueryItem) => void;
  activeQueryId?: string | null;
  queriesTree?: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
}

export const ConnectionSidebar: React.FC<ConnectionSidebarProps> = (props) => {
  const {
    connections,
    activeSession,
    databasesMap,
    loadingMap,
    expandedServers,
    onToggleExpand,
    onOpenNewModal,
    onConnectToDatabase,
    onDeleteConnection,
    onSelectQuery,
    activeQueryId,
    queriesTree: propQueriesTree,
    onSaveQueriesTree,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');

  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('octa_sidebar_width');
    const num = saved ? Number(saved) : 260;
    return isNaN(num) ? 260 : Math.min(450, Math.max(200, num));
  });

  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const queryTreeState = useSavedQueries({
    propQueriesTree,
    onSaveQueriesTree,
  });

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

  return (
    <div
      style={{ width, minWidth: width, maxWidth: width }}
      className="bg-white dark:bg-[#0d0e14] border-r border-slate-200 dark:border-zinc-800 flex flex-col h-full select-none flex-shrink-0 relative group/sidebar font-sans transition-colors"
    >
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

      <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 dark:divide-zinc-800/60">
        <div className="p-2">
          <ConnectionServerList
            connections={connections}
            activeSession={activeSession}
            databasesMap={databasesMap}
            loadingMap={loadingMap}
            expandedServers={expandedServers}
            onToggleExpand={onToggleExpand}
            onConnectToDatabase={onConnectToDatabase}
            onDeleteConnection={onDeleteConnection}
            onOpenNewModal={onOpenNewModal}
            searchQuery={searchQuery}
          />
        </div>

        <SavedQueriesTree
          queriesTree={queryTreeState.queriesTree}
          activeQueryId={activeQueryId}
          searchQuery={searchQuery}
          onSelectQuery={onSelectQuery}
          onToggleFolder={queryTreeState.handleToggleFolder}
          onDeleteItem={queryTreeState.handleDeleteItem}
          onAddFolder={queryTreeState.handleCreateFolder}
          onAddQuery={queryTreeState.handleCreateQuery}
          editingId={queryTreeState.editingId}
          editingName={queryTreeState.editingName}
          editInputRef={queryTreeState.editInputRef}
          setEditingId={queryTreeState.setEditingId}
          setEditingName={queryTreeState.setEditingName}
          commitQueryRename={queryTreeState.commitQueryRename}
        />
      </div>

      <div
        onMouseDown={handleResizeStart}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none flex items-center justify-center group/resizer z-20 hover:bg-brand-500/10 active:bg-brand-500/20"
      >
        <div className="w-[2px] h-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
      </div>
    </div>
  );
};
