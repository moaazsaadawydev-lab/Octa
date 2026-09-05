import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { TableColumn, TableDataResult, RowUpdate, EditingCellState } from '../../types';
import { DataGridToolbar } from './DataGridToolbar';
import { DataGridFilterPopover } from './DataGridFilterPopover';
import { DataGridTableHead } from './DataGridTableHead';
import { DataGridTableBody } from './DataGridTableBody';
import { DataGridPagination } from './DataGridPagination';
import { DataGridModals } from './DataGridModals';
import { useDataGridModals } from './useDataGridModals';

export interface DataGridProps {
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

export const DataGrid: React.FC<DataGridProps> = (props) => {
  const {
    tableName,
    schema,
    dataResult,
    loading,
    page,
    limit,
    sortColumn,
    sortOrder,
    filterColumn,
    filterOp,
    filterValue,
    onPageChange,
    onLimitChange,
    onSortChange,
    onApplyFilter,
    onClearFilter,
    onDropColumn,
    onRenameColumn,
    onSaveUpdates,
    onDeleteRows,
  } = props;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [stagedUpdates, setStagedUpdates] = useState<Record<string, Record<string, any>>>({});
  const [savingUpdates, setSavingUpdates] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);

  const [inputFilterCol, setInputFilterCol] = useState(filterColumn || '');
  const [inputFilterOp, setInputFilterOp] = useState(filterOp || 'contains');
  const [inputFilterVal, setInputFilterVal] = useState(filterValue || '');

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const columns: TableColumn[] = schema.length > 0 ? schema : (dataResult?.columns || []).map((c) => ({
    name: c,
    type: 'text',
    isNullable: true,
    isPrimaryKey: false,
  }));

  const pkCol = schema.find((c) => c.isPrimaryKey)?.name || 'id';
  const rows = dataResult?.rows || [];
  const totalRows = dataResult?.totalRows || 0;

  const modals = useDataGridModals(
    pkCol,
    selectedRowIds,
    onDeleteRows,
    onDropColumn,
    onRenameColumn,
    setSelectedRowIds
  );

  const stagedCount = Object.keys(stagedUpdates).reduce(
    (sum, id) => sum + Object.keys(stagedUpdates[id]).length,
    0
  );

  const allPageSelected = rows.length > 0 && rows.every((r, i) => selectedRowIds.has(String(r[pkCol] ?? i)));

  const handleToggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedRowIds(new Set());
    } else {
      const next = new Set(selectedRowIds);
      rows.forEach((r, i) => next.add(String(r[pkCol] ?? i)));
      setSelectedRowIds(next);
    }
  };

  const handleSaveStaged = async () => {
    setSavingUpdates(true);
    try {
      const updates: RowUpdate[] = [];
      for (const rowId of Object.keys(stagedUpdates)) {
        for (const colName of Object.keys(stagedUpdates[rowId])) {
          updates.push({ rowId, column: colName, newValue: stagedUpdates[rowId][colName] });
        }
      }
      await onSaveUpdates(pkCol, updates);
      setStagedUpdates({});
    } finally {
      setSavingUpdates(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#0c0d12] relative font-sans">
      <DataGridToolbar
        tableName={tableName}
        filterActive={Boolean(filterColumn && filterValue)}
        filterColumn={filterColumn}
        filterOp={filterOp}
        filterValue={filterValue}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        onClearFilter={onClearFilter}
        stagedCount={stagedCount}
        savingUpdates={savingUpdates}
        onSaveUpdates={handleSaveStaged}
        onDiscardUpdates={() => setStagedUpdates({})}
        selectedRowCount={selectedRowIds.size}
        onOpenDeleteModal={() => modals.setShowDeleteModal(true)}
      />

      <DataGridFilterPopover
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        columns={columns}
        inputFilterCol={inputFilterCol || columns[0]?.name || ''}
        setInputFilterCol={setInputFilterCol}
        inputFilterOp={inputFilterOp}
        setInputFilterOp={setInputFilterOp}
        inputFilterVal={inputFilterVal}
        setInputFilterVal={setInputFilterVal}
        onApply={() => {
          setIsFilterOpen(false);
          onApplyFilter?.(inputFilterCol, inputFilterOp, inputFilterVal);
        }}
        onClear={() => {
          setIsFilterOpen(false);
          onClearFilter?.();
        }}
      />

      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 z-30 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        )}

        <table className="w-full border-collapse text-xs font-mono">
          <DataGridTableHead
            columns={columns}
            columnWidths={{}}
            sortColumn={sortColumn}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
            allPageRowsSelected={allPageSelected}
            onToggleSelectAll={handleToggleSelectAll}
            headerCheckboxRef={headerCheckboxRef}
            onOpenColumnMenu={(col) => modals.setColumnToRename({ oldName: col, newName: col })}
            onResizeStart={() => {}}
          />
          <DataGridTableBody
            rows={rows}
            columns={columns}
            pkCol={pkCol}
            selectedRowIds={selectedRowIds}
            onToggleRowSelect={(rowId) => {
              const next = new Set(selectedRowIds);
              if (next.has(rowId)) next.delete(rowId);
              else next.add(rowId);
              setSelectedRowIds(next);
            }}
            stagedUpdates={stagedUpdates}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            onCellCommit={(newVal) => {
              if (!editingCell) return;
              const { rowId, colName } = editingCell;
              setStagedUpdates((prev) => ({
                ...prev,
                [rowId]: { ...(prev[rowId] || {}), [colName]: newVal },
              }));
              setEditingCell(null);
            }}
            inputRef={inputRef}
          />
        </table>
      </div>

      <DataGridPagination
        page={page}
        limit={limit}
        totalRows={totalRows}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />

      <DataGridModals
        showDeleteModal={modals.showDeleteModal}
        onCloseDeleteModal={() => modals.setShowDeleteModal(false)}
        onConfirmDelete={modals.handleConfirmDelete}
        selectedCount={selectedRowIds.size}
        isAllTable={modals.isAllTable}
        setIsAllTable={modals.setIsAllTable}
        tableName={tableName}
        deletingRows={modals.deletingRows}
        columnToDrop={modals.columnToDrop}
        onCloseDropModal={() => modals.setColumnToDrop(null)}
        onConfirmDrop={modals.handleConfirmDrop}
        columnToRename={modals.columnToRename}
        setColumnToRename={modals.setColumnToRename}
        onCloseRenameModal={() => modals.setColumnToRename(null)}
        onConfirmRename={modals.handleConfirmRename}
      />
    </div>
  );
};
