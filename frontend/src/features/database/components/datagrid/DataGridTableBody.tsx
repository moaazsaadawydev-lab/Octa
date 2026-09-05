import React from 'react';
import { TableColumn, EditingCellState } from '../../types';
import { DataGridCellEditor } from './DataGridCellEditor';

export interface DataGridTableBodyProps {
  rows: Record<string, any>[];
  columns: TableColumn[];
  pkCol: string;
  selectedRowIds: Set<string>;
  onToggleRowSelect: (rowId: string) => void;
  stagedUpdates: Record<string, Record<string, any>>;
  editingCell: EditingCellState | null;
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState | null>>;
  onCellCommit: (newVal: any) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
}

export const DataGridTableBody: React.FC<DataGridTableBodyProps> = ({
  rows,
  columns,
  pkCol,
  selectedRowIds,
  onToggleRowSelect,
  stagedUpdates,
  editingCell,
  setEditingCell,
  onCellCommit,
  inputRef,
}) => {
  return (
    <tbody>
      {rows.map((row, rIdx) => {
        const rowId = String(row[pkCol] ?? rIdx);
        const isSelected = selectedRowIds.has(rowId);
        return (
          <tr
            key={rowId}
            className={
              'border-b border-slate-200/80 dark:border-zinc-800/40 ' +
              (isSelected
                ? 'bg-brand-50/60 dark:bg-brand-950/20'
                : 'hover:bg-slate-50 dark:hover:bg-zinc-800/30')
            }
          >
            <td className="w-10 px-3 py-1.5 text-center border-r border-slate-200 dark:border-zinc-800/60">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleRowSelect(rowId)}
                className="rounded"
              />
            </td>
            {columns.map((col) => {
              const hasStaged = stagedUpdates[rowId]?.[col.name] !== undefined;
              const val = hasStaged ? stagedUpdates[rowId][col.name] : row[col.name];
              const isEditing =
                editingCell?.rowIdx === rIdx && editingCell?.colName === col.name;

              return (
                <td
                  key={col.name}
                  onDoubleClick={() => {
                    setEditingCell({
                      rowIdx: rIdx,
                      rowId,
                      colName: col.name,
                      colType: col.type,
                      isNullable: col.isNullable,
                      enumValues: col.enumValues,
                      initialValue: val,
                      editValue: val === null ? '__OCTA_NULL__' : String(val ?? ''),
                    });
                  }}
                  className={
                    'px-3 py-1.5 border-r border-slate-200/80 dark:border-zinc-800/40 relative truncate ' +
                    (hasStaged
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                      : '')
                  }
                >
                  {isEditing && (
                    <DataGridCellEditor
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      onCommit={onCellCommit}
                      onCancel={() => setEditingCell(null)}
                      inputRef={inputRef}
                    />
                  )}
                  {val === null || val === undefined ? (
                    <span className="text-slate-400 dark:text-zinc-600 italic">null</span>
                  ) : (
                    String(val)
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
};
