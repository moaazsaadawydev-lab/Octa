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
} from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import {
  ConnectionConfig,
  TableColumn,
  TableDataResult,
  QueryLog,
  RowUpdate,
  QueryResult,
  DatabaseSchema,
  DataQueryOptions,
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
      type: c.type,
      isNullable: Boolean(c.isNullable),
      isPrimaryKey: Boolean(c.isPrimaryKey),
      defaultValue: c.defaultValue,
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
    return results.map((r) => ({
      queryIndex: r.queryIndex,
      statement: r.statement,
      columns: r.columns || [],
      rows: r.rows || [],
      rowsAffected: r.rowsAffected || 0,
      durationMs: r.durationMs || 0,
      error: r.error,
      isSelect: Boolean(r.isSelect),
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
          dataType: c.dataType,
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





