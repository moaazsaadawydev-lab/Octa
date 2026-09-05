import React from 'react';
import {
  Table as TableIcon,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Key,
  Layers,
  Loader2,
} from 'lucide-react';
import { TableColumn } from '../types';

export interface SchemaTreeViewProps {
  tables: string[];
  filteredTables: string[];
  tableSearch: string;
  setTableSearch: (val: string) => void;
  loadingTables: boolean;
  schemas: Record<string, TableColumn[]>;
  expandedTables: Record<string, boolean>;
  activeTableTab: string | null;
  openTableTabs: string[];
  onRefreshTables: () => void;
  onSelectTable: (tableName: string) => void;
  onToggleExpandTable: (tableName: string) => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

export const SchemaTreeView: React.FC<SchemaTreeViewProps> = ({
  tables,
  filteredTables,
  tableSearch,
  setTableSearch,
  loadingTables,
  schemas,
  expandedTables,
  activeTableTab,
  openTableTabs,
  onRefreshTables,
  onSelectTable,
  onToggleExpandTable,
  width,
  onResizeStart,
}) => {
  return (
    <div
      style={{ width, minWidth: width, maxWidth: width }}
      className="bg-white dark:bg-[#12131a] border-r border-slate-200 dark:border-zinc-800 flex flex-col h-full select-none flex-shrink-0 relative group/tblsidebar transition-colors"
    >
      <div className="p-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Tables
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono">
              {tables.length}
            </span>
          </div>
          <button
            onClick={onRefreshTables}
            title="Refresh Tables"
            className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={'w-3 h-3 ' + (loadingTables ? 'animate-spin text-brand-500' : '')} />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search tables..."
            className="w-full pl-7 pr-2 py-1 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 rounded text-[11px] text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {loadingTables && (
          <div className="p-4 text-center flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
            <span>Loading schema...</span>
          </div>
        )}

        {!loadingTables && filteredTables.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
            No tables found
          </div>
        )}

        {!loadingTables &&
          filteredTables.map((tbl) => {
            const isSelected = activeTableTab === tbl;
            const isOpenInTabs = openTableTabs.includes(tbl);
            const isExpanded = Boolean(expandedTables[tbl]);
            const columns = schemas[tbl] || [];

            return (
              <div key={tbl} className="rounded-md overflow-hidden">
                <div
                  className={
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ' +
                    (isSelected
                      ? 'bg-brand-600 text-white font-medium shadow-sm'
                      : isOpenInTabs
                      ? 'text-brand-700 dark:text-brand-300 bg-slate-100/80 dark:bg-zinc-800/70 hover:bg-slate-200 dark:hover:bg-zinc-800'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100')
                  }
                  onClick={() => onSelectTable(tbl)}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpandTable(tbl);
                      }}
                      className="p-0.5 text-slate-400 dark:text-zinc-400 hover:text-white rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                    <TableIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate font-mono text-[11px]">{tbl}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l border-slate-200 dark:border-zinc-800 ml-3.5 my-0.5">
                    {columns.length === 0 ? (
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 italic py-0.5">
                        Loading columns...
                      </div>
                    ) : (
                      columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between py-0.5 text-[10px] font-mono text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {col.isPrimaryKey ? (
                              <Key className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                            ) : (
                              <span className="w-2.5 h-2.5 inline-block" />
                            )}
                            <span className="truncate">{col.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500 lowercase flex-shrink-0">
                            {col.type}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none flex items-center justify-center group/resizer z-20 hover:bg-brand-500/10 active:bg-brand-500/20"
      >
        <div className="w-[2px] h-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
      </div>
    </div>
  );
};
