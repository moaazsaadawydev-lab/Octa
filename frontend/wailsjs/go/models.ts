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
	export class ExplainPlanResult {
	    planJson: string;
	    totalCost: number;
	    planningTime: number;
	    executionTime: number;
	    rawOutput: string;
	
	    static createFrom(source: any = {}) {
	        return new ExplainPlanResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.planJson = source["planJson"];
	        this.totalCost = source["totalCost"];
	        this.planningTime = source["planningTime"];
	        this.executionTime = source["executionTime"];
	        this.rawOutput = source["rawOutput"];
	    }
	}
	
	export class FormFieldPayload {
	    key: string;
	    value: string;
	    type: string;
	    fileName?: string;
	    filePath?: string;
	    base64Data?: string;
	    contentType?: string;
	    fileNames?: string[];
	    filePaths?: string[];
	    fileBase64?: string[];
	
	    static createFrom(source: any = {}) {
	        return new FormFieldPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.type = source["type"];
	        this.fileName = source["fileName"];
	        this.filePath = source["filePath"];
	        this.base64Data = source["base64Data"];
	        this.contentType = source["contentType"];
	        this.fileNames = source["fileNames"];
	        this.filePaths = source["filePaths"];
	        this.fileBase64 = source["fileBase64"];
	    }
	}
	export class HttpRequestPayload {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    queryParams?: Record<string, string>;
	    bodyType: string;
	    bodyContent: string;
	    formData?: FormFieldPayload[];
	    urlEncoded?: Record<string, string>;
	    timeoutSec?: number;
	
	    static createFrom(source: any = {}) {
	        return new HttpRequestPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.queryParams = source["queryParams"];
	        this.bodyType = source["bodyType"];
	        this.bodyContent = source["bodyContent"];
	        this.formData = this.convertValues(source["formData"], FormFieldPayload);
	        this.urlEncoded = source["urlEncoded"];
	        this.timeoutSec = source["timeoutSec"];
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
	export class HttpResponsePayload {
	    status: number;
	    statusText: string;
	    durationMs: number;
	    sizeKb: number;
	    data: any;
	    headers: Record<string, string>;
	    cookies?: string[];
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new HttpResponsePayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.statusText = source["statusText"];
	        this.durationMs = source["durationMs"];
	        this.sizeKb = source["sizeKb"];
	        this.data = source["data"];
	        this.headers = source["headers"];
	        this.cookies = source["cookies"];
	        this.error = source["error"];
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
	export class RedisServerInfo {
	    redisVersion: string;
	    connectedClients: string;
	    usedMemoryHuman: string;
	    totalKeys: number;
	    uptimeInDays: string;
	    rawInfo: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new RedisServerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.redisVersion = source["redisVersion"];
	        this.connectedClients = source["connectedClients"];
	        this.usedMemoryHuman = source["usedMemoryHuman"];
	        this.totalKeys = source["totalKeys"];
	        this.uptimeInDays = source["uptimeInDays"];
	        this.rawInfo = source["rawInfo"];
	    }
	}
	export class RedisConnectResult {
	    success: boolean;
	    serverInfo: RedisServerInfo;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new RedisConnectResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.serverInfo = this.convertValues(source["serverInfo"], RedisServerInfo);
	        this.error = source["error"];
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
	export class RedisConnectionConfig {
	    id: string;
	    name: string;
	    host: string;
	    port: number;
	    username?: string;
	    password?: string;
	    db: number;
	    ssl: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RedisConnectionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.db = source["db"];
	        this.ssl = source["ssl"];
	    }
	}
	export class ZSetMember {
	    member: string;
	    score: number;
	
	    static createFrom(source: any = {}) {
	        return new ZSetMember(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.member = source["member"];
	        this.score = source["score"];
	    }
	}
	export class RedisKeyDetail {
	    key: string;
	    type: string;
	    ttl: number;
	    memoryUsage: number;
	    stringValue?: string;
	    hashValue?: Record<string, string>;
	    listValue?: string[];
	    setValue?: string[];
	    zsetValue?: ZSetMember[];
	
	    static createFrom(source: any = {}) {
	        return new RedisKeyDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.type = source["type"];
	        this.ttl = source["ttl"];
	        this.memoryUsage = source["memoryUsage"];
	        this.stringValue = source["stringValue"];
	        this.hashValue = source["hashValue"];
	        this.listValue = source["listValue"];
	        this.setValue = source["setValue"];
	        this.zsetValue = this.convertValues(source["zsetValue"], ZSetMember);
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
	export class RedisKeyInfo {
	    key: string;
	    type: string;
	    ttl: number;
	    memoryUsage: number;
	
	    static createFrom(source: any = {}) {
	        return new RedisKeyInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.type = source["type"];
	        this.ttl = source["ttl"];
	        this.memoryUsage = source["memoryUsage"];
	    }
	}
	export class RedisScanResult {
	    keys: RedisKeyInfo[];
	    nextCursor: number;
	    totalKeys: number;
	
	    static createFrom(source: any = {}) {
	        return new RedisScanResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.keys = this.convertValues(source["keys"], RedisKeyInfo);
	        this.nextCursor = source["nextCursor"];
	        this.totalKeys = source["totalKeys"];
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
	export class SelectedFileMeta {
	    name: string;
	    filePath: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new SelectedFileMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.filePath = source["filePath"];
	        this.size = source["size"];
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

