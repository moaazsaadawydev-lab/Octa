import {
  GetTableData,
  GetQueryLogs,
  ClearQueryLogs,
  UpdateTableRows,
  DeleteTableRows,
  TruncateTable,
  ExecuteRawQuery,
  CloseTabSession,
  ExportTableSQL,
  ExportDatabaseSQL,
  ImportSQLScript,
  SaveSQLDumpDialog,
  ExplainQuery,
} from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import {
  ConnectionConfig,
  TableDataResult,
  QueryLog,
  RowUpdate,
  QueryResult,
  DataQueryOptions,
  ImportResult,
  ExplainPlanResult,
} from '../types/connection';
import { toModelConfig } from './dbConnectionsApi';

export async function getTableData(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  options: DataQueryOptions
): Promise<TableDataResult> {
  const model = toModelConfig(config);
  const queryOpts = main.DataQueryOptions.createFrom({
    page: options.page || 1,
    pageSize: options.pageSize || 50,
    sortColumn: options.sortColumn || '',
    sortOrder: options.sortOrder || '',
    filterColumn: options.filterColumn || '',
    filterOp: options.filterOp || '',
    filterValue: options.filterValue || '',
  });
  const res = await GetTableData(model, dbName, tableName, queryOpts);
  return {
    columns: res.columns || [],
    rows: res.rows || [],
    totalRows: res.totalRows || 0,
    durationMs: res.durationMs || 0,
  };
}

export async function getQueryLogs(): Promise<QueryLog[]> {
  try {
    const logs = await GetQueryLogs();
    if (!logs || !Array.isArray(logs)) return [];
    return logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      query: l.query,
      durationMs: l.durationMs,
      status: l.status,
      error: l.error,
    }));
  } catch (err) {
    console.error('Failed to get query logs:', err);
    return [];
  }
}

export async function clearQueryLogs(): Promise<boolean> {
  try {
    return await ClearQueryLogs();
  } catch (err) {
    console.error('Failed to clear query logs:', err);
    return false;
  }
}

export async function updateTableRows(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  primaryKeyCol: string,
  updates: RowUpdate[]
): Promise<boolean> {
  const model = toModelConfig(config);
  const rowUpdates = updates.map((u) =>
    main.RowUpdate.createFrom({
      primaryKeyColumn: primaryKeyCol,
      primaryKeyValue: (u as any).primaryKeyValue ?? u.rowId,
      column: u.column,
      newValue: u.newValue,
    })
  );
  return await UpdateTableRows(model, dbName, tableName, primaryKeyCol, rowUpdates);
}

export async function deleteTableRows(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  primaryKeyCol: string,
  rowIds: string[]
): Promise<boolean> {
  const model = toModelConfig(config);
  return await DeleteTableRows(model, dbName, tableName, primaryKeyCol, rowIds);
}

export async function truncateTable(
  config: ConnectionConfig,
  dbName: string,
  tableName: string
): Promise<boolean> {
  const model = toModelConfig(config);
  return await TruncateTable(model, dbName, tableName);
}

export async function executeRawQuery(
  config: ConnectionConfig,
  dbName: string,
  rawSql: string,
  tabId: string = ''
): Promise<QueryResult[]> {
  const model = toModelConfig(config);
  const results = await ExecuteRawQuery(model, dbName, rawSql, tabId);
  if (!results || !Array.isArray(results)) return [];
  return results.map((r, idx) => ({
    queryIndex: (r as any).queryIndex ?? idx,
    statement: r.statement,
    columns: r.columns || [],
    rows: r.rows || [],
    rowCount: (r as any).rowCount ?? (r as any).rowsAffected ?? (r.rows ? r.rows.length : 0),
    rowsAffected: (r as any).rowsAffected ?? (r as any).rowCount ?? 0,
    durationMs: r.durationMs || 0,
    success: (r as any).success ?? !(r as any).error,
    errorMessage: (r as any).errorMessage || (r as any).error,
    error: (r as any).error || (r as any).errorMessage,
    isSelect: (r as any).isSelect !== undefined ? Boolean((r as any).isSelect) : (r.columns && r.columns.length > 0),
    txStatus: (r as any).txStatus || 'idle',
    notices: (r as any).notices || [],
  }));
}

export async function closeTabSession(tabId: string): Promise<boolean> {
  try {
    return await CloseTabSession(tabId);
  } catch (err) {
    console.error('Failed to close tab session:', err);
    return false;
  }
}

export async function exportTableSQL(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  exportData: boolean
): Promise<string> {
  const model = toModelConfig(config);
  return await ExportTableSQL(model, dbName, tableName, exportData);
}

export async function exportDatabaseSQL(
  config: ConnectionConfig,
  dbName: string,
  exportData: boolean
): Promise<string> {
  const model = toModelConfig(config);
  return await ExportDatabaseSQL(model, dbName, exportData);
}

export async function importSQLScript(
  config: ConnectionConfig,
  dbName: string,
  sqlContent: string
): Promise<ImportResult> {
  const model = toModelConfig(config);
  const res = await ImportSQLScript(model, dbName, sqlContent);
  return {
    statementsExecuted: res.statementsExecuted || 0,
    durationMs: res.durationMs || 0,
    success: Boolean(res.success),
    errorMessage: res.errorMessage || '',
  };
}

export async function saveSQLDumpDialog(
  defaultFilename: string,
  content: string
): Promise<string> {
  return await SaveSQLDumpDialog(defaultFilename, content);
}

export function downloadSQLFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function explainQuery(
  config: ConnectionConfig,
  dbName: string,
  query: string,
  analyze: boolean = false
): Promise<ExplainPlanResult> {
  const model = toModelConfig(config);
  const res = await ExplainQuery(model, dbName, query, analyze);
  return {
    planJson: res.planJson || '[]',
    totalCost: res.totalCost || 0,
    planningTime: res.planningTime || 0,
    executionTime: res.executionTime || 0,
    rawOutput: res.rawOutput || '',
  };
}
