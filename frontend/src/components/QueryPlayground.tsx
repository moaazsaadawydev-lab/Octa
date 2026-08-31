import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Download,
  Trash2,
  Plus,
  X,
  Database,
  Terminal,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  ArrowRight,
  History,
  Wand2,
  Edit2,
  Check,
  Zap,
  Activity,
  Save,
  Folder
} from 'lucide-react';
import { format } from 'sql-formatter';
import {
  ActiveSession,
  QueryResult,
  QueryTab,
  QueryHistoryEntry,
  ExplainPlanResult,
  SqlQueryItem,
  SqlQueryFolder,
  SqlTreeItem
} from '../types/connection';
import { executeRawQuery, explainQuery, getTables, getTableSchema } from '../services/api';
import { QueryEditor } from './QueryEditor';
import { QueryHistoryPanel } from './QueryHistoryPanel';
import { ExplainPlanViewer } from './ExplainPlanViewer';
import { HomeLanding } from './HomeLanding';
import interfaceSvg from '../assets/interface.svg';

interface QueryPlaygroundProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  tabs?: QueryTab[];
  activeTabId?: string | null;
  onTabsChange?: (tabs: QueryTab[]) => void;
  onActiveTabChange?: (tabId: string | null) => void;
  queriesTree?: (SqlQueryFolder | SqlQueryItem)[];
  onSaveQueriesTree?: (tree: (SqlQueryFolder | SqlQueryItem)[]) => void;
}

const DEFAULT_QUERY = `-- Octa SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'Octa' AS application,
  'Database Management & SQL Workspace' AS milestone,
  NOW() AS executed_at;
`;

// Helper: Extract all folder options for folder dropdown
function extractFolders(items: SqlTreeItem[], prefix: string = ''): { id: string; name: string }[] {
  let list: { id: string; name: string }[] = [];
  for (const item of items) {
    if (item.type === 'folder') {
      const label = prefix ? prefix + ' / ' + item.name : item.name;
      list.push({ id: item.id, name: label });
      if (item.items && item.items.length > 0) {
        list = list.concat(extractFolders(item.items, label));
      }
    }
  }
  return list;
}

