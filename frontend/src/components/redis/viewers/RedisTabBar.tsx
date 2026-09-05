import React from 'react';
import { X } from 'lucide-react';
import { RedisTab } from '../types';
import { KeyTypeBadge } from './KeyTypeBadge';

interface RedisTabBarProps {
  tabs: RedisTab[];
  activeTabKey: string | null;
  onSelectTab: (key: string) => void;
  onCloseTab: (key: string, e: React.MouseEvent) => void;
}

export const RedisTabBar: React.FC<RedisTabBarProps> = ({
  tabs,
  activeTabKey,
  onSelectTab,
  onCloseTab,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="h-10 border-b border-slate-200 dark:border-[#242429] bg-slate-100/70 dark:bg-[#121216] flex items-center px-2 gap-1 overflow-x-auto select-none flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTabKey;
        return (
          <div
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-mono cursor-pointer transition-all border-b-2 max-w-[220px] flex-shrink-0 ${
              isActive
                ? 'bg-white dark:bg-[#18181d] text-slate-900 dark:text-zinc-100 border-blue-500 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40 border-transparent'
            }`}
          >
            <KeyTypeBadge type={tab.type} />
            <span className="truncate flex-1" title={tab.key}>
              {tab.key}
            </span>
            {tab.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
            )}
            <button
              type="button"
              onClick={(e) => onCloseTab(tab.key, e)}
              className="p-0.5 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700/50 opacity-60 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
