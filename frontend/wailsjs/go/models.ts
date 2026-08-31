export namespace main {
	
	export class ColumnMeta {
	    name: string;
	    dataType: string;
	    isNullable: boolean;
	    isPrimaryKey: boolean;
	    isForeignKey: boolean;
	    defaultValue: string;
	
	    static createFrom(source: any = {}) {
	        return new ColumnMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.dataType = source["dataType"];
	        this.isNullable = source["isNullable"];
	        this.isPrimaryKey = source["isPrimaryKey"];
	        this.isForeignKey = source["isForeignKey"];
	        this.defaultValue = source["defaultValue"];
	    }
	}
	export class ConnectionConfig {
	    id: string;
	    name: string;
	    type: string;
	    host: string;
	    port: number;
	    database: string;
	    username: string;
	    password: string;
	    ssl: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.database = source["database"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.ssl = source["ssl"];
	    }
	}
	export class DataQueryOptions {
	    page: number;
	    pageSize: number;
	    sortColumn: string;
	    sortOrder: string;
	    filterColumn: string;
	    filterOp: string;
	    filterValue: string;
	
	    static createFrom(source: any = {}) {
	        return new DataQueryOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.sortColumn = source["sortColumn"];
	        this.sortOrder = source["sortOrder"];
	        this.filterColumn = source["filterColumn"];
	        this.filterOp = source["filterOp"];
	        this.filterValue = source["filterValue"];
	    }
	}
	export class ForeignKeyRelationship {
	    constraintName: string;
	    sourceTable: string;
	    sourceColumn: string;
	    targetTable: string;
	    targetColumn: string;
	
	    static createFrom(source: any = {}) {
	        return new ForeignKeyRelationship(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.constraintName = source["constraintName"];
	        this.sourceTable = source["sourceTable"];
	        this.sourceColumn = source["sourceColumn"];
	        this.targetTable = source["targetTable"];
	        this.targetColumn = source["targetColumn"];
	    }
	}
	export class TableSchema {
	    name: string;
	    columns: ColumnMeta[];
	    rowCount: number;
	
	    static createFrom(source: any = {}) {
	        return new TableSchema(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.columns = this.convertValues(source["columns"], ColumnMeta);
	        this.rowCount = source["rowCount"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DatabaseSchema {
	    tables: TableSchema[];
	    relationships: ForeignKeyRelationship[];
	
	    static createFrom(source: any = {}) {
	        return new DatabaseSchema(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tables = this.convertValues(source["tables"], TableSchema);
	        this.relationships = this.convertValues(source["relationships"], ForeignKeyRelationship);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ImportResult {
	    statementsExecuted: number;
	    durationMs: number;
	    success: boolean;
	    errorMessage?: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.statementsExecuted = source["statementsExecuted"];
	        this.durationMs = source["durationMs"];
	        this.success = source["success"];
	        this.errorMessage = source["errorMessage"];
	    }
	}
	export class QueryLog {
	    id: string;
	    timestamp: string;
	    query: string;
	    durationMs: number;
	    status: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new QueryLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.query = source["query"];
	        this.durationMs = source["durationMs"];
	        this.status = source["status"];
	        this.error = source["error"];
	    }
	}
	export class QueryResult {
	    queryIndex: number;
	    statement: string;
	    columns: string[];
	    rows: any[];
	    rowsAffected: number;
	    durationMs: number;
	    error?: string;
	    isSelect: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queryIndex = source["queryIndex"];
	        this.statement = source["statement"];
	        this.columns = source["columns"];
	        this.rows = source["rows"];
	        this.rowsAffected = source["rowsAffected"];
	        this.durationMs = source["durationMs"];
	        this.error = source["error"];
	        this.isSelect = source["isSelect"];
	    }
	}
	export class RowUpdate {
	    rowId: any;
	    column: string;
	    newValue: any;
	
	    static createFrom(source: any = {}) {
	        return new RowUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rowId = source["rowId"];
	        this.column = source["column"];
	        this.newValue = source["newValue"];
	    }
	}
	export class TableColumn {
	    name: string;
	    type: string;
	    isNullable: boolean;
	    isPrimaryKey: boolean;
	    defaultValue?: string;
	    enumValues?: string[];
	
	    static createFrom(source: any = {}) {
	        return new TableColumn(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.isNullable = source["isNullable"];
	        this.isPrimaryKey = source["isPrimaryKey"];
	        this.defaultValue = source["defaultValue"];
	        this.enumValues = source["enumValues"];
	    }
	}
	export class TableDataResult {
	    columns: string[];
	    rows: any[];
	    totalRows: number;
	    durationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new TableDataResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.columns = source["columns"];
	        this.rows = source["rows"];
	        this.totalRows = source["totalRows"];
	        this.durationMs = source["durationMs"];
	    }
	}

}

