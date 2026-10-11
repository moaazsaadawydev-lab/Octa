import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Command, CornerDownLeft } from 'lucide-react';
import { PaletteAction } from './types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  actions,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;

    return actions.filter((action) => {
      if (action.title.toLowerCase().includes(q)) return true;
      if (action.subtitle?.toLowerCase().includes(q)) return true;
      if (action.category.toLowerCase().includes(q)) return true;
      if (action.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [actions, query]);

  // Reset selected index when query changes or opened
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredActions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredActions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#121318] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#16171d]">
          <Search className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, workspace, or connection..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 divide-y divide-transparent scrollbar-thin scrollbar-thumb-zinc-700"
        >
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500">
              <Command className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No commands found for "{query}"</p>
              <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">Try another keyword</p>
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  data-index={idx}
                  onClick={() => action.run()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-500/10 dark:bg-brand-500/15 text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{action.title}</span>
                        <span className="text-[10px] font-normal uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                          {action.category}
                        </span>
                      </div>
                      {action.subtitle && (
                        <div className="text-[11px] text-slate-400 dark:text-zinc-400 truncate mt-0.5">
                          {action.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {action.shortcut && (
                      <kbd className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 text-slate-500 dark:text-zinc-400">
                        {action.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 animate-in fade-in" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#0e0f12] text-[11px] text-slate-400 dark:text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-slate-200 dark:bg-zinc-800 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1 rounded bg-slate-200 dark:bg-zinc-800 font-mono text-[10px]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono text-[10px]">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-slate-200 dark:bg-zinc-800 font-mono text-[10px]">esc</kbd>
              <span>close</span>
            </span>
          </div>
          <span className="font-mono text-[10px]">Octa Command Palette</span>
        </div>
      </div>
    </div>
  );
};
