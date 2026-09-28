import React, { useMemo, useState } from 'react';
import { Search, Plus, Trash2, Cookie as CookieIcon, Globe, X } from 'lucide-react';
import { StoredCookie } from '../../types';

export interface CookieListPaneProps {
  cookies: StoredCookie[];
  selectedIndex: number | null;
  onSelectCookie: (index: number) => void;
  onAddCookie: () => void;
  onDeleteCookie: (index: number) => void;
  onClearAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const CookieListPane: React.FC<CookieListPaneProps> = ({
  cookies,
  selectedIndex,
  onSelectCookie,
  onAddCookie,
  onDeleteCookie,
  onClearAll,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const domains = useMemo(() => {
    const set = new Set<string>();
    cookies.forEach((c) => {
      if (c.domain) set.add(c.domain.toLowerCase());
    });
    return Array.from(set).sort();
  }, [cookies]);

  const filteredCookies = useMemo(() => {
    return cookies
      .map((cookie, originalIndex) => ({ cookie, originalIndex }))
      .filter(({ cookie }) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          cookie.name.toLowerCase().includes(query) ||
          cookie.domain.toLowerCase().includes(query) ||
          cookie.value.toLowerCase().includes(query);

        const matchesDomain =
          selectedDomain === 'all' || cookie.domain.toLowerCase() === selectedDomain;

        return matchesSearch && matchesDomain;
      });
  }, [cookies, searchQuery, selectedDomain]);

  return (
    <div className="w-80 border-r border-slate-200 dark:border-zinc-800/80 flex flex-col bg-slate-50/70 dark:bg-[#0c1017] flex-shrink-0 select-none">
      {/* Search & Add Bar */}
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Cookies ({cookies.length})
          </span>
          <button
            type="button"
            onClick={onAddCookie}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cookie</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, domain, token..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-white dark:bg-[#12161f] border border-slate-200 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Domain Filter Pills */}
        {domains.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedDomain('all')}
              className={`px-2 py-0.5 rounded-full font-mono transition-colors cursor-pointer ${
                selectedDomain === 'all'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                  : 'bg-slate-200/60 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({cookies.length})
            </button>
            {domains.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDomain(d)}
                className={`px-2 py-0.5 rounded-full font-mono whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDomain === d
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                    : 'bg-slate-200/60 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cookie List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredCookies.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-zinc-500 px-4">
            <CookieIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
            <p className="text-xs font-medium">No cookies found</p>
            <p className="text-[11px] opacity-70 mt-1">
              {cookies.length === 0
                ? 'Create a new cookie or run a request that sets cookies.'
                : 'Try adjusting your search or domain filter.'}
            </p>
          </div>
        ) : (
          filteredCookies.map(({ cookie, originalIndex }) => {
            const isSelected = selectedIndex === originalIndex;
            return (
              <div
                key={originalIndex}
                onClick={() => onSelectCookie(originalIndex)}
                className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/50 shadow-sm'
                    : 'bg-white dark:bg-[#12161f] border-slate-200/80 dark:border-zinc-800/70 hover:bg-slate-100/70 dark:hover:bg-[#171d29] hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                        {cookie.name || '<unnamed>'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                      <Globe className="w-3 h-3 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                      <span className="truncate">{cookie.domain}</span>
                      <span className="text-slate-400 dark:text-zinc-600">•</span>
                      <span className="truncate text-slate-400 dark:text-zinc-500">{cookie.path || '/'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60">
                        {cookie.value.length} chars
                      </span>
                      {cookie.httpOnly && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30">
                          HttpOnly
                        </span>
                      )}
                      {cookie.secure && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                          Secure
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCookie(originalIndex);
                    }}
                    title="Delete cookie"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Footer */}
      {cookies.length > 0 && (
        <div className="p-3 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-100/60 dark:bg-[#0f141c]">
          {isConfirmingClear ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setIsConfirmingClear(false);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer text-center"
              >
                Confirm Clear?
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Cookies</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
