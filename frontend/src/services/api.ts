import {
  TestConnection,
  SaveConnection,
  GetSavedConnections,
  GetDatabases,
  DeleteConnection,
  GetTables,
  GetTableSchema,
  GetTableData,
  AddColumn,
  DropColumn,
  RenameColumn,
  GetQueryLogs,
  ClearQueryLogs,
  GetEnumValues,
  UpdateTableRows,
  DeleteTableRows,
  TruncateTable,
  ExecuteRawQuery,
  GetDatabaseSchemaDetails,
  ExportTableSQL,
  ExportDatabaseSQL,
  ImportSQLScript,
  SaveSQLDumpDialog,
  ExplainQuery,
  SaveHttpClientData,
  LoadHttpClientData,
  SaveSqlQueriesData,
  LoadSqlQueriesData,
  ExecuteHttpRequest,
  StartTerminalSession,
  WriteTerminalSession,
  ResizeTerminalSession,
  CloseTerminalSession,
  CheckDockerAvailability,
  ListContainers,
  StartContainer,
  StopContainer,
  RestartContainer,
  RemoveContainer,
  StartLogStream,
  StopLogStream,
} from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import { DockerProjectGroup, DockerContainer } from '../types/docker';
import {
  ConnectionConfig,
  TableColumn,
  TableDataResult,
  QueryLog,
  RowUpdate,
  QueryResult,
  DatabaseSchema,
  DataQueryOptions,
  ImportResult,
  ExplainPlanResult,
} from '../types/connection';

function toModelConfig(config: ConnectionConfig): main.ConnectionConfig {
  return main.ConnectionConfig.createFrom({
    id: config.id || '',
    name: config.name,
    type: config.type || 'postgres',
    host: config.host,
    port: Number(config.port) || 5432,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: Boolean(config.ssl),
  });
}

function parseResult(res: any): { success: boolean; message: string } {
  if (Array.isArray(res)) {
    return {
      success: Boolean(res[0]),
      message: String(res[1] || (res[0] ? 'Success' : 'Failed')),
    };
  }
  if (typeof res === 'object' && res !== null) {
    if ('r0' in res && 'r1' in res) {
      return {
        success: Boolean(res.r0),
        message: String(res.r1),
      };
    }
    if ('success' in res) {
      return {
        success: Boolean(res.success),
        message: String(res.message || ''),
      };
    }
  }
  if (typeof res === 'boolean') {
    return {
      success: res,
      message: res ? 'Success' : 'Failed',
    };
  }
  if (typeof res === 'string') {
    return {
      success: true,
      message: res,
    };
  }
  return {
    success: false,
    message: 'Unknown response format',
  };
}

export async function testConnection(config: ConnectionConfig): Promise<{ success: boolean; message: string }> {
  try {
    const model = toModelConfig(config);
    const res = await TestConnection(model);
    return parseResult(res);
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || String(err) || 'Connection failed',
    };
  }
}

export async function saveConnection(config: ConnectionConfig): Promise<{ success: boolean; message: string }> {
  try {
    const model = toModelConfig(config);
    const res = await SaveConnection(model);
    return parseResult(res);
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || String(err) || 'Failed to save connection',
    };
  }
}

export async function getSavedConnections(): Promise<ConnectionConfig[]> {
  try {
    const res = await GetSavedConnections();
    if (!res || !Array.isArray(res)) return [];
    return res.map((item) => ({
      id: item.id,
      name: item.name,
      type: (item.type as 'postgres' | 'mysql' | 'mongodb') || 'postgres',
      host: item.host,
      port: item.port,
      database: item.database,
      username: item.username,
      password: item.password,
      ssl: item.ssl,
    }));
  } catch (err) {
    console.error('Failed to load saved connections:', err);
    return [];
  }
}

export async function getDatabases(config: ConnectionConfig): Promise<string[]> {
  try {
    const model = toModelConfig(config);
    const dbs = await GetDatabases(model);
    return dbs || [];
  } catch (err: any) {
    console.error('Failed to get databases:', err);
    throw err;
  }
}

