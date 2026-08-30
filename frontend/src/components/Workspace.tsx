import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Table,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  Layers,
  ArrowRight,
  Shield,
  Clock,
  HardDrive
} from 'lucide-react';
import { ActiveSession, TableColumn, TableDataResult, RowUpdate } from '../types/connection';
import {
  getTables,
  getTableSchema,
  getTableData,
  addColumn,
  dropColumn,
  renameColumn,
  updateTableRows,
  deleteTableRows,
  truncateTable,
} from '../services/api';
import { DataGrid } from './DataGrid';
import { QueryConsole } from './QueryConsole';

interface WorkspaceProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const COMMON_COLUMN_TYPES = [
  'VARCHAR(255)',
  'TEXT',
  'INT',
  'BIGINT',
  'BOOLEAN',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'JSONB',
  'NUMERIC(10,2)',
  'UUID',
  'SERIAL',
];

export const Workspace: React.FC<WorkspaceProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
}) => {
  // Table Explorer state
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);

  // Resizable inner Tables sidebar width (persisted in localStorage)
  const [tablesWidth, setTablesWidth] = useState<number>(() => {
    const saved = localStorage.getItem('devcockpit_tables_sidebar_width');
    const num = saved ? Number(saved) : 240;
    return isNaN(num) ? 240 : Math.min(400, Math.max(180, num));
  });

  const tablesResizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleTablesResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tablesResizingRef.current = { startX: e.clientX, startWidth: tablesWidth };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!tablesResizingRef.current) return;
      const deltaX = moveEvent.clientX - tablesResizingRef.current.startX;
      const nextWidth = Math.min(400, Math.max(180, tablesResizingRef.current.startWidth + deltaX));
      setTablesWidth(nextWidth);
      localStorage.setItem('devcockpit_tables_sidebar_width', String(nextWidth));
    };

    const onMouseUp = () => {
      tablesResizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Active table schema & data
  const [schema, setSchema] = useState<TableColumn[]>([]);
  const [tableData, setTableData] = useState<TableDataResult | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Quick Add Column state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('VARCHAR(255)');
  const [newColNullable, setNewColNullable] = useState(true);
  const [addingCol, setAddingCol] = useState(false);

  // SQL Query Console expand/collapse
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);

  // Load tables whenever activeSession changes
  const loadTables = useCallback(async (preferredTable?: string) => {
    if (!activeSession) return;
    setLoadingTables(true);
    try {
      const tbls = await getTables(activeSession.connection, activeSession.activeDatabase);
      setTables(tbls);

      if (tbls.length > 0) {
        if (preferredTable && tbls.includes(preferredTable)) {
          setSelectedTable(preferredTable);
        } else if (!selectedTable || !tbls.includes(selectedTable)) {
          setSelectedTable(tbls[0]);
        }
      } else {
        setSelectedTable(null);
        setSchema([]);
        setTableData(null);
      }
    } catch (err: any) {
      console.error('Failed to load tables:', err);
      showToast(`Failed to load tables: ${err?.message || err}`, 'error');
    } finally {
      setLoadingTables(false);
    }
  }, [activeSession, selectedTable, showToast]);

  useEffect(() => {
    if (activeSession) {
      loadTables();
    } else {
      setTables([]);
      setSelectedTable(null);
      setSchema([]);
      setTableData(null);
    }
  }, [activeSession?.connection.id, activeSession?.activeDatabase]);

  // Load schema & data for the selected table
  const loadTableDetails = useCallback(async (tblName: string, curPage: number = 1, curLimit: number = 50) => {
    if (!activeSession || !tblName) return;
    setLoadingData(true);
    try {
      const [schemaRes, dataRes] = await Promise.all([
        getTableSchema(activeSession.connection, activeSession.activeDatabase, tblName),
        getTableData(
          activeSession.connection,
          activeSession.activeDatabase,
          tblName,
          curLimit,
          (curPage - 1) * curLimit
        ),
      ]);

      setSchema(schemaRes);
      setTableData(dataRes);
    } catch (err: any) {
      console.error(`Failed to load details for ${tblName}:`, err);
      showToast(`Failed to load data for ${tblName}: ${err?.message || err}`, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [activeSession, showToast]);

  useEffect(() => {
    if (selectedTable) {
      loadTableDetails(selectedTable, page, limit);
    }
  }, [selectedTable, page, limit, loadTableDetails]);

  // Table selection change
  const handleSelectTable = (tblName: string) => {
    if (selectedTable === tblName) return;
    setSelectedTable(tblName);
    setPage(1);
  };

  // Full refresh
  const handleRefresh = async () => {
    if (selectedTable) {
      await loadTableDetails(selectedTable, page, limit);
      showToast(`Refreshed table "${selectedTable}"`, 'info');
    } else {
      await loadTables();
      showToast('Refreshed tables list', 'info');
    }
  };

  // Add Column handler
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !selectedTable || !newColName.trim()) return;

    setAddingCol(true);
    try {
      await addColumn(
        activeSession.connection,
        activeSession.activeDatabase,
        selectedTable,
        newColName.trim(),
        newColType,
        newColNullable
      );

      showToast(`Column "${newColName.trim()}" added to ${selectedTable}`, 'success');
      setNewColName('');
      await loadTableDetails(selectedTable, page, limit);
    } catch (err: any) {
      console.error('Failed to add column:', err);
      showToast(`Failed to add column: ${err?.message || err}`, 'error');
    } finally {
      setAddingCol(false);
    }
  };

  // Drop Column handler
  const handleDropColumn = async (colName: string) => {
    if (!activeSession || !selectedTable) return;
    try {
      await dropColumn(
        activeSession.connection,
        activeSession.activeDatabase,
        selectedTable,
        colName
      );
      showToast(`Dropped column "${colName}" from ${selectedTable}`, 'success');
      await loadTableDetails(selectedTable, page, limit);
    } catch (err: any) {
      console.error('Failed to drop column:', err);
      showToast(`Failed to drop column: ${err?.message || err}`, 'error');
      throw err;
    }
  };

  // Rename Column handler
  const handleRenameColumn = async (oldName: string, newName: string) => {
    if (!activeSession || !selectedTable) return;
    try {
      await renameColumn(
        activeSession.connection,
        activeSession.activeDatabase,
        selectedTable,
        oldName,
        newName
      );
      showToast(`Renamed column "${oldName}" to "${newName}"`, 'success');
      await loadTableDetails(selectedTable, page, limit);
    } catch (err: any) {
      console.error('Failed to rename column:', err);
      showToast(`Failed to rename column: ${err?.message || err}`, 'error');
      throw err;
    }
  };

  // Save Batch Cell Updates handler
  const handleSaveUpdates = async (primaryKeyCol: string, updates: RowUpdate[]) => {
    if (!activeSession || !selectedTable || updates.length === 0) return;
    try {
      await updateTableRows(
        activeSession.connection,
        activeSession.activeDatabase,
        selectedTable,
        primaryKeyCol,
        updates
      );
      showToast(
        `Successfully saved ${updates.length} cell change${updates.length > 1 ? 's' : ''} to ${selectedTable}`,
        'success'
      );
      await loadTableDetails(selectedTable, page, limit);
    } catch (err: any) {
      console.error('Failed to save updates:', err);
      showToast(`Failed to save changes: ${err?.message || err}`, 'error');
      throw err;
    }
  };

  // Batch Row Deletion & Truncation handler
  const handleDeleteRows = async (
    primaryKeyCol: string,
    rowIds: string[],
    isAllTable: boolean
  ) => {
    if (!activeSession || !selectedTable) return;
    try {
      if (isAllTable) {
        await truncateTable(
          activeSession.connection,
          activeSession.activeDatabase,
          selectedTable
        );
        showToast(`Successfully truncated table "${selectedTable}"`, 'success');
      } else {
        if (rowIds.length === 0) return;
        await deleteTableRows(
          activeSession.connection,
          activeSession.activeDatabase,
          selectedTable,
          primaryKeyCol,
          rowIds
        );
        showToast(
          `Successfully deleted ${rowIds.length} row${rowIds.length > 1 ? 's' : ''} from ${selectedTable}`,
          'success'
        );
      }
      await loadTableDetails(selectedTable, page, limit);
    } catch (err: any) {
      console.error('Failed to delete rows:', err);
      showToast(`Failed to delete rows: ${err?.message || err}`, 'error');
      throw err;
    }
  };

  // Filtered tables list
  const filteredTables = tables.filter((t) =>
    t.toLowerCase().includes(tableSearch.toLowerCase().trim())
  );

  // If no connection is active, render welcoming screen
  if (!activeSession) {
    return (
      <div className="flex-1 bg-surface-950 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-6 shadow-xl">
            <Database className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-bold text-gray-100 mb-2">DevCockpit</h1>
          <p className="text-xs text-gray-400 leading-relaxed mb-8">
            Fast, lightweight, modern database GUI client. Select a server from the explorer or create a new connection to start working.
          </p>

          <button
            onClick={onOpenNewModal}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-900 border border-border/80 hover:border-brand-500/50 hover:bg-surface-850 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-100">Add New Connection</div>
                <div className="text-[11px] text-gray-400">Configure PostgreSQL credentials</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-surface-950 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Bar & Quick Action Controls */}
      <div className="px-5 py-2.5 border-b border-border-subtle bg-surface-900/90 backdrop-blur flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        {/* Left Status & Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-mono text-[11px]">
              {activeSession.connection.host}:{activeSession.connection.port}
            </span>
            <span className="text-gray-600">/</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">{activeSession.activeDatabase}</span>
            </div>
            {selectedTable && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-brand-300 font-semibold flex items-center gap-1">
                  <Table className="w-3.5 h-3.5 text-brand-400" />
                  {selectedTable}
                </span>
              </>
            )}
          </div>

          <button
            onClick={handleRefresh}
            title="Refresh Data and Schema"
            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData || loadingTables ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>

        {/* Right Top Action Bar: Quick "Add Column" Controls */}
        {selectedTable && (
          <form onSubmit={handleAddColumn} className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:inline">
              Add Column:
            </span>

            {/* Column Name Input */}
            <input
              type="text"
              required
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Column name"
              className="px-2.5 py-1.5 bg-surface-800 border border-border/80 rounded-md text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 w-32 font-mono"
            />

            {/* Column Type Select */}
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value)}
              className="px-2 py-1.5 bg-surface-800 border border-border/80 rounded-md text-xs text-gray-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              {COMMON_COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Nullable Checkbox */}
            <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer bg-surface-800/80 px-2 py-1.5 rounded-md border border-border/60">
              <input
                type="checkbox"
                checked={newColNullable}
                onChange={(e) => setNewColNullable(e.target.checked)}
                className="rounded border-border bg-surface-700 text-brand-600 focus:ring-0"
              />
              <span>Nullable</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={addingCol || !newColName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm disabled:opacity-50 transition-all"
            >
              {addingCol ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add</span>
            </button>
          </form>
        )}
      </div>

      {/* 2. Main Middle Workspace Area (Inner Tables Sidebar + Data Grid) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Inner Tables Sidebar */}
        <div
          style={{ width: tablesWidth, minWidth: tablesWidth, maxWidth: tablesWidth }}
          className="bg-surface-900 border-r border-border-subtle flex flex-col flex-shrink-0 select-none relative group/tables-sidebar"
        >
          {/* Tables Header */}
          <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Tables
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-800 text-gray-400 border border-border/50 font-mono">
              {tables.length}
            </span>
          </div>

          {/* Search Table */}
          <div className="p-2 border-b border-border-subtle bg-surface-850/40">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter tables..."
                className="w-full pl-7 pr-2 py-1 bg-surface-800 border border-border/60 rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-all font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Table List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {loadingTables && (
              <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Loading tables...</span>
              </div>
            )}

            {!loadingTables && tables.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500 italic">
                No tables in public schema
              </div>
            )}

            {!loadingTables &&
              filteredTables.map((tbl) => {
                const isSelected = selectedTable === tbl;
                return (
                  <button
                    key={tbl}
                    onClick={() => handleSelectTable(tbl)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-brand-600 text-white font-medium shadow-sm'
                        : 'text-gray-300 hover:bg-surface-800 hover:text-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isSelected ? 'text-white' : 'text-gray-400'
                        }`}
                      />
                      <span className="truncate font-mono text-[11px]">{tbl}</span>
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Vertical Drag-to-Resize Splitter Handle */}
          <div
            onMouseDown={handleTablesResizeStart}
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none flex items-center justify-center group/resizer z-20 hover:bg-brand-500/10 active:bg-brand-500/20"
          >
            <div className="w-[2px] h-full group-hover/resizer:bg-brand-400 group-active/resizer:bg-brand-500 bg-transparent transition-colors" />
          </div>
        </div>

        {/* Data Grid Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTable ? (
            <DataGrid
              tableName={selectedTable}
              schema={schema}
              dataResult={tableData}
              loading={loadingData}
              page={page}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              onDropColumn={handleDropColumn}
              onRenameColumn={handleRenameColumn}
              onSaveUpdates={handleSaveUpdates}
              onDeleteRows={handleDeleteRows}
            />
          ) : (
            <div className="flex-1 bg-[#141414] flex flex-col items-center justify-center text-gray-500 text-xs italic select-none">
              <Table className="w-8 h-8 text-gray-600 mb-2" />
              <span>Select a table from the sidebar to view records</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom SQL Query Log Console */}
      <QueryConsole
        isExpanded={isConsoleExpanded}
        onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
      />
    </div>
  );
};
