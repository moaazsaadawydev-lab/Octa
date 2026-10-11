package main

// ConnectionConfig holds database connection parameters.
type ConnectionConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "postgres", "mysql", "mongodb"
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	SSL      bool   `json:"ssl"`
}

// TableColumn represents metadata for a table column.
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

// RowUpdate represents an individual cell update in TableViewer inline editing.
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
	TxStatus     string           `json:"txStatus,omitempty"`
	Notices      []string         `json:"notices,omitempty"`
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

// TableDataResult represents paginated table data.
type TableDataResult struct {
	Columns    []string         `json:"columns"`
	Rows       []map[string]any `json:"rows"`
	TotalRows  int64            `json:"totalRows"`
	DurationMs float64          `json:"durationMs"`
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
