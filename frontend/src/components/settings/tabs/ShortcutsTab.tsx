import React, { useState } from 'react';
import { Search, Keyboard } from 'lucide-react';
import { NAVIGATION_SHORTCUTS } from '../../../constants/shortcuts';
import { KeyBadge } from '../../common';

export const ShortcutsTab: React.FC = () => {
  const [search, setSearch] = useState('');

  const filteredShortcuts = NAVIGATION_SHORTCUTS.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter workspace navigation shortcuts..."
          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Shortcuts List */}
      <div className="bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60">
        <div className="px-4 py-2.5 bg-slate-100/50 dark:bg-zinc-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-brand-500" />
          <span>Workspace Navigation</span>
        </div>

        {filteredShortcuts.length > 0 ? (
          filteredShortcuts.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-xs text-slate-800 dark:text-zinc-200 font-medium">
                {item.label}
              </span>
              <KeyBadge keys={item.keys} />
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500">
            No matching shortcuts found
          </div>
        )}
      </div>
    </div>
  );
};
