import React from 'react';
import { Play, Trash2, History, Loader2 } from 'lucide-react';

interface RedisWorkbenchHeaderProps {
  isRunning: boolean;
  canRun: boolean;
  onRun: () => void;
  onInsertTemplate: (snippet: string) => void;
  onClear: () => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  historyCount: number;
}

const QUICK_SNIPPETS = [
  { label: 'PING', cmd: 'PING' },
  { label: 'INFO', cmd: 'INFO' },
  { label: 'DBSIZE', cmd: 'DBSIZE' },
  { label: 'KEYS *', cmd: 'KEYS *' },
  { label: 'SET', cmd: 'SET my_key "Hello Octa" EX 60' },
  { label: 'GET', cmd: 'GET my_key' },
  { label: 'HGETALL', cmd: 'HGETALL user:profile' },
  { label: 'LRANGE', cmd: 'LRANGE my_list 0 -1' },
];

export const RedisWorkbenchHeader: React.FC<RedisWorkbenchHeaderProps> = ({
  isRunning,
  canRun,
  onRun,
  onInsertTemplate,
  onClear,
  isHistoryOpen,
  onToggleHistory,
  historyCount,
}) => {
  return (
    <div className="h-12 border-b border-slate-200 dark:border-[#242429] bg-white dark:bg-[#141418] px-4 flex items-center justify-between gap-4 flex-shrink-0">
      {/* Left: Run Button & Connection DB Pill */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || !canRun}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
          title="Execute Command (Ctrl+Enter / Cmd+Enter)"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white" />
          )}
          <span>Run</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-emerald-700/60 text-[10px] text-emerald-100 font-mono">
            Ctrl+↵
          </kbd>
        </button>

        {/* Quick Command Snippets */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider mr-1">
            Quick:
          </span>
          {QUICK_SNIPPETS.map((tmpl) => (
            <button
              key={tmpl.label}
              type="button"
              onClick={() => onInsertTemplate(tmpl.cmd)}
              className="px-2 py-0.8 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1c22] dark:hover:bg-zinc-700 text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200 dark:border-zinc-800 text-[11px] font-mono transition-colors cursor-pointer"
              title={`Insert ${tmpl.cmd}`}
            >
              {tmpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Actions: Clear, History */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a20] dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-800 text-xs transition-colors cursor-pointer"
          title="Clear Editor"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>

        <button
          type="button"
          onClick={onToggleHistory}
          className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg text-xs border transition-colors cursor-pointer ${
            isHistoryOpen
              ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-300 dark:border-blue-500/50 text-blue-600 dark:text-blue-400'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a20] dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border-slate-200 dark:border-zinc-800'
          }`}
          title="Command History"
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({historyCount})</span>
        </button>
      </div>
    </div>
  );
};
