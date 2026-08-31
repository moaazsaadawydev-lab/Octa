import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { QueryLog } from '../types/connection';
import { getQueryLogs, clearQueryLogs } from '../services/api';
import * as runtime from '../../wailsjs/runtime/runtime';

interface QueryConsoleProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const QueryConsole: React.FC<QueryConsoleProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resizable console height state (persisted in localStorage)
  const [consoleHeight, setConsoleHeight] = useState<number>(() => {
    const saved = localStorage.getItem('octa_query_console_height') || localStorage.getItem('devcockpit_query_console_height');
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
  }, [logs, isExpanded]);

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await clearQueryLogs();
    setLogs([]);
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
      'ORDER BY',
      'GROUP BY',
      'LIMIT',
      'OFFSET',
      'ALTER TABLE',
      'ADD COLUMN',
      'DROP COLUMN',
      'RENAME COLUMN',
      'TO',
      'CASCADE',
      'NOT NULL',
      'INSERT INTO',
      'UPDATE',
      'DELETE',
      'JOIN',
      'LEFT JOIN',
      'RIGHT JOIN',
      'INNER JOIN',
      'AND',
      'OR',
      'IN',
      'AS',
      'COUNT',
      'LIKE',
      'ILIKE',
    ];

    // Simple regex highlighter
    const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    const parts = query.split(pattern);

    return parts.map((part, i) => {
      if (keywords.some((kw) => kw.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={i} className="text-brand-400 font-semibold">
            {part.toUpperCase()}
          </span>
        );
      }
      return <span key={i} className="text-gray-300">{part}</span>;
    });
  };

  return (
    <div className="border-t border-border-subtle bg-surface-950 flex flex-col z-10 select-none relative flex-shrink-0 group/console">
      {/* Horizontal Drag-to-Resize Splitter Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 right-0 -top-1 h-2.5 cursor-row-resize select-none flex items-center justify-center group/resizer z-20 hover:bg-brand-500/10 active:bg-brand-500/20"
      >
        <div className="h-[2px] w-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
      </div>

      {/* Console Header Bar */}
      <div
        onClick={onToggleExpand}
        className="px-4 py-2 bg-surface-900/90 hover:bg-surface-850 border-b border-border/40 flex items-center justify-between cursor-pointer text-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-gray-300 font-medium">
            <Terminal className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-mono">SQL Query Log</span>
          </div>

          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-gray-400 border border-border/50 font-mono">
            {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={handleClear}
              title="Clear Logs"
              className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-surface-750 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="text-gray-400 hover:text-gray-200 p-0.5 rounded">
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
          className="overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1.5 bg-[#0d0d0d] select-text"
        >
          {logs.length === 0 ? (
            <div className="text-gray-600 italic py-4 text-center select-none">
              No SQL queries executed yet. Query executions and schema modifications will appear here in real time.
            </div>
          ) : (
            logs.map((log) => {
              const isError = log.status === 'ERROR';

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2.5 p-1.5 rounded hover:bg-surface-850/60 group transition-colors ${
                    isError ? 'bg-rose-950/20 border-l-2 border-rose-500 pl-2' : ''
                  }`}
                >
                  {/* Status & Timestamp */}
                  <div className="flex items-center gap-1.5 text-gray-500 flex-shrink-0 pt-0.5">
                    {isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                    )}
                    <span className="text-[10px] text-gray-400 font-mono">{log.timestamp}</span>
                  </div>

                  {/* Duration Badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium flex-shrink-0 ${
                      isError
                        ? 'text-rose-400 bg-rose-950/50'
                        : log.durationMs > 100
                        ? 'text-amber-400 bg-amber-950/40'
                        : 'text-emerald-400 bg-emerald-950/40'
                    }`}
                  >
                    {log.durationMs.toFixed(2)}ms
                  </span>

                  {/* SQL Statement / Error */}
                  <div className="flex-1 break-all font-mono">
                    <div className="whitespace-pre-wrap">{highlightSQL(log.query)}</div>
                    {isError && log.error && (
                      <div className="text-rose-400 mt-1 font-sans text-[11px] bg-rose-950/30 p-1.5 rounded border border-rose-900/40">
                        Error: {log.error}
                      </div>
                    )}
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={(e) => handleCopy(e, log.id, log.query)}
                    title="Copy Query"
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-300 hover:bg-surface-750 rounded transition-opacity flex-shrink-0"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