export async function deleteConnection(id: string): Promise<boolean> {
  try {
    return await DeleteConnection(id);
  } catch (err) {
    console.error('Failed to delete connection:', err);
    return false;
  }
}

export async function getTables(config: ConnectionConfig, dbName: string): Promise<string[]> {
  try {
    const model = toModelConfig(config);
    const tables = await GetTables(model, dbName);
    return tables || [];
  } catch (err: any) {
    console.error('Failed to get tables:', err);
    throw err;
  }
}

export async function getTableSchema(
  config: ConnectionConfig,
  dbName: string,
  tableName: string
): Promise<TableColumn[]> {
  try {
    const model = toModelConfig(config);
    const schema = await GetTableSchema(model, dbName, tableName);
    if (!schema || !Array.isArray(schema)) return [];
    return schema.map((c) => ({
      name: c.name,
      type: c.type || (c as any).dataType || '',
      dataType: (c as any).dataType || c.type || '',
      isNullable: Boolean(c.isNullable),
      isPrimaryKey: Boolean(c.isPrimaryKey),
      isForeignKey: Boolean((c as any).isForeignKey),
      defaultValue: c.defaultValue,
      enumValues: c.enumValues,
    }));
  } catch (err: any) {
    console.error('Failed to get table schema:', err);
    throw err;
  }
}

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

export async function addColumn(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  colName: string,
  colType: string,
  isNullable: boolean
): Promise<boolean> {
  try {
    const model = toModelConfig(config);
    return await AddColumn(model, dbName, tableName, colName, colType, isNullable);
  } catch (err: any) {
    console.error('Failed to add column:', err);
    throw err;
  }
}

export async function dropColumn(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  colName: string
): Promise<boolean> {
  try {
    const model = toModelConfig(config);
    return await DropColumn(model, dbName, tableName, colName);
  } catch (err: any) {
    console.error('Failed to drop column:', err);
    throw err;
  }
}

