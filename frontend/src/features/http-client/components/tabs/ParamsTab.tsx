import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HttpParam } from '../../types';

export interface ParamsTabProps {
  params: HttpParam[];
  onChange: (params: HttpParam[]) => void;
}

export const ParamsTab: React.FC<ParamsTabProps> = ({ params, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          Query Parameters ({params.length})
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Auto-syncs with URL</span>
      </div>

      {params.length === 0 && (
        <div className="text-xs text-zinc-500 py-3 text-center border border-dashed border-zinc-800 rounded-lg">
          No query parameters. Type <code className="text-zinc-400 font-mono">?key=value</code> in the URL bar or click below.
        </div>
      )}

      {params.map((p, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={p.enabled}
            onChange={(e) => {
              const next = [...params];
              next[idx] = { ...next[idx], enabled: e.target.checked };
              onChange(next);
            }}
            className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer"
          />
          <input
            type="text"
            value={p.key}
            onChange={(e) => {
              const next = [...params];
              next[idx] = { ...next[idx], key: e.target.value };
              onChange(next);
            }}
            placeholder="Key"
            className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
          />
          <input
            type="text"
            value={p.value}
            onChange={(e) => {
              const next = [...params];
              next[idx] = { ...next[idx], value: e.target.value };
              onChange(next);
            }}
            placeholder="Value"
            className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => onChange(params.filter((_, i) => i !== idx))}
            title="Remove Parameter"
            className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...params, { key: '', value: '', enabled: true }])}
        className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Parameter</span>
      </button>
    </div>
  );
};
