import React from 'react';
import clsx from 'clsx';

interface KeyBadgeProps {
  keys: string[];
  className?: string;
}

export const KeyBadge: React.FC<KeyBadgeProps> = ({ keys, className }) => {
  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 font-mono text-[11px] text-slate-800 dark:text-zinc-200 font-semibold shadow-xs select-none">
            {k}
          </kbd>
          {i < keys.length - 1 && (
            <span className="text-slate-400 dark:text-zinc-600 text-xs font-semibold select-none">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
