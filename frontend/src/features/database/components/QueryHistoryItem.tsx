import React from 'react';
import { Copy, Check, Play, CornerDownLeft, Clock, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { QueryHistoryEntry } from '../types';

export interface QueryHistoryItemProps {
  item: QueryHistoryEntry;
  isCopied: boolean;
  onCopy: (id: string, query: string, e: React.MouseEvent) => void;
  onInsert: (query: string) => void;
  onRun: (query: string) => void;
}

export const QueryHistoryItem: React.FC<QueryHistoryItemProps> = ({
  item,
  isCopied,
  onCopy,
  onInsert,
  onRun,
}) => {
  const isSuccess = item.status === 'success';
  const timeStr = typeof item.timestamp === 'number' 
    ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : item.timestamp instanceof Date
    ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#1c1c20] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all text-xs font-mono group/item space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 truncate">
          {isSuccess ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3 h-3 text-rose-500 flex-shrink-0" />
          )}
          {item.database && (
            <span className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-zinc-300 truncate">
              <Database className="w-2.5 h-2.5" />
              <span>{item.database}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500 flex-shrink-0">
          <Clock className="w-2.5 h-2.5" />
          <span>{timeStr}</span>
        </div>
      </div>

      <div className="p-1.5 rounded bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800/80 max-h-20 overflow-y-auto text-[11px] select-text text-slate-800 dark:text-zinc-200 whitespace-pre-wrap break-all">
        {item.query}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
          {item.executionTime ? `${item.executionTime.toFixed(1)}ms` : ''}
          {item.rowCount !== undefined ? ` • ${item.rowCount} rows` : ''}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => onCopy(item.id, item.query, e)}
            title="Copy SQL"
            className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => onInsert(item.query)}
            title="Insert into editor"
            className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            <CornerDownLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onRun(item.query)}
            title="Run again"
            className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
          >
            <Play className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
