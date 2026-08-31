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
  HardDrive,
  Download,
  Upload,
  ChevronDown,
  FileCode
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
  exportTableSQL,
  exportDatabaseSQL,
  saveSQLDumpDialog,
  downloadSQLFile,
} from '../services/api';
import { DataGrid } from './DataGrid';
import { QueryConsole } from './QueryConsole';
import { HomeLanding } from './HomeLanding';
import { ImportSqlModal } from './ImportSqlModal';
import interfaceSvg from '../assets/interface.svg';

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
    const saved = localStorage.getItem('octa_tables_sidebar_width') || localStorage.getItem('devcockpit_tables_sidebar_width');
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
      localStorage.setItem('octa_tables_sidebar_width', String(nextWidth));
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

  // Sorting & Filtering state
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterOp, setFilterOp] = useState<string>('contains');
  const [filterValue, setFilterValue] = useState<string>('');

  // Quick Add Column state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('VARCHAR(255)');
  const [newColNullable, setNewColNullable] = useState(true);
  const [addingCol, setAddingCol] = useState(false);

  // SQL Query Console expand/collapse
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);

  // SQL Dump Export & Import States
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Handle Export Table SQL
  const handleExportTable = async (exportData: boolean) => {
    if (!activeSession || !selectedTable) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const sql = await exportTableSQL(
        activeSession.connection,
        activeSession.activeDatabase,
        selectedTable,
        exportData
      );

      const filename = `${selectedTable}_${exportData ? 'dump' : 'schema'}_${Date.now()}.sql`;

      try {
        const savedPath = await saveSQLDumpDialog(filename, sql);
        if (savedPath) {
          showToast(`Exported table dump to ${savedPath}`, 'success');
          return;
        }
      } catch {
        // Fallback to browser download
      }

      downloadSQLFile(filename, sql);
      showToast(
        `Exported ${selectedTable} (${exportData ? 'Structure + Data' : 'Structure Only'})`,
        'success'
      );
    } catch (err: any) {
      console.error('Export failed:', err);
      showToast(`Export failed: ${err?.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export Full Database SQL
  const handleExportDatabase = async (exportData: boolean) => {
    if (!activeSession) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const sql = await exportDatabaseSQL(
        activeSession.connection,
        activeSession.activeDatabase,
        exportData
      );

      const filename = `db_${activeSession.activeDatabase}_${exportData ? 'dump' : 'schema'}_${Date.now()}.sql`;

      try {
        const savedPath = await saveSQLDumpDialog(filename, sql);
        if (savedPath) {
          showToast(`Exported database dump to ${savedPath}`, 'success');
          return;
        }
      } catch {
        // Fallback to browser download
      }

      downloadSQLFile(filename, sql);
      showToast(
        `Exported database ${activeSession.activeDatabase} (${exportData ? 'Structure + Data' : 'Structure Only'})`,
        'success'
      );
    } catch (err: any) {
      console.error('Database export failed:', err);
      showToast(`Database export failed: ${err?.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

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
  const loadTableDetails = useCallback(
    async (
      tblName: string,
      curPage: number = page,
      curLimit: number = limit,
      curSortCol: string = sortColumn,
      curSortOrd: 'ASC' | 'DESC' | '' = sortOrder,
      curFilterCol: string = filterColumn,
      curFilterOp: string = filterOp,
      curFilterVal: string = filterValue
    ) => {
      if (!activeSession || !tblName) return;
      setLoadingData(true);
      try {
        const [schemaRes, dataRes] = await Promise.all([
          getTableSchema(activeSession.connection, activeSession.activeDatabase, tblName),
          getTableData(activeSession.connection, activeSession.activeDatabase, tblName, {
            page: curPage,
            pageSize: curLimit,
            sortColumn: curSortCol,
            sortOrder: curSortOrd,
            filterColumn: curFilterCol,
            filterOp: curFilterOp,
            filterValue: curFilterVal,
          }),
        ]);

        setSchema(schemaRes);
        setTableData(dataRes);
      } catch (err: any) {
        console.error(`Failed to load details for ${tblName}:`, err);
        showToast(`Failed to load data for ${tblName}: ${err?.message || err}`, 'error');
      } finally {
        setLoadingData(false);
      }
    },
    [activeSession, page, limit, sortColumn, sortOrder, filterColumn, filterOp, filterValue, showToast]
  );

  useEffect(() => {
    if (selectedTable) {
      loadTableDetails(selectedTable, page, limit, sortColumn, sortOrder, filterColumn, filterOp, filterValue);
    }
  }, [selectedTable, page, limit, sortColumn, sortOrder, filterColumn, filterOp, filterValue, loadTableDetails]);

  // Table selection change
  const handleSelectTable = (tblName: string) => {
    if (selectedTable === tblName) return;
    setSelectedTable(tblName);
    setPage(1);
    setSortColumn('');
    setSortOrder('');
    setFilterColumn('');
    setFilterOp('contains');
    setFilterValue('');
  };

  // Sort change handler
  const handleSortChange = (colName: string, newOrder: 'ASC' | 'DESC' | '') => {
    setSortColumn(newOrder === '' ? '' : colName);
    setSortOrder(newOrder);
    setPage(1);
  };

  // Filter change handlers
  const handleApplyFilter = (col: string, op: string, val: string) => {
    setFilterColumn(col);
    setFilterOp(op);
    setFilterValue(val);
    setPage(1);
  };

  const handleClearFilter = () => {
    setFilterColumn('');
    setFilterOp('contains');
    setFilterValue('');
    setPage(1);
  };

  // Full refresh
  const handleRefresh = async () => {
    if (selectedTable) {
      await loadTableDetails(selectedTable, page, limit, sortColumn, sortOrder, filterColumn, filterOp, filterValue);
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

  // If no connection is active, render sleek VS Code-inspired Home Landing
  if (!activeSession) {
    return <HomeLanding onOpenNewModal={onOpenNewModal} />;
  }

  return (
    <div className="flex-1 bg-surface-950 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Bar & Quick Action Controls */}
      <div className="px-5 py-2.5 border-b border-border-subtle bg-surface-900/90 backdrop-blur flex flex-wrap items-center justify-between gap-3 flex-shrink-0 relative z-30">
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
            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData || loadingTables ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>

        {/* Right Top Action Bar: Export / Import & Quick "Add Column" Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Import SQL Script Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            title="Import SQL script (.sql) into active database"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-800 hover:bg-surface-750 text-cyan-300 border border-cyan-500/30 font-medium text-xs shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Import SQL</span>
          </button>

          {/* Export SQL Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              title="Export database or table SQL dump"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-800 hover:bg-surface-750 text-emerald-300 border border-emerald-500/30 font-medium text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden md:inline">Export SQL</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#1f1f1f] border border-zinc-700/80 rounded-md shadow-2xl py-1.5 z-[100] animate-fade-in select-none">
                {selectedTable && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                      Table: {selectedTable}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportTable(false)}
                      className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Structure only (.sql)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportTable(true)}
                      className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Structure + Data (.sql)</span>
                    </button>
                    <div className="my-1 border-t border-zinc-800" />
                  </>
                )}

                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                  Database: {activeSession.activeDatabase}
                </div>
                <button
                  type="button"
                  onClick={() => handleExportDatabase(false)}
                  className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Database Structure only (.sql)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDatabase(true)}
                  className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Full Database Dump (.sql)</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick "Add Column" Controls */}
          {selectedTable && (
            <form onSubmit={handleAddColumn} className="flex items-center gap-2 text-xs border-l border-border/60 pl-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:inline">
                Add Column:
              </span>

              {/* Column Name Input */}
              <input
                type="text"
                required
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Column name"
                className="px-2.5 py-1.5 bg-surface-800 border border-border/80 rounded-md text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 w-28 font-mono"
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
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
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              filterColumn={filterColumn}
              filterOp={filterOp}
              filterValue={filterValue}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              onSortChange={handleSortChange}
              onApplyFilter={handleApplyFilter}
              onClearFilter={handleClearFilter}
              onDropColumn={handleDropColumn}
              onRenameColumn={handleRenameColumn}
              onSaveUpdates={handleSaveUpdates}
              onDeleteRows={handleDeleteRows}
            />
          ) : (
            <div className="flex-1 bg-[#121212] flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="w-48 h-48 max-w-[200px] max-h-[200px] flex items-center justify-center mb-3">
                <img
                  src={interfaceSvg}
                  alt="Octa"
                  className="w-full h-full object-contain opacity-30 select-none pointer-events-none drop-shadow-lg"
                />
              </div>
              <span className="text-zinc-500 font-medium text-xs">
                Select a table from the sidebar to inspect schema & records
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom SQL Query Log Console */}
      <QueryConsole
        isExpanded={isConsoleExpanded}
        onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
      />

      {/* 4. Import SQL Script Modal */}
      <ImportSqlModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeSession={activeSession}
        onImportSuccess={() => {
          loadTables();
          if (selectedTable) {
            handleRefresh();
          }
        }}
        showToast={showToast}
      />
    </div>
  );
};
