import {
  GetTables,
  GetTableSchema,
  AddColumn,
  DropColumn,
  RenameColumn,
  GetEnumValues,
  GetDatabaseSchemaDetails,
} from '../../wailsjs/go/main/App';
import { ConnectionConfig, TableColumn, DatabaseSchema } from '../types/connection';
import { toModelConfig } from './dbConnectionsApi';

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
