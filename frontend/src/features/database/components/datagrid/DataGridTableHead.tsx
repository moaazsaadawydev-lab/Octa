import React from 'react';
import { Key, ArrowUp, ArrowDown, ArrowUpDown, MoreVertical } from 'lucide-react';
import { TableColumn } from '../../types';

export interface DataGridTableHeadProps {
  columns: TableColumn[];
  columnWidths: Record<string, number>;
  sortColumn?: string;
  sortOrder?: 'ASC' | 'DESC' | '';
  onSortChange?: (colName: string, newOrder: 'ASC' | 'DESC' | '') => void;
  allPageRowsSelected: boolean;
  onToggleSelectAll: () => void;
  headerCheckboxRef: React.RefObject<HTMLInputElement | null>;
  onOpenColumnMenu: (colName: string, e: React.MouseEvent) => void;
  onResizeStart: (colName: string, e: React.MouseEvent) => void;
}

export const DataGridTableHead: React.FC<DataGridTableHeadProps> = ({
  columns,
  columnWidths,
  sortColumn,
  sortOrder,
  onSortChange,
  allPageRowsSelected,
  onToggleSelectAll,
  headerCheckboxRef,
  onOpenColumnMenu,
  onResizeStart,
}) => {
  const handleSortClick = (colName: string) => {
    if (!onSortChange) return;
    if (sortColumn !== colName) {
      onSortChange(colName, 'ASC');
    } else if (sortOrder === 'ASC') {
      onSortChange(colName, 'DESC');
    } else {
      onSortChange(colName, '');
    }
  };

  return (
    <thead className="bg-slate-100 dark:bg-[#18181c] border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10 text-xs select-none">
      <tr>
        <th className="w-10 px-3 py-2 text-center border-r border-slate-200 dark:border-zinc-800/60">
          <input
            ref={headerCheckboxRef}
            type="checkbox"
            checked={allPageRowsSelected}
            onChange={onToggleSelectAll}
            className="rounded bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-brand-600 focus:ring-0 cursor-pointer"
          />
        </th>

        {columns.map((col) => {
          const isSorted = sortColumn === col.name;
          const width = columnWidths[col.name] || 160;

          return (
            <th
              key={col.name}
              style={{ width, minWidth: width, maxWidth: width }}
              className="group/th px-3 py-2 text-left border-r border-slate-200 dark:border-zinc-800/60 relative font-normal text-slate-700 dark:text-zinc-300"
            >
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div
                  onClick={() => handleSortClick(col.name)}
                  className="flex items-center gap-1.5 truncate cursor-pointer hover:text-slate-900 dark:hover:text-white flex-1"
                >
                  {col.isPrimaryKey && (
                    <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="font-semibold truncate text-[11px] font-mono">
                    {col.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono lowercase">
                    {col.type}
                  </span>

                  <span className="opacity-0 group-hover/th:opacity-100 transition-opacity ml-auto">
                    {isSorted && sortOrder === 'ASC' ? (
                      <ArrowUp className="w-3 h-3 text-brand-500" />
                    ) : isSorted && sortOrder === 'DESC' ? (
                      <ArrowDown className="w-3 h-3 text-brand-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => onOpenColumnMenu(col.name, e)}
                  className="opacity-0 group-hover/th:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </div>

              <div
                onMouseDown={(e) => onResizeStart(col.name, e)}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-500"
              />
            </th>
          );
        })}
      </tr>
    </thead>
  );
};
