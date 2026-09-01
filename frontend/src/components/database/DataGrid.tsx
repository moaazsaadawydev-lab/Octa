import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Key,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Database,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Layers,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { TableColumn, TableDataResult, RowUpdate } from '../../types/connection';

interface DataGridProps {
  tableName: string;
  schema: TableColumn[];
  dataResult: TableDataResult | null;
  loading: boolean;
  page: number;
  limit: number;
  sortColumn?: string;
  sortOrder?: 'ASC' | 'DESC' | '';
  filterColumn?: string;
  filterOp?: string;
  filterValue?: string;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSortChange?: (colName: string, newOrder: 'ASC' | 'DESC' | '') => void;
  onApplyFilter?: (column: string, op: string, value: string) => void;
  onClearFilter?: () => void;
  onDropColumn: (colName: string) => Promise<void>;
  onRenameColumn: (oldName: string, newName: string) => Promise<void>;
  onSaveUpdates: (primaryKeyCol: string, updates: RowUpdate[]) => Promise<void>;
  onDeleteRows: (primaryKeyCol: string, rowIds: string[], isAllTable: boolean) => Promise<void>;
}

interface EditingCellState {
  rowIdx: number;
  rowId: any;
  colName: string;
  colType: string;
  isNullable: boolean;
  enumValues?: string[];
  initialValue: any;
  editValue: string;
}

