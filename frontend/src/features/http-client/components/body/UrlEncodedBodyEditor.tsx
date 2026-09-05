import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UrlEncodedField } from '../../types';

export interface UrlEncodedBodyEditorProps {
  fields: UrlEncodedField[];
  onChange: (fields: UrlEncodedField[]) => void;
}

export const UrlEncodedBodyEditor: React.FC<UrlEncodedBodyEditorProps> = ({ fields, onChange }) => {
  return (
    <div className="flex-1 flex flex-col space-y-2 min-h-0">
      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
        URL Encoded Key-Value Pairs
      </div>

      <div className="border border-slate-200 dark:border-[#26262a] rounded-xl overflow-hidden bg-white dark:bg-[#161618]">
        <div className="grid grid-cols-[36px_1fr_1fr_40px] items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#1a1a1e] border-b border-slate-200 dark:border-[#26262a] text-[11px] font-semibold text-slate-700 dark:text-zinc-400">
          <span className="text-center">#</span>
          <span>Key</span>
          <span>Value</span>
          <span className="text-right"></span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#222226]">
          {fields.map((row, idx) => (
            <div
              key={row.id || idx}
              className="grid grid-cols-[36px_1fr_1fr_40px] items-center gap-2 px-3 py-2 text-xs bg-white dark:bg-[#161618] hover:bg-slate-50 dark:hover:bg-[#19191d] transition-colors"
            >
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => {
                    const next = [...fields];
                    next[idx].enabled = e.target.checked;
                    onChange(next);
                  }}
                  className="rounded bg-zinc-800 border-zinc-700 text-purple-500 cursor-pointer"
                />
              </div>

              <input
                type="text"
                value={row.key}
                onChange={(e) => {
                  const next = [...fields];
                  next[idx].key = e.target.value;
                  onChange(next);
                }}
                placeholder="Key"
                className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-purple-500"
              />

              <input
                type="text"
                value={row.value}
                onChange={(e) => {
                  const next = [...fields];
                  next[idx].value = e.target.value;
                  onChange(next);
                }}
                placeholder="Value"
                className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-purple-500"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onChange(fields.filter((_, i) => i !== idx))}
                  title="Remove Field"
                  className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const newField: UrlEncodedField = {
            id: 'urlenc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            key: '',
            value: '',
            enabled: true,
          };
          onChange([...fields, newField]);
        }}
        className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer self-start mt-2"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Field</span>
      </button>
    </div>
  );
};
