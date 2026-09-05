import React from 'react';
import { Table, X } from 'lucide-react';
import { TableTabState } from '../types';

export interface TableTabsHeaderProps {
  openTabs: string[];
  activeTab: string | null;
  tableStates: Record<string, TableTabState>;
  onSelectTab: (tabName: string) => void;
  onCloseTab: (tabName: string, e?: React.MouseEvent) => void;
}

export const TableTabsHeader: React.FC<TableTabsHeaderProps> = ({
  openTabs,
  activeTab,
  tableStates,
  onSelectTab,
  onCloseTab,
}) => {
  return (
    <div className="bg-slate-100/70 dark:bg-[#141416] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between pl-2 pr-3 flex-shrink-0 select-none min-h-[38px]">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
        {openTabs.map((tbl) => {
          const isActive = tbl === activeTab;
          const state = tableStates[tbl];
          const rowCount = state?.tableData?.totalRows;

          return (
            <div
              key={tbl}
              onClick={() => onSelectTab(tbl)}
              onAuxClick={(e) => {
                if (e.button === 1) onCloseTab(tbl, e);
              }}
              title={tbl + (rowCount !== undefined ? ` (${rowCount} rows)` : '')}
              className={
                'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[220px] ' +
                (isActive
                  ? 'bg-white dark:bg-[#1e1e22] text-slate-900 dark:text-white border-slate-200 dark:border-zinc-700/80 shadow-sm font-medium'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-[#18181c] border-transparent')
              }
            >
              <Table
                className={
                  'w-3.5 h-3.5 flex-shrink-0 ' +
                  (isActive ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-zinc-500')
                }
              />
              <span className="truncate font-mono text-[11px] flex-1">{tbl}</span>
              {rowCount !== undefined && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-500 font-mono flex-shrink-0">
                  {rowCount}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => onCloseTab(tbl, e)}
                title="Close Tab"
                className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
