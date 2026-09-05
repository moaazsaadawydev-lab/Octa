import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

interface RedisResultTableProps {
  data: Array<{ key?: string; index?: number; value: string }>;
}

export const RedisResultTable: React.FC<RedisResultTableProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) => {
      const k = String(row.key ?? row.index ?? '').toLowerCase();
      const v = String(row.value || '').toLowerCase();
      return k.includes(q) || v.includes(q);
    });
  }, [data, searchQuery]);

  return (
    <div className="space-y-3">
      {/* Table Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter records..."
            className="w-full pl-8 pr-3 py-1 bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-zinc-200 outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-[11px] text-slate-500 dark:text-zinc-500">
          {filteredRows.length} / {data.length} rows
        </span>
      </div>

      {/* Table Grid */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#141418] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#18181d] border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold">
              <th className="py-2 px-3 w-12 text-center">#</th>
              <th className="py-2 px-3">
                {data[0] && 'key' in data[0] ? 'Field / Key' : 'Index'}
              </th>
              <th className="py-2 px-3">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {filteredRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="py-1.5 px-3 text-center text-slate-400 dark:text-zinc-500 font-mono text-[11px]">
                  {idx + 1}
                </td>
                <td className="py-1.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {row.key !== undefined ? row.key : row.index}
                </td>
                <td className="py-1.5 px-3 font-mono text-slate-800 dark:text-zinc-200 break-all">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
