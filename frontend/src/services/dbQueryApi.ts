import {
  GetTableData,
  GetQueryLogs,
  ClearQueryLogs,
  UpdateTableRows,
  DeleteTableRows,
  TruncateTable,
  ExecuteRawQuery,
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
  try {
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
  } catch (err: any) {
    console.error('Failed to get table data:', err);
    throw err;
  }
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
  try {
    const model = toModelConfig(config);
    const rowUpdates = updates.map((u) =>
      main.RowUpdate.createFrom({
        rowId: u.rowId,
        column: u.column,
        newValue: u.newValue,
      })
    );
    return await UpdateTableRows(model, dbName, tableName, primaryKeyCol, rowUpdates);
  } catch (err: any) {
    console.error('Failed to update table rows:', err);
    throw err;
  }
}

export async function deleteTableRows(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  primaryKeyCol: string,
  rowIds: string[]
): Promise<boolean> {
  try {
    const model = toModelConfig(config);
    return await DeleteTableRows(model, dbName, tableName, primaryKeyCol, rowIds);
  } catch (err: any) {
    console.error('Failed to delete table rows:', err);
    throw err;
  }
}

export async function truncateTable(
  config: ConnectionConfig,
  dbName: string,
  tableName: string
): Promise<boolean> {
  try {
    const model = toModelConfig(config);
    return await TruncateTable(model, dbName, tableName);
  } catch (err: any) {
    console.error('Failed to truncate table:', err);
    throw err;
  }
}

export async function executeRawQuery(
  config: ConnectionConfig,
  dbName: string,
  rawSql: string
): Promise<QueryResult[]> {
  try {
    const model = toModelConfig(config);
    const results = await ExecuteRawQuery(model, dbName, rawSql);
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
    }));
  } catch (err: any) {
    console.error('Failed to execute raw query:', err);
    throw err;
  }
}

export async function exportTableSQL(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  exportData: boolean
): Promise<string> {
  try {
    const model = toModelConfig(config);
    return await ExportTableSQL(model, dbName, tableName, exportData);
  } catch (err: any) {
    console.error('Failed to export table SQL:', err);
    throw err;
  }
}

export async function exportDatabaseSQL(
  config: ConnectionConfig,
  dbName: string,
  exportData: boolean
): Promise<string> {
  try {
    const model = toModelConfig(config);
    return await ExportDatabaseSQL(model, dbName, exportData);
  } catch (err: any) {
    console.error('Failed to export database SQL:', err);
    throw err;
  }
}

export async function importSQLScript(
  config: ConnectionConfig,
  dbName: string,
  sqlContent: string
): Promise<ImportResult> {
  try {
    const model = toModelConfig(config);
    const res = await ImportSQLScript(model, dbName, sqlContent);
    return {
      statementsExecuted: res.statementsExecuted || 0,
      durationMs: res.durationMs || 0,
      success: Boolean(res.success),
      errorMessage: res.errorMessage || '',
    };
  } catch (err: any) {
    console.error('Failed to import SQL script:', err);
    throw err;
  }
}

export async function saveSQLDumpDialog(
  defaultFilename: string,
  content: string
): Promise<string> {
  try {
    return await SaveSQLDumpDialog(defaultFilename, content);
  } catch (err: any) {
    console.error('Failed to save SQL dump dialog:', err);
    throw err;
  }
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
  try {
    const model = toModelConfig(config);
    const res = await ExplainQuery(model, dbName, query, analyze);
    return {
      planJson: res.planJson || '[]',
      totalCost: res.totalCost || 0,
      planningTime: res.planningTime || 0,
      executionTime: res.executionTime || 0,
      rawOutput: res.rawOutput || '',
    };
  } catch (err: any) {
    console.error('Failed to explain query:', err);
    throw err;
  }
}