export async function renameColumn(
  config: ConnectionConfig,
  dbName: string,
  tableName: string,
  oldName: string,
  newName: string
): Promise<boolean> {
  try {
    const model = toModelConfig(config);
    return await RenameColumn(model, dbName, tableName, oldName, newName);
  } catch (err: any) {
    console.error('Failed to rename column:', err);
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

export async function getEnumValues(
  config: ConnectionConfig,
  dbName: string,
  enumTypeName: string
): Promise<string[]> {
  try {
    const model = toModelConfig(config);
    const vals = await GetEnumValues(model, dbName, enumTypeName);
    return vals || [];
  } catch (err: any) {
    console.error('Failed to get enum values:', err);
    throw err;
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

export async function getDatabaseSchemaDetails(
  config: ConnectionConfig,
  dbName: string
): Promise<DatabaseSchema> {
  try {
    const model = toModelConfig(config);
    const schema = await GetDatabaseSchemaDetails(model, dbName);
    if (!schema) {
      return { tables: [], relationships: [] };
    }
    return {
      tables: (schema.tables || []).map((t) => ({
        name: t.name,
        rowCount: t.rowCount || 0,
        columns: (t.columns || []).map((c) => ({
          name: c.name,
          dataType: c.dataType || c.type || '',
          isNullable: Boolean(c.isNullable),
          isPrimaryKey: Boolean(c.isPrimaryKey),
          isForeignKey: Boolean(c.isForeignKey),
          defaultValue: c.defaultValue || '',
        })),
      })),
      relationships: (schema.relationships || []).map((r) => ({
        constraintName: r.constraintName,
        sourceTable: r.sourceTable,
        sourceColumn: r.sourceColumn,
        targetTable: r.targetTable,
        targetColumn: r.targetColumn,
      })),
    };
  } catch (err: any) {
    console.error('Failed to get database schema details:', err);
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

export async function saveHttpClientData(jsonData: string): Promise<void> {
  try {
    if (typeof SaveHttpClientData === 'function') {
      await SaveHttpClientData(jsonData);
    }
  } catch (err: any) {
    console.error('Failed to save HTTP client data via backend:', err);
    throw err;
  }
}

export async function loadHttpClientData(): Promise<string> {
  try {
    if (typeof LoadHttpClientData === 'function') {
      return await LoadHttpClientData();
    }
  } catch (err: any) {
    console.error('Failed to load HTTP client data via backend:', err);
  }
  return '';
}

export async function saveSqlQueriesData(jsonData: string): Promise<void> {
  try {
    if (typeof SaveSqlQueriesData === 'function') {
      await SaveSqlQueriesData(jsonData);
    }
  } catch (err: any) {
    console.error('Failed to save SQL queries data via backend:', err);
    throw err;
  }
}

export async function loadSqlQueriesData(): Promise<string> {
  try {
    if (typeof LoadSqlQueriesData === 'function') {
      return await LoadSqlQueriesData();
    }
  } catch (err: any) {
    console.error('Failed to load SQL queries data via backend:', err);
  }
  return '';
}

export interface FormFieldPayload {
  key: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  filePath?: string;
  base64Data?: string;
  contentType?: string;
  fileNames?: string[];
  filePaths?: string[];
  fileBase64?: string[];
}

export interface HttpRequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyType: string;
  bodyContent?: string;
  formData?: FormFieldPayload[];
  urlEncoded?: Record<string, string>;
  timeoutSec?: number;
}

export interface HttpResponsePayload {
  status: number;
  statusText: string;
  durationMs: number;
  sizeKb: number;
  data: any;
  headers: Record<string, string>;
  cookies?: string[];
  error?: string;
}

export async function executeHttpRequest(payload: HttpRequestPayload): Promise<HttpResponsePayload> {
  try {
    if (typeof ExecuteHttpRequest === 'function') {
      const res = await ExecuteHttpRequest(payload as any);
      return {
        status: res.status,
        statusText: res.statusText || '',
        durationMs: res.durationMs || 0,
        sizeKb: Number(res.sizeKb ? res.sizeKb.toFixed(2) : 0),
        data: res.data,
        headers: res.headers || {},
        cookies: res.cookies || [],
        error: res.error || '',
      };
    }
  } catch (err: any) {
    console.warn('Backend ExecuteHttpRequest failed:', err);
    throw err;
  }
  throw new Error('Native Go HTTP client is only available in Octa desktop runtime');
}





export async function selectFilesDialog(): Promise<Array<{ name: string; filePath: string; size: number }>> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.SelectFilesDialog === 'function') {
      const res = await w.go.main.App.SelectFilesDialog();
      return res || [];
    }
  } catch (e) {
    console.warn('SelectFilesDialog binding not available, using fallback', e);
  }
  return [];
}

export async function saveEnvironmentsData(jsonData: string): Promise<void> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.SaveEnvironmentsData === 'function') {
      await w.go.main.App.SaveEnvironmentsData(jsonData);
      return;
    }
  } catch (e) {
    console.warn('SaveEnvironmentsData binding error:', e);
  }
}

export async function loadEnvironmentsData(): Promise<string> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.LoadEnvironmentsData === 'function') {
      const res = await w.go.main.App.LoadEnvironmentsData();
      return res || '[]';
    }
  } catch (e) {
    console.warn('LoadEnvironmentsData binding error:', e);
  }
  return '[]';
}


import {
  RedisConnectionConfig,
  RedisConnectResult,
  RedisScanResult,
  RedisKeyDetail,
  RedisCommandResult,
} from '../types/redis';

// ============================================================================
// REDIS BRIDGE METHODS
// ============================================================================

export async function saveRedisConnections(jsonData: string): Promise<void> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.SaveRedisConnections === 'function') {
      await w.go.main.App.SaveRedisConnections(jsonData);
      return;
    }
  } catch (e) {
    console.warn('SaveRedisConnections binding error:', e);
  }
}

