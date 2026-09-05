import React, { useState } from 'react';
import { History, Search, Trash2, X } from 'lucide-react';
import { QueryHistoryEntry } from '../types';
import { QueryHistoryItem } from './QueryHistoryItem';

export interface QueryHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: QueryHistoryEntry[];
  onInsertQuery: (query: string) => void;
  onRunQuery: (query: string) => void;
  onClearHistory: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QueryHistoryDrawer: React.FC<QueryHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onInsertQuery,
  onRunQuery,
  onClearHistory,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = history.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.query.toLowerCase().includes(q) ||
      (item.database && item.database.toLowerCase().includes(q))
    );
  });

  const handleCopy = (id: string, query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    showToast('SQL copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-80 sm:w-96 bg-white dark:bg-[#161616] border-l border-slate-200 dark:border-[#262626] flex flex-col h-full z-20 flex-shrink-0 shadow-2xl">
      <div className="p-3 bg-slate-50 dark:bg-[#1A1A1A] border-b border-slate-200 dark:border-[#2A2A2A] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider">Query History</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
            {history.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear all history"
              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-zinc-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2 border-b border-slate-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
            No query history found
          </div>
        ) : (
          filtered.map((item) => (
            <QueryHistoryItem
              key={item.id}
              item={item}
              isCopied={copiedId === item.id}
              onCopy={handleCopy}
              onInsert={onInsertQuery}
              onRun={onRunQuery}
            />
          ))
        )}
      </div>
    </div>
  );
};
