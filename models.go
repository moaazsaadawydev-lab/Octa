package main

// ConnectionConfig defines the database connection properties.
type ConnectionConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "postgres" | "mysql" | "mongodb"
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	SSL      bool   `json:"ssl"`
}

// TableColumn represents the column metadata of a table.
type TableColumn struct {
	Name         string   `json:"name"`
	Type         string   `json:"type"`
	DataType     string   `json:"dataType,omitempty"`
	IsNullable   bool     `json:"isNullable"`
	IsPrimaryKey bool     `json:"isPrimaryKey"`
	IsForeignKey bool     `json:"isForeignKey"`
	DefaultValue *string  `json:"defaultValue,omitempty"`
	EnumValues   []string `json:"enumValues,omitempty"`
}

// TableDataResult wraps the rows, columns, and total row count for table data view.
type TableDataResult struct {
	Columns    []string         `json:"columns"`
	Rows       []map[string]any `json:"rows"`
	TotalRows  int64            `json:"totalRows"`
	DurationMs float64          `json:"durationMs"`
}

// RowUpdate defines a single cell modification payload from the frontend data grid.
type RowUpdate struct {
	PrimaryKeyColumn string `json:"primaryKeyColumn"`
	PrimaryKeyValue  any    `json:"primaryKeyValue"`
	Column           string `json:"column"`
	NewValue         any    `json:"newValue"`
}

// QueryResult represents the outcome of an individual SQL statement execution.
type QueryResult struct {
	QueryIndex   int              `json:"queryIndex"`
	RowsAffected int64            `json:"rowsAffected"`
	Columns      []string         `json:"columns"`
	Rows         []map[string]any `json:"rows"`
	RowCount     int64            `json:"rowCount"`
	DurationMs   float64          `json:"durationMs"`
	Statement    string           `json:"statement"`
	Success      bool             `json:"success"`
	ErrorMessage string           `json:"errorMessage,omitempty"`
	Error        string           `json:"error,omitempty"`
	IsSelect     bool             `json:"isSelect"`
}

// TableSchema holds the columns and primary keys of a single table for ERD.
type TableSchema struct {
	Name        string        `json:"name"`
	Columns     []TableColumn `json:"columns"`
	PrimaryKeys []string      `json:"primaryKeys"`
	RowCount    int64         `json:"rowCount"`
}

// ForeignKeyRelationship defines a relationship between two tables.
type ForeignKeyRelationship struct {
	ConstraintName string `json:"constraintName"`
	SourceTable    string `json:"sourceTable"`
	SourceColumn   string `json:"sourceColumn"`
	TargetTable    string `json:"targetTable"`
	TargetColumn   string `json:"targetColumn"`
}

// DatabaseSchema holds the complete ERD schema for a database.
type DatabaseSchema struct {
	Tables        []TableSchema            `json:"tables"`
	Relationships []ForeignKeyRelationship `json:"relationships"`
}

// DataQueryOptions defines pagination, sorting, and filtering parameters for table queries.
type DataQueryOptions struct {
	Page         int    `json:"page"`
	PageSize     int    `json:"pageSize"`
	SortColumn   string `json:"sortColumn"`
	SortOrder    string `json:"sortOrder"` // "ASC" | "DESC" | ""
	FilterColumn string `json:"filterColumn"`
	FilterOp     string `json:"filterOp"` // "equals", "contains", "starts_with", "gt", "lt", "gte", "lte", "is_null", "is_not_null"
	FilterValue  string `json:"filterValue"`
}

// ImportResult contains statistics and status of an imported SQL script.
type ImportResult struct {
	StatementsExecuted int     `json:"statementsExecuted"`
	DurationMs         float64 `json:"durationMs"`
	Success            bool    `json:"success"`
	ErrorMessage       string  `json:"errorMessage,omitempty"`
}

// ExplainPlanResult contains parsed metrics and raw representations of an execution plan.
type ExplainPlanResult struct {
	PlanJSON      string  `json:"planJson"`
	TotalCost     float64 `json:"totalCost"`
	PlanningTime  float64 `json:"planningTime"`
	ExecutionTime float64 `json:"executionTime"`
	RawOutput     string  `json:"rawOutput"`
}

// QueryLog represents an executed SQL statement with metadata.
type QueryLog struct {
	ID         string  `json:"id"`
	Timestamp  string  `json:"timestamp"`
	Query      string  `json:"query"`
	DurationMs float64 `json:"durationMs"`
	Status     string  `json:"status"` // "SUCCESS" | "ERROR"
	Error      string  `json:"error,omitempty"`
}

// RedisConnectionConfig defines Redis connection parameters.
type RedisConnectionConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	DB       int    `json:"db"`
	SSL      bool   `json:"ssl"`
}

// RedisServerInfo contains telemetry about the connected Redis instance.
type RedisServerInfo struct {
	RedisVersion     string            `json:"redisVersion"`
	ConnectedClients int               `json:"connectedClients"`
	UsedMemoryHuman  string            `json:"usedMemoryHuman"`
	TotalKeys        int64             `json:"totalKeys"`
	UptimeInDays     int64             `json:"uptimeInDays"`
	RawInfo          map[string]string `json:"rawInfo"`
}