export async function loadRedisConnections(): Promise<string> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.LoadRedisConnections === 'function') {
      const res = await w.go.main.App.LoadRedisConnections();
      return res || '[]';
    }
  } catch (e) {
    console.warn('LoadRedisConnections binding error:', e);
  }
  return '[]';
}

export async function connectRedis(config: RedisConnectionConfig): Promise<RedisConnectResult> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.ConnectRedis === 'function') {
      return await w.go.main.App.ConnectRedis(config);
    }
  } catch (e: any) {
    console.warn('ConnectRedis binding error:', e);
    return {
      success: false,
      serverInfo: {
        redisVersion: '',
        connectedClients: '0',
        usedMemoryHuman: '0B',
        totalKeys: 0,
        uptimeInDays: '0',
        rawInfo: {},
      },
      error: e?.message || String(e),
    };
  }
  return {
    success: false,
    serverInfo: {
      redisVersion: '',
      connectedClients: '0',
      usedMemoryHuman: '0B',
      totalKeys: 0,
      uptimeInDays: '0',
      rawInfo: {},
    },
    error: 'Wails bridge not available',
  };
}

export async function scanRedisKeys(
  config: RedisConnectionConfig,
  pattern: string = '*',
  cursor: number = 0,
  count: number = 500
): Promise<RedisScanResult> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.ScanRedisKeys === 'function') {
      return await w.go.main.App.ScanRedisKeys(config, pattern, cursor, count);
    }
  } catch (e) {
    console.warn('ScanRedisKeys binding error:', e);
  }
  return { keys: [], nextCursor: 0, totalKeys: 0 };
}

export async function getRedisKeyDetails(
  config: RedisConnectionConfig,
  key: string
): Promise<RedisKeyDetail | null> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.GetRedisKeyDetails === 'function') {
      return await w.go.main.App.GetRedisKeyDetails(config, key);
    }
  } catch (e) {
    console.warn('GetRedisKeyDetails binding error:', e);
  }
  return null;
}

export async function createRedisKey(
  config: RedisConnectionConfig,
  key: string,
  keyType: string,
  payload: any,
  ttlSeconds: number = -1
): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.CreateRedisKey === 'function') {
      return await w.go.main.App.CreateRedisKey(config, key, keyType, payload, ttlSeconds);
    }
  } catch (e) {
    console.warn('CreateRedisKey binding error:', e);
  }
  return false;
}

export async function updateRedisKey(
  config: RedisConnectionConfig,
  key: string,
  keyType: string,
  payload: any,
  ttlSeconds: number = -1
): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.UpdateRedisKey === 'function') {
      return await w.go.main.App.UpdateRedisKey(config, key, keyType, payload, ttlSeconds);
    }
  } catch (e) {
    console.warn('UpdateRedisKey binding error:', e);
  }
  return false;
}

export async function deleteRedisKey(
  config: RedisConnectionConfig,
  key: string
): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.DeleteRedisKey === 'function') {
      return await w.go.main.App.DeleteRedisKey(config, key);
    }
  } catch (e) {
    console.warn('DeleteRedisKey binding error:', e);
  }
  return false;
}

export async function deleteRedisKeysBatch(
  config: RedisConnectionConfig,
  keys: string[]
): Promise<number> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.DeleteRedisKeysBatch === 'function') {
      return await w.go.main.App.DeleteRedisKeysBatch(config, keys);
    }
  } catch (e) {
    console.warn('DeleteRedisKeysBatch binding error:', e);
  }
  return 0;
}

export async function setRedisTTL(
  config: RedisConnectionConfig,
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.SetRedisTTL === 'function') {
      return await w.go.main.App.SetRedisTTL(config, key, ttlSeconds);
    }
  } catch (e) {
    console.warn('SetRedisTTL binding error:', e);
  }
  return false;
}

export async function flushRedisDB(
  config: RedisConnectionConfig
): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.FlushRedisDB === 'function') {
      return await w.go.main.App.FlushRedisDB(config);
    }
  } catch (e) {
    console.warn('FlushRedisDB binding error:', e);
  }
  return false;
}

