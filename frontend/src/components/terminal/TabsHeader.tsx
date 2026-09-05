import React from 'react';
import { Columns2, Rows2, Folder, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { TerminalTab, ShellInfo } from '../../types/terminal';
import { ShellDropdown } from './ShellDropdown';
import { TerminalTabBar } from './TerminalTabBar';

interface TabsHeaderProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  availableShells?: ShellInfo[];
  defaultShellId?: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: (shellTarget?: ShellInfo | string) => void;
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  onRenameTab: (tabId: string, newTitle: string) => void;
  onSplitTab: (direction: 'horizontal' | 'vertical') => void;
  onRestartSession: () => void;
}

export const TabsHeader: React.FC<TabsHeaderProps> = ({
  tabs,
  activeTabId,
  availableShells = [],
  defaultShellId = 'powershell',
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  onSplitTab,
  onRestartSession,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="bg-white dark:bg-[#0c0d12] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between pl-2 pr-4 flex-shrink-0 select-none min-h-[38px] z-30 transition-colors relative">
      {/* Scrollable Tabs List & Shell Launcher */}
      <div className="flex items-center min-w-0 flex-1 py-1.5 overflow-visible">
        <TerminalTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onRenameTab={onRenameTab}
          onSplitTab={onSplitTab}
        />

        <ShellDropdown
          availableShells={availableShells}
          defaultShellId={defaultShellId}
          onAddTab={onAddTab}
        />
      </div>

      {/* Right Toolbar Actions */}
      <div className="flex items-center gap-1.5">
        {activeTab && (
          <>
            {/* Split Right (Horizontal) Button */}
            <button
              type="button"
              onClick={() => onSplitTab('horizontal')}
              title="Split Terminal Right (Side by side)"
              className={clsx(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                activeTab.splitDirection === 'horizontal'
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-300 dark:border-brand-800/80'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
              )}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>

            {/* Split Down (Vertical) Button */}
            <button
              type="button"
              onClick={() => onSplitTab('vertical')}
              title="Split Terminal Down (Stacked)"
              className={clsx(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                activeTab.splitDirection === 'vertical'
                  ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-300 dark:border-brand-800/80'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
              )}
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>

            {/* Working Directory Indicator */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400 font-mono max-w-[220px] truncate"
              title={activeTab.workDir || 'Home Directory'}
            >
              <Folder className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <span className="truncate">{activeTab.workDir || '~'}</span>
            </div>

            {/* Restart Active Session */}
            <button
              type="button"
              onClick={onRestartSession}
              title="Restart Terminal Session"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
