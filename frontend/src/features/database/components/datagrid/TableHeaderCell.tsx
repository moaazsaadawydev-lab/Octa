import React from 'react';
import { Key, ArrowUp, ArrowDown, ArrowUpDown, MoreVertical } from 'lucide-react';
import { TableColumn } from '../../types';

export interface TableHeaderCellProps {
  column: TableColumn;
  width: number;
  isSorted: boolean;
  sortOrder?: 'ASC' | 'DESC' | '';
  onSortClick: (colName: string) => void;
  onOpenColumnMenu: (colName: string, e: React.MouseEvent) => void;
  onResizeStart: (colName: string, e: React.MouseEvent) => void;
  onAutoFit?: (colName: string, text?: string) => void;
}

export const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
  column,
  width,
  isSorted,
  sortOrder,
  onSortClick,
  onOpenColumnMenu,
  onResizeStart,
  onAutoFit,
}) => {
  return (
    <th
      style={{ width, minWidth: width, maxWidth: width }}
      className="group/th px-3 py-1.5 text-left border-r border-slate-200 dark:border-zinc-800/60 relative font-normal text-slate-700 dark:text-zinc-300 align-top select-none"
    >
      <div className="flex flex-col min-w-0 pr-1">
        {/* Primary Row: Column Name, PK Indicator, Sort, and Menu */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div
            onClick={() => onSortClick(column.name)}
            className="flex items-center gap-1.5 min-w-0 truncate cursor-pointer hover:text-slate-900 dark:hover:text-white flex-1"
            title={`${column.name} (${column.type})`}
          >
            {column.isPrimaryKey && (
              <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
            )}
            <span className="font-semibold truncate text-xs font-mono text-slate-900 dark:text-zinc-100">
              {column.name}
            </span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onSortClick(column.name)}
              className={`p-0.5 rounded cursor-pointer transition-opacity ${
                isSorted
                  ? 'opacity-100 text-brand-600 dark:text-brand-400'
                  : 'opacity-0 group-hover/th:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
              }`}
              title="Sort column"
            >
              {isSorted && sortOrder === 'ASC' ? (
                <ArrowUp className="w-3 h-3 text-brand-500" />
              ) : isSorted && sortOrder === 'DESC' ? (
                <ArrowDown className="w-3 h-3 text-brand-500" />
              ) : (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => onOpenColumnMenu(column.name, e)}
              className="opacity-0 group-hover/th:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer transition-opacity"
              title="Column options"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Secondary Subtext: Data Type (never squeezes out column name) */}
        <div className="flex items-center gap-1 min-w-0 mt-0.5">
          <span
            className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono lowercase truncate"
            title={column.type}
          >
            {column.type}
          </span>
          {column.isNullable && (
            <span className="text-[9px] text-slate-400/70 dark:text-zinc-600 font-mono">
              ?
            </span>
          )}
        </div>
      </div>

      {/* Draggable Resize Handle with Double-Click Auto-Fit */}
      <div
        onMouseDown={(e) => onResizeStart(column.name, e)}
        onDoubleClick={() => onAutoFit?.(column.name, `${column.name} ${column.type}`)}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-500/50 active:bg-brand-500 z-10 transition-colors"
        title="Drag to resize, double-click to auto-fit"
      />
    </th>
  );
};