export async function executeRedisCommand(
  config: RedisConnectionConfig,
  commandLine: string
): Promise<RedisCommandResult> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.ExecuteRedisCommand === 'function') {
      return await w.go.main.App.ExecuteRedisCommand(config, commandLine);
    }
  } catch (e: any) {
    console.warn('ExecuteRedisCommand binding error:', e);
    return {
      rawOutput: null,
      formatted: `(error) ${e?.message || String(e)}`,
      resultType: 'error',
      durationMs: 0,
      command: commandLine,
      error: e?.message || String(e),
    };
  }
  return {
    rawOutput: null,
    formatted: '(error) Wails bridge not available',
    resultType: 'error',
    durationMs: 0,
    command: commandLine,
    error: 'Wails bridge not available',
  };
}


import {
  ProjectWorkspace,
  ProjectFileResult,
} from '../types/project';

// ============================================================================
// PROJECT FILE & LIFECYCLE BRIDGE METHODS
// ============================================================================

export async function createProjectFileDialog(defaultName: string = 'my-workspace'): Promise<ProjectFileResult> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.CreateProjectFileDialog === 'function') {
      return await w.go.main.App.CreateProjectFileDialog(defaultName);
    }
  } catch (e: any) {
    console.warn('CreateProjectFileDialog binding error:', e);
    return { filePath: '', error: e?.message || String(e) };
  }
  return { filePath: '', error: 'Wails bridge not available' };
}

export async function openProjectFileDialog(): Promise<ProjectFileResult> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.OpenProjectFileDialog === 'function') {
      return await w.go.main.App.OpenProjectFileDialog();
    }
  } catch (e: any) {
    console.warn('OpenProjectFileDialog binding error:', e);
    return { filePath: '', error: e?.message || String(e) };
  }
  return { filePath: '', error: 'Wails bridge not available' };
}

export async function readProjectFile(filePath: string): Promise<ProjectFileResult> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.ReadProjectFile === 'function') {
      return await w.go.main.App.ReadProjectFile(filePath);
    }
  } catch (e: any) {
    console.warn('ReadProjectFile binding error:', e);
    return { filePath, error: e?.message || String(e) };
  }
  return { filePath, error: 'Wails bridge not available' };
}

export async function saveProjectFile(filePath: string, project: ProjectWorkspace): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.SaveProjectFile === 'function') {
      const jsonStr = JSON.stringify(project, null, 2);
      return await w.go.main.App.SaveProjectFile(filePath, jsonStr);
    }
  } catch (e) {
    console.warn('SaveProjectFile binding error:', e);
  }
  return false;
}

export async function closeProjectConnections(): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.CloseProjectConnections === 'function') {
      return await w.go.main.App.CloseProjectConnections();
    }
  } catch (e) {
    console.warn('CloseProjectConnections binding error:', e);
  }
  return true;
}

export async function wipeLegacyStorage(): Promise<boolean> {
  try {
    const w = window as any;
    if (w && w.go && w.go.main && w.go.main.App && typeof w.go.main.App.WipeLegacyStorage === 'function') {
      return await w.go.main.App.WipeLegacyStorage();
    }
  } catch (e) {
    console.warn('WipeLegacyStorage binding error:', e);
  }
  return false;
}

// ============================================================================
// TERMINAL DOMAIN (Wails Native ConPTY Bindings)
// ============================================================================

export async function startTerminalSession(
  sessionId: string,
  workDir: string = '',
  cols: number = 120,
  rows: number = 30
): Promise<boolean> {
  try {
    if (typeof StartTerminalSession === 'function') {
      await StartTerminalSession(sessionId, workDir, cols, rows);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartTerminalSession) {
      await w.go.main.App.StartTerminalSession(sessionId, workDir, cols, rows);
      return true;
    }
  } catch (e) {
    console.error('[Terminal Start Error]:', e);
  }
  return false;
}

