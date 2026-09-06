import React from 'react';
import { TableColumn } from '../../types';
import { TableHeaderCell } from './TableHeaderCell';

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
  onAutoFit?: (colName: string, text?: string) => void;
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
  onAutoFit,
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
        <th className="w-10 px-3 py-2 text-center border-r border-slate-200 dark:border-zinc-800/60 align-middle">
          <input
            ref={headerCheckboxRef}
            type="checkbox"
            checked={allPageRowsSelected}
            onChange={onToggleSelectAll}
            className="rounded bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-brand-600 focus:ring-0 cursor-pointer"
          />
        </th>

        {columns.map((col) => (
          <TableHeaderCell
            key={col.name}
            column={col}
            width={columnWidths[col.name] || 160}
            isSorted={sortColumn === col.name}
            sortOrder={sortOrder}
            onSortClick={handleSortClick}
            onOpenColumnMenu={onOpenColumnMenu}
            onResizeStart={onResizeStart}
            onAutoFit={onAutoFit}
          />
        ))}
      </tr>
    </thead>
  );
};
