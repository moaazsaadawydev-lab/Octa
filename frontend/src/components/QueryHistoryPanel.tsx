import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  X,
  Copy,
  Check,
  Play,
  CornerDownLeft,
  Clock,
  Database,
  CheckCircle2,
  AlertCircle,
  Code
} from 'lucide-react';
import { QueryHistoryEntry } from '../types/connection';

interface QueryHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: QueryHistoryEntry[];
  onInsertQuery: (query: string) => void;
  onRunQuery: (query: string) => void;
  onClearHistory: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QueryHistoryPanel: React.FC<QueryHistoryPanelProps> = ({
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.query.toLowerCase().includes(q) ||
      item.database.toLowerCase().includes(q) ||
      (item.errorMessage && item.errorMessage.toLowerCase().includes(q))
    );
  });

  const handleCopy = (id: string, query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    showToast('SQL copied to clipboard', 'info');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    const now = Date.now();
    const diffSec = Math.floor((now - ts) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-80 sm:w-96 bg-[#161616] border-l border-[#262626] flex flex-col h-full z-20 flex-shrink-0 animate-fade-in shadow-2xl">
      {/* 1. Header */}
      <div className="p-3 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
            Query History
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-cyan-300 border border-cyan-500/30 font-mono">
            {history.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              title="Clear all history"
              className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close panel"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clear Confirmation Banner */}
      {showClearConfirm && (
        <div className="p-3 bg-rose-950/70 border-b border-rose-500/40 text-xs text-rose-200 flex flex-col gap-2">
          <span>Are you sure you want to clear all query history?</span>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClearHistory();
                setShowClearConfirm(false);
                showToast('Execution history cleared', 'info');
              }}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px]"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* 2. Search Input */}
      <div className="p-2.5 border-b border-[#262626] bg-[#141414]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries or database..."
            className="w-full bg-[#1F1F1F] border border-[#2D2D2D] rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. History List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222222]">
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs italic select-none px-4">
            {search ? 'No matching queries found' : 'No queries executed yet'}
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isSuccess = item.status === 'success';
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="p-3 hover:bg-[#1C1C1C] transition-colors group relative select-text"
              >
                {/* Header Row: Status, DB, Duration, Timestamp */}
                <div className="flex items-center justify-between text-[11px] mb-1.5 select-none">
                  <div className="flex items-center gap-1.5">
                    {isSuccess ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium font-mono">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>OK</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30 text-[10px] font-medium font-mono">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>ERR</span>
                      </span>
                    )}

                    <span className="text-zinc-400 font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700/50 truncate max-w-[100px]">
                      {item.database}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                    <span className="text-zinc-400">{item.durationMs.toFixed(1)}ms</span>
                    <span>•</span>
                    <span title={new Date(item.timestamp).toLocaleString()}>{formatTime(item.timestamp)}</span>
                  </div>
                </div>

                {/* SQL Statement Code Preview */}
                <div className="font-mono text-xs text-zinc-200 bg-[#121212] p-2 rounded-md border border-[#292929] max-h-24 overflow-y-auto whitespace-pre-wrap break-all select-text leading-relaxed">
                  {item.query}
                </div>

                {/* Error message if any */}
                {item.errorMessage && (
                  <div className="mt-1 text-[11px] text-rose-400/90 font-mono truncate" title={item.errorMessage}>
                    {item.errorMessage}
                  </div>
                )}

                {/* Rows affected or rows count info */}
                {item.rowsCount !== undefined && isSuccess && (
                  <div className="mt-1 text-[10px] text-zinc-500 font-mono">
                    {item.rowsCount} record{item.rowsCount === 1 ? '' : 's'}
                  </div>
                )}

                {/* Hover Action Bar */}
                <div className="mt-2 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(item.id, item.query, e)}
                    title="Copy Query"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium border border-zinc-700/60 transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-zinc-400" />
                    )}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onInsertQuery(item.query);
                      showToast('Inserted into editor', 'info');
                    }}
                    title="Insert into active editor tab"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 hover:text-cyan-200 text-[10px] font-medium border border-zinc-700/60 transition-colors cursor-pointer"
                  >
                    <CornerDownLeft className="w-3 h-3 text-cyan-400" />
                    <span>Insert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRunQuery(item.query);
                    }}
                    title="Run query now"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-medium transition-colors cursor-pointer shadow-sm"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