export async function writeTerminalSession(sessionId: string, data: string): Promise<boolean> {
  try {
    if (typeof WriteTerminalSession === 'function') {
      await WriteTerminalSession(sessionId, data);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.WriteTerminalSession) {
      await w.go.main.App.WriteTerminalSession(sessionId, data);
      return true;
    }
  } catch (e) {
    console.error('[Terminal Write Error]:', e);
  }
  return false;
}

export async function resizeTerminalSession(
  sessionId: string,
  cols: number,
  rows: number
): Promise<boolean> {
  try {
    if (typeof ResizeTerminalSession === 'function') {
      await ResizeTerminalSession(sessionId, cols, rows);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.ResizeTerminalSession) {
      await w.go.main.App.ResizeTerminalSession(sessionId, cols, rows);
      return true;
    }
  } catch (e) {
    console.warn('[Terminal Resize Error]:', e);
  }
  return false;
}

export async function closeTerminalSession(sessionId: string): Promise<boolean> {
  try {
    if (typeof CloseTerminalSession === 'function') {
      await CloseTerminalSession(sessionId);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.CloseTerminalSession) {
      await w.go.main.App.CloseTerminalSession(sessionId);
      return true;
    }
  } catch (e) {
    console.warn('[Terminal Close Error]:', e);
  }
  return false;
}

// ============================================================================
// DOCKER DOMAIN
// ============================================================================

export async function checkDockerAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    console.log('[Frontend] Invoking CheckDockerAvailability / CheckConnection...');
    let res: any;
    if (typeof CheckDockerAvailability === 'function') {
      res = await CheckDockerAvailability();
    } else {
      const w = window as any;
      if (w?.go?.main?.App?.CheckDockerAvailability) {
        res = await w.go.main.App.CheckDockerAvailability();
      } else if (w?.go?.main?.App?.CheckConnection) {
        res = await w.go.main.App.CheckConnection();
      }
    }

    console.log('[Frontend] Docker connection response from backend:', res);

    if (Array.isArray(res)) {
      const isOnline = Boolean(res[0]);
      if (isOnline) {
        return { available: true, version: String(res[1] || '') };
      } else {
        return { available: false, error: String(res[1] || 'Docker daemon is not responding') };
      }
    } else if (typeof res === 'object' && res !== null) {
      return {
        available: Boolean(res.available ?? res.isOnline ?? true),
        version: res.version,
        error: res.error,
      };
    } else if (typeof res === 'boolean') {
      return { available: res };
    }
  } catch (e: any) {
    console.error('[Frontend] Error calling CheckDockerAvailability:', e);
    return { available: false, error: e?.message || String(e) };
  }
  return { available: false, error: 'Docker API not available' };
}

export async function listDockerContainers(onlyRunning: boolean = false): Promise<DockerProjectGroup[]> {
  try {
    if (typeof ListContainers === 'function') {
      const res = await ListContainers(onlyRunning);
      return (res || []) as unknown as DockerProjectGroup[];
    }
    const w = window as any;
    if (w?.go?.main?.App?.ListContainers) {
      const res = await w.go.main.App.ListContainers(onlyRunning);
      return (res || []) as unknown as DockerProjectGroup[];
    }
  } catch (e) {
    console.error('[Docker ListContainers Error]:', e);
  }
  return [];
}

