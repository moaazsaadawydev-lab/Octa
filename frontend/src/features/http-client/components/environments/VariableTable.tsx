import React from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { EnvironmentVariable, EnvironmentVariableType } from '../../types';

export interface VariableTableProps {
  variables: EnvironmentVariable[];
  onChange: (variables: EnvironmentVariable[]) => void;
  revealedSecrets: Record<string, boolean>;
  onToggleSecret: (id: string) => void;
  placeholderKey?: string;
}

export const VariableTable: React.FC<VariableTableProps> = ({
  variables,
  onChange,
  revealedSecrets,
  onToggleSecret,
  placeholderKey = 'e.g. key',
}) => {
  return (
    <div className="flex-1 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-y-auto bg-slate-50 dark:bg-[#18181b]/40">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900/60 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
            <th className="py-2.5 px-3 w-10 text-center">Active</th>
            <th className="py-2.5 px-3 w-1/3">Variable (Key)</th>
            <th className="py-2.5 px-3 w-28">Type</th>
            <th className="py-2.5 px-3">Value</th>
            <th className="py-2.5 px-3 w-12 text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/60 font-mono text-xs text-slate-800 dark:text-zinc-200">
          {variables.map((v, idx) => {
            const isSecret = v.type === 'secret';
            const isRevealed = revealedSecrets[v.id];
            return (
              <tr key={v.id} className="hover:bg-slate-100/50 dark:hover:bg-zinc-850/40 transition-colors">
                <td className="py-2 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={v.enabled}
                    onChange={(e) => {
                      const next = [...variables];
                      next[idx] = { ...next[idx], enabled: e.target.checked };
                      onChange(next);
                    }}
                    className="accent-brand-500 rounded cursor-pointer"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={v.key}
                    onChange={(e) => {
                      const next = [...variables];
                      next[idx] = { ...next[idx], key: e.target.value };
                      onChange(next);
                    }}
                    placeholder={placeholderKey}
                    className="w-full bg-transparent outline-none text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:text-brand-500"
                  />
                </td>
                <td className="py-2 px-3">
                  <select
                    value={v.type || 'default'}
                    onChange={(e) => {
                      const next = [...variables];
                      next[idx] = { ...next[idx], type: e.target.value as EnvironmentVariableType };
                      onChange(next);
                    }}
                    className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/60 rounded px-2 py-0.5 text-[11px] text-slate-800 dark:text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="default">Default</option>
                    <option value="secret">Secret</option>
                  </select>
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type={isSecret && !isRevealed ? 'password' : 'text'}
                      value={v.value}
                      onChange={(e) => {
                        const next = [...variables];
                        next[idx] = { ...next[idx], value: e.target.value };
                        onChange(next);
                      }}
                      placeholder="Value"
                      className="flex-1 bg-transparent outline-none text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500"
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => onToggleSecret(v.id)}
                        className="p-1 text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onChange(variables.filter((_, i) => i !== idx))}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