// Helper: Find query by ID in tree
function findQueryInTree(items: SqlTreeItem[], id: string): SqlQueryItem | null {
  for (const item of items) {
    if (item.type === 'query' && item.id === id) {
      return item;
    }
    if (item.type === 'folder') {
      const found = findQueryInTree(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

export const QueryPlayground: React.FC<QueryPlaygroundProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
  tabs: propTabs,
  activeTabId: propActiveTabId,
  onTabsChange,
  onActiveTabChange,
  queriesTree = [],
  onSaveQueriesTree,
}) => {
  // Internal Tabs State if not controlled from props
  const [internalTabs, setInternalTabs] = useState<QueryTab[]>(() => {
    try {
      const saved = localStorage.getItem('octa_query_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t) => ({
            ...t,
            isDirty: false,
            results: null,
            isExecuting: false,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to parse query tabs from localStorage', e);
    }
    return [
      {
        id: 'tab-1',
        title: 'Query 1.sql',
        query: DEFAULT_QUERY,
        isDirty: false,
        results: null,
        activeResultIndex: 0,
        isExecuting: false,
      },
    ];
  });

  const [internalActiveTabId, setInternalActiveTabId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem('octa_active_query_tab_id');
    return savedActiveId && internalTabs.some((t) => t.id === savedActiveId)
      ? savedActiveId
      : internalTabs[0]?.id || null;
  });

  const tabs = propTabs !== undefined ? propTabs : internalTabs;
  const setTabs = (updater: QueryTab[] | ((prev: QueryTab[]) => QueryTab[])) => {
    if (onTabsChange) {
      const nextVal = typeof updater === 'function' ? updater(tabs) : updater;
      onTabsChange(nextVal);
    } else {
      setInternalTabs(updater);
    }
  };

  const activeTabId = propActiveTabId !== undefined ? propActiveTabId : internalActiveTabId;
  const setActiveTabId = (tabId: string | null) => {
    if (onActiveTabChange) {
      onActiveTabChange(tabId);
    } else {
      setInternalActiveTabId(tabId);
    }
  };

  // Save Query Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveModalFolderId, setSaveModalFolderId] = useState('');

  // Unsaved Changes Close Confirmation Modal State
  const [tabPendingClose, setTabPendingClose] = useState<QueryTab | null>(null);

  // Query History State (Loaded from localStorage)
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('octa_query_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 100);
        }
      }
    } catch (e) {
      console.warn('Failed to parse query history from localStorage', e);
    }
    return [];
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(() => {
    return localStorage.getItem('octa_history_panel_open') === 'true';
  });

  // Explain Query Dropdown State
  const [showExplainMenu, setShowExplainMenu] = useState(false);
  const explainDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close explain dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (explainDropdownRef.current && !explainDropdownRef.current.contains(e.target as Node)) {
        setShowExplainMenu(false);
      }
    };
    if (showExplainMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExplainMenu]);

  // Inline tab rename state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // Dynamic Schema for Intellisense
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    if (!activeSession) {
      setTables([]);
      setColumns([]);
      return;
    }
    let isMounted = true;
    getTables(activeSession.connection, activeSession.activeDatabase)
      .then(async (tbls) => {
        if (!isMounted) return;
        setTables(tbls || []);
        const colsSet = new Set<string>();
        for (const tbl of (tbls || []).slice(0, 10)) {
          try {
            const schema = await getTableSchema(
              activeSession.connection,
              activeSession.activeDatabase,
              tbl
            );
            schema.forEach((c) => colsSet.add(c.name));
          } catch {
            // ignore
          }
        }
        if (isMounted) {
          setColumns(Array.from(colsSet));
        }
      })
      .catch((err) => console.warn('Failed to load schema for autocomplete:', err));

    return () => {
      isMounted = false;
    };
  }, [activeSession?.connection.id, activeSession?.activeDatabase]);

  // Save query tabs to localStorage
  useEffect(() => {
    try {
      const serialized = tabs.map((t) => ({
        id: t.id,
        title: t.title,
        query: t.query,
        savedQueryId: t.savedQueryId,
      }));
      localStorage.setItem('octa_query_tabs', JSON.stringify(serialized));
    } catch (e) {
      console.warn('Failed to save query tabs to localStorage', e);
    }
  }, [tabs]);

  // Save activeTabId to localStorage
  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem('octa_active_query_tab_id', activeTabId);
    } else {
      localStorage.removeItem('octa_active_query_tab_id');
    }
  }, [activeTabId]);

  // Save query history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('octa_query_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save query history to localStorage', e);
    }
  }, [history]);

  // Toggle history drawer and save state
  const handleToggleHistory = () => {
    setIsHistoryOpen((prev) => {
      const next = !prev;
      localStorage.setItem('octa_history_panel_open', String(next));
      return next;
    });
  };

  // Resizable Results Panel Height
  const [resultsHeight, setResultsHeight] = useState<number>(() => {
    const saved = localStorage.getItem('octa_playground_results_height');
    const num = saved ? Number(saved) : 280;
    return isNaN(num) ? 280 : Math.min(600, Math.max(140, num));
  });

  const resizingRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { startY: e.clientY, startHeight: resultsHeight };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaY = resizingRef.current.startY - moveEvent.clientY;
      const nextHeight = Math.min(600, Math.max(140, resizingRef.current.startHeight + deltaY));
      setResultsHeight(nextHeight);
      localStorage.setItem('octa_playground_results_height', String(nextHeight));
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

  // Results pagination state
  const [resultPage, setResultPage] = useState<number>(1);
  const [resultLimit, setResultLimit] = useState<number>(50);

  const activeTab = tabs.find((t) => t.id === activeTabId) || (tabs.length > 0 ? tabs[0] : null);

  // Trigger Save Query Action
  const handleTriggerSave = useCallback(() => {
    if (!activeTab) return;

    // Check if query is already saved in tree
    const existingInTree = activeTab.savedQueryId
      ? findQueryInTree(queriesTree, activeTab.savedQueryId)
      : null;

    if (existingInTree && onSaveQueriesTree) {
      // Direct update in tree
      const updateRecursively = (items: SqlTreeItem[]): SqlTreeItem[] => {
        return items.map((it) => {
          if (it.id === existingInTree.id && it.type === 'query') {
            return {
              ...it,
              content: activeTab.query,
              updatedAt: Date.now(),
            };
          }
          if (it.type === 'folder') {
            return { ...it, items: updateRecursively(it.items) };
          }
          return it;
        });
      };

      onSaveQueriesTree(updateRecursively(queriesTree) as (SqlQueryFolder | SqlQueryItem)[]);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, isDirty: false } : t))
      );
      showToast('Query "' + activeTab.title + '" saved', 'success');
    } else {
      // Open Save Query Dialog
      setSaveModalName(activeTab.title || 'Untitled.sql');
      const folders = extractFolders(queriesTree);
      setSaveModalFolderId(folders[0]?.id || '');
      setIsSaveModalOpen(true);
    }
  }, [activeTab, queriesTree, onSaveQueriesTree, setTabs, showToast]);

  // Confirm Save Modal submission
  const handleConfirmSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !saveModalName.trim()) return;

    let finalName = saveModalName.trim();
    if (!finalName.endsWith('.sql')) {
      finalName += '.sql';
    }

    const newQueryId = activeTab.savedQueryId || 'query-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newQueryItem: SqlQueryItem = {
      id: newQueryId,
      type: 'query',
      name: finalName,
      content: activeTab.query,
      database: activeSession?.activeDatabase,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (onSaveQueriesTree) {
      if (!saveModalFolderId) {
        // Add to root of queries tree
        onSaveQueriesTree([...queriesTree, newQueryItem]);
      } else {
        // Insert into target folder
        const insertIntoFolder = (items: SqlTreeItem[]): SqlTreeItem[] => {
          return items.map((it) => {
            if (it.id === saveModalFolderId && it.type === 'folder') {
              return {
                ...it,
                isOpen: true,
                items: [newQueryItem, ...it.items],
              };
            }
            if (it.type === 'folder') {
              return { ...it, items: insertIntoFolder(it.items) };
            }
            return it;
          });
        };
        onSaveQueriesTree(insertIntoFolder(queriesTree) as (SqlQueryFolder | SqlQueryItem)[]);
      }
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? {
              ...t,
              id: newQueryId,
              title: finalName,
              savedQueryId: newQueryId,
              isDirty: false,
            }
          : t
      )
    );

    setActiveTabId(newQueryId);

    setIsSaveModalOpen(false);
    showToast('Saved query "' + finalName + '" to QUERIES explorer', 'success');
  };

  // Close Tab handler with Unsaved Check
  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // If tab has unsaved changes, prompt confirmation
    if (tab.isDirty && tab.query.trim()) {
      setTabPendingClose(tab);
      return;
    }

    performCloseTab(tabId);
  };

  const performCloseTab = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);

    if (nextTabs.length === 0) {
      setActiveTabId(null);
    } else if (activeTabId === tabId) {
      const nextActive = nextTabs[Math.max(0, idx - 1)];
      setActiveTabId(nextActive.id);
    }
    setTabPendingClose(null);
  };

  // Save & Close from Unsaved Prompt
  const handleSaveAndClose = () => {
    if (!tabPendingClose) return;
    handleTriggerSave();
    performCloseTab(tabPendingClose.id);
  };

  // Global Keyboard Shortcuts (Ctrl+T/Ctrl+N, Ctrl+W, Ctrl+S, Ctrl+H, Alt+X, Ctrl+Shift+Enter, Ctrl+Shift+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S -> Save Query
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleTriggerSave();
      }
      // Alt+X -> Explain (Dry Run)
      else if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleExplainQuery(false);
      }
      // Ctrl+Shift+Enter -> Explain & Analyze
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleExplainQuery(true);
      }
      // Ctrl+Shift+F -> Format SQL
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleFormatSql();
      }
      // Ctrl+T or Ctrl+N -> New Tab
      else if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleAddTab();
      }
      // Ctrl+W -> Close active tab
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        if (activeTabId) {
          e.preventDefault();
          handleCloseTab(activeTabId);
        }
      }
      // Ctrl+H -> Toggle History Panel
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleToggleHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, activeTab?.query, handleTriggerSave]);

  // Explain Query Handler
  const handleExplainQuery = async (analyze: boolean = false) => {
    if (!activeSession) {
      showToast('Please connect to a database first', 'error');
      return;
    }
    if (!activeTab) return;

    const sqlToRun = activeTab.query.trim();
    if (!sqlToRun) {
      showToast('Query editor is empty', 'info');
      return;
    }

    setShowExplainMenu(false);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: true } : t))
    );

    const startTs = Date.now();

    try {
      const plan = await explainQuery(
        activeSession.connection,
        activeSession.activeDatabase,
        sqlToRun,
        analyze
      );

      const durationMs = Date.now() - startTs;

      // Add to Query History
      const newHistoryEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: (analyze ? 'EXPLAIN (ANALYZE) ' : 'EXPLAIN ') + sqlToRun,
        timestamp: Date.now(),
        durationMs,
        status: 'success',
        rowsCount: 1,
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 99)]);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                explainPlan: plan,
                activeViewMode: 'explain',
                isExecuting: false,
              }
            : t
        )
      );

      showToast(
        analyze
          ? 'Explain Analyze completed in ' + durationMs + 'ms (Execution: ' + plan.executionTime.toFixed(2) + 'ms)'
          : 'Query Plan estimated: Cost ' + plan.totalCost.toFixed(2),
        'success'
      );
    } catch (err: any) {
      console.error('Explain failed:', err);
      const durationMs = Date.now() - startTs;

      const newHistoryEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: (analyze ? 'EXPLAIN (ANALYZE) ' : 'EXPLAIN ') + sqlToRun,
        timestamp: Date.now(),
        durationMs,
        status: 'error',
        errorMessage: err?.message || String(err),
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 99)]);

      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: false } : t))
      );

      showToast('Explain failed: ' + (err?.message || err), 'error');
    }
  };

  // Add New Tab
  const handleAddTab = () => {
    const newId = 'tab-' + Date.now();
    const newTabNum = tabs.length + 1;
    const newTab: QueryTab = {
      id: newId,
      title: 'Query ' + newTabNum + '.sql',
      query: DEFAULT_QUERY,
      isDirty: false,
      results: null,
      activeResultIndex: 0,
      isExecuting: false,
      activeConnectionName: activeSession?.connection.name || 'Local Postgres',
      activeDatabaseName: activeSession?.activeDatabase || 'postgres',
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setResultPage(1);
    showToast('New query tab created', 'info');
  };

  // Rename Tab
  const handleStartRename = (tabId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (tabId: string) => {
    if (editingTitle.trim()) {
      let finalTitle = editingTitle.trim();
      if (!finalTitle.endsWith('.sql')) {
        finalTitle += '.sql';
      }
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, title: finalTitle } : t))
      );
    }
    setEditingTabId(null);
    setEditingTitle('');
  };

  // Update current active tab query content
  const handleQueryChange = (newQuery: string) => {
    if (!activeTabId) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, query: newQuery, isDirty: true } : t
      )
    );
  };

  // Format SQL with sql-formatter
  const handleFormatSql = () => {
    if (!activeTab || !activeTab.query.trim()) return;
    try {
      const formatted = format(activeTab.query, {
        language: 'postgresql',
        keywordCase: 'upper',
        tabWidth: 2,
        linesBetweenQueries: 2,
      });
      handleQueryChange(formatted);
      showToast('Formatted SQL query', 'success');
    } catch (err: any) {
      console.warn('Formatting failed:', err);
      showToast('Failed to format SQL: ' + (err?.message || err), 'error');
    }
  };

  // Run Query handler
  const handleExecuteQuery = async (queryOverride?: string) => {
    if (!activeSession) {
      showToast('Please connect to a database first', 'error');
      return;
    }
    if (!activeTab) return;

    const sqlToRun = (queryOverride || activeTab.query).trim();
    if (!sqlToRun) {
      showToast('Query editor is empty', 'info');
      return;
    }

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: true } : t))
    );

    const startTs = Date.now();

    try {
      const results = await executeRawQuery(
        activeSession.connection,
        activeSession.activeDatabase,
        sqlToRun
      );

      const totalDuration = Date.now() - startTs;
      const totalRows = results.reduce(
        (sum, r) => sum + (r.isSelect ? r.rows.length : r.rowsAffected),
        0
      );

      const hasError = results.some((r) => r.error);

      // Add to Query History
      const newHistoryEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: sqlToRun,
        timestamp: Date.now(),
        durationMs: totalDuration,
        status: hasError ? 'error' : 'success',
        rowsCount: totalRows,
        errorMessage: results.find((r) => r.error)?.error,
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 99)]);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                results,
                activeResultIndex: 0,
                activeViewMode: 'results',
                isExecuting: false,
              }
            : t
        )
      );

      setResultPage(1);

      if (hasError) {
        const firstErr = results.find((r) => r.error)?.error;
        showToast('Query failed: ' + firstErr, 'error');
      } else {
        showToast(
          'Executed ' + results.length + ' statement(s) in ' + totalDuration + 'ms (' + totalRows + ' rows)',
          'success'
        );
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      const totalDuration = Date.now() - startTs;

      const newHistoryEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: sqlToRun,
        timestamp: Date.now(),
        durationMs: totalDuration,
        status: 'error',
        errorMessage: err?.message || String(err),
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 99)]);

      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: false } : t))
      );

      showToast('Query failed: ' + (err?.message || err), 'error');
    }
  };

  // Export Results to CSV
  const handleExportCSV = () => {
    if (!activeTab?.results || activeTab.results.length === 0) return;
    const currentResult = activeTab.results[activeTab.activeResultIndex || 0];
    if (!currentResult || currentResult.rows.length === 0) {
      showToast('No rows to export', 'info');
      return;
    }

    try {
      const headers = currentResult.columns.join(',');
      const rows = currentResult.rows.map((row) =>
        currentResult.columns
          .map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return '"' + str.replace(/"/g, '""') + '"';
          })
          .join(',')
      );

      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'query_result_' + Date.now() + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Exported ' + currentResult.rows.length + ' rows to CSV', 'success');
    } catch (err: any) {
      console.error('CSV Export failed:', err);
      showToast('Export failed: ' + (err?.message || err), 'error');
    }
  };

  // Export Results to JSON
  const handleExportJSON = () => {
    if (!activeTab?.results || activeTab.results.length === 0) return;
    const currentResult = activeTab.results[activeTab.activeResultIndex || 0];
    if (!currentResult || currentResult.rows.length === 0) {
      showToast('No rows to export', 'info');
      return;
    }

    try {
      const jsonContent = JSON.stringify(currentResult.rows, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'query_result_' + Date.now() + '.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Exported ' + currentResult.rows.length + ' rows to JSON', 'success');
    } catch (err: any) {
      console.error('JSON Export failed:', err);
      showToast('Export failed: ' + (err?.message || err), 'error');
    }
  };

  // Clear Results
  const handleClearResults = () => {
    if (!activeTabId) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              results: null,
              activeResultIndex: 0,
              explainPlan: null,
            }
          : t
      )
    );
  };

  const currentResult =
    activeTab?.results && activeTab.results.length > 0
      ? activeTab.results[activeTab.activeResultIndex || 0]
      : null;

  // Paginated Rows for current result
  const paginatedRows =
    currentResult && currentResult.rows
      ? currentResult.rows.slice((resultPage - 1) * resultLimit, resultPage * resultLimit)
      : [];

  const totalResultPages =
    currentResult && currentResult.rows
      ? Math.max(1, Math.ceil(currentResult.rows.length / resultLimit))
      : 1;

  const availableFolders = extractFolders(queriesTree);

  if (!activeSession) {
    return <HomeLanding onOpenNewModal={onOpenNewModal} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full min-h-0 bg-surface-950 text-gray-100 overflow-hidden select-none font-sans relative">
      {/* 1. Top Multi-Tab Bar for SQL Query Files */}
      <div className="bg-[#141416] border-b border-border-subtle flex items-center justify-between pl-2 pr-64 flex-shrink-0 select-none min-h-[38px] z-30">
        {/* Scrollable Query Tabs List */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingTabId === tab.id;

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onAuxClick={(e) => {
                  if (e.button === 1) handleCloseTab(tab.id, e);
                }}
                title={tab.title + (tab.isDirty ? ' (Unsaved)' : '')}
                className={
                  'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[240px] ' +
                  (isActive
                    ? 'bg-[#1e1e22] text-white border-zinc-700/80 shadow-sm font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181c] border-transparent')
                }
              >
                <FileCode
                  className={
                    'w-3.5 h-3.5 flex-shrink-0 ' +
                    (isActive ? 'text-amber-400' : 'text-zinc-500 group-hover/tab:text-zinc-400')
                  }
                />

                {/* Tab Title or Inline Editing */}
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveRename(tab.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename(tab.id)}
                      className="bg-surface-900 border border-brand-500 text-white px-1 py-0.5 rounded text-xs outline-none font-mono w-28"
                    />
                  </form>
                ) : (
                  <span
                    onDoubleClick={(e) => handleStartRename(tab.id, tab.title, e)}
                    className="truncate font-mono text-[11px] flex-1"
                  >
                    {tab.title}
                  </span>
                )}

                {/* Unsaved / Dirty Indicator Dot */}
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0 animate-pulse" title="Unsaved changes" />
                )}

                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  title="Close Tab (Ctrl+W)"
                  className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add Query Tab Button */}
          <button
            type="button"
            onClick={handleAddTab}
            title="New SQL Query Tab (Ctrl+T)"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Workspace Body: Active Tab Editor vs Empty Placeholder */}
      {activeTab ? (
        <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden relative">
          {/* Top SQL Execution Toolbar */}
          <div className="px-4 py-2 border-b border-border-subtle bg-[#161618] flex items-center justify-between gap-3 flex-shrink-0 z-20">
            {/* Left Controls: Run Selection / Run All / Explain Plan / Format / Save */}
            <div className="flex items-center gap-2">
              {/* Run Query Button */}
              <button
                type="button"
                onClick={() => handleExecuteQuery()}
                disabled={activeTab.isExecuting || !activeTab.query?.trim()}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-semibold text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {activeTab.isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Run (Ctrl+Enter)</span>
              </button>

              {/* Explain Query Dropdown */}
              <div className="relative" ref={explainDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowExplainMenu(!showExplainMenu)}
                  disabled={activeTab.isExecuting || !activeTab.query?.trim()}
                  title="Explain execution plan"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Explain Plan</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {showExplainMenu && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#18181a] border border-zinc-800/90 shadow-2xl rounded-xl py-1.5 z-50 text-xs text-zinc-300 backdrop-blur-md">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/60 mb-1">
                      Execution Planner
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExplainQuery(false)}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-sky-400" />
                        <span>Explain (Dry Run)</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Alt+X</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExplainQuery(true)}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Explain & Analyze</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+↵</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Format SQL */}
              <button
                type="button"
                onClick={handleFormatSql}
                disabled={activeTab.isExecuting || !activeTab.query?.trim()}
                title="Format SQL (Ctrl+Shift+F)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 border border-border/60 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Format SQL</span>
              </button>

              {/* Save Query Action Button */}
              <button
                type="button"
                onClick={handleTriggerSave}
                disabled={!activeTab}
                title="Save Query (Ctrl+S)"
                className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer ' +
                  (activeTab.isDirty
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 active:scale-[0.98]'
                    : 'bg-surface-800 hover:bg-surface-750 text-zinc-300 border border-border/60')
                }
              >
                <Save className={'w-3.5 h-3.5 ' + (activeTab.isDirty ? 'text-white' : 'text-zinc-400')} />
                <span>Save Query</span>
              </button>
            </div>

            {/* Right Controls: Query History Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleHistory}
                className={
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ' +
                  (isHistoryOpen
                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                    : 'bg-surface-800 hover:bg-surface-750 text-zinc-300 border-border/60')
                }
              >
                <History className="w-3.5 h-3.5 text-zinc-300" />
                <span>History ({history.length})</span>
              </button>
            </div>
          </div>

          {/* Main Work Area: Monaco Editor + Bottom Results Panel + Right History Panel */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative w-full h-full">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full h-full">
              {/* Monaco Editor Container */}
              <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden bg-[#1e1e1e] relative">
                <QueryEditor
                  value={activeTab.query}
                  onChange={handleQueryChange}
                  onExecute={(selectedSql?: string) => handleExecuteQuery(selectedSql)}
                  onFormat={handleFormatSql}
                  onSave={handleTriggerSave}
                  tables={tables}
                  columns={columns}
                  isExecuting={activeTab.isExecuting}
                />
              </div>

              {/* Bottom Resizable Results Panel */}
              {(activeTab.results || activeTab.explainPlan) && (
                <div
                  style={{ height: resultsHeight, minHeight: 140, maxHeight: 600 }}
                  className="bg-[#141416] border-t border-border-subtle flex flex-col flex-shrink-0 select-none relative"
                >
                  {/* Row Resizer Handle */}
                  <div
                    onMouseDown={handleResizeStart}
                    className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-30 hover:bg-brand-500/20 transition-colors flex items-center justify-center group/hres"
                  >
                    <div className="w-12 h-1 bg-zinc-600 rounded-full group-hover/hres:bg-brand-400 transition-colors" />
                  </div>

                  {/* Results Panel Header */}
                  <div className="px-4 py-2 border-b border-border-subtle bg-[#17171a] flex items-center justify-between flex-shrink-0">
                    {/* View Switcher / Results info */}
                    <div className="flex items-center gap-3">
                      {activeTab.explainPlan ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Explain Plan
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            Total Cost: {activeTab.explainPlan.totalCost.toFixed(2)}
                          </span>
                          {activeTab.explainPlan.executionTime > 0 && (
                            <span className="text-xs font-mono text-emerald-400">
                              • Exec: {activeTab.explainPlan.executionTime.toFixed(2)}ms
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                            Query Results
                          </span>
                          {currentResult && (
                            <span className="text-xs font-mono text-zinc-400">
                              {currentResult.isSelect
                                ? currentResult.rows.length + ' rows'
                                : currentResult.rowsAffected + ' rows affected'}{' '}
                              • {currentResult.durationMs.toFixed(1)}ms
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Export & Clear Actions */}
                    <div className="flex items-center gap-2">
                      {currentResult && currentResult.rows.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleExportCSV}
                            title="Export to CSV"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202024] hover:bg-[#28282e] border border-zinc-700/60 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                            <span>CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleExportJSON}
                            title="Export to JSON"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202024] hover:bg-[#28282e] border border-zinc-700/60 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <FileJson className="w-3 h-3 text-amber-400" />
                            <span>JSON</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleClearResults}
                        title="Clear Results"
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Results Panel Body */}
                  <div className="flex-1 overflow-auto bg-[#111113]">
                    {activeTab.explainPlan ? (
                      <ExplainPlanViewer planResult={activeTab.explainPlan} showToast={showToast} />
                    ) : currentResult ? (
                      currentResult.error ? (
                        <div className="p-4 text-xs text-rose-400 font-mono bg-rose-950/20 border-l-2 border-rose-500">
                          {currentResult.error}
                        </div>
                      ) : currentResult.columns.length === 0 ? (
                        <div className="p-4 text-xs text-emerald-400 font-mono">
                          Statement completed successfully. ({currentResult.rowsAffected} rows affected)
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono border-collapse">
                            <thead>
                              <tr className="bg-[#18181c] border-b border-border-subtle sticky top-0 z-10">
                                <th className="p-2 text-zinc-500 font-normal w-10 text-center">#</th>
                                {currentResult.columns.map((col) => (
                                  <th
                                    key={col}
                                    className="p-2 text-zinc-300 font-semibold border-r border-border-subtle/40 whitespace-nowrap"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedRows.map((row, rIdx) => {
                                const rowNum = (resultPage - 1) * resultLimit + rIdx + 1;
                                return (
                                  <tr
                                    key={rIdx}
                                    className="border-b border-border-subtle/30 hover:bg-zinc-800/40"
                                  >
                                    <td className="p-2 text-zinc-600 text-center select-none font-mono">
                                      {rowNum}
                                    </td>
                                    {currentResult.columns.map((col) => {
                                      const val = row[col];
                                      return (
                                        <td
                                          key={col}
                                          className="p-2 text-zinc-200 border-r border-border-subtle/20 whitespace-nowrap select-text"
                                        >
                                          {val === null || val === undefined ? (
                                            <span className="text-zinc-600 italic">null</span>
                                          ) : typeof val === 'object' ? (
                                            JSON.stringify(val)
                                          ) : (
                                            String(val)
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Right Drawer: Query History Panel */}
            {isHistoryOpen && (
              <QueryHistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => handleToggleHistory()}
                history={history}
                onInsertQuery={(sql: string) => {
                  handleQueryChange(sql);
                  showToast('Loaded query from history', 'info');
                }}
                onRunQuery={(sql: string) => {
                  handleQueryChange(sql);
                  handleExecuteQuery(sql);
                }}
                onClearHistory={() => setHistory([])}
                showToast={showToast}
              />
            )}
          </div>

          {/* 3. Bottom Status Bar */}
          <div className="px-3.5 py-1.5 bg-[#121214] border-t border-border-subtle flex items-center justify-between text-xs select-none flex-shrink-0 z-20">
            {/* Left DB Connection Context */}
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-300 font-medium">
                  Connected to database "{activeSession.activeDatabase}" on {activeSession.connection.name || activeSession.connection.host}
                </span>
              </div>
            </div>

            {/* Right Status Info / Shortcuts */}
            <div className="flex items-center gap-4 text-zinc-500 text-[11px] font-mono">
              {activeTab.isExecuting ? (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Executing query...</span>
                </div>
              ) : currentResult ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    Executed in {currentResult.durationMs.toFixed(1)}ms ({currentResult.isSelect ? currentResult.rows.length : currentResult.rowsAffected} rows)
                  </span>
                </div>
              ) : (
                <span className="text-zinc-500">Ready</span>
              )}
              <div className="h-3 w-px bg-zinc-800" />
              <span className="hidden md:inline text-zinc-500">
                Run: <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Ctrl+↵</kbd>
              </span>
              <span className="hidden md:inline text-zinc-500">
                Save: <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Ctrl+S</kbd>
              </span>
              <span className="hidden md:inline text-zinc-500">
                Format: <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Ctrl+Shift+F</kbd>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty SQL Playground Workspace State */
        <div className="flex-1 bg-[#121212] flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] max-w-[50vw] max-h-[50vh] flex items-center justify-center pointer-events-none mb-2">
            <img
              src={interfaceSvg}
              alt="No Query Selected"
              className="w-full h-full object-contain opacity-45 select-none pointer-events-none drop-shadow-2xl"
            />
          </div>
          <div className="flex flex-col items-center text-center mt-2">
            <span className="text-sm font-semibold text-zinc-300">No Query Selected</span>
            <span className="text-xs text-zinc-500 mt-1 max-w-sm">
              Select a query to edit or create a new one.
            </span>
            <button
              type="button"
              onClick={handleAddTab}
              className="mt-6 flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700/60 hover:border-zinc-600 rounded-lg shadow-sm transition-all duration-150 cursor-pointer group"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              <span>New Query</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Save Query Modal Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
          <div
            className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl p-5 text-gray-100 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Save SQL Query</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Query File Name (.sql)
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={saveModalName}
                  onChange={(e) => setSaveModalName(e.target.value)}
                  placeholder="e.g. Get User Payments.sql"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Destination Folder (Optional)
                </label>
                <select
                  value={saveModalFolderId}
                  onChange={(e) => setSaveModalFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 font-sans transition-all"
                >
                  <option value="">/ (Root - No Folder)</option>
                  {availableFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!saveModalName.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-medium text-xs rounded-lg shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Query</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Unsaved Changes Close Confirmation Modal */}
      {tabPendingClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
          <div
            className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl p-5 text-gray-100 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Unsaved Changes</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  You have unsaved changes in <span className="font-mono text-zinc-200 font-medium">"{tabPendingClose.title}"</span>. Do you want to save before closing?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setTabPendingClose(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performCloseTab(tabPendingClose.id)}
                className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Don't Save
              </button>
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
