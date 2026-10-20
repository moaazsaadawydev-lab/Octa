import React, { useState, useEffect } from 'react';
import { Plus, X, Globe, Radio } from 'lucide-react';
import { BrowserTab, DEFAULT_DEV_PORTS } from '../types';

interface BrowserTabBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: (url?: string) => void;
  onSelectPort: (port: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  recentPorts?: string[];
}

const TabFavicon: React.FC<{ faviconUrl?: string; isActive: boolean }> = ({
  faviconUrl,
  isActive,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [faviconUrl]);

  if (faviconUrl && !hasError) {
    return (
      <img
        src={faviconUrl}
        alt=""
        onError={() => setHasError(true)}
        className="w-3.5 h-3.5 flex-shrink-0 object-contain rounded-xs"
      />
    );
  }

  return (
    <Globe
      className={`w-3.5 h-3.5 flex-shrink-0 ${
        isActive ? 'text-brand-500' : 'text-slate-400 dark:text-zinc-500'
      }`}
    />
  );
};

export const BrowserTabBar: React.FC<BrowserTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onSelectPort,
  onContextMenu,
  recentPorts,
}) => {
  const displayedPorts = recentPorts && recentPorts.length > 0 ? recentPorts : DEFAULT_DEV_PORTS;

  return (
    <div
      onContextMenu={onContextMenu}
      className="flex items-center justify-between h-9 px-2 bg-slate-100 dark:bg-[#101115] border-b border-slate-200 dark:border-zinc-800/80 select-none flex-shrink-0"
    >
      {/* Left: Tab Items & Add Button */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[70%]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const displayTitle = tab.title || 'localhost';

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              title={tab.title ? `${tab.title} (${tab.url})` : tab.url}
              className={`group flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-sans transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#1a1b22] text-brand-600 dark:text-brand-400 font-semibold shadow-xs border border-slate-200/80 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <TabFavicon faviconUrl={tab.faviconUrl} isActive={isActive} />
              <span className="truncate max-w-[130px]">{displayTitle}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="Close tab"
                className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-zinc-700/80 p-0.5 rounded transition-opacity text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Add Tab Button */}
        <button
          type="button"
          onClick={() => onAddTab()}
          title="New Tab"
          className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Quick Port Switchers */}
      <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500 font-mono mr-1 hidden sm:flex">
          <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
          Ports:
        </span>
        {displayedPorts.map((port) => (
          <button
            key={port}
            type="button"
            onClick={() => onSelectPort(port)}
            title={`Open http://localhost:${port}`}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-200/60 hover:bg-brand-500/10 dark:bg-zinc-800/80 dark:hover:bg-brand-500/20 text-slate-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-300/60 dark:border-zinc-700/60 transition-colors cursor-pointer"
          >
            :{port}
          </button>
        ))}
      </div>
    </div>
  );
};
