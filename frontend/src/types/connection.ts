export interface ConnectionConfig {
  id?: string;
  name: string;
  type: 'postgres' | 'mysql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface ActiveSession {
  connection: ConnectionConfig;
  activeDatabase: string;
  connectedAt: Date;
}

export type ConnectionStatus = 'idle' | 'testing' | 'connecting' | 'connected' | 'error';

export interface TableColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  enumValues?: string[];
}

export interface RowUpdate {
  rowId: any;
  column: string;
  newValue: any;
}

export interface TableDataResult {
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  durationMs: number;
}

export interface QueryLog {
  id: string;
  timestamp: string;
  query: string;
  durationMs: number;
  status: 'SUCCESS' | 'ERROR' | string;
  error?: string;
}

export interface QueryResult {
  queryIndex: number;
  statement: string;
  columns: string[];
  rows: Record<string, any>[];
  rowsAffected: number;
  durationMs: number;
  error?: string;
  isSelect: boolean;
}

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  results: QueryResult[] | null;
  activeResultIndex: number;
  isExecuting: boolean;
}



