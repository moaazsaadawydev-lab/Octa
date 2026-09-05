import React, { useState, useEffect } from 'react';
import { Database, Plus } from 'lucide-react';
import { ActiveSession } from '../types';
import { SchemaTreeView } from './SchemaTreeView';
import { TableTabsHeader } from './TableTabsHeader';
import { DataGrid } from './datagrid/DataGrid';
import { QueryConsole } from '../../../components/database/QueryConsole';
import { HomeLanding } from '../../../components/layout/HomeLanding';
import { useSchemaExplorer } from '../hooks/useSchemaExplorer';
import { useTableData } from '../hooks/useTableData';

export interface TablesWorkspaceProps {
  activeSession: ActiveSession | null;
  onOpenNewModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TablesWorkspace: React.FC<TablesWorkspaceProps> = ({
  activeSession,
  onOpenNewModal,
  showToast,
}) => {
  const schema = useSchemaExplorer({ activeSession, showToast });
  const tableData = useTableData({ activeSession, showToast });
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  useEffect(() => {
    if (schema.activeTableTab && !tableData.tableStates[schema.activeTableTab]?.tableData) {
      tableData.loadTableDetails(schema.activeTableTab);
    }
  }, [schema.activeTableTab, tableData]);

  if (!activeSession) {
    return <HomeLanding onOpenNewModal={onOpenNewModal} />;
  }

  const activeState = schema.activeTableTab
    ? tableData.tableStates[schema.activeTableTab]
    : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d12] flex items-center justify-between text-xs select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 dark:text-zinc-200">
            {activeSession.activeDatabase}
          </span>
          <span className="text-slate-400 dark:text-zinc-500 font-mono">
            ({activeSession.connection.name || activeSession.connection.host})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
          className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
        >
          {isConsoleExpanded ? 'Hide Console' : 'Console'}
        </button>
      </div>

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <SchemaTreeView
          tables={schema.tables}
          filteredTables={schema.filteredTables}
          tableSearch={schema.tableSearch}
          setTableSearch={schema.setTableSearch}
          loadingTables={schema.loadingTables}
          schemas={schema.schemas}
          expandedTables={schema.expandedTables}
          activeTableTab={schema.activeTableTab}
          openTableTabs={schema.openTableTabs}
          onRefreshTables={schema.fetchTablesList}
          onSelectTable={schema.handleOpenTableTab}
          onToggleExpandTable={schema.toggleExpandTable}
          width={sidebarWidth}
          onResizeStart={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMove = (me: MouseEvent) => {
              setSidebarWidth(Math.min(400, Math.max(180, startWidth + (me.clientX - startX))));
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TableTabsHeader
            openTabs={schema.openTableTabs}
            activeTab={schema.activeTableTab}
            tableStates={tableData.tableStates}
            onSelectTab={(tbl) => {
              schema.setActiveTableTab(tbl);
              if (!tableData.tableStates[tbl]?.tableData) {
                tableData.loadTableDetails(tbl);
              }
            }}
            onCloseTab={schema.handleCloseTableTab}
          />

          <div className="flex-1 overflow-hidden relative">
            {schema.activeTableTab && activeState ? (
              <DataGrid
                tableName={schema.activeTableTab}
                schema={activeState.schema}
                dataResult={activeState.tableData}
                loading={activeState.loadingData}
                page={activeState.page}
                limit={activeState.limit}
                sortColumn={activeState.sortColumn}
                sortOrder={activeState.sortOrder}
                filterColumn={activeState.filterColumn}
                filterOp={activeState.filterOp}
                filterValue={activeState.filterValue}
                onPageChange={(p) => tableData.handlePageChange(schema.activeTableTab!, p)}
                onLimitChange={(l) => tableData.handleLimitChange(schema.activeTableTab!, l)}
                onSortChange={(col, o) => tableData.handleSortChange(schema.activeTableTab!, col, o)}
                onApplyFilter={(col, op, val) =>
                  tableData.handleApplyFilter(schema.activeTableTab!, col, op, val)
                }
                onClearFilter={() => tableData.handleClearFilter(schema.activeTableTab!)}
                onDropColumn={(col) => tableData.handleDropColumn(schema.activeTableTab!, col)}
                onRenameColumn={(oldN, newN) =>
                  tableData.handleRenameColumn(schema.activeTableTab!, oldN, newN)
                }
                onSaveUpdates={(pk, upd) =>
                  tableData.handleSaveUpdates(schema.activeTableTab!, pk, upd)
                }
                onDeleteRows={(pk, ids, all) =>
                  tableData.handleDeleteRows(schema.activeTableTab!, pk, ids, all)
                }
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400 dark:text-zinc-500">
                <Database className="w-10 h-10 stroke-1 mb-2 opacity-40" />
                <p className="text-xs">Select a table from the sidebar to view its records</p>
              </div>
            )}
          </div>

          <QueryConsole
            isExpanded={isConsoleExpanded}
            onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
          />
        </div>
      </div>
    </div>
  );
};