// RedisConnectResult is returned from ConnectRedis.
type RedisConnectResult struct {
	Success    bool            `json:"success"`
	ServerInfo RedisServerInfo `json:"serverInfo"`
	Error      string          `json:"error,omitempty"`
}

// RedisKeyInfo represents key metadata during keyspace scans.
type RedisKeyInfo struct {
	Key         string `json:"key"`
	Type        string `json:"type"` // "string", "hash", "list", "set", "zset"
	TTL         int64  `json:"ttl"`  // -1 persistent, -2 expired/none, >0 seconds
	MemoryUsage int64  `json:"memoryUsage"`
}

// ZSetMember represents a member in a Redis Sorted Set.
type ZSetMember struct {
	Member string  `json:"member"`
	Score  float64 `json:"score"`
}

// RedisKeyDetail holds value representations across all Redis data structures.
type RedisKeyDetail struct {
	Key         string            `json:"key"`
	Type        string            `json:"type"`
	TTL         int64             `json:"ttl"`
	MemoryUsage int64             `json:"memoryUsage"`
	StringValue string            `json:"stringValue,omitempty"`
	HashValue   map[string]string `json:"hashValue,omitempty"`
	ListValue   []string          `json:"listValue,omitempty"`
	SetValue    []string          `json:"setValue,omitempty"`
	ZSetValue   []ZSetMember      `json:"zsetValue,omitempty"`
}

// RedisScanResult holds pagination results from SCAN.
type RedisScanResult struct {
	Keys       []RedisKeyInfo `json:"keys"`
	NextCursor uint64         `json:"nextCursor"`
}

// RedisCommandResult holds the output from a raw CLI command execution in Redis Workbench.
type RedisCommandResult struct {
	RawOutput  any     `json:"rawOutput"`
	Formatted  string  `json:"formatted"`
	ResultType string  `json:"resultType"` // "string", "integer", "slice", "map", "status", "error", "nil"
	DurationMs float64 `json:"durationMs"`
	Command    string  `json:"command"`
	Error      string  `json:"error,omitempty"`
}

// FormFieldPayload represents a key-value or file part in multipart requests.
type FormFieldPayload struct {
	Key         string   `json:"key"`
	Value       string   `json:"value"`
	Type        string   `json:"type"` // "text" | "file"
	FileName    string   `json:"fileName,omitempty"`
	FilePath    string   `json:"filePath,omitempty"`
	Base64Data  string   `json:"base64Data,omitempty"`
	ContentType string   `json:"contentType,omitempty"`
	FileNames   []string `json:"fileNames,omitempty"`
	FilePaths   []string `json:"filePaths,omitempty"`
	FileBase64  []string `json:"fileBase64,omitempty"`
}

// HttpRequestPayload represents the incoming HTTP request configuration from the frontend.
type HttpRequestPayload struct {
	Method      string             `json:"method"`
	URL         string             `json:"url"`
	Headers     map[string]string  `json:"headers"`
	QueryParams map[string]string  `json:"queryParams,omitempty"`
	BodyType    string             `json:"bodyType"` // "none" | "json" | "form-data" | "x-www-form-urlencoded"
	BodyContent string             `json:"bodyContent"`
	FormData    []FormFieldPayload `json:"formData,omitempty"`
	UrlEncoded  map[string]string  `json:"urlEncoded,omitempty"`
	TimeoutSec  int                `json:"timeoutSec,omitempty"`
}

// HttpResponsePayload represents the structured HTTP response returned to the frontend.
type HttpResponsePayload struct {
	Status     int               `json:"status"`
	StatusText string            `json:"statusText"`
	DurationMs float64           `json:"durationMs"`
	SizeKb     float64           `json:"sizeKb"`
	Data       any               `json:"data"`
	Headers    map[string]string `json:"headers"`
	Cookies    []string          `json:"cookies,omitempty"`
	Error      string            `json:"error,omitempty"`
}

// SelectedFileMeta represents metadata for files selected via native dialog.
type SelectedFileMeta struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Size        int64  `json:"size"`
	Base64Data  string `json:"base64Data"`
	ContentType string `json:"contentType"`
}

// ProjectHttpClient holds HTTP client data for the project.
type ProjectHttpClient struct {
	Collections         []any  `json:"collections"`
	Environments        []any  `json:"environments"`
	GlobalVariables     []any  `json:"globalVariables"`
	ActiveEnvironmentID string `json:"activeEnvironmentId"`
}

// ProjectWorkspace is the root schema for a .octa project file.
type ProjectWorkspace struct {
	SchemaVersion int                     `json:"schemaVersion"`
	ID            string                  `json:"id"`
	Name          string                  `json:"name"`
	CreatedAt     string                  `json:"createdAt"`
	UpdatedAt     string                  `json:"updatedAt"`
	Databases     []ConnectionConfig      `json:"databases"`
	SqlQueries    []any                   `json:"sqlQueries"`
	Redis         []RedisConnectionConfig `json:"redis"`
	HttpClient    ProjectHttpClient       `json:"httpClient"`
}

// ProjectFileResult is returned from project file operations.
type ProjectFileResult struct {
	FilePath  string            `json:"filePath"`
	Project   *ProjectWorkspace `json:"project,omitempty"`
	Error     string            `json:"error,omitempty"`
	Cancelled bool              `json:"cancelled"`
}
