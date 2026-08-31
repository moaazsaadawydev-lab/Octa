import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { format } from 'sql-formatter';
import { ActiveSession, QueryResult, QueryTab, QueryHistoryEntry, ExplainPlanResult } from '../types/connection';
import { executeRawQuery, explainQuery, getTables, getTableSchema } from '../services/api';
import { QueryEditor } from './QueryEditor';
import { QueryHistoryPanel } from './QueryHistoryPanel';
import { ExplainPlanViewer } from './ExplainPlanViewer';
import { HomeLanding } from './HomeLanding';

interface QueryPlaygroundProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_QUERY = `-- Octa SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'Octa' AS application,
  'Database Management & SQL Workspace' AS milestone,
  NOW() AS executed_at;
`;

export const QueryPlayground: React.FC<QueryPlaygroundProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
}) => {
  // Tabs State (Loaded from localStorage)
  const [tabs, setTabs] = useState<QueryTab[]>(() => {
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

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('octa_active_query_tab_id');
    return savedActiveId && tabs.some((t) => t.id === savedActiveId)
      ? savedActiveId
      : tabs[0]?.id || 'tab-1';
  });

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
      }));
      localStorage.setItem('octa_query_tabs', JSON.stringify(serialized));
    } catch (e) {
      console.warn('Failed to save query tabs to localStorage', e);
    }
  }, [tabs]);

  // Save activeTabId to localStorage
  useEffect(() => {
    localStorage.setItem('octa_active_query_tab_id', activeTabId);
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

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Global Keyboard Shortcuts (Ctrl+T/Ctrl+N, Ctrl+W, Ctrl+H, Alt+X, Ctrl+Shift+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+X -> Explain (Dry Run)
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleExplainQuery(false);
      }
      // Ctrl+Shift+Enter -> Explain & Analyze
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleExplainQuery(true);
      }
      // Ctrl+T or Ctrl+N -> New Tab
      else if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleAddTab();
      }
      // Ctrl+W -> Close active tab
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        handleCloseTab(activeTabId);
      }
      // Ctrl+H -> Toggle History Panel
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleToggleHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, activeTab?.query]);

  // Explain Query Handler
  const handleExplainQuery = async (analyze: boolean = false) => {
    if (!activeSession) {
      showToast('Please connect to a database first', 'error');
      return;
    }

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
          ? `Explain Analyze completed in ${durationMs}ms (Execution: ${plan.executionTime.toFixed(2)}ms)`
          : `Explain Plan generated (Total cost: ${plan.totalCost.toLocaleString()})`,
        'success'
      );
    } catch (err: any) {
      console.error('Explain failed:', err);
      showToast(`Explain failed: ${err?.message || err}`, 'error');
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: false } : t))
      );
    }
  };

  // Add new query tab
  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const newTab: QueryTab = {
      id: 'tab-' + Date.now(),
      title: `Query ${nextIdx}.sql`,
      query: `-- Query ${nextIdx}\n\n`,
      isDirty: false,
      results: null,
      activeResultIndex: 0,
      isExecuting: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Close tab
  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) {
      setTabs([
        {
          id: 'tab-1',
          title: 'Query 1.sql',
          query: '',
          isDirty: false,
          results: null,
          activeResultIndex: 0,
          isExecuting: false,
        },
      ]);
      setActiveTabId('tab-1');
      return;
    }

    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
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

      const durationMs = Date.now() - startTs;
      const hasError = results.some((r) => Boolean(r.error));
      const totalRows = results.reduce(
        (sum, r) => sum + (r.isSelect ? r.rows?.length || 0 : r.rowsAffected || 0),
        0
      );
      const firstErr = results.find((r) => Boolean(r.error))?.error;

      // Add to Query History
      const newHistoryEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: sqlToRun,
        timestamp: Date.now(),
        durationMs,
        status: hasError ? 'error' : 'success',
        rowsCount: totalRows,
        errorMessage: firstErr,
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 99)]);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, results, activeResultIndex: 0, activeViewMode: 'results', isExecuting: false, isDirty: false }
            : t
        )
      );

      setResultPage(1);

      if (hasError) {
        showToast('Query finished with errors', 'error');
      } else {
        showToast(
          `Executed ${results.length} statement${results.length > 1 ? 's' : ''} in ${durationMs}ms`,
          'success'
        );
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTs;
      console.error('Failed to execute query:', err);

      const newHistoryEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: sqlToRun,
        timestamp: Date.now(),
        durationMs,
        status: 'error',
        errorMessage: err?.message || String(err),
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => [newHistoryEntry, ...prev.slice(0, 99)]);

      showToast(`Execution failed: ${err?.message || err}`, 'error');
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: false } : t))
      );
    }
  };

  // Export active result set to JSON
  const handleExportJSON = () => {
    if (!activeTab.results || activeTab.results.length === 0) return;
    const activeResultIndex = activeTab.activeResultIndex ?? 0;
    const activeResult = activeTab.results[activeResultIndex];
    if (!activeResult || !activeResult.rows || activeResult.rows.length === 0) return;

    const jsonStr = JSON.stringify(activeResult.rows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${activeSession?.activeDatabase || 'postgres'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported results as JSON', 'success');
  };

  // Export active result set to CSV
  const handleExportCSV = () => {
    if (!activeTab.results || activeTab.results.length === 0) return;
    const activeResultIndex = activeTab.activeResultIndex ?? 0;
    const activeResult = activeTab.results[activeResultIndex];
    if (!activeResult || !activeResult.rows || activeResult.rows.length === 0) return;

    const cols =
      activeResult.columns && activeResult.columns.length > 0
        ? activeResult.columns
        : Object.keys(activeResult.rows[0] || {});

    if (cols.length === 0) return;

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = cols.map(escapeCSV).join(',');
    const rowLines = activeResult.rows.map((row: any) =>
      cols.map((col: string) => escapeCSV(row[col])).join(',')
    );

    const csvContent = [headerLine, ...rowLines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${activeSession?.activeDatabase || 'postgres'}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported results as CSV', 'success');
  };

  // Clear query or results
  const handleClear = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, query: '', results: null, explainPlan: null, activeViewMode: 'results', isDirty: false }
          : t
      )
    );
    showToast('Editor cleared', 'info');
  };

  // If no connection is active, render sleek VS Code-inspired Home Landing
  if (!activeSession) {
    return <HomeLanding onOpenNewModal={onOpenNewModal} />;
  }

  const activeResult: QueryResult | undefined =
    activeTab.results?.[activeTab.activeResultIndex ?? 0];

  // Pagination slicing for active SELECT result
  const totalRows = activeResult?.rows?.length || 0;
  const totalPages = Math.ceil(totalRows / resultLimit) || 1;
  const startRow = totalRows === 0 ? 0 : (resultPage - 1) * resultLimit + 1;
  const endRow = Math.min(resultPage * resultLimit, totalRows);
  const pagedRows =
    activeResult?.rows?.slice(
      (resultPage - 1) * resultLimit,
      resultPage * resultLimit
    ) || [];

  return (
    <div className="flex-1 bg-surface-950 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Top Query Tabs Bar (VS Code Style) */}
      <div className="bg-[#181818] border-b border-[#2B2B2B] flex items-center justify-between px-2 pt-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto max-w-4xl no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingTabId === tab.id;

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onDoubleClick={(e) => handleStartRename(tab.id, tab.title, e)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer text-xs transition-all select-none border-t-2 ${
                  isActive
                    ? 'bg-[#121212] border-t-brand-500 text-gray-100 font-medium shadow-sm'
                    : 'bg-[#1E1E1E] border-t-transparent text-gray-400 hover:bg-[#252525] hover:text-gray-200'
                }`}
              >
                <FileCode
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? 'text-brand-400' : 'text-gray-500'
                  }`}
                />

                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveRename(tab.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename(tab.id)}
                      className="bg-zinc-800 border border-brand-500 text-xs px-1.5 py-0.5 rounded text-white font-mono outline-none w-28"
                    />
                    <button
                      type="submit"
                      className="p-0.5 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <span className="font-mono text-[11px] truncate max-w-[140px]" title="Double click to rename">
                    {tab.title}
                  </span>
                )}

                {/* Dirty indicator dot */}
                {tab.isDirty && !isEditing && (
                  <span
                    title="Unsaved changes"
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                  />
                )}

                {/* Close Button */}
                {!isEditing && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    title="Close Tab (Ctrl+W)"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-zinc-800 rounded p-0.5 transition-all ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddTab}
            title="New Query Tab (Ctrl+N / Ctrl+T)"
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-[#252525] rounded-md transition-colors ml-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Database Context Indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pb-1.5 pr-2 mr-72">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-medium text-[11px]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activeSession.connection.name}</span>
            <span className="text-emerald-500/50">/</span>
            <span className="font-semibold">{activeSession.activeDatabase}</span>
          </div>
        </div>
      </div>

      {/* 2. Execution Control Action Bar */}
      <div className="px-4 py-2 bg-[#1C1C1C] border-b border-[#2B2B2B] flex items-center justify-between gap-3 flex-shrink-0 relative z-20">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Run Button */}
          <button
            type="button"
            onClick={() => handleExecuteQuery()}
            disabled={activeTab.isExecuting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {activeTab.isExecuting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run Selection / All</span>
            <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.2 rounded font-mono text-emerald-200 border border-emerald-500/30">
              Ctrl + ↵
            </span>
          </button>

          {/* Explain Dropdown Button */}
          <div className="relative" ref={explainDropdownRef}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleExplainQuery(false)}
                disabled={activeTab.isExecuting}
                title="Generate Query Execution Plan (Dry Run) - Alt+X"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg bg-amber-600/90 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current text-amber-200" />
                <span>Explain</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExplainMenu(!showExplainMenu)}
                disabled={activeTab.isExecuting}
                title="Explain Options"
                className="px-1.5 py-1.5 rounded-r-lg bg-amber-700 hover:bg-amber-600 text-white border-l border-amber-500/60 text-xs transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showExplainMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#1f1f1f] border border-zinc-700/80 rounded-md shadow-2xl py-1.5 z-[100] animate-fade-in select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowExplainMenu(false);
                    handleExplainQuery(false);
                  }}
                  className="w-full px-3 py-2 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-zinc-200">Explain (Dry Run)</div>
                    <div className="text-[11px] text-zinc-400">Estimates cost without running query (Alt + X)</div>
                  </div>
                </button>

                <div className="my-1 border-t border-zinc-800" />

                <button
                  type="button"
                  onClick={() => {
                    setShowExplainMenu(false);
                    handleExplainQuery(true);
                  }}
                  className="w-full px-3 py-2 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-zinc-200">Explain & Analyze</div>
                    <div className="text-[11px] text-zinc-400">Executes query with timing metrics (Ctrl + Shift + ↵)</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Format SQL Button */}
          <button
            type="button"
            onClick={handleFormatSql}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/70 text-xs transition-colors cursor-pointer shadow-sm"
            title="Format SQL (Beautify query)"
          >
            <Wand2 className="w-3.5 h-3.5 text-brand-400" />
            <span>Format SQL</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-gray-400 hover:text-gray-200 border border-zinc-700/70 text-xs transition-colors cursor-pointer"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Right Action: History Drawer Toggle & Query Meta */}
        <div className="flex items-center gap-3">
          {/* Query Meta Status */}
          {activeResult && activeTab.activeViewMode !== 'explain' && (
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono text-[11px] hidden sm:flex">
              {activeResult.isSelect ? (
                <span>
                  <strong className="text-gray-200">{activeResult.rows.length.toLocaleString()}</strong> rows returned
                </span>
              ) : (
                <span>
                  <strong className="text-gray-200">{activeResult.rowsAffected.toLocaleString()}</strong> rows affected
                </span>
              )}
              <span>•</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <Clock className="w-3 h-3" />
                <span>{activeResult.durationMs.toFixed(2)}ms</span>
              </div>
            </div>
          )}

          {/* History Drawer Toggle Button */}
          <button
            type="button"
            onClick={handleToggleHistory}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shadow-sm ${
              isHistoryOpen
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700/70 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Query Execution History (Ctrl+H)"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>History</span>
            {history.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-900/60 text-cyan-200 text-[10px] font-mono border border-cyan-500/30">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Middle Section: Editor / Results + Sliding History Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor & Results Column */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* 3A. Query Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden relative min-h-[120px]">
            <QueryEditor
              value={activeTab.query}
              onChange={handleQueryChange}
              onExecute={handleExecuteQuery}
              onFormat={handleFormatSql}
              onSave={() => {
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
                );
                showToast('Tab saved', 'info');
              }}
              isExecuting={activeTab.isExecuting}
              tables={tables}
              columns={columns}
            />
          </div>

          {/* 3B. Split Resizable Query Results Panel */}
          <div
            style={{ height: activeTab.results || activeTab.explainPlan ? resultsHeight : 'auto' }}
            className={`border-t border-border-subtle bg-surface-900 flex flex-col relative flex-shrink-0 transition-all duration-150 ${
              !activeTab.results && !activeTab.explainPlan ? 'min-h-[38px] overflow-hidden' : ''
            }`}
          >
            {/* Horizontal Splitter Resizer Handle */}
            {(activeTab.results || activeTab.explainPlan) && (
              <div
                onMouseDown={handleResizeStart}
                className="absolute left-0 right-0 -top-1 h-2.5 cursor-row-resize select-none flex items-center justify-center group/resizer z-30 hover:bg-brand-500/10 active:bg-brand-500/20"
              >
                <div className="h-[2px] w-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
              </div>
            )}

            {/* Results Tab Header / Status Bar */}
            <div className="px-3.5 py-2 bg-surface-950 border-b border-border/40 flex items-center justify-between text-xs min-h-[38px] select-none">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1.5 flex-shrink-0">
                  <Layers className="w-3.5 h-3.5 text-brand-400" />
                  Output
                </span>

                {/* Multi-Statement Result Tabs */}
                {activeTab.results && activeTab.results.length > 0 &&
                  activeTab.results.map((res, rIdx) => {
                    const isSelected = activeTab.activeViewMode !== 'explain' && (activeTab.activeResultIndex ?? 0) === rIdx;
                    const isErr = Boolean(res.error);

                    return (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => {
                          setTabs((prev) =>
                            prev.map((t) =>
                              t.id === activeTabId ? { ...t, activeResultIndex: rIdx, activeViewMode: 'results' } : t
                            )
                          );
                          setResultPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                          isSelected
                            ? isErr
                              ? 'bg-rose-950/70 border border-rose-500/50 text-rose-300 font-semibold'
                              : 'bg-brand-950/70 border border-brand-500/50 text-brand-300 font-semibold shadow-sm'
                            : 'bg-surface-850 hover:bg-surface-800 text-gray-400 border border-border/40'
                        }`}
                      >
                        {isErr ? (
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>
                          Result {res.queryIndex} ({res.isSelect ? `${res.rows.length} rows` : `${res.rowsAffected} aff.`}, {res.durationMs.toFixed(1)}ms)
                        </span>
                      </button>
                    );
                  })}

                {/* Execution Plan Tab */}
                {activeTab.explainPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setTabs((prev) =>
                        prev.map((t) =>
                          t.id === activeTabId ? { ...t, activeViewMode: 'explain' } : t
                        )
                      );
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                      activeTab.activeViewMode === 'explain'
                        ? 'bg-amber-950/70 border border-amber-500/50 text-amber-300 font-semibold shadow-sm'
                        : 'bg-surface-850 hover:bg-surface-800 text-gray-400 border border-border/40'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Execution Plan{' '}
                      {activeTab.explainPlan.executionTime > 0
                        ? `(${activeTab.explainPlan.executionTime.toFixed(2)}ms)`
                        : `(Cost: ${activeTab.explainPlan.totalCost.toLocaleString()})`}
                    </span>
                  </button>
                )}
              </div>

              {/* Right-side: Export actions or placeholder hint */}
              {!activeTab.results && !activeTab.explainPlan ? (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 select-none flex-shrink-0">
                  <span>Execute SQL queries (</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-border/60 text-zinc-300 font-mono text-[10px]">
                    Ctrl + Enter
                  </kbd>
                  <span>) or Explain (</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-border/60 text-zinc-300 font-mono text-[10px]">
                    Alt + X
                  </kbd>
                  <span>)</span>
                </div>
              ) : activeTab.activeViewMode !== 'explain' && activeResult && activeResult.rows && activeResult.rows.length > 0 ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline mr-1">
                    {activeResult.rows.length.toLocaleString()} rows
                  </span>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    title="Export active result set as formatted JSON"
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 px-2.5 py-1 rounded border border-zinc-700/60 transition-colors shadow-sm cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5 text-brand-400" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    title="Export active result set as CSV"
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 px-2.5 py-1 rounded border border-zinc-700/60 transition-colors shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Result Content Area */}
            {activeTab.activeViewMode === 'explain' && activeTab.explainPlan ? (
              <div className="flex-1 overflow-hidden relative">
                <ExplainPlanViewer planResult={activeTab.explainPlan} showToast={showToast} />
              </div>
            ) : activeTab.results ? (
              <div className="flex-1 overflow-auto bg-[#141414] relative">
                {activeResult && activeResult.error && (
                  <div className="p-4">
                    <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>PostgreSQL Execution Error</span>
                      </div>
                      <div className="font-mono text-xs bg-rose-950/60 p-3 rounded-lg border border-rose-900/50 text-rose-200 whitespace-pre-wrap">
                        {activeResult.error}
                      </div>
                      <div className="text-[11px] text-rose-400/80 font-mono">
                        Statement: {activeResult.statement}
                      </div>
                    </div>
                  </div>
                )}

                {activeResult && !activeResult.error && !activeResult.isSelect && (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-gray-100 mb-1">
                      Query Executed Successfully
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {activeResult.rowsAffected} row{activeResult.rowsAffected === 1 ? '' : 's'} affected in{' '}
                      <span className="text-emerald-400">{activeResult.durationMs.toFixed(2)}ms</span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono mt-2 bg-surface-900 px-3 py-1.5 rounded-lg border border-border/40 max-w-lg truncate">
                      {activeResult.statement}
                    </div>
                  </div>
                )}

                {activeResult && !activeResult.error && activeResult.isSelect && (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-auto">
                      <table className="text-left border-collapse text-xs select-text table-fixed min-w-full">
                        {/* Sticky Header */}
                        <thead className="sticky top-0 bg-[#1F1F1F] z-20 shadow-sm border-b border-[#2D2D2D]">
                          <tr>
                            <th className="w-12 min-w-[48px] max-w-[48px] px-3 py-2.5 text-center text-gray-500 font-mono font-medium text-[11px] border-r border-[#2D2D2D] bg-[#1a1a1a] sticky left-0 z-30">
                              #
                            </th>
                            {activeResult.columns.map((colName) => (
                              <th
                                key={colName}
                                className="px-4 py-2.5 font-medium border-r border-[#2D2D2D] text-gray-200 whitespace-nowrap min-w-[160px]"
                              >
                                <span className="font-semibold">{colName}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        {/* Table Rows */}
                        <tbody className="divide-y divide-[#242424]">
                          {pagedRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={activeResult.columns.length + 1}
                                className="py-12 text-center text-gray-500 italic"
                              >
                                Zero rows returned
                              </td>
                            </tr>
                          ) : (
                            pagedRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[#1a1a1a] transition-colors">
                                <td className="w-12 min-w-[48px] max-w-[48px] px-3 py-2 text-center text-gray-500 font-mono text-[10px] border-r border-[#242424] bg-[#141414] sticky left-0 z-10 select-none">
                                  {(resultPage - 1) * resultLimit + rIdx + 1}
                                </td>
                                {activeResult.columns.map((colName) => {
                                  const val = row[colName];
                                  return (
                                    <td
                                      key={colName}
                                      className="px-4 py-2 border-r border-[#242424] truncate text-gray-200"
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="text-[10px] italic px-1.5 py-0.5 rounded border border-border/40 bg-surface-850 text-gray-500 font-mono">
                                          NULL
                                        </span>
                                      ) : typeof val === 'boolean' ? (
                                        val ? (
                                          <span className="text-[11px] text-emerald-400 font-mono font-medium">true</span>
                                        ) : (
                                          <span className="text-[11px] text-rose-400 font-mono font-medium">false</span>
                                        )
                                      ) : (
                                        <span>{String(val)}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Result Pagination Footer */}
                    {totalRows > 0 && (
                      <div className="px-4 py-2 bg-surface-900 border-t border-border-subtle flex items-center justify-between text-xs text-gray-400 select-none flex-shrink-0">
                        <span>
                          Showing <strong className="text-gray-200">{startRow}-{endRow}</strong> of{' '}
                          <strong className="text-gray-200">{totalRows.toLocaleString()}</strong> rows
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">
                            Page {resultPage} of {totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setResultPage(Math.max(1, resultPage - 1))}
                              disabled={resultPage <= 1}
                              className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setResultPage(Math.min(totalPages, resultPage + 1))}
                              disabled={resultPage >= totalPages}
                              className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* 3C. Sliding Query History Drawer */}
        <QueryHistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          history={history}
          onInsertQuery={(sql) => handleQueryChange(sql)}
          onRunQuery={(sql) => {
            handleQueryChange(sql);
            handleExecuteQuery(sql);
          }}
          onClearHistory={() => {
            setHistory([]);
            localStorage.removeItem('octa_query_history');
          }}
          showToast={showToast}
        />
      </div>
    </div>
  );
};