export const DataGrid: React.FC<DataGridProps> = ({
  tableName,
  schema,
  dataResult,
  loading,
  page,
  limit,
  sortColumn = '',
  sortOrder = '',
  filterColumn = '',
  filterOp = 'contains',
  filterValue = '',
  onPageChange,
  onLimitChange,
  onSortChange,
  onApplyFilter,
  onClearFilter,
  onDropColumn,
  onRenameColumn,
  onSaveUpdates,
  onDeleteRows,
}) => {
  // Modal states for column dropping / renaming
  const [columnToDrop, setColumnToDrop] = useState<string | null>(null);
  const [columnToRename, setColumnToRename] = useState<{ oldName: string; newName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Staged updates state: Record<rowId, Record<columnName, newValue>>
  const [stagedUpdates, setStagedUpdates] = useState<Record<string, Record<string, any>>>({});
  const [savingUpdates, setSavingUpdates] = useState(false);

  // Multi-row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isAllTableSelected, setIsAllTableSelected] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingRows, setDeletingRows] = useState(false);

  // Column widths state for drag-to-resize: Record<columnName, widthInPixels>
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingColRef = useRef<{ colName: string; startX: number; startWidth: number } | null>(null);

  // Inline cell editing state
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Quick filter input states
  const [inputFilterCol, setInputFilterCol] = useState<string>(filterColumn || '');
  const [inputFilterOp, setInputFilterOp] = useState<string>(filterOp || 'contains');
  const [inputFilterVal, setInputFilterVal] = useState<string>(filterValue || '');

  // Derive column list from schema if available, else from dataResult columns
  const columns: TableColumn[] =
    schema.length > 0
      ? schema
      : (dataResult?.columns || []).map((colName) => ({
          name: colName,
          type: 'text',
          isNullable: true,
          isPrimaryKey: false,
        }));

  // Sync filter input states with props / columns
  useEffect(() => {
    if (columns.length > 0) {
      setInputFilterCol((prev) => filterColumn || (prev && columns.some((c) => c.name === prev) ? prev : columns[0].name));
    }
    setInputFilterOp(filterOp || 'contains');
    setInputFilterVal(filterValue || '');
  }, [filterColumn, filterOp, filterValue, tableName, columns]);

  // Detect Primary Key Column
  const detectedPkCol = schema.find((c) => c.isPrimaryKey)?.name ||
    (schema.some((c) => c.name.toLowerCase() === 'id') ? 'id' : columns[0]?.name || 'id');

  const rows = dataResult?.rows || [];
  const totalRows = dataResult?.totalRows || 0;
  const totalPages = Math.ceil(totalRows / limit) || 1;
  const startRow = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, totalRows);

  // Page row selection helpers
  const currentPageRowIds = rows.map((r, rIdx) => String(r[detectedPkCol] ?? rIdx));
  const allPageRowsSelected =
    currentPageRowIds.length > 0 &&
    currentPageRowIds.every((id) => selectedRowIds.has(id));
  const somePageRowsSelected =
    currentPageRowIds.some((id) => selectedRowIds.has(id));

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        somePageRowsSelected && !allPageRowsSelected && !isAllTableSelected;
    }
  }, [somePageRowsSelected, allPageRowsSelected, isAllTableSelected]);

  // Clear state when switching tables
  useEffect(() => {
    setStagedUpdates({});
    setEditingCell(null);
    setSelectedRowIds(new Set());
    setIsAllTableSelected(false);
    setShowDeleteConfirmModal(false);
  }, [tableName]);

  // Focus and select input on edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && typeof inputRef.current.select === 'function') {
        inputRef.current.select();
      }
    }
  }, [editingCell?.rowIdx, editingCell?.colName]);

  // Keyboard Shortcuts (Delete / Backspace triggers delete modal, Escape deselects)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        editingCell !== null ||
        columnToDrop !== null ||
        columnToRename !== null
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRowIds.size > 0 || isAllTableSelected) {
          e.preventDefault();
          setShowDeleteConfirmModal(true);
        }
      } else if (e.key === 'Escape') {
        if (showDeleteConfirmModal) {
          setShowDeleteConfirmModal(false);
        } else if (selectedRowIds.size > 0 || isAllTableSelected) {
          setSelectedRowIds(new Set());
          setIsAllTableSelected(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowIds, isAllTableSelected, editingCell, columnToDrop, columnToRename, showDeleteConfirmModal]);

// Helper to shorten and cleanly format PostgreSQL data types for badges
const formatDisplayType = (type?: string, enumValues?: string[]): string => {
  if (!type) return '';
  const lower = type.toLowerCase().trim();

  if (enumValues && enumValues.length > 0) return 'enum';
  if (lower.includes('varying') || lower.includes('varchar')) return 'varchar';
  if (lower === 'character' || lower === 'char') return 'char';
  if (lower === 'boolean' || lower === 'bool') return 'bool';
  if (lower.includes('with time zone') || lower === 'timestamptz') return 'timestamptz';
  if (lower.includes('without time zone') || lower === 'timestamp') return 'timestamp';
  if (lower === 'smallint' || lower === 'int2') return 'smallint';
  if (lower === 'bigint' || lower === 'int8') return 'bigint';
  if (lower === 'integer' || lower === 'int' || lower === 'int4') return 'int';
  if (lower.includes('double') || lower.includes('float')) return 'float';
  if (lower.includes('numeric') || lower.includes('decimal')) return 'numeric';
  if (lower.includes('uuid')) return 'uuid';
  if (lower.includes('jsonb')) return 'jsonb';
  if (lower.includes('json')) return 'json';
  if (lower.endsWith('_enum') || lower.includes('enum')) return 'enum';

  return lower.length > 12 ? lower.slice(0, 10) + '..' : lower;
};

  // Helper to get generous effective column width
  const getColumnWidth = useCallback((colName: string): number => {
    if (columnWidths[colName]) return columnWidths[colName];

    const col = schema.find((c) => c.name === colName);
    const typeStr = col?.type?.toLowerCase() || '';
    const nameLower = colName.toLowerCase();

    // Primary keys or ID columns
    if (col?.isPrimaryKey || nameLower === 'id' || nameLower.endsWith('_id')) {
      if (typeStr.includes('uuid')) return 260;
      return 220;
    }

    // Specific type-based widths
    if (typeStr.includes('uuid')) return 260;
    if (typeStr.includes('timestamp') || typeStr.includes('date')) return 220;
    if (typeStr.includes('json')) return 240;

    // Short boolean / small enum / status fields
    if (
      typeStr.includes('bool') ||
      typeStr.includes('smallint') ||
      nameLower === 'gender' ||
      nameLower === 'status' ||
      nameLower === 'role' ||
      nameLower === 'country' ||
      nameLower.startsWith('is_') ||
      nameLower.startsWith('has_')
    ) {
      return 140;
    }

    // Standard string text fields
    if (
      nameLower.includes('email') ||
      nameLower.includes('description') ||
      nameLower.includes('address') ||
      nameLower.includes('password') ||
      nameLower.includes('avatar') ||
      nameLower.includes('image') ||
      nameLower.includes('url')
    ) {
      return 230;
    }

    if (typeStr.includes('char') || typeStr.includes('text') || nameLower.includes('name')) {
      return 200;
    }

    if (typeStr.includes('int') || typeStr.includes('numeric') || typeStr.includes('float')) {
      return 150;
    }

    return 190;
  }, [columnWidths, schema]);

  // Column drag-to-resize handlers
  const handleResizeStart = (e: React.MouseEvent, colName: string) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = getColumnWidth(colName);
    resizingColRef.current = { colName, startX, startWidth };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const deltaX = moveEvent.clientX - resizingColRef.current.startX;
      const newWidth = Math.max(120, resizingColRef.current.startWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColRef.current!.colName]: newWidth,
      }));
    };

    const onMouseUp = () => {
      resizingColRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Count total staged cell edits
  const totalStagedEditsCount = Object.values(stagedUpdates).reduce(
    (acc, rowUpdates) => acc + Object.keys(rowUpdates).length,
    0
  );

  // Toggle selection for all rows on page
  const handleToggleSelectAllPage = () => {
    if (isAllTableSelected || allPageRowsSelected) {
      setSelectedRowIds(new Set());
      setIsAllTableSelected(false);
    } else {
      const next = new Set<string>(selectedRowIds);
      currentPageRowIds.forEach((id) => next.add(id));
      setSelectedRowIds(next);
    }
  };

  // Toggle single row selection
  const handleToggleRowSelect = (rowId: string) => {
    const next = new Set<string>(selectedRowIds);
    if (isAllTableSelected) {
      currentPageRowIds.forEach((id) => {
        if (id !== rowId) next.add(id);
      });
      setIsAllTableSelected(false);
      setSelectedRowIds(next);
      return;
    }

    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedRowIds(next);
  };

  // Execute Batch Row Delete or Table Truncation
  const handleConfirmBatchDelete = async () => {
    setDeletingRows(true);
    try {
      await onDeleteRows(
        detectedPkCol,
        Array.from(selectedRowIds),
        isAllTableSelected
      );
      setSelectedRowIds(new Set());
      setIsAllTableSelected(false);
      setShowDeleteConfirmModal(false);
    } finally {
      setDeletingRows(false);
    }
  };

  // Helper to get effective cell value (staged vs original)
  const getCellValue = (row: Record<string, any>, rowId: any, colName: string) => {
    if (stagedUpdates[rowId] && colName in stagedUpdates[rowId]) {
      return stagedUpdates[rowId][colName];
    }
    return row[colName];
  };

  const isCellStaged = (rowId: any, colName: string) => {
    return Boolean(stagedUpdates[rowId] && colName in stagedUpdates[rowId]);
  };

  // Start cell edit
  const handleStartEdit = (
    rowIdx: number,
    row: Record<string, any>,
    col: TableColumn
  ) => {
    const rowId = row[detectedPkCol] ?? rowIdx;
    const currentVal = getCellValue(row, rowId, col.name);

    let editValStr = '';
    if (currentVal !== null && currentVal !== undefined) {
      editValStr = typeof currentVal === 'object' ? JSON.stringify(currentVal) : String(currentVal);
    }

    setEditingCell({
      rowIdx,
      rowId,
      colName: col.name,
      colType: col.type.toLowerCase(),
      isNullable: col.isNullable,
      enumValues: col.enumValues,
      initialValue: row[col.name],
      editValue: editValStr,
    });
  };

  // Commit editing change to staged changes buffer
  const commitEdit = (customVal?: any) => {
    if (!editingCell) return;

    const { rowId, colName, colType, initialValue } = editingCell;
    let finalVal: any = customVal !== undefined ? customVal : editingCell.editValue;

    // Convert value according to type
    if (typeof finalVal === 'string') {
      const trimmed = finalVal.trim();
      if (trimmed.toUpperCase() === 'NULL' || trimmed === '[NULL]') {
        finalVal = null;
      } else if (colType.includes('bool')) {
        finalVal = trimmed === 'true';
      } else if (
        (colType.includes('int') || colType.includes('numeric') || colType.includes('float')) &&
        trimmed !== '' &&
        !isNaN(Number(trimmed))
      ) {
        finalVal = Number(trimmed);
      }
    }

    // Check if value actually changed compared to initial
    const isDifferent =
      finalVal !== initialValue &&
      !(finalVal === null && initialValue === null) &&
      !(String(finalVal) === String(initialValue));

    setStagedUpdates((prev) => {
      const rowUpdates = { ...(prev[rowId] || {}) };
      if (isDifferent) {
        rowUpdates[colName] = finalVal;
        return { ...prev, [rowId]: rowUpdates };
      } else {
        delete rowUpdates[colName];
        if (Object.keys(rowUpdates).length === 0) {
          const next = { ...prev };
          delete next[rowId];
          return next;
        }
        return { ...prev, [rowId]: rowUpdates };
      }
    });

    setEditingCell(null);
  };

  // Discard all staged changes
  const handleDiscardStaged = () => {
    setStagedUpdates({});
    setEditingCell(null);
  };

  // Save all staged changes in batch transaction
  const handleSaveStaged = async () => {
    if (totalStagedEditsCount === 0) return;

    const updatesPayload: RowUpdate[] = [];
    for (const [rowId, colUpdates] of Object.entries(stagedUpdates)) {
      for (const [column, newValue] of Object.entries(colUpdates)) {
        updatesPayload.push({
          rowId,
          column,
          newValue,
        });
      }
    }

    setSavingUpdates(true);
    try {
      await onSaveUpdates(detectedPkCol, updatesPayload);
      setStagedUpdates({});
      setEditingCell(null);
    } finally {
      setSavingUpdates(false);
    }
  };

  const confirmDrop = async () => {
    if (!columnToDrop) return;
    setActionLoading(true);
    try {
      await onDropColumn(columnToDrop);
      setColumnToDrop(null);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !columnToRename ||
      !columnToRename.newName.trim() ||
      columnToRename.oldName === columnToRename.newName.trim()
    ) {
      setColumnToRename(null);
      return;
    }
    setActionLoading(true);
    try {
      await onRenameColumn(columnToRename.oldName, columnToRename.newName.trim());
      setColumnToRename(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to render cell value
  const renderCellValue = (val: any, isStaged: boolean) => {
    if (val === null || val === undefined) {
      return (
        <span className={`text-[10px] italic px-1.5 py-0.5 rounded border font-mono ${
          isStaged
            ? 'text-amber-300 bg-amber-950/60 border-amber-500/50'
            : 'text-gray-500 bg-surface-850 border-border/40'
        }`}>
          NULL
        </span>
      );
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="text-[11px] text-emerald-400 font-mono font-medium">true</span>
      ) : (
        <span className="text-[11px] text-rose-400 font-mono font-medium">false</span>
      );
    }
    if (typeof val === 'object') {
      return (
        <span className="font-mono text-gray-300 text-xs truncate max-w-xs block" title={JSON.stringify(val)}>
          {JSON.stringify(val)}
        </span>
      );
    }
    return <span className={`truncate ${isStaged ? 'text-amber-200 font-semibold' : 'text-gray-200'}`}>{String(val)}</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-hidden select-none relative">
      {/* Quick Filter & Sort Toolbar */}
      <div className="px-3.5 py-2 bg-[#171717] border-b border-[#292929] flex flex-wrap items-center justify-between gap-2 z-20 text-xs select-none">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputFilterCol && onApplyFilter) {
              onApplyFilter(inputFilterCol, inputFilterOp, inputFilterVal);
            }
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center gap-1.5 text-zinc-400 font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold hidden sm:inline">
              Filter:
            </span>
          </div>

          {/* Column Selector */}
          <select
            value={inputFilterCol}
            onChange={(e) => setInputFilterCol(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-xs px-2.5 py-1 rounded text-zinc-200 focus:border-cyan-500 outline-none font-mono cursor-pointer transition-colors"
          >
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} {c.type ? `(${formatDisplayType(c.type, c.enumValues)})` : ''}
              </option>
            ))}
          </select>

          {/* Condition / Operator Dropdown */}
          <select
            value={inputFilterOp}
            onChange={(e) => setInputFilterOp(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-xs px-2.5 py-1 rounded text-zinc-200 focus:border-cyan-500 outline-none font-mono cursor-pointer transition-colors"
          >
            <option value="contains">contains</option>
            <option value="equals">equals</option>
            <option value="starts_with">starts_with</option>
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="is_null">is_null</option>
          </select>

          {/* Value Input */}
          {inputFilterOp !== 'is_null' && (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={inputFilterVal}
                onChange={(e) => setInputFilterVal(e.target.value)}
                placeholder="Filter value..."
                className="bg-zinc-900 border border-zinc-700 text-xs pl-8 pr-6 py-1 rounded text-zinc-200 focus:border-cyan-500 outline-none font-mono w-40 sm:w-48 placeholder-zinc-500"
              />
              {inputFilterVal && (
                <button
                  type="button"
                  onClick={() => setInputFilterVal('')}
                  className="absolute right-2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Apply Button */}
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-2.5 py-1 rounded transition-colors font-medium shadow-sm cursor-pointer flex items-center gap-1"
          >
            <span>Apply</span>
          </button>

          {/* Clear Button */}
          {(filterColumn || filterValue) && onClearFilter && (
            <button
              type="button"
              onClick={() => {
                setInputFilterVal('');
                onClearFilter();
              }}
              title="Clear Filter"
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3 text-zinc-400" />
              <span>Clear</span>
            </button>
          )}
        </form>

        {/* Active Filter & Sort Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterColumn && onClearFilter && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono shadow-sm animate-fade-in">
              <span>
                Filtered by <strong className="text-cyan-200">{filterColumn}</strong> {filterOp}{' '}
                {filterOp !== 'is_null' && `"${filterValue}"`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setInputFilterVal('');
                  onClearFilter();
                }}
                title="Clear filter"
                className="text-cyan-400 hover:text-white p-0.5 rounded-full hover:bg-cyan-900/60 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {sortColumn && onSortChange && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-950/70 border border-brand-500/40 text-brand-300 text-[11px] font-mono shadow-sm animate-fade-in">
              <span>
                Sorted by <strong className="text-brand-200">{sortColumn}</strong> ({sortOrder})
              </span>
              <button
                type="button"
                onClick={() => onSortChange('', '')}
                title="Clear sort"
                className="text-brand-400 hover:text-white p-0.5 rounded-full hover:bg-brand-900/60 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1. Staged Changes Action Banner (when edits exist) */}
      {totalStagedEditsCount > 0 && (
        <div className="px-4 py-2 bg-amber-950/80 border-b border-amber-500/40 backdrop-blur-md flex items-center justify-between z-30 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-amber-200 font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>
              <strong>{totalStagedEditsCount}</strong> unsaved cell mutation{totalStagedEditsCount > 1 ? 's' : ''} staged
            </span>
            <span className="text-amber-400/60 text-[11px] font-mono">(PK: {detectedPkCol})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardStaged}
              disabled={savingUpdates}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-850 hover:bg-surface-800 text-gray-300 border border-border text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-gray-400" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={handleSaveStaged}
              disabled={savingUpdates}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition-all"
            >
              {savingUpdates ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Multi-Row Selection Sticky Action Bar */}
      {(selectedRowIds.size > 0 || isAllTableSelected) && (
        <div className="px-4 py-2 bg-brand-950/85 border-b border-brand-500/40 backdrop-blur-md flex items-center justify-between z-30 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs text-brand-200 font-medium">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-500/20 border border-brand-500/30 text-brand-300">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>
                {isAllTableSelected
                  ? `All ${totalRows.toLocaleString()} rows selected in table`
                  : `${selectedRowIds.size} row${selectedRowIds.size > 1 ? 's' : ''} selected`}
              </span>
            </div>
            <span className="text-brand-400/60 text-[11px] font-mono">(PK: {detectedPkCol})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRowIds(new Set());
                setIsAllTableSelected(false);
              }}
              disabled={deletingRows}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-850 hover:bg-surface-800 text-gray-300 border border-border text-xs font-medium transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
              <span>Deselect All</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirmModal(true)}
              disabled={deletingRows}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-600/20 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>
                {isAllTableSelected ? 'Truncate Table' : `Delete Selected (${selectedRowIds.size})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Table Prompt Banner for Selecting All Table Records */}
      {allPageRowsSelected && totalRows > rows.length && !isAllTableSelected && (
        <div className="px-4 py-1.5 bg-[#1b2230] border-b border-brand-500/30 flex items-center justify-center text-xs text-brand-200 z-20">
          <span>
            All <strong>{rows.length}</strong> rows on this page are selected.{' '}
            <button
              type="button"
              onClick={() => setIsAllTableSelected(true)}
              className="text-brand-400 hover:text-brand-300 font-semibold underline ml-1 cursor-pointer transition-colors"
            >
              Select all {totalRows.toLocaleString()} records in "{tableName}"
            </button>
          </span>
        </div>
      )}

      {/* 4. Table Content Container */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-900 border border-border text-xs text-brand-300 shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>Fetching records...</span>
            </div>
          </div>
        )}

        <table className="text-left border-collapse text-xs select-text table-fixed min-w-full">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-[#1F1F1F] z-20 shadow-sm border-b border-[#2D2D2D]">
            <tr>
              {/* Checkbox Column */}
              <th className="w-[44px] min-w-[44px] max-w-[44px] px-2.5 py-2.5 text-center border-r border-[#2D2D2D] bg-[#1a1a1a] sticky left-0 z-30">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={isAllTableSelected || (allPageRowsSelected && rows.length > 0)}
                  onChange={handleToggleSelectAllPage}
                  className="rounded border-gray-600 bg-surface-800 text-brand-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>

              {/* Row Number Sticky Column */}
              <th className="w-[50px] min-w-[50px] max-w-[50px] px-2 py-2.5 text-center text-gray-500 font-mono font-medium text-[11px] border-r border-[#2D2D2D] bg-[#1a1a1a] sticky left-[44px] z-30">
                #
              </th>

              {columns.map((col) => {
                const width = getColumnWidth(col.name);
                const isColSorted = sortColumn === col.name;

                return (
                  <th
                    key={col.name}
                    style={{ width, minWidth: width, maxWidth: width }}
                    className={`px-4 py-2.5 font-medium border-r border-[#2D2D2D] group/col transition-colors relative select-none whitespace-nowrap ${
                      isColSorted ? 'bg-[#242424] text-cyan-300' : 'text-gray-200 hover:bg-[#252525]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 pr-2 overflow-hidden">
                      <div
                        onClick={() => {
                          if (!onSortChange) return;
                          let nextOrder: 'ASC' | 'DESC' | '' = 'ASC';
                          if (sortColumn === col.name) {
                            if (sortOrder === 'ASC') nextOrder = 'DESC';
                            else if (sortOrder === 'DESC') nextOrder = '';
                          }
                          onSortChange(col.name, nextOrder);
                        }}
                        className="flex items-center gap-1.5 min-w-0 truncate flex-1 cursor-pointer hover:text-cyan-300 transition-colors"
                        title={`Click to sort by "${col.name}"`}
                      >
                        {col.isPrimaryKey && (
                          <span title="Primary Key" className="inline-flex flex-shrink-0">
                            <Key className="w-3 h-3 text-amber-400" />
                          </span>
                        )}
                        <span
                          className={`font-semibold truncate ${
                            isColSorted ? 'text-cyan-300' : 'text-gray-100'
                          }`}
                        >
                          {col.name}
                        </span>

                        {/* Sort Indicator */}
                        {isColSorted ? (
                          sortOrder === 'ASC' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-zinc-500 opacity-0 group-hover/col:opacity-60 flex-shrink-0 transition-opacity" />
                        )}

                        {col.type && (
                          <span
                            className="text-[10px] text-zinc-500 font-normal font-mono flex-shrink-0"
                            title={col.type}
                          >
                            ({formatDisplayType(col.type, col.enumValues)})
                          </span>
                        )}
                      </div>

                      {/* Column Header Actions (Rename, Drop) */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setColumnToRename({ oldName: col.name, newName: col.name });
                          }}
                          title="Rename Column"
                          className="p-1 rounded text-gray-400 hover:text-brand-300 hover:bg-surface-700 transition-colors"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setColumnToDrop(col.name);
                          }}
                          title="Drop Column"
                          className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-surface-700 transition-colors"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Resizable Column Handle */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.name)}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize select-none flex items-center justify-center group/resizer z-10 hover:bg-brand-500/20"
                    >
                      <div className="w-[2px] h-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#242424]">
            {rows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="py-16 text-center text-gray-500 italic select-none"
                >
                  No records in "{tableName}"
                </td>
              </tr>
            )}

            {rows.map((row, rIdx) => {
              const rowId = String(row[detectedPkCol] ?? rIdx);
              const isRowSelected = isAllTableSelected || selectedRowIds.has(rowId);

              return (
                <tr
                  key={rIdx}
                  className={`transition-colors group/row ${
                    isRowSelected
                      ? 'bg-brand-950/35 hover:bg-brand-900/45 text-blue-100'
                      : 'hover:bg-[#1a1a1a]'
                  }`}
                >
                  {/* Row Checkbox Column */}
                  <td className={`w-[44px] min-w-[44px] max-w-[44px] px-2.5 py-2 text-center border-r border-[#242424] sticky left-0 z-10 select-none ${
                    isRowSelected ? 'bg-[#151c28]' : 'bg-[#141414] group-hover/row:bg-[#1a1a1a]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={() => handleToggleRowSelect(rowId)}
                      className="rounded border-gray-600 bg-surface-800 text-brand-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>

                  {/* Sticky Row Index */}
                  <td className={`w-[50px] min-w-[50px] max-w-[50px] px-2 py-2 text-center text-gray-500 font-mono text-[10px] border-r border-[#242424] sticky left-[44px] z-10 select-none ${
                    isRowSelected ? 'bg-[#151c28]' : 'bg-[#141414] group-hover/row:bg-[#1a1a1a]'
                  }`}>
                    {(page - 1) * limit + rIdx + 1}
                  </td>

                  {columns.map((col) => {
                    const width = getColumnWidth(col.name);
                    const isEditing =
                      editingCell?.rowIdx === rIdx && editingCell?.colName === col.name;
                    const staged = isCellStaged(rowId, col.name);
                    const cellVal = getCellValue(row, rowId, col.name);
                    const isEnum = Boolean(col.enumValues && col.enumValues.length > 0);
                    const isBool = col.type.toLowerCase().includes('bool');

                    return (
                      <td
                        key={col.name}
                        style={{ width, minWidth: width, maxWidth: width }}
                        onDoubleClick={() => handleStartEdit(rIdx, row, col)}
                        className={`px-4 py-2 border-r border-[#242424] truncate relative cursor-pointer ${
                          staged
                            ? 'bg-amber-500/15 text-amber-200 border-b-amber-500/40'
                            : ''
                        }`}
                      >
                        {/* Staged Indicator Corner Dot */}
                        {staged && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-black" title="Staged edit" />
                        )}

                        {/* Inline Editor */}
                        {isEditing ? (
                          <div className="w-full flex items-center" onClick={(e) => e.stopPropagation()}>
                            {isBool ? (
                              <select
                                ref={inputRef as React.RefObject<HTMLSelectElement>}
                                value={String(editingCell.editValue)}
                                onChange={(e) => {
                                  const v = e.target.value === 'NULL' ? null : e.target.value === 'true';
                                  commitEdit(v);
                                }}
                                onBlur={() => commitEdit()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full bg-[#1a1a1a] border border-brand-500 rounded px-1 py-0.5 text-xs text-gray-100 outline-none font-mono"
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                                {col.isNullable && <option value="NULL">NULL</option>}
                              </select>
                            ) : isEnum ? (
                              <select
                                ref={inputRef as React.RefObject<HTMLSelectElement>}
                                value={editingCell.editValue}
                                onChange={(e) => {
                                  const v = e.target.value === 'NULL' ? null : e.target.value;
                                  commitEdit(v);
                                }}
                                onBlur={() => commitEdit()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full bg-[#1a1a1a] border border-brand-500 rounded px-1 py-0.5 text-xs text-gray-100 outline-none font-mono"
                              >
                                {col.enumValues?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                                {col.isNullable && <option value="NULL">NULL</option>}
                              </select>
                            ) : (
                              <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                value={editingCell.editValue}
                                onChange={(e) =>
                                  setEditingCell({ ...editingCell, editValue: e.target.value })
                                }
                                onBlur={() => commitEdit()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full bg-[#1a1a1a] border border-brand-500 rounded px-1.5 py-0.5 text-xs text-gray-100 outline-none font-mono"
                              />
                            )}
                          </div>
                        ) : (
                          renderCellValue(cellVal, staged)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Pagination Footer */}
      <div className="px-4 py-2.5 bg-surface-900 border-t border-border-subtle flex items-center justify-between text-xs text-gray-400 select-none flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-gray-200">{startRow}-{endRow}</strong> of{' '}
            <strong className="text-gray-200">{totalRows.toLocaleString()}</strong> rows
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-surface-800 border border-border text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="p-1 rounded bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Batch Row Deletion / Truncation */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-border rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-100">
                  {isAllTableSelected ? 'Truncate Table' : 'Delete Selected Rows'}
                </h4>
                <p className="text-xs text-gray-400">
                  {isAllTableSelected
                    ? 'Permanent removal of all table records'
                    : 'Permanent removal of selected records'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-950/70 border border-border/60 text-xs text-gray-300 space-y-2">
              {isAllTableSelected ? (
                <p className="leading-relaxed">
                  Are you sure you want to permanently delete all{' '}
                  <strong className="text-rose-300 font-semibold">{totalRows.toLocaleString()}</strong> records in table{' '}
                  <strong className="text-gray-100 font-mono">"{tableName}"</strong>?
                  <br />
                  <span className="text-gray-400 text-[11px] mt-1 block">
                    This will execute a <code className="text-rose-400 bg-surface-800 px-1 rounded">TRUNCATE TABLE CASCADE</code> statement.
                  </span>
                </p>
              ) : (
                <p className="leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-rose-300 font-semibold">{selectedRowIds.size}</strong> selected row{selectedRowIds.size > 1 ? 's' : ''} from table{' '}
                  <strong className="text-gray-100 font-mono">"{tableName}"</strong>?
                  <br />
                  <span className="text-gray-400 text-[11px] mt-1 block">
                    Matching records via primary key column <code className="text-brand-300 bg-surface-800 px-1 rounded">{detectedPkCol}</code>.
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deletingRows}
                className="px-3.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={deletingRows}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20"
              >
                {deletingRows ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {isAllTableSelected ? 'Truncate Table' : `Delete (${selectedRowIds.size})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Dropping Column */}
      {columnToDrop && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-border rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-100">Drop Column</h4>
                <p className="text-xs text-gray-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-gray-300">
              Are you sure you want to drop column <strong className="text-rose-300 font-mono">"{columnToDrop}"</strong> from table <strong className="text-gray-100 font-mono">"{tableName}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setColumnToDrop(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDrop}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20"
              >
                {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Drop Column</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Renaming Column */}
      {columnToRename && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={confirmRename}
            className="bg-surface-900 border border-border rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-100">Rename Column</h4>
                <p className="text-xs text-gray-400">Update column identifier in PostgreSQL</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">New Column Name</label>
              <input
                type="text"
                required
                autoFocus
                value={columnToRename.newName}
                onChange={(e) =>
                  setColumnToRename({ ...columnToRename, newName: e.target.value })
                }
                className="w-full px-3 py-2 bg-surface-800 border border-border rounded-lg text-xs text-gray-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setColumnToRename(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !columnToRename.newName.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-md shadow-brand-600/20"
              >
                {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Rename</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
