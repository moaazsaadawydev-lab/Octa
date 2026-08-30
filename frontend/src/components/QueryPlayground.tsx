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
  FileCode,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ActiveSession, QueryResult, QueryTab } from '../types/connection';
import { executeRawQuery, getTables, getTableSchema } from '../services/api';
import { QueryEditor } from './QueryEditor';

interface QueryPlaygroundProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_QUERY = `-- DevCockpit SQL Playground
-- Press Ctrl + Enter to run selected text or full query

SELECT 
  'DevCockpit' AS application,
  'Phase 3: SQL Playground' AS milestone,
  NOW() AS executed_at;
`;

export const QueryPlayground: React.FC<QueryPlaygroundProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
}) => {
  // Tabs State
  const [tabs, setTabs] = useState<QueryTab[]>(() => {
    try {
      const saved = localStorage.getItem('devcockpit_query_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t) => ({
            ...t,
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
        results: null,
        activeResultIndex: 0,
        isExecuting: false,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || 'tab-1');

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
          } catch (e) {
            // ignore schema query errors
          }
        }
        if (isMounted) {
          setColumns(Array.from(colsSet));
        }
      })
      .catch((e) => console.warn('Failed to load schema for Intellisense', e));

    return () => {
      isMounted = false;
    };
  }, [activeSession?.connection?.id, activeSession?.activeDatabase]);

  // Save tabs (without results) to localStorage
  useEffect(() => {
    try {
      const toSave = tabs.map(({ id, title, query }) => ({ id, title, query }));
      localStorage.setItem('devcockpit_query_tabs', JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save query tabs to localStorage', e);
    }
  }, [tabs]);

  // Resizable Results Panel Height
  const [resultsHeight, setResultsHeight] = useState<number>(() => {
    const saved = localStorage.getItem('devcockpit_playground_results_height');
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
      localStorage.setItem('devcockpit_playground_results_height', String(nextHeight));
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

  // Add new query tab
  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const newTab: QueryTab = {
      id: 'tab-' + Date.now(),
      title: `Query ${nextIdx}.sql`,
      query: `-- Query ${nextIdx}\n\n`,
      results: null,
      activeResultIndex: 0,
      isExecuting: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Close tab
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setTabs([
        {
          id: 'tab-1',
          title: 'Query 1.sql',
          query: '',
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

  // Update current active tab query content
  const handleQueryChange = (newQuery: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, query: newQuery } : t))
    );
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

    try {
      const results = await executeRawQuery(
        activeSession.connection,
        activeSession.activeDatabase,
        sqlToRun
      );

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, results, activeResultIndex: 0, isExecuting: false }
            : t
        )
      );

      setResultPage(1);

      const hasError = results.some((r) => Boolean(r.error));
      if (hasError) {
        showToast('Query finished with errors', 'error');
      } else {
        showToast(
          `Executed ${results.length} statement${results.length > 1 ? 's' : ''} successfully`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Failed to execute query:', err);
      showToast(`Execution failed: ${err?.message || err}`, 'error');
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isExecuting: false } : t))
      );
    }
  };

  // Export active result set to JSON
  const handleExportJSON = () => {
    if (!activeTab.results || activeTab.results.length === 0) return;
    const activeResult = activeTab.results[activeTab.activeResultIndex];
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
    const activeResult = activeTab.results[activeTab.activeResultIndex];
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
    const rowLines = activeResult.rows.map((row) =>
      cols.map((col) => escapeCSV(row[col])).join(',')
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
        t.id === activeTabId ? { ...t, query: '', results: null } : t
      )
    );
    showToast('Editor cleared', 'info');
  };

  // If no connection is active, render welcoming prompt
  if (!activeSession) {
    return (
      <div className="flex-1 bg-surface-950 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-6 shadow-xl">
            <Terminal className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-bold text-gray-100 mb-2">SQL Playground</h1>
          <p className="text-xs text-gray-400 leading-relaxed mb-8">
            Interactive SQL workspace with multi-tab editor, statement execution, and instant data grid results. Connect to a database to begin.
          </p>

          <button
            onClick={onOpenNewModal}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-900 border border-border/80 hover:border-brand-500/50 hover:bg-surface-850 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-100">Add New Connection</div>
                <div className="text-[11px] text-gray-400">Connect to PostgreSQL server</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    );
  }

  const activeResult: QueryResult | undefined =
    activeTab.results?.[activeTab.activeResultIndex];

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
      {/* 1. Top Query Tabs Bar */}
      <div className="bg-surface-950 border-b border-border-subtle flex items-center justify-between px-2 pt-2 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto max-w-4xl no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg border-t border-x cursor-pointer text-xs transition-colors select-none ${
                  isActive
                    ? 'bg-[#121212] border-border/80 text-gray-100 font-medium'
                    : 'bg-surface-900 border-transparent text-gray-400 hover:bg-surface-850 hover:text-gray-200'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-gray-500'}`} />
                <span className="font-mono text-[11px] truncate max-w-[140px]">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  title="Close Tab"
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 rounded p-0.5 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddTab}
            title="New Query Tab"
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-surface-850 rounded-lg transition-colors ml-1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Database Context Indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pb-1.5 pr-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-medium text-[11px]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activeSession.connection.name}</span>
            <span className="text-emerald-500/50">/</span>
            <span className="font-semibold">{activeSession.activeDatabase}</span>
          </div>
        </div>
      </div>

      {/* 2. Execution Control Action Bar */}
      <div className="px-4 py-2 bg-surface-900 border-b border-border-subtle flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Run Button */}
          <button
            type="button"
            onClick={() => handleExecuteQuery()}
            disabled={activeTab.isExecuting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {activeTab.isExecuting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run</span>
            <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.2 rounded font-mono text-emerald-200 border border-emerald-500/30">
              Ctrl + ↵
            </span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-400 hover:text-gray-200 border border-border/60 text-xs transition-colors"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Query Meta Status */}
        {activeResult && (
          <div className="flex items-center gap-3 text-xs text-gray-400 font-mono text-[11px]">
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
      </div>

      {/* 3. Query Code Editor */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-h-[120px]">
        <QueryEditor
          value={activeTab.query}
          onChange={handleQueryChange}
          onExecute={handleExecuteQuery}
          isExecuting={activeTab.isExecuting}
          tables={tables}
          columns={columns}
        />
      </div>

      {/* 4. Split Resizable Query Results Panel */}
      <div
        style={{ height: activeTab.results ? resultsHeight : 'auto' }}
        className={`border-t border-border-subtle bg-surface-900 flex flex-col relative flex-shrink-0 transition-all duration-150 ${
          !activeTab.results ? 'min-h-[38px] overflow-hidden' : ''
        }`}
      >
        {/* Horizontal Splitter Resizer Handle */}
        {activeTab.results && (
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
              Results
            </span>

            {/* Multi-Statement Result Tabs */}
            {activeTab.results && activeTab.results.length > 0 &&
              activeTab.results.map((res, rIdx) => {
                const isSelected = activeTab.activeResultIndex === rIdx;
                const isErr = Boolean(res.error);

                return (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => {
                      setTabs((prev) =>
                        prev.map((t) =>
                          t.id === activeTabId ? { ...t, activeResultIndex: rIdx } : t
                        )
                      );
                      setResultPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
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
          </div>

          {/* Right-side: Export actions or placeholder hint */}
          {!activeTab.results ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 select-none flex-shrink-0">
              <span>Execute SQL queries (</span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-border/60 text-zinc-300 font-mono text-[10px]">
                Ctrl + Enter
              </kbd>
              <span>) to view result sets</span>
            </div>
          ) : activeResult && activeResult.rows && activeResult.rows.length > 0 ? (
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
        {activeTab.results && (
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
                        className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setResultPage(Math.min(totalPages, resultPage + 1))}
                        disabled={resultPage >= totalPages}
                        className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed"
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
      )}
      </div>
    </div>
  );
};