export async function startDockerContainer(containerId: string): Promise<boolean> {
  try {
    if (typeof StartContainer === 'function') {
      const res = await StartContainer(containerId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartContainer) {
      const res = await w.go.main.App.StartContainer(containerId);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker StartContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function stopDockerContainer(containerId: string): Promise<boolean> {
  try {
    if (typeof StopContainer === 'function') {
      const res = await StopContainer(containerId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.StopContainer) {
      const res = await w.go.main.App.StopContainer(containerId);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker StopContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function restartDockerContainer(containerId: string): Promise<boolean> {
  try {
    if (typeof RestartContainer === 'function') {
      const res = await RestartContainer(containerId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.RestartContainer) {
      const res = await w.go.main.App.RestartContainer(containerId);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker RestartContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function removeDockerContainer(containerId: string, force: boolean = false): Promise<boolean> {
  try {
    if (typeof RemoveContainer === 'function') {
      const res = await RemoveContainer(containerId, force);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.RemoveContainer) {
      const res = await w.go.main.App.RemoveContainer(containerId, force);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker RemoveContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function startDockerLogStream(containerId: string): Promise<void> {
  try {
    if (typeof StartLogStream === 'function') {
      await StartLogStream(containerId);
      return;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartLogStream) {
      await w.go.main.App.StartLogStream(containerId);
    }
  } catch (e) {
    console.warn('[Docker StartLogStream Error]:', e);
  }
}

export async function stopDockerLogStream(containerId: string): Promise<void> {
  try {
    if (typeof StopLogStream === 'function') {
      await StopLogStream(containerId);
      return;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StopLogStream) {
      await w.go.main.App.StopLogStream(containerId);
    }
  } catch (e) {
    console.warn('[Docker StopLogStream Error]:', e);
  }
}

export async function startContainerExec(sessionId: string, containerId: string, cols: number = 80, rows: number = 24): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StartContainerExec) {
      await w.go.main.App.StartContainerExec(sessionId, containerId, cols, rows);
      return true;
    }
  } catch (e) {
    console.error('[Docker StartContainerExec Error]:', e);
    throw e;
  }
  return false;
}

export async function writeContainerExec(sessionId: string, data: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.WriteContainerExec) {
      await w.go.main.App.WriteContainerExec(sessionId, data);
      return true;
    }
  } catch (e) {
    console.warn('[Docker WriteContainerExec Error]:', e);
  }
  return false;
}

export async function resizeContainerExec(sessionId: string, cols: number, rows: number): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.ResizeContainerExec) {
      await w.go.main.App.ResizeContainerExec(sessionId, cols, rows);
      return true;
    }
  } catch (e) {
    console.warn('[Docker ResizeContainerExec Error]:', e);
  }
  return false;
}

export async function closeContainerExec(sessionId: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.CloseContainerExec) {
      await w.go.main.App.CloseContainerExec(sessionId);
      return true;
    }
  } catch (e) {
    console.warn('[Docker CloseContainerExec Error]:', e);
  }
  return false;
}

// ============================================================================
// SOURCE CONTROL / GIT API
// ============================================================================

import { GitStatusResult } from '../types/git';

export async function openGitRepositoryDialog(): Promise<string> {
  console.log('[Git API] openGitRepositoryDialog called');
  try {
    const w = window as any;
    if (w?.go?.main?.App?.OpenRepositoryDialog) {
      const res = await w.go.main.App.OpenRepositoryDialog();
      console.log('[Git API] App.OpenRepositoryDialog result:', res);
      return res || '';
    }
    if (w?.go?.main?.GitService?.OpenRepositoryDialog) {
      const res = await w.go.main.GitService.OpenRepositoryDialog();
      console.log('[Git API] GitService.OpenRepositoryDialog result:', res);
      return res || '';
    }
    console.warn('[Git API] Neither App.OpenRepositoryDialog nor GitService.OpenRepositoryDialog found in window.go.main');
  } catch (e) {
    console.error('[Git OpenRepositoryDialog Error]:', e);
    throw e;
  }
  return '';
}

export async function initGitRepository(repoPath: string): Promise<void> {
  console.log('[Git API] initGitRepository called for path:', repoPath);
  try {
    const w = window as any;
    if (w?.go?.main?.App?.InitRepository) {
      await w.go.main.App.InitRepository(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.InitRepository) {
      await w.go.main.GitService.InitRepository(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git InitRepository Error]:', e);
    throw e;
  }
}

export async function getGitRepoStatus(repoPath: string): Promise<GitStatusResult> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.GetRepoStatus) {
      const res = await w.go.main.App.GetRepoStatus(repoPath);
      return res;
    }
    if (w?.go?.main?.GitService?.GetRepoStatus) {
      const res = await w.go.main.GitService.GetRepoStatus(repoPath);
      return res;
    }
  } catch (e) {
    console.error('[Git GetRepoStatus Error]:', e);
    throw e;
  }
  return {
    isRepo: false,
    repoPath: repoPath,
    branch: '',
    upstream: '',
    ahead: 0,
    behind: 0,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
  };
}

export async function getGitFileDiff(repoPath: string, filePath: string, staged: boolean = false): Promise<string> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.GetFileDiff) {
      const res = await w.go.main.App.GetFileDiff(repoPath, filePath, staged);
      return res || '';
    }
    if (w?.go?.main?.GitService?.GetFileDiff) {
      const res = await w.go.main.GitService.GetFileDiff(repoPath, filePath, staged);
      return res || '';
    }
  } catch (e) {
    console.error('[Git GetFileDiff Error]:', e);
    throw e;
  }
  return '';
}

export async function stageGitFile(repoPath: string, filePath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StageFile) {
      await w.go.main.App.StageFile(repoPath, filePath);
      return;
    }
    if (w?.go?.main?.GitService?.StageFile) {
      await w.go.main.GitService.StageFile(repoPath, filePath);
      return;
    }
  } catch (e) {
    console.error('[Git StageFile Error]:', e);
    throw e;
  }
}

