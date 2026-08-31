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
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  FileCode,
  X
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

export interface TableTabState {
  schema: TableColumn[];
  tableData: TableDataResult | null;
  loadingData: boolean;
  page: number;
  limit: number;
  sortColumn: string;
  sortOrder: 'ASC' | 'DESC' | '';
  filterColumn: string;
  filterOp: string;
  filterValue: string;
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

const createDefaultTableState = (existing?: Partial<TableTabState>): TableTabState => ({
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

export const Workspace: React.FC<WorkspaceProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
}) => {
  // Tables List in sidebar
  const [tables, setTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);

  // Multi-Tab State for Tables
  const [openTableTabs, setOpenTableTabs] = useState<string[]>(() => {
    if (!activeSession) return [];
    try {
      const key = 'octa_open_table_tabs_' + (activeSession.connection.id || activeSession.connection.name) + '_' + activeSession.activeDatabase;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse open table tabs from storage', e);
    }
    return [];
  });

  const [activeTableTab, setActiveTableTab] = useState<string | null>(() => {
    if (!activeSession) return null;
    try {
      const key = 'octa_active_table_tab_' + (activeSession.connection.id || activeSession.connection.name) + '_' + activeSession.activeDatabase;
      const saved = localStorage.getItem(key);
      if (saved && openTableTabs.includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return openTableTabs[0] || null;
  });

  // Per-Tab State storage: { [tableName]: TableTabState }
  const [tableStates, setTableStates] = useState<Record<string, TableTabState>>({});

  // Resizable inner Tables sidebar width (persisted in localStorage)
  const [tablesWidth, setTablesWidth] = useState<number>(() => {
    const saved = localStorage.getItem('octa_tables_sidebar_width');
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

  // Quick Add Column form state
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

  // Persist open table tabs to localStorage
  useEffect(() => {
    if (!activeSession) return;
    try {
      const connKey = (activeSession.connection.id || activeSession.connection.name) + '_' + activeSession.activeDatabase;
      localStorage.setItem('octa_open_table_tabs_' + connKey, JSON.stringify(openTableTabs));
      if (activeTableTab) {
        localStorage.setItem('octa_active_table_tab_' + connKey, activeTableTab);
      } else {
        localStorage.removeItem('octa_active_table_tab_' + connKey);
      }
    } catch (e) {
      console.warn('Failed to persist table tabs', e);
    }
  }, [openTableTabs, activeTableTab, activeSession]);

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

  // Keyboard shortcut: Ctrl+W to close active table tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'w' || e.key === 'W') {
          if (activeTableTab) {
            e.preventDefault();
            handleCloseTab(activeTableTab);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTableTab, openTableTabs]);

  // Load Schema & Data for a specific table tab
  const loadTableDetails = useCallback(
    async (tblName: string, stateOverrides?: Partial<TableTabState>) => {
      if (!activeSession || !tblName) return;

      const currentState = tableStates[tblName] || createDefaultTableState();
      const effectiveState = {
        ...currentState,
        ...(stateOverrides || {}),
      };

      setTableStates((prev) => ({
        ...prev,
        [tblName]: {
          ...(prev[tblName] || createDefaultTableState()),
          loadingData: true,
          ...stateOverrides,
        },
      }));

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
        console.error('Failed to load details for ' + tblName + ':', err);
        setTableStates((prev) => ({
          ...prev,
          [tblName]: {
            ...(prev[tblName] || createDefaultTableState()),
            loadingData: false,
          },
        }));
        showToast('Failed to load data for ' + tblName + ': ' + (err?.message || err), 'error');
      }
    },
    [activeSession, tableStates, showToast]
  );

  // Load tables list on session connect
  const loadTables = useCallback(async () => {
    if (!activeSession) return;
    setLoadingTables(true);
    try {
      const tbls = await getTables(activeSession.connection, activeSession.activeDatabase);
      setTables(tbls);

      // Clean up any open tabs that no longer exist in this database
      setOpenTableTabs((prev) => {
        const valid = prev.filter((t) => tbls.includes(t));
        return valid;
      });
    } catch (err: any) {
      console.error('Failed to load tables:', err);
      showToast('Failed to load tables: ' + (err?.message || err), 'error');
    } finally {
      setLoadingTables(false);
    }
  }, [activeSession, showToast]);

  useEffect(() => {
    if (activeSession) {
      loadTables();
    } else {
      setTables([]);
      setOpenTableTabs([]);
      setActiveTableTab(null);
      setTableStates({});
    }
  }, [activeSession?.connection.id, activeSession?.activeDatabase]);

  // Load details for active table tab when focused if not loaded yet
  useEffect(() => {
    if (activeTableTab && !tableStates[activeTableTab]?.tableData && !tableStates[activeTableTab]?.loadingData) {
      loadTableDetails(activeTableTab);
    }
  }, [activeTableTab, tableStates, loadTableDetails]);

  // User selects a table from sidebar
  const handleSelectTable = (tblName: string) => {
    if (!openTableTabs.includes(tblName)) {
      setOpenTableTabs((prev) => [...prev, tblName]);
      setActiveTableTab(tblName);
      loadTableDetails(tblName);
    } else {
      setActiveTableTab(tblName);
      if (!tableStates[tblName]?.tableData) {
        loadTableDetails(tblName);
      }
    }
  };

  // Close a table tab
  const handleCloseTab = (tblName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const idx = openTableTabs.indexOf(tblName);
    if (idx === -1) return;

    const nextTabs = openTableTabs.filter((t) => t !== tblName);
    setOpenTableTabs(nextTabs);

    if (nextTabs.length === 0) {
      setActiveTableTab(null);
    } else if (activeTableTab === tblName) {
      const nextActive = nextTabs[Math.max(0, idx - 1)];
      setActiveTableTab(nextActive);
      if (!tableStates[nextActive]?.tableData) {
        loadTableDetails(nextActive);
      }
    }
  };

  // Active tab state helper
  const currentTabState: TableTabState = activeTableTab
    ? tableStates[activeTableTab] || createDefaultTableState()
    : createDefaultTableState();

  // Sort change handler
  const handleSortChange = (colName: string, newOrder: 'ASC' | 'DESC' | '') => {
    if (!activeTableTab) return;
    const newSortCol = newOrder === '' ? '' : colName;
    loadTableDetails(activeTableTab, {
      sortColumn: newSortCol,
      sortOrder: newOrder,
      page: 1,
    });
  };

  // Filter change handlers
  const handleApplyFilter = (col: string, op: string, val: string) => {
    if (!activeTableTab) return;
    loadTableDetails(activeTableTab, {
      filterColumn: col,
      filterOp: op,
      filterValue: val,
      page: 1,
    });
  };

  const handleClearFilter = () => {
    if (!activeTableTab) return;
    loadTableDetails(activeTableTab, {
      filterColumn: '',
      filterOp: 'contains',
      filterValue: '',
      page: 1,
    });
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (!activeTableTab) return;
    loadTableDetails(activeTableTab, { page: newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    if (!activeTableTab) return;
    loadTableDetails(activeTableTab, { limit: newLimit, page: 1 });
  };

  // Full Refresh active tab
  const handleRefreshActiveTab = () => {
    loadTables();
    if (activeTableTab) {
      loadTableDetails(activeTableTab);
    }
  };

  // Handle Export Table SQL
  const handleExportTable = async (exportData: boolean) => {
    if (!activeSession || !activeTableTab) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const sql = await exportTableSQL(
        activeSession.connection,
        activeSession.activeDatabase,
        activeTableTab,
        exportData
      );

      const filename = activeTableTab + '_' + (exportData ? 'dump' : 'schema') + '_' + Date.now() + '.sql';

      try {
        const savedPath = await saveSQLDumpDialog(filename, sql);
        if (savedPath) {
          showToast('Exported table dump to ' + savedPath, 'success');
          return;
        }
      } catch {
        // Browser fallback
      }

      downloadSQLFile(filename, sql);
      showToast(
        'Exported ' + activeTableTab + ' (' + (exportData ? 'Structure + Data' : 'Structure Only') + ')',
        'success'
      );
    } catch (err: any) {
      console.error('Export failed:', err);
      showToast('Export failed: ' + (err?.message || err), 'error');
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

      const filename = 'db_' + activeSession.activeDatabase + '_' + (exportData ? 'dump' : 'schema') + '_' + Date.now() + '.sql';

      try {
        const savedPath = await saveSQLDumpDialog(filename, sql);
        if (savedPath) {
          showToast('Exported database dump to ' + savedPath, 'success');
          return;
        }
      } catch {
        // Browser fallback
      }

      downloadSQLFile(filename, sql);
      showToast(
        'Exported database ' + activeSession.activeDatabase + ' (' + (exportData ? 'Structure + Data' : 'Structure Only') + ')',
        'success'
      );
    } catch (err: any) {
      console.error('Database export failed:', err);
      showToast('Database export failed: ' + (err?.message || err), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Add column handler
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !activeTableTab || !newColName.trim()) return;

    setAddingCol(true);
    try {
      await addColumn(
        activeSession.connection,
        activeSession.activeDatabase,
        activeTableTab,
        newColName.trim(),
        newColType,
        newColNullable
      );
      showToast('Column "' + newColName.trim() + '" added successfully', 'success');
      setNewColName('');
      loadTableDetails(activeTableTab);
    } catch (err: any) {
      console.error('Failed to add column:', err);
      showToast('Failed to add column: ' + (err?.message || err), 'error');
    } finally {
      setAddingCol(false);
    }
  };

  // Drop column handler
  const handleDropColumn = async (colName: string) => {
    if (!activeSession || !activeTableTab) return;
    try {
      await dropColumn(activeSession.connection, activeSession.activeDatabase, activeTableTab, colName);
      showToast('Column "' + colName + '" dropped successfully', 'info');
      loadTableDetails(activeTableTab);
    } catch (err: any) {
      console.error('Failed to drop column:', err);
      showToast('Failed to drop column: ' + (err?.message || err), 'error');
      throw err;
    }
  };

  // Rename column handler
  const handleRenameColumn = async (oldName: string, newName: string) => {
    if (!activeSession || !activeTableTab) return;
    try {
      await renameColumn(
        activeSession.connection,
        activeSession.activeDatabase,
        activeTableTab,
        oldName,
        newName
      );
      showToast('Column renamed from "' + oldName + '" to "' + newName + '"', 'success');
      loadTableDetails(activeTableTab);
    } catch (err: any) {
      console.error('Failed to rename column:', err);
      showToast('Failed to rename column: ' + (err?.message || err), 'error');
      throw err;
    }
  };

  // Save row inline edits
  const handleSaveUpdates = async (primaryKeyCol: string, updates: RowUpdate[]) => {
    if (!activeSession || !activeTableTab) return;
    try {
      await updateTableRows(
        activeSession.connection,
        activeSession.activeDatabase,
        activeTableTab,
        primaryKeyCol,
        updates
      );
      showToast('Successfully updated ' + updates.length + ' cell(s)', 'success');
      loadTableDetails(activeTableTab);
    } catch (err: any) {
      console.error('Failed to save row updates:', err);
      showToast('Failed to update rows: ' + (err?.message || err), 'error');
      throw err;
    }
  };

  // Delete selected rows or truncate table
  const handleDeleteRows = async (
    primaryKeyCol: string,
    rowIds: string[],
    isAllTable: boolean
  ) => {
    if (!activeSession || !activeTableTab) return;
    try {
      if (isAllTable) {
        await truncateTable(activeSession.connection, activeSession.activeDatabase, activeTableTab);
        showToast('Table "' + activeTableTab + '" truncated successfully', 'info');
      } else {
        await deleteTableRows(
          activeSession.connection,
          activeSession.activeDatabase,
          activeTableTab,
          primaryKeyCol,
          rowIds
        );
        showToast('Deleted ' + rowIds.length + ' row(s)', 'info');
      }
      loadTableDetails(activeTableTab);
    } catch (err: any) {
      console.error('Delete failed:', err);
      showToast('Delete failed: ' + (err?.message || err), 'error');
      throw err;
    }
  };

  // Filtered tables for search
  const filteredTables = tables.filter((t) =>
    t.toLowerCase().includes(tableSearch.toLowerCase().trim())
  );

  // If no connection is active, render HomeLanding
  if (!activeSession) {
    return <HomeLanding onOpenNewModal={onOpenNewModal} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-950 text-gray-100 overflow-hidden select-none">
      {/* 1. Database Connection Status Header */}
      <div className="px-5 py-2.5 border-b border-border-subtle bg-surface-900/90 backdrop-blur flex items-center justify-between gap-3 flex-shrink-0 relative z-30">
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
            {activeTableTab && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-brand-300 font-semibold flex items-center gap-1">
                  <Table className="w-3.5 h-3.5 text-brand-400" />
                  {activeTableTab}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2 text-xs mr-72">
          <button
            type="button"
            onClick={handleRefreshActiveTab}
            title="Refresh Data and Schema"
            className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-gray-300 border border-border/60 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={'w-3.5 h-3.5 ' + (currentTabState.loadingData || loadingTables ? 'animate-spin text-brand-400' : '')}
            />
            <span className="text-xs hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Main Middle Workspace Area (Inner Tables Sidebar + Multi-Tab Data Grid Area) */}
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
                const isSelected = activeTableTab === tbl;
                const isOpenInTabs = openTableTabs.includes(tbl);
                return (
                  <button
                    key={tbl}
                    onClick={() => handleSelectTable(tbl)}
                    className={
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer ' +
                      (isSelected
                        ? 'bg-brand-600 text-white font-medium shadow-sm'
                        : isOpenInTabs
                        ? 'text-brand-300 bg-surface-800/70 hover:bg-surface-800'
                        : 'text-gray-300 hover:bg-surface-800 hover:text-gray-100')
                    }
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table
                        className={
                          'w-3.5 h-3.5 flex-shrink-0 ' +
                          (isSelected ? 'text-white' : isOpenInTabs ? 'text-brand-400' : 'text-gray-400')
                        }
                      />
                      <span className="truncate font-mono text-[11px]">{tbl}</span>
                    </div>
                    {isSelected && (
                      <ChevronRight className="w-3.5 h-3.5 text-white flex-shrink-0" />
                    )}
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

        {/* Multi-Tab Table Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-950">
          {/* Top Multi-Tab Bar for Tables */}
          <div className="bg-[#141416] border-b border-border-subtle flex items-center justify-between pl-2 pr-3 flex-shrink-0 select-none min-h-[38px]">
            {/* Scrollable Table Tabs List */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
              {openTableTabs.map((tbl) => {
                const isActive = tbl === activeTableTab;
                const state = tableStates[tbl];
                const rowCount = state?.tableData?.totalRows;
                return (
                  <div
                    key={tbl}
                    onClick={() => {
                      setActiveTableTab(tbl);
                      if (!tableStates[tbl]?.tableData) {
                        loadTableDetails(tbl);
                      }
                    }}
                    onAuxClick={(e) => {
                      if (e.button === 1) handleCloseTab(tbl, e);
                    }}
                    title={tbl + (rowCount !== undefined ? ' (' + rowCount + ' rows)' : '')}
                    className={
                      'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[220px] ' +
                      (isActive
                        ? 'bg-[#1e1e22] text-white border-zinc-700/80 shadow-sm font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181c] border-transparent')
                    }
                  >
                    <Table
                      className={
                        'w-3.5 h-3.5 flex-shrink-0 ' +
                        (isActive ? 'text-brand-400' : 'text-zinc-500 group-hover/tab:text-zinc-400')
                      }
                    />

                    {/* Table Name */}
                    <span className="truncate font-mono text-[11px] flex-1">{tbl}</span>

                    {/* Row Count Pill if loaded */}
                    {rowCount !== undefined && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800/80 text-zinc-500 font-mono flex-shrink-0">
                        {rowCount}
                      </span>
                    )}

                    {/* Close Tab Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tbl, e)}
                      title="Close Tab (Ctrl+W)"
                      className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Content or Empty Workspace Placeholder */}
          {activeTableTab ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Context-Aware Table Action Header */}
              <div className="px-4 py-2 border-b border-border-subtle bg-[#161616] flex flex-wrap items-center justify-between gap-2 flex-shrink-0 relative z-20">
                {/* Table Title & Column Count */}
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-brand-400" />
                  <span className="font-mono text-xs font-bold text-zinc-100">{activeTableTab}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {currentTabState.schema.length} cols
                  </span>
                  {currentTabState.tableData && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800/80 text-zinc-400 font-mono">
                      {currentTabState.tableData.totalRows} rows
                    </span>
                  )}
                </div>

                {/* Table Actions: Import, Export, Add Column */}
                <div className="flex items-center gap-2 text-xs">
                  {/* Import SQL */}
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    title="Import SQL script (.sql)"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800 hover:bg-surface-750 text-cyan-300 border border-cyan-500/30 font-medium text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Import SQL</span>
                  </button>

                  {/* Export SQL Dropdown */}
                  <div className="relative" ref={exportDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={isExporting}
                      title="Export table SQL dump"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800 hover:bg-surface-750 text-emerald-300 border border-emerald-500/30 font-medium text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isExporting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="hidden sm:inline">Export SQL</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-[#1f1f1f] border border-zinc-700/80 rounded-md shadow-2xl py-1.5 z-[100] animate-fade-in select-none">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                          Table: {activeTableTab}
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
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                          Database: {activeSession.activeDatabase}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExportDatabase(false)}
                          className="w-full px-3 py-1.5 text-xs text-left text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Database Structure (.sql)</span>
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

                  {/* Add Column Form */}
                  <form onSubmit={handleAddColumn} className="flex items-center gap-1.5 text-xs border-l border-border/60 pl-2">
                    <input
                      type="text"
                      required
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="Col name"
                      className="px-2 py-1 bg-surface-800 border border-border/80 rounded-md text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 w-24 font-mono"
                    />
                    <select
                      value={newColType}
                      onChange={(e) => setNewColType(e.target.value)}
                      className="px-1.5 py-1 bg-surface-800 border border-border/80 rounded-md text-xs text-gray-200 focus:outline-none focus:border-brand-500 font-mono"
                    >
                      {COMMON_COLUMN_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-gray-300 cursor-pointer bg-surface-800/80 px-1.5 py-1 rounded-md border border-border/60">
                      <input
                        type="checkbox"
                        checked={newColNullable}
                        onChange={(e) => setNewColNullable(e.target.checked)}
                        className="rounded border-border bg-surface-700 text-brand-600 focus:ring-0 w-3 h-3"
                      />
                      <span>Null</span>
                    </label>
                    <button
                      type="submit"
                      disabled={addingCol || !newColName.trim()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {addingCol ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>Add</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* DataGrid */}
              <div className="flex-1 overflow-hidden">
                <DataGrid
                  tableName={activeTableTab}
                  schema={currentTabState.schema}
                  dataResult={currentTabState.tableData}
                  loading={currentTabState.loadingData}
                  page={currentTabState.page}
                  limit={currentTabState.limit}
                  sortColumn={currentTabState.sortColumn}
                  sortOrder={currentTabState.sortOrder}
                  filterColumn={currentTabState.filterColumn}
                  filterOp={currentTabState.filterOp}
                  filterValue={currentTabState.filterValue}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  onSortChange={handleSortChange}
                  onApplyFilter={handleApplyFilter}
                  onClearFilter={handleClearFilter}
                  onDropColumn={handleDropColumn}
                  onRenameColumn={handleRenameColumn}
                  onSaveUpdates={handleSaveUpdates}
                  onDeleteRows={handleDeleteRows}
                />
              </div>
            </div>
          ) : (
            /* Empty Table Workspace State */
            <div className="flex-1 bg-[#121212] flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] max-w-[50vw] max-h-[50vh] flex items-center justify-center pointer-events-none mb-2">
                <img
                  src={interfaceSvg}
                  alt="No Table Selected"
                  className="w-full h-full object-contain opacity-45 select-none pointer-events-none drop-shadow-2xl"
                />
              </div>
              <div className="flex flex-col items-center text-center mt-2">
                <span className="text-sm font-semibold text-zinc-300">No Table Selected</span>
                <span className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Select a table from the sidebar to view its structure and records.
                </span>
              </div>
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
          if (activeTableTab) {
            loadTableDetails(activeTableTab);
          }
        }}
        showToast={showToast}
      />
    </div>
  );
};
