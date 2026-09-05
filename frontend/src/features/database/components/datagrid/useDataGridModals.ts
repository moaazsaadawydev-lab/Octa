import { useState, useCallback } from 'react';

export function useDataGridModals(
  pkCol: string,
  selectedRowIds: Set<string>,
  onDeleteRows: (primaryKeyCol: string, rowIds: string[], isAllTable: boolean) => Promise<void>,
  onDropColumn: (colName: string) => Promise<void>,
  onRenameColumn: (oldName: string, newName: string) => Promise<void>,
  setSelectedRowIds: (ids: Set<string>) => void
) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAllTable, setIsAllTable] = useState(false);
  const [deletingRows, setDeletingRows] = useState(false);
  const [columnToDrop, setColumnToDrop] = useState<string | null>(null);
  const [columnToRename, setColumnToRename] = useState<{ oldName: string; newName: string } | null>(null);

  const handleConfirmDelete = useCallback(async () => {
    setDeletingRows(true);
    try {
      await onDeleteRows(pkCol, Array.from(selectedRowIds), isAllTable);
      setSelectedRowIds(new Set());
      setIsAllTable(false);
      setShowDeleteModal(false);
    } finally {
      setDeletingRows(false);
    }
  }, [isAllTable, onDeleteRows, pkCol, selectedRowIds, setSelectedRowIds]);

  const handleConfirmDrop = useCallback(async () => {
    if (columnToDrop) {
      await onDropColumn(columnToDrop);
      setColumnToDrop(null);
    }
  }, [columnToDrop, onDropColumn]);

  const handleConfirmRename = useCallback(async () => {
    if (columnToRename && columnToRename.newName.trim()) {
      await onRenameColumn(columnToRename.oldName, columnToRename.newName.trim());
      setColumnToRename(null);
    }
  }, [columnToRename, onRenameColumn]);

  return {
    showDeleteModal,
    setShowDeleteModal,
    isAllTable,
    setIsAllTable,
    deletingRows,
    columnToDrop,
    setColumnToDrop,
    columnToRename,
    setColumnToRename,
    handleConfirmDelete,
    handleConfirmDrop,
    handleConfirmRename,
  };
}
