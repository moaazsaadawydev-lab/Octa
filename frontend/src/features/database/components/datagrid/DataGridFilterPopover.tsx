import React from 'react';
import { Filter, X } from 'lucide-react';
import { TableColumn } from '../../types';

export interface DataGridFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  columns: TableColumn[];
  inputFilterCol: string;
  setInputFilterCol: (col: string) => void;
  inputFilterOp: string;
  setInputFilterOp: (op: string) => void;
  inputFilterVal: string;
  setInputFilterVal: (val: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export const DataGridFilterPopover: React.FC<DataGridFilterPopoverProps> = ({
  isOpen,
  onClose,
  columns,
  inputFilterCol,
  setInputFilterCol,
  inputFilterOp,
  setInputFilterOp,
  inputFilterVal,
  setInputFilterVal,
  onApply,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-4 top-12 z-40 w-80 bg-white dark:bg-[#18181c] border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl p-3 text-xs font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800 mb-2.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
          <Filter className="w-3.5 h-3.5 text-brand-500" />
          <span>Filter Rows</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Column</label>
          <select
            value={inputFilterCol}
            onChange={(e) => setInputFilterCol(e.target.value)}
            className="w-full px-2 py-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded text-xs"
          >
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Operator</label>
          <select
            value={inputFilterOp}
            onChange={(e) => setInputFilterOp(e.target.value)}
            className="w-full px-2 py-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded text-xs"
          >
            <option value="contains">contains</option>
            <option value="equals">=</option>
            <option value="not_equals">≠</option>
            <option value="starts_with">starts with</option>
            <option value="ends_with">ends with</option>
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="gte">≥</option>
            <option value="lte">≤</option>
            <option value="is_null">IS NULL</option>
            <option value="is_not_null">IS NOT NULL</option>
          </select>
        </div>

        {inputFilterOp !== 'is_null' && inputFilterOp !== 'is_not_null' && (
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Value</label>
            <input
              type="text"
              value={inputFilterVal}
              onChange={(e) => setInputFilterVal(e.target.value)}
              placeholder="Filter value..."
              className="w-full px-2 py-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded text-xs font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClear}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded font-medium text-xs shadow"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};
