import React, { useState, useMemo } from 'react';
import {
  Search,
  Keyboard,
  Globe,
  Database,
  Terminal,
  GitBranch,
  Boxes,
  Sliders,
  Compass,
} from 'lucide-react';
import clsx from 'clsx';
import {
  ALL_SHORTCUTS,
  ALL_SHORTCUT_GROUPS,
  ShortcutCategory,
  ShortcutGroup,
} from '../../../constants/shortcuts';
import { KeyBadge } from '../../common';

const CATEGORY_ICONS: Record<ShortcutCategory, React.ReactNode> = {
  'Workspace Navigation': <Compass className="w-3.5 h-3.5 text-brand-500" />,
  'General & Window': <Sliders className="w-3.5 h-3.5 text-blue-500" />,
  'HTTP / API Client': <Globe className="w-3.5 h-3.5 text-amber-500" />,
  'Database & SQL': <Database className="w-3.5 h-3.5 text-emerald-500" />,
  Terminal: <Terminal className="w-3.5 h-3.5 text-purple-500" />,
  'Source Control (Git)': <GitBranch className="w-3.5 h-3.5 text-rose-500" />,
  'Redis Cache': <Boxes className="w-3.5 h-3.5 text-red-500" />,
};

export const ShortcutsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Filter groups and items
  const filteredGroups = useMemo<ShortcutGroup[]>(() => {
    const q = search.trim().toLowerCase();

    return ALL_SHORTCUT_GROUPS.map((group) => {
      if (selectedCategory !== 'All' && group.category !== selectedCategory) {
        return { ...group, items: [] };
      }

      const matchingItems = group.items.filter((item) => {
        if (!q) return true;
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesKey = item.keys.some((k) => k.toLowerCase().includes(q));
        const combinedKeys = item.keys.join('+').toLowerCase();
        return matchesLabel || matchesDesc || matchesCat || matchesKey || combinedKeys.includes(q);
      });

      return {
        ...group,
        items: matchingItems,
      };
    }).filter((g) => g.items.length > 0);
  }, [search, selectedCategory]);

  const totalResults = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.length, 0),
    [filteredGroups]
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all shortcuts (e.g. Ctrl+1, Enter, Save, HTTP, Git, Terminal)..."
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0a0d13] border border-slate-200 dark:border-zinc-800/80 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
        <button
          type="button"
          onClick={() => setSelectedCategory('All')}
          className={clsx(
            'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer',
            selectedCategory === 'All'
              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
              : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60'
          )}
        >
          All ({ALL_SHORTCUTS.length})
        </button>
        {ALL_SHORTCUT_GROUPS.map((g) => (
          <button
            key={g.category}
            type="button"
            onClick={() => setSelectedCategory(g.category)}
            className={clsx(
              'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer',
              selectedCategory === g.category
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60'
            )}
          >
            {g.category}
          </button>
        ))}
      </div>

      {/* Grouped Shortcuts Catalog */}
      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {totalResults > 0 ? (
          filteredGroups.map((group) => (
            <div
              key={group.category}
              className="bg-slate-50/70 dark:bg-[#0e1219] border border-slate-200 dark:border-zinc-800/80 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60"
            >
              {/* Category Header */}
              <div className="px-4 py-2 bg-slate-100/60 dark:bg-[#121620] text-[11px] font-semibold tracking-wider text-slate-600 dark:text-zinc-300 flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[group.category] || <Keyboard className="w-3.5 h-3.5 text-brand-500" />}
                  <span>{group.category}</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                  {group.items.length} {group.items.length === 1 ? 'shortcut' : 'shortcuts'}
                </span>
              </div>

              {/* Items in Category */}
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-100/60 dark:hover:bg-[#161c28] transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                    <span className="text-xs text-slate-800 dark:text-zinc-200 font-medium">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                      {item.description}
                    </span>
                  </div>
                  <KeyBadge keys={item.keys} />
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-[#0a0d13] border border-slate-200 dark:border-zinc-800 rounded-xl">
            No matching shortcuts found for "{search}"
          </div>
        )}
      </div>
    </div>
  );
};
