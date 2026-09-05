import React from 'react';
import { Plus, Trash2, ShieldCheck, Eye, EyeOff, Cookie as CookieIcon } from 'lucide-react';
import { HttpHeader, StoredCookie, ComputedAutoHeader } from '../../types';

export interface HeadersTabProps {
  headers: HttpHeader[];
  totalActiveHeadersCount: number;
  matchingCookies: StoredCookie[];
  showAutoHeaders: boolean;
  setShowAutoHeaders: (show: boolean) => void;
  computedAutoHeaders: ComputedAutoHeader[];
  handleToggleAutoHeader: (key: string, enable: boolean) => void;
  onHeadersChange: (headers: HttpHeader[]) => void;
  setIsCookieJarOpen: (open: boolean) => void;
}

export const HeadersTab: React.FC<HeadersTabProps> = ({
  headers,
  totalActiveHeadersCount,
  matchingCookies,
  showAutoHeaders,
  setShowAutoHeaders,
  computedAutoHeaders,
  handleToggleAutoHeader,
  onHeadersChange,
  setIsCookieJarOpen,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-[#26262a]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Headers</span>
          <span className="text-[10px] text-zinc-500 font-mono">({totalActiveHeadersCount} active)</span>
        </div>
        <div className="flex items-center gap-2">
          {matchingCookies.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCookieJarOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-mono cursor-pointer hover:bg-amber-950/70 transition-colors"
            >
              <CookieIcon className="w-3 h-3 text-amber-400" />
              <span>{matchingCookies.length} cookie(s)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAutoHeaders(!showAutoHeaders)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800 transition-colors cursor-pointer"
          >
            {showAutoHeaders ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Hide auto-generated headers ({computedAutoHeaders.length})</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-brand-400" />
                <span>Show auto-generated headers ({computedAutoHeaders.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showAutoHeaders && (
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-900/60">
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>Auto-Generated System Headers</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-normal italic hidden sm:inline">Custom headers with matching key override these</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-zinc-800/80">
            {computedAutoHeaders.map((ah) => (
              <div
                key={ah.key}
                className={
                  'grid grid-cols-[36px_1.5fr_2fr_100px] items-center gap-2 px-3 py-1.5 text-xs transition-colors ' +
                  (ah.isOverridden
                    ? 'bg-slate-100/50 dark:bg-[#151517]/50 opacity-50'
                    : ah.isChecked
                    ? 'bg-white dark:bg-[#161618]/40 hover:bg-slate-50 dark:hover:bg-[#18181c]/60'
                    : 'bg-slate-50/60 dark:bg-[#141416]/40 opacity-60')
                }
              >
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={ah.isChecked}
                    disabled={ah.isOverridden}
                    onChange={(e) => handleToggleAutoHeader(ah.key, e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer disabled:opacity-40"
                  />
                </div>
                <span className={'px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 font-mono text-[11px] select-text ' + (ah.isOverridden ? 'line-through text-slate-400 dark:text-zinc-600' : 'text-slate-700 dark:text-zinc-300 italic')}>
                  {ah.key}
                </span>
                <span className={'px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 font-mono text-[11px] select-text truncate ' + (ah.isOverridden ? 'line-through text-slate-400 dark:text-zinc-600' : 'text-slate-800 dark:text-zinc-200 italic')} title={ah.value}>
                  {ah.value}
                </span>
                <div className="flex items-center justify-end">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 font-mono">
                    {ah.isOverridden ? 'overridden' : 'auto'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          Custom Headers ({headers.length})
        </div>
        {headers.map((h, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={h.enabled}
              onChange={(e) => {
                const next = [...headers];
                next[idx].enabled = e.target.checked;
                onHeadersChange(next);
              }}
              className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer"
            />
            <input
              type="text"
              value={h.key}
              onChange={(e) => {
                const next = [...headers];
                next[idx].key = e.target.value;
                onHeadersChange(next);
              }}
              placeholder="Header Name"
              className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
            />
            <input
              type="text"
              value={h.value}
              onChange={(e) => {
                const next = [...headers];
                next[idx].value = e.target.value;
                onHeadersChange(next);
              }}
              placeholder="Value"
              className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => onHeadersChange(headers.filter((_, i) => i !== idx))}
              title="Remove Header"
              className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onHeadersChange([...headers, { key: '', value: '', enabled: true }])}
          className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Header</span>
        </button>
      </div>
    </div>
  );
};
