import React from 'react';
import {
  Cookie as CookieIcon,
  Columns2,
  Rows2,
  Plus,
  X,
} from 'lucide-react';
import { HttpRequestItem, Environment, METHOD_COLORS } from '../types';
import { EnvironmentDropdown } from './EnvironmentDropdown';

export interface HttpTabBarProps {
  openTabs: HttpRequestItem[];
  activeTabId: string;
  activeRequest: HttpRequestItem | null;
  setActiveTabId: (id: string) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleNewTab: () => void;
  environments: Environment[];
  activeEnvironment: Environment | null;
  activeEnvironmentId: string | null;
  setActiveEnvironmentId: (id: string | null) => void;
  isEnvDropdownOpen: boolean;
  setIsEnvDropdownOpen: (open: boolean) => void;
  envDropdownRef: React.RefObject<HTMLDivElement | null>;
  setIsEnvModalOpen: (open: boolean) => void;
  cookieJarCount: number;
  setIsCookieJarOpen: (open: boolean) => void;
  layoutOrientation: 'horizontal' | 'vertical';
  setLayoutOrientation: (layout: 'horizontal' | 'vertical') => void;
}

export const HttpTabBar: React.FC<HttpTabBarProps> = ({
  openTabs,
  activeTabId,
  activeRequest,
  setActiveTabId,
  handleCloseTab,
  handleNewTab,
  environments,
  activeEnvironment,
  activeEnvironmentId,
  setActiveEnvironmentId,
  isEnvDropdownOpen,
  setIsEnvDropdownOpen,
  envDropdownRef,
  setIsEnvModalOpen,
  cookieJarCount,
  setIsCookieJarOpen,
  layoutOrientation,
  setLayoutOrientation,
}) => {
  return (
    <div className="bg-white dark:bg-[#141416] border-b border-slate-200 dark:border-[#242428] flex items-center justify-between pl-2 pr-3 flex-shrink-0 select-none min-h-[38px]">
      {/* Scrollable Tabs List */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
        {openTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const methodColor = METHOD_COLORS[tab.method] || METHOD_COLORS.GET;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) handleCloseTab(tab.id, e);
              }}
              title={`${tab.name} (${tab.method})`}
              className={`group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[200px] ${
                isActive
                  ? 'bg-slate-100 dark:bg-[#1e1e22] text-slate-900 dark:text-white border-slate-300 dark:border-zinc-700/80 shadow-sm font-medium'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#18181c] border-transparent'
              }`}
            >
              <span className={'text-[9px] font-bold font-mono px-1 py-0.2 rounded border ' + methodColor.badge}>
                {tab.method}
              </span>
              <span className="truncate flex-1">{tab.name}</span>
              {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
              <button
                type="button"
                onClick={(e) => handleCloseTab(tab.id, e)}
                title="Close Tab (Ctrl+W)"
                className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleNewTab}
          title="New Request Tab (Ctrl+T)"
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Right Controls */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-zinc-800 flex-shrink-0">
        <EnvironmentDropdown
          environments={environments}
          activeEnvironment={activeEnvironment}
          activeEnvironmentId={activeEnvironmentId}
          onSelectEnvironment={setActiveEnvironmentId}
          isOpen={isEnvDropdownOpen}
          setIsOpen={setIsEnvDropdownOpen}
          dropdownRef={envDropdownRef}
          onOpenManage={() => setIsEnvModalOpen(true)}
        />

        <button
          type="button"
          onClick={() => setIsCookieJarOpen(true)}
          title="Cookie Jar (Manage active session cookies)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-amber-500/30 transition-colors cursor-pointer"
        >
          <CookieIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="text-[11px] font-mono">Cookies ({cookieJarCount})</span>
        </button>

        {activeRequest && (
          <button
            type="button"
            onClick={() => setLayoutOrientation(layoutOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
            title={layoutOrientation === 'horizontal' ? 'Switch to Stacked View (Top/Bottom)' : 'Switch to Side-by-Side View (Left/Right)'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            {layoutOrientation === 'horizontal' ? (
              <>
                <Columns2 className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                <span className="text-[11px] hidden sm:inline">Side-by-Side</span>
              </>
            ) : (
              <>
                <Rows2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-[11px] hidden sm:inline">Stacked</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
