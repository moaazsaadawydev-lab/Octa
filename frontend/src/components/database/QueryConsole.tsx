import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { QueryLog } from '../../types/connection';
import { getQueryLogs, clearQueryLogs } from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';
import { QueryLogList } from './console/QueryLogList';
import { HttpLogList, HttpLog } from './console/HttpLogList';

export interface QueryConsoleProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
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

  const [consoleHeight, setConsoleHeight] = useState<number>(() => {
    const saved = localStorage.getItem('octa_query_console_height');
    const num = saved ? Number(saved) : 180;
    return isNaN(num) ? 180 : Math.min(600, Math.max(100, num));
  });

  const resizingRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExpanded) onToggleExpand();
    resizingRef.current = { startY: e.clientY, startHeight: consoleHeight };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
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

  useEffect(() => {
    getQueryLogs().then((res) => {
      if (res && res.length > 0) setLogs(res);
    });

    try {
      if (runtime && typeof runtime.EventsOn === 'function') {
        const cancel = runtime.EventsOn('query_log', (newLog: QueryLog) => {
          setLogs((prev) => [...prev, newLog].slice(-200));
        });
        return () => {
          if (cancel) cancel();
        };
      }
    } catch (e) {
      console.warn('Wails runtime event listener not available:', e);
    }
  }, []);

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

  return (
    <div
      style={{ height: isExpanded ? `${consoleHeight}px` : '32px' }}
      className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141416] flex flex-col transition-[height] duration-75 relative z-30 select-none shadow-lg"
    >
      {isExpanded && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize z-40 hover:bg-brand-500/40"
        />
      )}

      <div
        onClick={onToggleExpand}
        className="h-8 px-3 flex items-center justify-between bg-slate-50 dark:bg-[#18181c] border-b border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
            <Terminal className="w-3.5 h-3.5 text-brand-500" />
            <span>Console</span>
          </div>

          <div
            className="flex items-center bg-slate-200/80 dark:bg-zinc-900 rounded p-0.5 text-[11px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveConsoleTab('sql')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeConsoleTab === 'sql'
                  ? 'bg-white dark:bg-zinc-800 font-medium text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              SQL ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveConsoleTab('http')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeConsoleTab === 'http'
                  ? 'bg-white dark:bg-zinc-800 font-medium text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              HTTP ({httpLogs.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClear}
            title="Clear Console"
            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <div className="p-0.5 text-slate-400">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {activeConsoleTab === 'sql' ? (
            <QueryLogList logs={logs} copiedId={copiedId} onCopy={handleCopy} />
          ) : (
            <HttpLogList logs={httpLogs} copiedId={copiedId} onCopy={handleCopy} />
          )}
        </div>
      )}
    </div>
  );
};
