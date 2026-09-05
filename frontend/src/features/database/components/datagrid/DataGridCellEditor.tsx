import React from 'react';
import { Check, X } from 'lucide-react';
import { EditingCellState } from '../../types';

export interface DataGridCellEditorProps {
  editingCell: EditingCellState;
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState | null>>;
  onCommit: (newVal: any) => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
}

export const DataGridCellEditor: React.FC<DataGridCellEditorProps> = ({
  editingCell,
  setEditingCell,
  onCommit,
  onCancel,
  inputRef,
}) => {
  const isNull = editingCell.editValue === '__OCTA_NULL__';
  const isBool = editingCell.colType.toLowerCase().includes('bool');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNull) {
      onCommit(null);
    } else if (isBool) {
      onCommit(editingCell.editValue === 'true');
    } else {
      onCommit(editingCell.editValue);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute inset-0 z-20 flex items-center bg-white dark:bg-[#1a1a1e] p-0.5 border-2 border-brand-500 rounded shadow-lg"
    >
      {isBool ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={isNull ? 'null' : editingCell.editValue}
          onChange={(e) => {
            if (e.target.value === 'null') {
              setEditingCell((prev) => (prev ? { ...prev, editValue: '__OCTA_NULL__' } : null));
            } else {
              setEditingCell((prev) => (prev ? { ...prev, editValue: e.target.value } : null));
            }
          }}
          className="w-full h-full bg-transparent text-xs px-1 outline-none font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
          {editingCell.isNullable && <option value="null">NULL</option>}
        </select>
      ) : editingCell.enumValues && editingCell.enumValues.length > 0 ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={isNull ? 'null' : editingCell.editValue}
          onChange={(e) => {
            if (e.target.value === 'null') {
              setEditingCell((prev) => (prev ? { ...prev, editValue: '__OCTA_NULL__' } : null));
            } else {
              setEditingCell((prev) => (prev ? { ...prev, editValue: e.target.value } : null));
            }
          }}
          className="w-full h-full bg-transparent text-xs px-1 outline-none font-mono"
        >
          {editingCell.enumValues.map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
          {editingCell.isNullable && <option value="null">NULL</option>}
        </select>
      ) : (
        <div className="flex items-center w-full h-full gap-1">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            disabled={isNull}
            type="text"
            value={isNull ? 'NULL' : editingCell.editValue}
            onChange={(e) =>
              setEditingCell((prev) => (prev ? { ...prev, editValue: e.target.value } : null))
            }
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
            className="w-full h-full bg-transparent px-1 text-xs outline-none font-mono"
          />
          {editingCell.isNullable && (
            <button
              type="button"
              onClick={() => {
                setEditingCell((prev) =>
                  prev
                    ? {
                        ...prev,
                        editValue: isNull ? '' : '__OCTA_NULL__',
                      }
                    : null
                );
              }}
              className={
                'px-1.5 py-0.5 rounded text-[10px] font-mono border ' +
                (isNull
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400')
              }
            >
              NULL
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 pl-1">
        <button
          type="submit"
          className="p-1 rounded bg-brand-600 text-white hover:bg-brand-500 cursor-pointer"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </form>
  );
};
