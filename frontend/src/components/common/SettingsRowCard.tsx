import React from 'react';
import clsx from 'clsx';

interface SettingsRowCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const SettingsRowCard: React.FC<SettingsRowCardProps> = ({
  title,
  description,
  children,
  icon,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#16171d] border border-slate-200 dark:border-zinc-800/80 rounded-xl transition-all hover:border-slate-300 dark:hover:border-zinc-700/80 gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0 pr-2">
        {icon && (
          <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">{title}</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center">{children}</div>
    </div>
  );
};
