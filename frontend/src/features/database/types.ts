export * from '../../types/connection';

export interface TableTabState {
  schema: import('../../types/connection').TableColumn[];
  tableData: import('../../types/connection').TableDataResult | null;
  loadingData: boolean;
  page: number;
  limit: number;
  sortColumn: string;
  sortOrder: 'ASC' | 'DESC' | '';
  filterColumn: string;
  filterOp: string;
  filterValue: string;
}

export interface EditingCellState {
  rowIdx: number;
  rowId: any;
  colName: string;
  colType: string;
  isNullable: boolean;
  enumValues?: string[];
  initialValue: any;
  editValue: string;
}

export type DbSubView = 'tables' | 'playground' | 'erd';

export interface QueryHistoryEntry {
  id: string;
  query: string;
  timestamp: Date;
  status: 'success' | 'error';
  executionTime?: number;
  rowCount?: number;
  database?: string;
  errorMessage?: string;
}
