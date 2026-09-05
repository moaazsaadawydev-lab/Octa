import { useState, useCallback } from 'react';
import { ActiveSession, TableTabState, RowUpdate } from '../types';
import {
  getTableSchema,
  getTableData,
  updateTableRows,
  deleteTableRows,
  truncateTable,
  dropColumn,
  renameColumn,
} from '../../../services/api';

export const createDefaultTableState = (existing?: Partial<TableTabState>): TableTabState => ({
  schema: existing?.schema || [],
  tableData: existing?.tableData || null,
  loadingData: existing?.loadingData || false,
  page: existing?.page || 1,
  limit: existing?.limit || 50,
  sortColumn: existing?.sortColumn || '',
  sortOrder: existing?.sortOrder || '',
  filterColumn: existing?.filterColumn || '',
  filterOp: existing?.filterOp || 'contains',
  filterValue: existing?.filterValue || '',
});

export interface UseTableDataOptions {
  activeSession: ActiveSession | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useTableData({ activeSession, showToast = () => {} }: UseTableDataOptions) {
  const [tableStates, setTableStates] = useState<Record<string, TableTabState>>({});

  const loadTableDetails = useCallback(
    async (tblName: string, stateOverrides?: Partial<TableTabState>) => {
      if (!activeSession) return;
      const current = tableStates[tblName] || createDefaultTableState();
      const effectiveState: TableTabState = {
        ...current,
        ...stateOverrides,
        loadingData: true,
      };

      setTableStates((prev) => ({ ...prev, [tblName]: effectiveState }));

      try {
        const [schemaRes, dataRes] = await Promise.all([
          getTableSchema(activeSession.connection, activeSession.activeDatabase, tblName),
          getTableData(activeSession.connection, activeSession.activeDatabase, tblName, {
            page: effectiveState.page,
            pageSize: effectiveState.limit,
            sortColumn: effectiveState.sortColumn,
            sortOrder: effectiveState.sortOrder,
            filterColumn: effectiveState.filterColumn,
            filterOp: effectiveState.filterOp,
            filterValue: effectiveState.filterValue,
          }),
        ]);

        setTableStates((prev) => ({
          ...prev,
          [tblName]: {
            ...effectiveState,
            schema: schemaRes,
            tableData: dataRes,
            loadingData: false,
          },
        }));
      } catch (err: any) {
        setTableStates((prev) => ({
          ...prev,
          [tblName]: { ...(prev[tblName] || createDefaultTableState()), loadingData: false },
        }));
        showToast('Failed to load table ' + tblName + ': ' + (err?.message || err), 'error');
      }
    },
    [activeSession, tableStates, showToast]
  );

  const handleSortChange = useCallback((tblName: string, colName: string, newOrder: 'ASC' | 'DESC' | '') => {
    loadTableDetails(tblName, {
      sortColumn: newOrder === '' ? '' : colName,
      sortOrder: newOrder,
      page: 1,
    });
  }, [loadTableDetails]);

  const handleApplyFilter = useCallback((tblName: string, col: string, op: string, val: string) => {
    loadTableDetails(tblName, {
      filterColumn: col,
      filterOp: op,
      filterValue: val,
      page: 1,
    });
  }, [loadTableDetails]);

  const handleClearFilter = useCallback((tblName: string) => {
    loadTableDetails(tblName, {
      filterColumn: '',
      filterOp: 'contains',
      filterValue: '',
      page: 1,
    });
  }, [loadTableDetails]);

  const handlePageChange = useCallback((tblName: string, newPage: number) => {
    loadTableDetails(tblName, { page: newPage });
  }, [loadTableDetails]);

  const handleLimitChange = useCallback((tblName: string, newLimit: number) => {
    loadTableDetails(tblName, { limit: newLimit, page: 1 });
  }, [loadTableDetails]);

  const handleSaveUpdates = useCallback(
    async (tblName: string, primaryKeyCol: string, updates: RowUpdate[]) => {
      if (!activeSession) return;
      try {
        await updateTableRows(activeSession.connection, activeSession.activeDatabase, tblName, primaryKeyCol, updates);
        showToast(`Saved ${updates.length} cell change(s)`, 'success');
        await loadTableDetails(tblName);
      } catch (err: any) {
        showToast('Failed to save changes: ' + (err?.message || err), 'error');
        throw err;
      }
    },
    [activeSession, loadTableDetails, showToast]
  );

  const handleDeleteRows = useCallback(
    async (tblName: string, primaryKeyCol: string, rowIds: string[], isAllTable: boolean) => {
      if (!activeSession) return;
      try {
        if (isAllTable) {
          await truncateTable(activeSession.connection, activeSession.activeDatabase, tblName);
          showToast(`All rows deleted from ${tblName}`, 'success');
        } else {
          if (rowIds.length === 0) return;
          await deleteTableRows(activeSession.connection, activeSession.activeDatabase, tblName, primaryKeyCol, rowIds);
          showToast(`Deleted ${rowIds.length} row(s)`, 'success');
        }
        await loadTableDetails(tblName, { page: 1 });
      } catch (err: any) {
        showToast('Failed to delete rows: ' + (err?.message || err), 'error');
        throw err;
      }
    },
    [activeSession, loadTableDetails, showToast]
  );

  const handleDropColumn = useCallback(
    async (tblName: string, colName: string) => {
      if (!activeSession) return;
      try {
        await dropColumn(activeSession.connection, activeSession.activeDatabase, tblName, colName);
        showToast(`Column "${colName}" dropped`, 'success');
        await loadTableDetails(tblName);
      } catch (err: any) {
        showToast('Failed to drop column: ' + (err?.message || err), 'error');
        throw err;
      }
    },
    [activeSession, loadTableDetails, showToast]
  );

  const handleRenameColumn = useCallback(
    async (tblName: string, oldName: string, newName: string) => {
      if (!activeSession) return;
      try {
        await renameColumn(activeSession.connection, activeSession.activeDatabase, tblName, oldName, newName);
        showToast(`Column "${oldName}" renamed to "${newName}"`, 'success');
        await loadTableDetails(tblName);
      } catch (err: any) {
        showToast('Failed to rename column: ' + (err?.message || err), 'error');
        throw err;
      }
    },
    [activeSession, loadTableDetails, showToast]
  );

  return {
    tableStates,
    setTableStates,
    loadTableDetails,
    handleSortChange,
    handleApplyFilter,
    handleClearFilter,
    handlePageChange,
    handleLimitChange,
    handleSaveUpdates,
    handleDeleteRows,
    handleDropColumn,
    handleRenameColumn,
  };
}