export async function unstageGitFile(repoPath: string, filePath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.UnstageFile) {
      await w.go.main.App.UnstageFile(repoPath, filePath);
      return;
    }
    if (w?.go?.main?.GitService?.UnstageFile) {
      await w.go.main.GitService.UnstageFile(repoPath, filePath);
      return;
    }
  } catch (e) {
    console.error('[Git UnstageFile Error]:', e);
    throw e;
  }
}

export async function stageAllGitFiles(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StageAll) {
      await w.go.main.App.StageAll(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.StageAll) {
      await w.go.main.GitService.StageAll(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git StageAll Error]:', e);
    throw e;
  }
}

export async function unstageAllGitFiles(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.UnstageAll) {
      await w.go.main.App.UnstageAll(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.UnstageAll) {
      await w.go.main.GitService.UnstageAll(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git UnstageAll Error]:', e);
    throw e;
  }
}

export async function commitGitChanges(repoPath: string, message: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.CommitChanges) {
      await w.go.main.App.CommitChanges(repoPath, message);
      return;
    }
    if (w?.go?.main?.GitService?.CommitChanges) {
      await w.go.main.GitService.CommitChanges(repoPath, message);
      return;
    }
  } catch (e) {
    console.error('[Git CommitChanges Error]:', e);
    throw e;
  }
}

export async function pushGitChanges(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.PushChanges) {
      await w.go.main.App.PushChanges(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.PushChanges) {
      await w.go.main.GitService.PushChanges(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git PushChanges Error]:', e);
    throw e;
  }
}

export async function pullGitChanges(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.PullChanges) {
      await w.go.main.App.PullChanges(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.PullChanges) {
      await w.go.main.GitService.PullChanges(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git PullChanges Error]:', e);
    throw e;
  }
}

export async function fetchGitChanges(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.FetchChanges) {
      await w.go.main.App.FetchChanges(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.FetchChanges) {
      await w.go.main.GitService.FetchChanges(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git FetchChanges Error]:', e);
    throw e;
  }
}

export async function startGitAutoWatch(repoPath: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StartAutoWatch) {
      await w.go.main.App.StartAutoWatch(repoPath);
      return true;
    }
    if (w?.go?.main?.GitService?.StartAutoWatch) {
      await w.go.main.GitService.StartAutoWatch(repoPath);
      return true;
    }
  } catch (e) {
    console.warn('[Git StartAutoWatch Error]:', e);
  }
  return false;
}

export async function stopGitAutoWatch(): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StopAutoWatch) {
      await w.go.main.App.StopAutoWatch();
      return true;
    }
    if (w?.go?.main?.GitService?.StopAutoWatch) {
      await w.go.main.GitService.StopAutoWatch();
      return true;
    }
  } catch (e) {
    console.warn('[Git StopAutoWatch Error]:', e);
  }
  return false;
}

