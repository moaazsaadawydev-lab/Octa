import React from 'react';
import { RotateCcw } from 'lucide-react';
import { CommandHistoryItem } from './types';
import { RedisResultBadge } from './RedisResultBadge';

interface RedisHistoryDrawerProps {
  isOpen: boolean;
  history: CommandHistoryItem[];
  activeHistoryId: string | null;
  onSelectHistory: (id: string) => void;
  onClearHistory: () => void;
  onLoadIntoEditor: (cmd: string) => void;
}

export const RedisHistoryDrawer: React.FC<RedisHistoryDrawerProps> = ({
  isOpen,
  history,
  activeHistoryId,
  onSelectHistory,
  onClearHistory,
  onLoadIntoEditor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="border-t border-slate-200 dark:border-[#242429] bg-white dark:bg-[#121216] max-h-48 overflow-y-auto p-3 select-none transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
          Execution History
        </span>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-[11px] text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
        >
          Clear History
        </button>
      </div>
      <div className="space-y-1">
        {history.map((h) => {
          const isSelected = h.id === activeHistoryId;
          return (
            <div
              key={h.id}
              onClick={() => onSelectHistory(h.id)}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-600/20 border border-blue-400 dark:border-blue-500/40 text-blue-900 dark:text-blue-200 font-medium'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#18181d] dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-1">
                <RedisResultBadge type={h.result.resultType} />
                <span className="truncate font-semibold">{h.command}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 flex-shrink-0">
                <span>{h.result.durationMs.toFixed(1)}ms</span>
                <span>{h.timestamp}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadIntoEditor(h.command);
                  }}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  title="Load Command into Editor"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
