import React from 'react';
import { History, Globe, X } from 'lucide-react';
import { BrowserHistoryItem } from '../types';

interface BrowserSuggestionsDropdownProps {
  suggestions: BrowserHistoryItem[];
  selectedIndex: number;
  onSelect: (item: BrowserHistoryItem) => void;
  onRemoveItem?: (url: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export const BrowserSuggestionsDropdown: React.FC<BrowserSuggestionsDropdownProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  onRemoveItem,
  dropdownRef,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-[#181920] border border-slate-200 dark:border-zinc-700/80 rounded-lg shadow-2xl z-50 overflow-hidden"
    >
      <div className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-zinc-500 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800">
        <span className="flex items-center gap-1">
          <History className="w-3 h-3" />
          Frequently Visited Localhosts
        </span>
        <span>{suggestions.length} suggestions</span>
      </div>

      <div className="max-h-60 overflow-y-auto py-0.5">
        {suggestions.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={item.url}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className={`group flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Globe className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-zinc-500" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate font-sans font-medium text-slate-900 dark:text-zinc-100">
                      {item.title || 'Localhost Service'}
                    </span>
                    {item.port && (
                      <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        :{item.port}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                    {item.url}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                  {item.visitCount} visits
                </span>
                {onRemoveItem && (
                  <button
                    type="button"
                    title="Remove from history"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.url);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
