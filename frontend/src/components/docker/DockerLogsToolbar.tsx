import React from 'react';
import { Search, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface DockerLogsToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onClear: () => void;
}

export const DockerLogsToolbar: React.FC<DockerLogsToolbarProps> = ({
  searchTerm,
  onSearchChange,
  onFindNext,
  onFindPrevious,
  autoScroll,
  onToggleAutoScroll,
  onClear,
}) => {
  return (
    <div className="px-4 py-2 bg-slate-100/70 dark:bg-[#08090d] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-shrink-0 select-none">
      {/* Search in Logs */}
      <div className="flex items-center gap-1.5 flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  onFindPrevious();
                } else {
                  onFindNext();
                }
              }
            }}
            className="w-full pl-8 pr-16 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-brand-500 font-mono transition-colors"
          />
          {searchTerm && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={onFindPrevious}
                title="Find Previous (Shift+Enter)"
                className="p-0.5 rounded text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onFindNext}
                title="Find Next (Enter)"
                className="p-0.5 rounded text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Tools: AutoScroll, Clear */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={onToggleAutoScroll}
          className={clsx(
            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
            autoScroll
              ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-300 dark:border-brand-800/80'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
          )}
        >
          <ArrowDown className="w-3 h-3" />
          <span>Auto-scroll</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          title="Clear Log Stream Buffer"
          className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
