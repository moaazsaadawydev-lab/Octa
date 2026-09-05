import React from 'react';
import { Plus, Minus } from 'lucide-react';
import clsx from 'clsx';
import { GitFileChange } from '../../types/git';

interface GitFileItemProps {
  file: GitFileChange;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (e: React.MouseEvent) => void;
  isStaged: boolean;
}

export const GitFileItem: React.FC<GitFileItemProps> = ({
  file,
  isSelected,
  onSelect,
  onAction,
  isStaged,
}) => {
  const filename = file.path.split(/[\\/]/).pop() || file.path;
  const dir = file.path.substring(0, file.path.length - filename.length);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'modified':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-amber-500 bg-amber-500/10">
            M
          </span>
        );
      case 'added':
      case 'untracked':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-emerald-500 bg-emerald-500/10">
            {status === 'untracked' ? 'U' : 'A'}
          </span>
        );
      case 'deleted':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-rose-500 bg-rose-500/10">
            D
          </span>
        );
      case 'renamed':
        return (
          <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center text-sky-500 bg-sky-500/10">
            R
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border-l-2',
        isSelected
          ? 'bg-slate-200/90 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 border-l-blue-600 dark:border-l-blue-500 font-medium shadow-xs'
          : 'border-l-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {getStatusBadge(file.status)}
        <div className="min-w-0 truncate">
          <span className="font-mono text-xs">{filename}</span>
          {dir && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-1.5 font-mono truncate">
              {dir}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAction(e);
        }}
        title={isStaged ? 'Unstage File (-)' : 'Stage File (+)'}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all cursor-pointer"
      >
        {isStaged ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
      </button>
    </div>
  );
};
