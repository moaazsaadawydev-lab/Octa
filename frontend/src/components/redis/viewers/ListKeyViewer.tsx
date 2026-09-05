import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ListKeyViewerProps {
  items: string[];
  onChange: (items: string[]) => void;
}

export const ListKeyViewer: React.FC<ListKeyViewerProps> = ({ items, onChange }) => {
  const handlePushItem = () => {
    onChange([...items, '']);
  };

  const handleUpdateItem = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    onChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
          List Elements ({items.length})
        </span>
        <button
          type="button"
          onClick={handlePushItem}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Push Item</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 w-8">{idx}</span>
            <input
              type="text"
              value={item}
              onChange={(e) => handleUpdateItem(idx, e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a1a1f] border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleRemoveItem(idx)}
              className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
