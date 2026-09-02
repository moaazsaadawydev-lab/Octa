import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { QueryLog } from '../../types/connection';
import { getQueryLogs, clearQueryLogs } from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';

interface QueryConsoleProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
}

interface HttpLog {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  status: number;
  durationMs: number;
  timestamp: string;
}

export const QueryConsole: React.FC<QueryConsoleProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'sql' | 'http'>('sql');
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [httpLogs, setHttpLogs] = useState<HttpLog[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resizable console height state (persisted in localStorage)
  const [consoleHeight, setConsoleHeight] = useState<number>(() => {
    const saved = localStorage.getItem('octa_query_console_height');
    const num = saved ? Number(saved) : 180;
    return isNaN(num) ? 180 : Math.min(600, Math.max(100, num));
  });

  const resizingRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExpanded) {
      onToggleExpand();
    }
    resizingRef.current = { startY: e.clientY, startHeight: consoleHeight };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      // Moving mouse UP increases height
      const deltaY = resizingRef.current.startY - moveEvent.clientY;
      const nextHeight = Math.min(600, Math.max(100, resizingRef.current.startHeight + deltaY));
      setConsoleHeight(nextHeight);
      localStorage.setItem('octa_query_console_height', String(nextHeight));
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

  // Initial load of query logs
  useEffect(() => {
    getQueryLogs().then((res) => {
      if (res && res.length > 0) {
        setLogs(res);
      }
    });

    // Listen for live query_log events emitted by Wails backend
    try {
      if (runtime && typeof runtime.EventsOn === 'function') {
        const cancel = runtime.EventsOn('query_log', (newLog: QueryLog) => {
          setLogs((prev) => {
            const updated = [...prev, newLog];
            return updated.slice(-200); // keep last 200 logs
          });
        });
        return () => {
          if (cancel) cancel();
        };
      }
    } catch (e) {
      console.warn('Wails runtime event listener not available:', e);
    }
  }, []);

  // Auto-scroll to bottom when new logs arrive and console is open
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, httpLogs, isExpanded, activeConsoleTab]);

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeConsoleTab === 'sql') {
      await clearQueryLogs();
      setLogs([]);
    } else {
      setHttpLogs([]);
    }
  };

  const handleCopy = (e: React.MouseEvent, id: string, query: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to colorize SQL keywords
  const highlightSQL = (query: string) => {
    const keywords = [
      'SELECT',
      'FROM',
      'WHERE',
      'INSERT',
      'INTO',
      'VALUES',
      'UPDATE',
      'SET',
      'DELETE',
      'JOIN',
      'LEFT',
      'RIGHT',
      'INNER',
      'OUTER',
      'GROUP',
      'BY',
      'ORDER',
      'ASC',
      'DESC',
      'LIMIT',
      'OFFSET',
      'AND',
      'OR',
      'NOT',
      'IN',
      'IS',
      'NULL',
      'CREATE',
      'TABLE',
      'ALTER',
      'DROP',
      'EXPLAIN',
      'ANALYZE',
      'COSTS',
      'VERBOSE',
      'BUFFERS',
      'FORMAT',
      'JSON'
    ];

    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    const parts = query.split(regex);

    return parts.map((part, i) => {
      if (keywords.some((kw) => kw.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={i} className="text-cyan-400 font-semibold">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex-shrink-0 flex flex-col bg-white dark:bg-[#0c0d12] border-t border-slate-200 dark:border-zinc-800 transition-all duration-200 select-none z-10">
      {/* Resizable handle line */}
      {isExpanded && (
        <div
          onMouseDown={handleResizeStart}
          title="Drag to resize console"
          className="h-1.5 w-full cursor-row-resize bg-transparent hover:bg-brand-500/40 active:bg-brand-500 transition-colors z-20 flex-shrink-0"
        />
      )}

      {/* Header Bar */}
      <div
        onClick={onToggleExpand}
        className="px-3 py-1.5 bg-slate-100/80 dark:bg-[#0c0d12] hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 text-xs transition-colors"
      >
        {/* Tabs: SQL Logs & HTTP Network */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveConsoleTab('sql');
              if (!isExpanded) onToggleExpand();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeConsoleTab === 'sql'
                ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">SQL Logs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono">
              {logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveConsoleTab('http');
              if (!isExpanded) onToggleExpand();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeConsoleTab === 'http'
                ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <span className="text-xs">🌐</span>
            <span className="font-mono text-[11px]">HTTP Network</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono">
              {httpLogs.length}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {((activeConsoleTab === 'sql' && logs.length > 0) || (activeConsoleTab === 'http' && httpLogs.length > 0)) && (
            <button
              type="button"
              onClick={handleClear}
              title={`Clear ${activeConsoleTab === 'sql' ? 'SQL' : 'HTTP'} Logs`}
              className="p-1 rounded text-slate-400 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 p-0.5 rounded">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Console Log Content Area */}
      {isExpanded && (
        <div
          ref={scrollRef}
          style={{ height: consoleHeight }}
          className="overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1.5 bg-slate-50 dark:bg-[#090a0f] select-text"
        >
          {activeConsoleTab === 'sql' ? (
            logs.length === 0 ? (
              <div className="text-slate-400 dark:text-zinc-600 italic py-4 text-center select-none font-sans">
                No SQL queries executed yet. Query executions and schema modifications will appear here in real time.
              </div>
            ) : (
              logs.map((log) => {
                const isError = log.status === 'ERROR';

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-800/50 group transition-colors ${
                      isError ? 'bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-500 pl-2' : ''
                    }`}
                  >
                    {/* Status & Timestamp */}
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 flex-shrink-0 pt-0.5">
                      {isError ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{log.timestamp}</span>
                    </div>

                    {/* Duration Badge */}
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium flex-shrink-0 ${
                        isError
                          ? 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/50'
                          : log.durationMs > 100
                          ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40'
                          : 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40'
                      }`}
                    >
                      {log.durationMs.toFixed(2)}ms
                    </span>

                    {/* SQL Statement / Error */}
                    <div className="flex-1 break-all font-mono text-slate-800 dark:text-zinc-200">
                      <div className="whitespace-pre-wrap">{highlightSQL(log.query)}</div>
                      {isError && log.error && (
                        <div className="text-rose-600 dark:text-rose-400 mt-1 font-sans text-[11px] bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-200 dark:border-rose-900/40">
                          Error: {log.error}
                        </div>
                      )}
                    </div>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, log.id, log.query)}
                      title="Copy SQL Query"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all flex-shrink-0 cursor-pointer"
                    >
                      {copiedId === log.id ? (
                        <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                );
              })
            )
          ) : (
            httpLogs.length === 0 ? (
              <div className="text-slate-400 dark:text-zinc-600 italic py-4 text-center select-none font-sans">
                No HTTP network requests logged yet. API requests will appear here in real time.
              </div>
            ) : (
              httpLogs.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-2.5 p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-800/50 group transition-colors text-slate-800 dark:text-zinc-200"
                >
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">{req.timestamp}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                    {req.method}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                    {req.status}
                  </span>
                  <span className="text-slate-800 dark:text-zinc-300 truncate flex-1">{req.url}</span>
                  <span className="text-slate-400 dark:text-zinc-500 text-[10px]">{req.durationMs}ms</span>
                </div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
};
