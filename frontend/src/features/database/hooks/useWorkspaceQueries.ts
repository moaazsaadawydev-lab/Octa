import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionConfig, ActiveSession, QueryTab, SqlQueryItem, SqlQueryFolder } from '../types';
import { ActiveModule } from '../../../components/layout/ActivityBar';
import { loadSqlQueriesData, saveSqlQueriesData } from '../../../services/api';
import { findQueryById } from '../utils/treeHelpers';

const DEFAULT_PLAYGROUND_QUERY = `-- Octa SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'Octa' AS application,
  'Database Management & SQL Workspace' AS milestone,
  NOW() AS executed_at;
`;

const STORAGE_KEY_TREE = 'octa_sql_queries_tree';
const STORAGE_KEY_TABS = 'octa_playground_tabs_v2';
const STORAGE_KEY_ACTIVE_TAB = 'octa_playground_active_tab_v2';

interface UseWorkspaceQueriesOptions {
  connections: ConnectionConfig[];
  activeSession: ActiveSession | null;
  databasesMap: Record<string, string[]>;
  handleConnectToDatabase: (server: ConnectionConfig, databaseName: string) => void;
  setActiveModule: (mod: ActiveModule) => void;
  setDbSubView: (view: 'tables' | 'playground' | 'erd') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function loadInitialTabs(): { tabs: QueryTab[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned: QueryTab[] = parsed.map((t: any) => ({
          id: t.id || 'tab-' + Date.now(),
          title: t.title || 'Query 1.sql',
          query: typeof t.query === 'string' ? t.query : DEFAULT_PLAYGROUND_QUERY,
          savedQueryId: t.savedQueryId,
          activeDatabaseName: t.activeDatabaseName,
          activeConnectionName: t.activeConnectionName,
          isDirty: false,
          results: null,
          activeResultIndex: 0,
          isExecuting: false,
        }));
        const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
        const activeId = cleaned.some((t) => t.id === savedActiveId) ? savedActiveId : cleaned[0].id;
        return { tabs: cleaned, activeId };
      }
    }
  } catch {}
  return {
    tabs: [{ id: 'tab-1', title: 'Query 1.sql', query: DEFAULT_PLAYGROUND_QUERY, isDirty: false, results: null }],
    activeId: 'tab-1',
  };
}

export function useWorkspaceQueries({
  connections,
  activeSession,
  databasesMap,
  handleConnectToDatabase,
  setActiveModule,
  setDbSubView,
  showToast,
}: UseWorkspaceQueriesOptions) {
  const initial = useRef(loadInitialTabs()).current;
  const [queriesTree, setQueriesTree] = useState<(SqlQueryFolder | SqlQueryItem)[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TREE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [queryTabs, setQueryTabs] = useState<QueryTab[]>(initial.tabs);
  const [activeQueryTabId, setActiveQueryTabId] = useState<string | null>(initial.activeId);

  useEffect(() => {
    loadSqlQueriesData().then((data) => {
      if (data?.trim()) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setQueriesTree(parsed);
          try { localStorage.setItem(STORAGE_KEY_TREE, JSON.stringify(parsed)); } catch {}
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const lean = queryTabs.map((t) => ({
          id: t.id, title: t.title, query: t.query, savedQueryId: t.savedQueryId,
          activeDatabaseName: t.activeDatabaseName, activeConnectionName: t.activeConnectionName,
        }));
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(lean));
        if (activeQueryTabId) localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeQueryTabId);
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [queryTabs, activeQueryTabId]);

  const handleSaveQueriesTree = useCallback((nextTree: (SqlQueryFolder | SqlQueryItem)[]) => {
    setQueriesTree(nextTree);
    try {
      const json = JSON.stringify(nextTree);
      localStorage.setItem(STORAGE_KEY_TREE, json);
      saveSqlQueriesData(json).catch((err) => console.warn('Failed saveSqlQueriesData:', err));
    } catch (e) {
      console.warn('Failed saving sql queries:', e);
    }
  }, []);

  const activateQueryDatabase = useCallback(
    (targetDb: string, targetConnId?: string) => {
      if (!targetDb?.trim() || activeSession?.activeDatabase === targetDb) return;
      let targetConn = targetConnId ? connections.find((c) => c.id === targetConnId) : activeSession?.connection;
      if (!targetConn && connections.length > 0) {
        targetConn = connections.find((c) => databasesMap[c.id || `${c.host}:${c.port}`]?.includes(targetDb)) || connections[0];
      }
      if (targetConn) {
        handleConnectToDatabase(targetConn, targetDb);
        showToast(`Activated database "${targetDb}"`, 'info');
      }
    },
    [activeSession, connections, databasesMap, handleConnectToDatabase, showToast]
  );

  const handleSelectTab = useCallback(
    (tabId: string | null) => {
      setActiveQueryTabId(tabId);
      if (!tabId) return;
      const targetTab = queryTabs.find((t) => t.id === tabId);
      if (!targetTab) return;
      let db = targetTab.activeDatabaseName;
      if (!db && targetTab.savedQueryId) {
        const item = findQueryById(queriesTree, targetTab.savedQueryId);
        if (item?.type === 'query' && item.database) db = item.database;
      }
      if (db) activateQueryDatabase(db);
    },
    [queryTabs, queriesTree, activateQueryDatabase]
  );

  const handleSelectQueryFromSidebar = useCallback(
    (query: SqlQueryItem) => {
      setActiveModule('databases');
      setDbSubView('playground');
      if (query.database) activateQueryDatabase(query.database, query.connectionId);

      let targetTabId = query.id;
      setQueryTabs((prev) => {
        const existing = prev.find((t) => t.id === query.id || t.savedQueryId === query.id);
        if (existing) {
          targetTabId = existing.id;
          return prev.map((t) => (t.id === existing.id ? {
            ...t, title: query.name, query: t.isDirty ? t.query : query.content,
            activeDatabaseName: query.database || t.activeDatabaseName,
          } : t));
        }

        const isFresh = prev.length === 1 && prev[0].title === 'Query 1.sql' && !prev[0].isDirty && !prev[0].savedQueryId && prev[0].results === null;
        targetTabId = query.id;
        const newTab: QueryTab = {
          id: query.id, savedQueryId: query.id, title: query.name, query: query.content, isDirty: false, results: null,
          activeResultIndex: 0, isExecuting: false, activeConnectionName: activeSession?.connection.name || 'Local Postgres',
          activeDatabaseName: query.database || activeSession?.activeDatabase || 'postgres',
        };
        return isFresh ? [newTab] : [...prev, newTab];
      });

      setActiveQueryTabId(targetTabId);
    },
    [activeSession, activateQueryDatabase, setActiveModule, setDbSubView]
  );

  return {
    queriesTree,
    setQueriesTree,
    queryTabs,
    setQueryTabs,
    activeQueryTabId,
    setActiveQueryTabId: handleSelectTab,
    handleSaveQueriesTree,
    handleSelectQueryFromSidebar,
    activateQueryDatabase,
  };
}
