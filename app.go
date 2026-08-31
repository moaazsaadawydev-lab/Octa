package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

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
	IsNullable   bool     `json:"isNullable"`
	IsPrimaryKey bool     `json:"isPrimaryKey"`
	DefaultValue *string  `json:"defaultValue"`
	EnumValues   []string `json:"enumValues,omitempty"`
}

// RowUpdate defines a single cell mutation within a row.
type RowUpdate struct {
	RowID    any    `json:"rowId"`
	Column   string `json:"column"`
	NewValue any    `json:"newValue"`
}

// TableDataResult holds paginated rows, columns, and timing information.
type TableDataResult struct {
	Columns    []string         `json:"columns"`
	Rows       []map[string]any `json:"rows"`
	TotalRows  int64            `json:"totalRows"`
	DurationMs float64          `json:"durationMs"`
}

// QueryResult holds the result of a single statement in raw query execution.
type QueryResult struct {
	QueryIndex   int              `json:"queryIndex"`
	Statement    string           `json:"statement"`
	Columns      []string         `json:"columns"`
	Rows         []map[string]any `json:"rows"`
	RowsAffected int64            `json:"rowsAffected"`
	DurationMs   float64          `json:"durationMs"`
	Error        string           `json:"error,omitempty"`
	IsSelect     bool             `json:"isSelect"`
}

// ColumnMeta represents detailed column attributes for ERD visualization.
type ColumnMeta struct {
	Name         string `json:"name"`
	DataType     string `json:"dataType"`
	IsNullable   bool   `json:"isNullable"`
	IsPrimaryKey bool   `json:"isPrimaryKey"`
	IsForeignKey bool   `json:"isForeignKey"`
	DefaultValue string `json:"defaultValue"`
}

// TableSchema holds table metadata, column list, and row count for ERD.
type TableSchema struct {
	Name     string       `json:"name"`
	Columns  []ColumnMeta `json:"columns"`
	RowCount int64        `json:"rowCount"`
}

// ForeignKeyRelationship represents a relation between source and target tables/columns.
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

// App struct
type App struct {
	ctx       context.Context
	mu        sync.RWMutex
	queryLogs []QueryLog
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		queryLogs: make([]QueryLog, 0),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// logQuery adds a query entry to memory and emits a runtime event.
func (a *App) logQuery(query string, durationMs float64, status string, errStr string) QueryLog {
	a.mu.Lock()
	defer a.mu.Unlock()

	entry := QueryLog{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().Format("15:04:05.000"),
		Query:      query,
		DurationMs: durationMs,
		Status:     status,
		Error:      errStr,
	}

	a.queryLogs = append(a.queryLogs, entry)
	if len(a.queryLogs) > 200 {
		a.queryLogs = a.queryLogs[len(a.queryLogs)-200:]
	}

	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "query_log", entry)
	}

	return entry
}

// GetQueryLogs returns all buffered query execution logs.
func (a *App) GetQueryLogs() ([]QueryLog, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	logsCopy := make([]QueryLog, len(a.queryLogs))
	copy(logsCopy, a.queryLogs)
	return logsCopy, nil
}

// ClearQueryLogs clears all buffered query logs.
func (a *App) ClearQueryLogs() (bool, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.queryLogs = make([]QueryLog, 0)
	return true, nil
}

// buildPostgresURL creates a standard postgresql connection string.
func buildPostgresURL(config ConnectionConfig) string {
	sslMode := "disable"
	if config.SSL {
		sslMode = "require"
	}

	port := config.Port
	if port <= 0 {
		port = 5432
	}

	host := config.Host
	if host == "" {
		host = "localhost"
	}

	hostPort := net.JoinHostPort(host, fmt.Sprintf("%d", port))

	dbName := config.Database
	if dbName == "" {
		dbName = "postgres"
	}

	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(config.Username, config.Password),
		Host:   hostPort,
		Path:   dbName,
	}

	q := u.Query()
	q.Set("sslmode", sslMode)
	q.Set("connect_timeout", "5")
	u.RawQuery = q.Encode()

	return u.String()
}

// buildPostgresURLWithDB creates a connection string overriding the database name.
func buildPostgresURLWithDB(config ConnectionConfig, dbName string) string {
	c := config
	if dbName != "" {
		c.Database = dbName
	}
	return buildPostgresURL(c)
}

// getConnectionsFilePath returns the full path to connections.json in the user's config directory.
func getConnectionsFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "devcockpit")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "connections.json"), nil
}

// TestConnection establishes a test connection to PostgreSQL with a 5-second timeout.
func (a *App) TestConnection(config ConnectionConfig) (bool, string) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Sprintf("Unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURL(config)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Sprintf("Invalid connection string: %v", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Sprintf("Connection failed: %v", err)
	}
	defer conn.Close(ctx)

	if err := conn.Ping(ctx); err != nil {
		return false, fmt.Sprintf("Ping failed: %v", err)
	}

	return true, "Connection successful"
}

// SaveConnection verifies the connection via TestConnection and persists it in connections.json.
func (a *App) SaveConnection(config ConnectionConfig) (bool, string) {
	if config.Type == "" {
		config.Type = "postgres"
	}

	// 1. Verify connection first via TestConnection
	success, msg := a.TestConnection(config)
	if !success {
		return false, msg
	}

	// 2. Assign a new UUID if empty
	if config.ID == "" {
		config.ID = uuid.New().String()
	}

	filePath, err := getConnectionsFilePath()
	if err != nil {
		return false, fmt.Sprintf("Failed to get config directory: %v", err)
	}

	connections, err := a.GetSavedConnections()
	if err != nil {
		connections = []ConnectionConfig{}
	}

	// Check if updating existing connection or appending new one
	updated := false
	for i, c := range connections {
		if c.ID == config.ID {
			connections[i] = config
			updated = true
			break
		}
	}
	if !updated {
		connections = append(connections, config)
	}

	data, err := json.MarshalIndent(connections, "", "  ")
	if err != nil {
		return false, fmt.Sprintf("Failed to serialize connections: %v", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return false, fmt.Sprintf("Failed to write connections file: %v", err)
	}

	return true, "Connection saved successfully"
}

// GetSavedConnections reads and returns all saved connection profiles from connections.json.
func (a *App) GetSavedConnections() ([]ConnectionConfig, error) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return []ConnectionConfig{}, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var connections []ConnectionConfig
	if err := json.Unmarshal(data, &connections); err != nil {
		return []ConnectionConfig{}, nil
	}

	if connections == nil {
		connections = []ConnectionConfig{}
	}
	return connections, nil
}

// GetDatabases connects to PostgreSQL and returns non-template databases.
func (a *App) GetDatabases(config ConnectionConfig) ([]string, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURL(config)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
	start := time.Now()
	rows, err := conn.Query(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(query, durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query databases: %w", err)
	}
	defer rows.Close()

	a.logQuery(query, durationMs, "SUCCESS", "")

	var databases []string
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil {
			return nil, fmt.Errorf("failed to scan database name: %w", err)
		}
		databases = append(databases, dbName)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("database query iteration error: %w", err)
	}

	if databases == nil {
		databases = []string{}
	}
	return databases, nil
}

// DeleteConnection removes a saved connection profile by ID.
func (a *App) DeleteConnection(id string) (bool, error) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return false, err
	}

	connections, err := a.GetSavedConnections()
	if err != nil {
		return false, err
	}

	filtered := make([]ConnectionConfig, 0, len(connections))
	for _, c := range connections {
		if c.ID != id {
			filtered = append(filtered, c)
		}
	}

	data, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return false, err
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return false, err
	}

	return true, nil
}

// GetTables returns all table names in the 'public' schema for the selected database.
func (a *App) GetTables(config ConnectionConfig, dbName string) ([]string, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
	start := time.Now()
	rows, err := conn.Query(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(query, durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	a.logQuery(query, durationMs, "SUCCESS", "")

	var tables []string
	for rows.Next() {
		var tbl string
		if err := rows.Scan(&tbl); err != nil {
			return nil, fmt.Errorf("failed to scan table name: %w", err)
		}
		tables = append(tables, tbl)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("tables query error: %w", err)
	}

	if tables == nil {
		tables = []string{}
	}
	return tables, nil
}

// GetTableSchema returns the column metadata for a given table.
func (a *App) GetTableSchema(config ConnectionConfig, dbName string, tableName string) ([]TableColumn, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := `SELECT 
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
    COALESCE(t.typtype, '') as udt_typtype
FROM information_schema.columns c
LEFT JOIN pg_type t ON t.typname = c.udt_name
LEFT JOIN (
    SELECT ku.table_schema, ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
) pk ON c.table_schema = pk.table_schema 
    AND c.table_name = pk.table_name 
    AND c.column_name = pk.column_name
WHERE c.table_schema = 'public' AND c.table_name = $1
ORDER BY c.ordinal_position;`

	logQueryStr := fmt.Sprintf(`SELECT columns, types, pk FROM information_schema.columns WHERE table_name = '%s';`, tableName)
	start := time.Now()
	rows, err := conn.Query(ctx, query, tableName)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(logQueryStr, durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query table schema: %w", err)
	}
	defer rows.Close()

	a.logQuery(logQueryStr, durationMs, "SUCCESS", "")

	type colRaw struct {
		colName, dataType, udtName, isNullableStr, udtType string
		colDefault                                         *string
		isPk                                               bool
	}
	var rawCols []colRaw

	for rows.Next() {
		var r colRaw
		if err := rows.Scan(&r.colName, &r.dataType, &r.udtName, &r.isNullableStr, &r.colDefault, &r.isPk, &r.udtType); err != nil {
			return nil, fmt.Errorf("failed to scan column schema: %w", err)
		}
		rawCols = append(rawCols, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("schema query iteration error: %w", err)
	}

	var columns []TableColumn
	for _, r := range rawCols {
		displayType := r.dataType
		if r.dataType == "USER-DEFINED" || r.dataType == "ARRAY" {
			displayType = r.udtName
		}

		var enumVals []string
		if r.udtType == "e" {
			enumRows, enumErr := conn.Query(ctx, `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1 ORDER BY e.enumsortorder;`, r.udtName)
			if enumErr == nil {
				for enumRows.Next() {
					var el string
					if err := enumRows.Scan(&el); err == nil {
						enumVals = append(enumVals, el)
					}
				}
				enumRows.Close()
			}
		}

		columns = append(columns, TableColumn{
			Name:         r.colName,
			Type:         displayType,
			IsNullable:   r.isNullableStr == "YES",
			IsPrimaryKey: r.isPk,
			DefaultValue: r.colDefault,
			EnumValues:   enumVals,
		})
	}

	if columns == nil {
		columns = []TableColumn{}
	}
	return columns, nil
}

// isPrintableASCII returns true if all bytes are printable ASCII characters.
func isPrintableASCII(b []byte) bool {
	for _, c := range b {
		if c < 32 || c > 126 {
			return false
		}
	}
	return true
}

// formatPostgresValue converts PostgreSQL types (UUIDs, timestamps, raw bytes, etc.) into clean JSON values.
func formatPostgresValue(val any, dataTypeOID uint32) any {
	if val == nil {
		return nil
	}

	// 1. Explicit UUID OID check (PostgreSQL OID 2950 is UUID)
	if dataTypeOID == 2950 {
		switch v := val.(type) {
		case [16]byte:
			if u, err := uuid.FromBytes(v[:]); err == nil {
				return u.String()
			}
			return fmt.Sprintf("%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
				v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12], v[13], v[14], v[15])
		case []byte:
			if len(v) == 16 {
				if u, err := uuid.FromBytes(v); err == nil {
					return u.String()
				}
				return fmt.Sprintf("%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
					v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12], v[13], v[14], v[15])
			}
			return string(v)
		case string:
			return v
		}
	}

	// 2. Generic type checks
	switch v := val.(type) {
	case [16]byte:
		if u, err := uuid.FromBytes(v[:]); err == nil {
			return u.String()
		}
		return fmt.Sprintf("%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
			v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12], v[13], v[14], v[15])
	case []byte:
		if len(v) == 16 && !isPrintableASCII(v) {
			if u, err := uuid.FromBytes(v); err == nil {
				return u.String()
			}
		}
		return string(v)
	case time.Time:
		return v.Format(time.RFC3339)
	default:
		return v
	}
}

// cleanRowID normalizes row identifiers (converting legacy byte arrays to canonical UUID strings).
func cleanRowID(rowID any) any {
	if rowID == nil {
		return nil
	}
	switch v := rowID.(type) {
	case string:
		// Check if it's a JSON array representation like [220, 225, ...]
		var byteArr []byte
		if json.Unmarshal([]byte(v), &byteArr) == nil && len(byteArr) == 16 {
			if parsedUUID, err := uuid.FromBytes(byteArr); err == nil {
				return parsedUUID.String()
			}
		}
		return v
	case []any:
		if len(v) == 16 {
			bytes := make([]byte, 16)
			allBytes := true
			for i, elem := range v {
				if num, ok := elem.(float64); ok && num >= 0 && num <= 255 {
					bytes[i] = byte(num)
				} else {
					allBytes = false
					break
				}
			}
			if allBytes {
				if parsedUUID, err := uuid.FromBytes(bytes); err == nil {
					return parsedUUID.String()
				}
			}
		}
		return v
	default:
		return v
	}
}

// GetTableData retrieves paginated table rows with optional filtering and sorting, and logs the query execution.
func (a *App) GetTableData(config ConnectionConfig, dbName string, tableName string, options DataQueryOptions) (TableDataResult, error) {
	var result TableDataResult
	result.Columns = []string{}
	result.Rows = []map[string]any{}

	limit := options.PageSize
	if limit <= 0 {
		limit = 50
	}
	page := options.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return result, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return result, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return result, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	// Build WHERE filter clause and arguments safely
	whereClause := ""
	var filterArgs []any

	if options.FilterColumn != "" && options.FilterOp != "" {
		colIdent := fmt.Sprintf("%q", options.FilterColumn)
		op := strings.ToLower(strings.TrimSpace(options.FilterOp))

		switch op {
		case "equals", "=":
			whereClause = fmt.Sprintf(" WHERE %s::text = $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue)
		case "not_equals", "!=", "<>":
			whereClause = fmt.Sprintf(" WHERE %s::text != $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue)
		case "contains", "like":
			whereClause = fmt.Sprintf(" WHERE %s::text ILIKE $1", colIdent)
			filterArgs = append(filterArgs, "%"+options.FilterValue+"%")
		case "starts_with":
			whereClause = fmt.Sprintf(" WHERE %s::text ILIKE $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue+"%")
		case "ends_with":
			whereClause = fmt.Sprintf(" WHERE %s::text ILIKE $1", colIdent)
			filterArgs = append(filterArgs, "%"+options.FilterValue)
		case "gt", ">":
			whereClause = fmt.Sprintf(" WHERE %s > $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue)
		case "lt", "<":
			whereClause = fmt.Sprintf(" WHERE %s < $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue)
		case "gte", ">=":
			whereClause = fmt.Sprintf(" WHERE %s >= $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue)
		case "lte", "<=":
			whereClause = fmt.Sprintf(" WHERE %s <= $1", colIdent)
			filterArgs = append(filterArgs, options.FilterValue)
		case "is_null":
			whereClause = fmt.Sprintf(" WHERE %s IS NULL", colIdent)
		case "is_not_null":
			whereClause = fmt.Sprintf(" WHERE %s IS NOT NULL", colIdent)
		}
	}

	// 1. Get total row count (filtered)
	countQuery := fmt.Sprintf(`SELECT count(*) FROM %q%s;`, tableName, whereClause)
	startCount := time.Now()
	var totalRows int64
	if err := conn.QueryRow(ctx, countQuery, filterArgs...).Scan(&totalRows); err != nil {
		durationMs := float64(time.Since(startCount).Microseconds()) / 1000.0
		a.logQuery(countQuery, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("failed to count rows: %w", err)
	}
	result.TotalRows = totalRows

	// Build ORDER BY clause
	orderClause := ""
	if options.SortColumn != "" {
		sortDir := "ASC"
		if strings.ToUpper(strings.TrimSpace(options.SortOrder)) == "DESC" {
			sortDir = "DESC"
		}
		orderClause = fmt.Sprintf(" ORDER BY %q %s", options.SortColumn, sortDir)
	}

	// 2. Fetch paginated data rows
	dataQuery := fmt.Sprintf(`SELECT * FROM %q%s%s LIMIT %d OFFSET %d;`, tableName, whereClause, orderClause, limit, offset)
	start := time.Now()
	rows, err := conn.Query(ctx, dataQuery, filterArgs...)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	result.DurationMs = durationMs

	if err != nil {
		a.logQuery(dataQuery, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	a.logQuery(dataQuery, durationMs, "SUCCESS", "")

	fieldDescs := rows.FieldDescriptions()
	for _, fd := range fieldDescs {
		result.Columns = append(result.Columns, string(fd.Name))
	}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return result, fmt.Errorf("failed to read row values: %w", err)
		}

		rowMap := make(map[string]any)
		for i, val := range values {
			if i < len(result.Columns) {
				colName := result.Columns[i]
				var dataTypeOID uint32 = 0
				if i < len(fieldDescs) {
					dataTypeOID = fieldDescs[i].DataTypeOID
				}
				rowMap[colName] = formatPostgresValue(val, dataTypeOID)
			}
		}
		result.Rows = append(result.Rows, rowMap)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("row iteration error: %w", err)
	}

	return result, nil
}

// AddColumn executes an ALTER TABLE ADD COLUMN statement on the database.
func (a *App) AddColumn(config ConnectionConfig, dbName string, tableName string, colName string, colType string, isNullable bool) (bool, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	nullClause := ""
	if !isNullable {
		nullClause = " NOT NULL"
	}

	query := fmt.Sprintf(`ALTER TABLE %q ADD COLUMN %q %s%s;`, tableName, colName, colType, nullClause)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to add column: %w", err)
	}

	a.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// DropColumn executes an ALTER TABLE DROP COLUMN statement on the database.
func (a *App) DropColumn(config ConnectionConfig, dbName string, tableName string, colName string) (bool, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := fmt.Sprintf(`ALTER TABLE %q DROP COLUMN %q CASCADE;`, tableName, colName)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to drop column: %w", err)
	}

	a.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// RenameColumn executes an ALTER TABLE RENAME COLUMN statement on the database.
func (a *App) RenameColumn(config ConnectionConfig, dbName string, tableName string, oldName string, newName string) (bool, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := fmt.Sprintf(`ALTER TABLE %q RENAME COLUMN %q TO %q;`, tableName, oldName, newName)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to rename column: %w", err)
	}

	a.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// GetEnumValues queries pg_enum and pg_type to fetch all valid values for a PostgreSQL enum type.
func (a *App) GetEnumValues(config ConnectionConfig, dbName string, enumTypeName string) ([]string, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := `SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = $1
ORDER BY e.enumsortorder;`

	logQueryStr := fmt.Sprintf("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = '%s';", enumTypeName)
	start := time.Now()
	rows, err := conn.Query(ctx, query, enumTypeName)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(logQueryStr, durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query enum values: %w", err)
	}
	defer rows.Close()

	a.logQuery(logQueryStr, durationMs, "SUCCESS", "")

	var values []string
	for rows.Next() {
		var val string
		if err := rows.Scan(&val); err != nil {
			return nil, fmt.Errorf("failed to scan enum value: %w", err)
		}
		values = append(values, val)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("enum values error: %w", err)
	}

	if values == nil {
		values = []string{}
	}
	return values, nil
}

// UpdateTableRows executes batch cell updates within a single PostgreSQL transaction.
func (a *App) UpdateTableRows(config ConnectionConfig, dbName string, tableName string, primaryKeyCol string, updates []RowUpdate) (bool, error) {
	if len(updates) == 0 {
		return true, nil
	}
	if primaryKeyCol == "" {
		primaryKeyCol = "id"
	}

	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	// Begin atomic transaction
	tx, err := conn.Begin(ctx)
	if err != nil {
		a.logQuery("BEGIN TRANSACTION;", 0, "ERROR", err.Error())
		return false, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	a.logQuery("BEGIN TRANSACTION;", 0.1, "SUCCESS", "")

	for _, u := range updates {
		query := fmt.Sprintf(`UPDATE %q SET %q = $1 WHERE %q = $2;`, tableName, u.Column, primaryKeyCol)
		start := time.Now()

		rowIDToMatch := cleanRowID(u.RowID)

		var valToSet any = cleanRowID(u.NewValue)
		if strVal, isStr := valToSet.(string); isStr && (strVal == "NULL" || strVal == "[NULL]") {
			valToSet = nil
		}

		_, execErr := tx.Exec(ctx, query, valToSet, rowIDToMatch)
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0

		logQueryStr := fmt.Sprintf(`UPDATE "%s" SET "%s" = '%v' WHERE "%s" = '%v';`, tableName, u.Column, valToSet, primaryKeyCol, rowIDToMatch)
		if execErr != nil {
			a.logQuery(logQueryStr, durationMs, "ERROR", execErr.Error())
			return false, fmt.Errorf("failed to update row (%s=%v): %w", primaryKeyCol, rowIDToMatch, execErr)
		}

		a.logQuery(logQueryStr, durationMs, "SUCCESS", "")
	}

	commitStart := time.Now()
	if err := tx.Commit(ctx); err != nil {
		commitDuration := float64(time.Since(commitStart).Microseconds()) / 1000.0
		a.logQuery("COMMIT;", commitDuration, "ERROR", err.Error())
		return false, fmt.Errorf("failed to commit transaction: %w", err)
	}
	commitDuration := float64(time.Since(commitStart).Microseconds()) / 1000.0
	a.logQuery("COMMIT;", commitDuration, "SUCCESS", "")

	return true, nil
}

// formatStringArrayForLog formats a slice of strings nicely for the SQL console log.
func formatStringArrayForLog(arr []string) string {
	if len(arr) == 0 {
		return ""
	}
	maxItems := 5
	var formatted []string
	for i, s := range arr {
		if i >= maxItems {
			formatted = append(formatted, fmt.Sprintf("... (%d more)", len(arr)-maxItems))
			break
		}
		formatted = append(formatted, fmt.Sprintf("'%s'", s))
	}
	return strings.Join(formatted, ", ")
}

// DeleteTableRows deletes multiple rows matching primaryKeyCol using ANY($1) parameterized query.
func (a *App) DeleteTableRows(config ConnectionConfig, dbName string, tableName string, primaryKeyCol string, rowIds []string) (bool, error) {
	if len(rowIds) == 0 {
		return true, nil
	}
	if primaryKeyCol == "" {
		primaryKeyCol = "id"
	}

	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := fmt.Sprintf(`DELETE FROM %q WHERE %q::text = ANY($1);`, tableName, primaryKeyCol)
	start := time.Now()
	_, err = conn.Exec(ctx, query, rowIds)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	logQueryStr := fmt.Sprintf(`DELETE FROM "%s" WHERE "%s"::text = ANY(ARRAY[%s]);`, tableName, primaryKeyCol, formatStringArrayForLog(rowIds))
	if err != nil {
		a.logQuery(logQueryStr, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to delete rows: %w", err)
	}

	a.logQuery(logQueryStr, durationMs, "SUCCESS", "")
	return true, nil
}

// TruncateTable completely empties a table and cascades to foreign keys.
func (a *App) TruncateTable(config ConnectionConfig, dbName string, tableName string) (bool, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return false, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	query := fmt.Sprintf(`TRUNCATE TABLE %q CASCADE;`, tableName)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to truncate table: %w", err)
	}

	a.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// splitSQLStatements parses raw SQL text and splits it into individual statements by semicolon,
// safely ignoring semicolons within single quotes, double quotes, line/block comments, and dollar-quoted strings.
func splitSQLStatements(rawSQL string) []string {
	var statements []string
	var current strings.Builder

	inSingleQuote := false
	inDoubleQuote := false
	inLineComment := false
	inBlockComment := false
	dollarTag := ""
	inDollarQuote := false

	chars := []rune(rawSQL)
	n := len(chars)

	for i := 0; i < n; i++ {
		c := chars[i]

		// 1. Handle Line Comment (-- ...)
		if inLineComment {
			current.WriteRune(c)
			if c == '\n' {
				inLineComment = false
			}
			continue
		}

		// 2. Handle Block Comment (/* ... */)
		if inBlockComment {
			current.WriteRune(c)
			if c == '*' && i+1 < n && chars[i+1] == '/' {
				current.WriteRune('/')
				i++
				inBlockComment = false
			}
			continue
		}

		// 3. Handle Single Quote ('...')
		if inSingleQuote {
			current.WriteRune(c)
			if c == '\'' {
				// Check for escaped single quote ''
				if i+1 < n && chars[i+1] == '\'' {
					current.WriteRune('\'')
					i++
				} else {
					inSingleQuote = false
				}
			}
			continue
		}

		// 4. Handle Double Quote ("...")
		if inDoubleQuote {
			current.WriteRune(c)
			if c == '"' {
				if i+1 < n && chars[i+1] == '"' {
					current.WriteRune('"')
					i++
				} else {
					inDoubleQuote = false
				}
			}
			continue
		}

		// 5. Handle Dollar Quote ($tag$...$tag$ or $$...$$)
		if inDollarQuote {
			current.WriteRune(c)
			if c == '$' {
				tagLen := len(dollarTag)
				if i+tagLen <= n {
					sub := string(chars[i : i+tagLen])
					if sub == dollarTag {
						for k := 1; k < tagLen; k++ {
							current.WriteRune(chars[i+k])
						}
						i += tagLen - 1
						inDollarQuote = false
						dollarTag = ""
					}
				}
			}
			continue
		}

		// Check start of Line Comment (-- ...)
		if c == '-' && i+1 < n && chars[i+1] == '-' {
			inLineComment = true
			current.WriteRune(c)
			current.WriteRune('-')
			i++
			continue
		}

		// Check start of Block Comment (/* ...)
		if c == '/' && i+1 < n && chars[i+1] == '*' {
			inBlockComment = true
			current.WriteRune(c)
			current.WriteRune('*')
			i++
			continue
		}

		// Check start of Single Quote
		if c == '\'' {
			inSingleQuote = true
			current.WriteRune(c)
			continue
		}

		// Check start of Double Quote
		if c == '"' {
			inDoubleQuote = true
			current.WriteRune(c)
			continue
		}

		// Check start of Dollar Quote ($tag$ or $$)
		if c == '$' {
			endDollar := -1
			for j := i + 1; j < n && j < i+32; j++ {
				if chars[j] == '$' {
					endDollar = j
					break
				}
				if !(chars[j] >= 'a' && chars[j] <= 'z') &&
					!(chars[j] >= 'A' && chars[j] <= 'Z') &&
					!(chars[j] >= '0' && chars[j] <= '9') &&
					chars[j] != '_' {
					break
				}
			}
			if endDollar != -1 {
				dollarTag = string(chars[i : endDollar+1])
				inDollarQuote = true
				for k := i; k <= endDollar; k++ {
					current.WriteRune(chars[k])
				}
				i = endDollar
				continue
			}
		}

		// Check for statement delimiter ';'
		if c == ';' {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			continue
		}

		current.WriteRune(c)
	}

	lastStmt := strings.TrimSpace(current.String())
	if lastStmt != "" {
		statements = append(statements, lastStmt)
	}

	return statements
}

// ExecuteRawQuery executes one or more raw SQL statements against the target database.
func (a *App) ExecuteRawQuery(config ConnectionConfig, dbName string, rawSql string) ([]QueryResult, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	statements := splitSQLStatements(rawSql)
	if len(statements) == 0 {
		return []QueryResult{}, nil
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	defer conn.Close(ctx)

	var results []QueryResult

	for idx, stmt := range statements {
		result := QueryResult{
			QueryIndex: idx + 1,
			Statement:  stmt,
			Columns:    []string{},
			Rows:       []map[string]any{},
		}

		start := time.Now()
		rows, queryErr := conn.Query(ctx, stmt)
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		result.DurationMs = durationMs

		if queryErr != nil {
			result.Error = queryErr.Error()
			result.IsSelect = false
			a.logQuery(stmt, durationMs, "ERROR", queryErr.Error())
			results = append(results, result)
			continue
		}

		fieldDescs := rows.FieldDescriptions()
		if len(fieldDescs) == 0 {
			result.IsSelect = false
			tag := rows.CommandTag()
			result.RowsAffected = tag.RowsAffected()
			rows.Close()

			a.logQuery(stmt, durationMs, "SUCCESS", "")
			results = append(results, result)
			continue
		}

		result.IsSelect = true
		for _, fd := range fieldDescs {
			result.Columns = append(result.Columns, string(fd.Name))
		}

		for rows.Next() {
			values, err := rows.Values()
			if err != nil {
				result.Error = err.Error()
				break
			}

			rowMap := make(map[string]any)
			for i, val := range values {
				if i < len(result.Columns) {
					colName := result.Columns[i]
					var dataTypeOID uint32 = 0
					if i < len(fieldDescs) {
						dataTypeOID = fieldDescs[i].DataTypeOID
					}
					rowMap[colName] = formatPostgresValue(val, dataTypeOID)
				}
			}
			result.Rows = append(result.Rows, rowMap)
		}

		if rows.Err() != nil && result.Error == "" {
			result.Error = rows.Err().Error()
		}

		tag := rows.CommandTag()
		result.RowsAffected = tag.RowsAffected()
		if result.RowsAffected == 0 {
			result.RowsAffected = int64(len(result.Rows))
		}
		rows.Close()

		if result.Error != "" {
			a.logQuery(stmt, durationMs, "ERROR", result.Error)
		} else {
			a.logQuery(stmt, durationMs, "SUCCESS", "")
		}

		results = append(results, result)
	}

	return results, nil
}

// GetDatabaseSchemaDetails extracts tables, columns, primary keys, and foreign key relationships for ERD visualization.
func (a *App) GetDatabaseSchemaDetails(config ConnectionConfig, dbName string) (DatabaseSchema, error) {
	var result DatabaseSchema
	result.Tables = make([]TableSchema, 0)
	result.Relationships = make([]ForeignKeyRelationship, 0)

	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return result, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return result, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return result, fmt.Errorf("failed to connect to database: %w", err)
	}
	defer conn.Close(ctx)

	start := time.Now()

	// 1. Fetch Foreign Key Relationships
	fkQuery := `
		SELECT
			tc.constraint_name,
			tc.table_name AS source_table,
			kcu.column_name AS source_column,
			ccu.table_name AS target_table,
			ccu.column_name AS target_column
		FROM
			information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
		ORDER BY tc.table_name, kcu.column_name;
	`
	fkRows, err := conn.Query(ctx, fkQuery)
	if err == nil {
		for fkRows.Next() {
			var fk ForeignKeyRelationship
			if err := fkRows.Scan(&fk.ConstraintName, &fk.SourceTable, &fk.SourceColumn, &fk.TargetTable, &fk.TargetColumn); err == nil {
				result.Relationships = append(result.Relationships, fk)
			}
		}
		fkRows.Close()
	}

	// Create FK lookup map: map[table]map[column]bool
	fkMap := make(map[string]map[string]bool)
	for _, fk := range result.Relationships {
		if fkMap[fk.SourceTable] == nil {
			fkMap[fk.SourceTable] = make(map[string]bool)
		}
		fkMap[fk.SourceTable][fk.SourceColumn] = true
	}

	// 2. Fetch all public tables and row counts
	tblQuery := `
		SELECT
			t.table_name,
			COALESCE(s.n_live_tup, 0) AS est_row_count
		FROM
			information_schema.tables t
			LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
		WHERE
			t.table_schema = 'public'
			AND t.table_type = 'BASE TABLE'
		ORDER BY t.table_name;
	`
	tblRows, err := conn.Query(ctx, tblQuery)
	if err != nil {
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		a.logQuery(tblQuery, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("failed to fetch tables: %w", err)
	}
	defer tblRows.Close()

	type tableMeta struct {
		name     string
		rowCount int64
	}
	var tablesList []tableMeta
	for tblRows.Next() {
		var tm tableMeta
		if err := tblRows.Scan(&tm.name, &tm.rowCount); err == nil {
			tablesList = append(tablesList, tm)
		}
	}
	tblRows.Close()

	// 3. For each table, query its column metadata
	for _, tm := range tablesList {
		colQuery := `
			SELECT
				c.column_name,
				c.data_type,
				c.udt_name,
				c.is_nullable,
				c.column_default,
				COALESCE(pk.is_pk, false) AS is_primary_key
			FROM
				information_schema.columns c
				LEFT JOIN (
					SELECT
						kcu.column_name,
						true AS is_pk
					FROM
						information_schema.table_constraints tc
						JOIN information_schema.key_column_usage kcu
							ON tc.constraint_name = kcu.constraint_name
							AND tc.table_schema = kcu.table_schema
					WHERE
						tc.constraint_type = 'PRIMARY KEY'
						AND tc.table_schema = 'public'
						AND tc.table_name = $1
				) pk ON pk.column_name = c.column_name
			WHERE
				c.table_schema = 'public'
				AND c.table_name = $1
			ORDER BY c.ordinal_position;
		`
		colRows, err := conn.Query(ctx, colQuery, tm.name)
		if err != nil {
			continue
		}

		tableSchema := TableSchema{
			Name:     tm.name,
			RowCount: tm.rowCount,
			Columns:  make([]ColumnMeta, 0),
		}

		for colRows.Next() {
			var colName, dataType, udtName, isNullableStr string
			var colDefault *string
			var isPk bool

			if err := colRows.Scan(&colName, &dataType, &udtName, &isNullableStr, &colDefault, &isPk); err == nil {
				displayType := dataType
				if dataType == "USER-DEFINED" || dataType == "ARRAY" {
					displayType = udtName
				}
				defaultValStr := ""
				if colDefault != nil {
					defaultValStr = *colDefault
				}

				isFk := false
				if fkMap[tm.name] != nil && fkMap[tm.name][colName] {
					isFk = true
				}

				tableSchema.Columns = append(tableSchema.Columns, ColumnMeta{
					Name:         colName,
					DataType:     displayType,
					IsNullable:   isNullableStr == "YES",
					IsPrimaryKey: isPk,
					IsForeignKey: isFk,
					DefaultValue: defaultValStr,
				})
			}
		}
		colRows.Close()

		result.Tables = append(result.Tables, tableSchema)
	}

	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	a.logQuery("-- Extracted ERD Schema & Relationships", durationMs, "SUCCESS", "")

	return result, nil
}

// formatSQLValue formats a Go value into a safe SQL literal for dump generation.
func formatSQLValue(val any) string {
	if val == nil {
		return "NULL"
	}
	switch v := val.(type) {
	case bool:
		if v {
			return "TRUE"
		}
		return "FALSE"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v)
	case float32, float64:
		return fmt.Sprintf("%v", v)
	case time.Time:
		return fmt.Sprintf("'%s'", v.Format("2006-01-02 15:04:05.999999"))
	case []byte:
		return fmt.Sprintf("'%s'", strings.ReplaceAll(string(v), "'", "''"))
	case map[string]any, []any:
		bytes, err := json.Marshal(v)
		if err == nil {
			return fmt.Sprintf("'%s'", strings.ReplaceAll(string(bytes), "'", "''"))
		}
		return fmt.Sprintf("'%s'", strings.ReplaceAll(fmt.Sprintf("%v", v), "'", "''"))
	default:
		s := fmt.Sprintf("%v", v)
		return fmt.Sprintf("'%s'", strings.ReplaceAll(s, "'", "''"))
	}
}

// generateTableDDL generates the DROP TABLE and CREATE TABLE DDL statement for a table.
func generateTableDDL(ctx context.Context, conn *pgx.Conn, tableName string) (string, []string, error) {
	colQuery := `
		SELECT
			c.column_name,
			c.data_type,
			c.udt_name,
			c.is_nullable,
			c.column_default,
			COALESCE(pk.is_pk, false) AS is_primary_key
		FROM
			information_schema.columns c
			LEFT JOIN (
				SELECT
					kcu.column_name,
					true AS is_pk
				FROM
					information_schema.table_constraints tc
					JOIN information_schema.key_column_usage kcu
						ON tc.constraint_name = kcu.constraint_name
						AND tc.table_schema = kcu.table_schema
				WHERE
					tc.constraint_type = 'PRIMARY KEY'
					AND tc.table_schema = 'public'
					AND tc.table_name = $1
			) pk ON pk.column_name = c.column_name
		WHERE
			c.table_schema = 'public'
			AND c.table_name = $1
		ORDER BY c.ordinal_position;
	`
	rows, err := conn.Query(ctx, colQuery, tableName)
	if err != nil {
		return "", nil, fmt.Errorf("failed to query columns for table %s: %w", tableName, err)
	}
	defer rows.Close()

	var columnNames []string
	var colDefs []string
	var pkColumns []string

	for rows.Next() {
		var colName, dataType, udtName, isNullableStr string
		var colDefault *string
		var isPk bool

		if err := rows.Scan(&colName, &dataType, &udtName, &isNullableStr, &colDefault, &isPk); err != nil {
			continue
		}

		columnNames = append(columnNames, colName)
		if isPk {
			pkColumns = append(pkColumns, fmt.Sprintf("%q", colName))
		}

		typeStr := dataType
		if dataType == "USER-DEFINED" || dataType == "ARRAY" {
			typeStr = udtName
		} else if dataType == "character varying" {
			typeStr = "VARCHAR(255)"
		}

		nullStr := ""
		if isNullableStr == "NO" {
			nullStr = " NOT NULL"
		}

		defaultStr := ""
		if colDefault != nil && *colDefault != "" {
			defaultStr = fmt.Sprintf(" DEFAULT %s", *colDefault)
		}

		colDefs = append(colDefs, fmt.Sprintf("    %q %s%s%s", colName, typeStr, nullStr, defaultStr))
	}
	rows.Close()

	if len(columnNames) == 0 {
		return "", nil, fmt.Errorf("table %s has no accessible columns", tableName)
	}

	if len(pkColumns) > 0 {
		colDefs = append(colDefs, fmt.Sprintf("    PRIMARY KEY (%s)", strings.Join(pkColumns, ", ")))
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("--\n-- Table structure for table %q\n--\n\n", tableName))
	sb.WriteString(fmt.Sprintf("DROP TABLE IF EXISTS %q CASCADE;\n", tableName))
	sb.WriteString(fmt.Sprintf("CREATE TABLE %q (\n", tableName))
	sb.WriteString(strings.Join(colDefs, ",\n"))
	sb.WriteString("\n);\n\n")

	return sb.String(), columnNames, nil
}

// generateTableData generates batch INSERT INTO statements for table rows.
func generateTableData(ctx context.Context, conn *pgx.Conn, tableName string, columns []string) (string, error) {
	quotedCols := make([]string, len(columns))
	for i, c := range columns {
		quotedCols[i] = fmt.Sprintf("%q", c)
	}
	colsList := strings.Join(quotedCols, ", ")

	dataQuery := fmt.Sprintf("SELECT %s FROM %q", colsList, tableName)
	rows, err := conn.Query(ctx, dataQuery)
	if err != nil {
		return "", fmt.Errorf("failed to query rows for table %s: %w", tableName, err)
	}
	defer rows.Close()

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("--\n-- Dumping data for table %q\n--\n\n", tableName))

	chunkSize := 100
	var batchRows []string
	totalExported := 0

	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			continue
		}

		rowFormatted := make([]string, len(vals))
		for i, v := range vals {
			rowFormatted[i] = formatSQLValue(v)
		}

		batchRows = append(batchRows, fmt.Sprintf("  (%s)", strings.Join(rowFormatted, ", ")))
		totalExported++

		if len(batchRows) >= chunkSize {
			sb.WriteString(fmt.Sprintf("INSERT INTO %q (%s) VALUES\n", tableName, colsList))
			sb.WriteString(strings.Join(batchRows, ",\n"))
			sb.WriteString(";\n\n")
			batchRows = nil
		}
	}
	rows.Close()

	if len(batchRows) > 0 {
		sb.WriteString(fmt.Sprintf("INSERT INTO %q (%s) VALUES\n", tableName, colsList))
		sb.WriteString(strings.Join(batchRows, ",\n"))
		sb.WriteString(";\n\n")
	}

	if totalExported == 0 {
		sb.WriteString(fmt.Sprintf("-- (Table %q is empty, 0 rows dumped)\n\n", tableName))
	}

	return sb.String(), nil
}

// getPostgresConn establishes a connection to PostgreSQL for a given configuration and database.
func (a *App) getPostgresConn(ctx context.Context, config ConnectionConfig, dbName string) (*pgx.Conn, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 10 * time.Second

	return pgx.ConnectConfig(ctx, connConfig)
}

// ExportTableSQL generates a complete SQL dump for a specific table.
func (a *App) ExportTableSQL(config ConnectionConfig, dbName string, tableName string, exportData bool) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	conn, err := a.getPostgresConn(ctx, config, dbName)
	if err != nil {
		return "", fmt.Errorf("failed to connect to database %s: %w", dbName, err)
	}
	defer conn.Close(ctx)

	start := time.Now()

	var sb strings.Builder
	sb.WriteString("-- -------------------------------------------------------------\n")
	sb.WriteString("-- DevCockpit SQL Dump\n")
	sb.WriteString(fmt.Sprintf("-- Database: %s\n", dbName))
	sb.WriteString(fmt.Sprintf("-- Table: %s\n", tableName))
	sb.WriteString(fmt.Sprintf("-- Exported At: %s\n", time.Now().Format("2006-01-02 15:04:05 MST")))
	sb.WriteString("-- -------------------------------------------------------------\n\n")
	sb.WriteString("SET statement_timeout = 0;\n")
	sb.WriteString("SET lock_timeout = 0;\n")
	sb.WriteString("SET client_encoding = 'UTF8';\n\n")

	ddl, cols, err := generateTableDDL(ctx, conn, tableName)
	if err != nil {
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		a.logQuery(fmt.Sprintf("-- Export table %s SQL", tableName), durationMs, "ERROR", err.Error())
		return "", err
	}
	sb.WriteString(ddl)

	if exportData {
		dataSQL, err := generateTableData(ctx, conn, tableName, cols)
		if err != nil {
			durationMs := float64(time.Since(start).Microseconds()) / 1000.0
			a.logQuery(fmt.Sprintf("-- Export table %s data", tableName), durationMs, "ERROR", err.Error())
			return "", err
		}
		sb.WriteString(dataSQL)
	}

	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	a.logQuery(fmt.Sprintf("-- Exported SQL dump for table %s (Data=%v)", tableName, exportData), durationMs, "SUCCESS", "")

	return sb.String(), nil
}

// ExportDatabaseSQL generates a complete SQL dump for an entire database.
func (a *App) ExportDatabaseSQL(config ConnectionConfig, dbName string, exportData bool) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	conn, err := a.getPostgresConn(ctx, config, dbName)
	if err != nil {
		return "", fmt.Errorf("failed to connect to database %s: %w", dbName, err)
	}
	defer conn.Close(ctx)

	start := time.Now()

	// Get all tables
	tblQuery := `
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
		ORDER BY table_name;
	`
	rows, err := conn.Query(ctx, tblQuery)
	if err != nil {
		return "", fmt.Errorf("failed to query database tables: %w", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tbl string
		if err := rows.Scan(&tbl); err == nil {
			tables = append(tables, tbl)
		}
	}
	rows.Close()

	var sb strings.Builder
	sb.WriteString("-- -------------------------------------------------------------\n")
	sb.WriteString("-- DevCockpit Full Database Dump\n")
	sb.WriteString(fmt.Sprintf("-- Database: %s\n", dbName))
	sb.WriteString(fmt.Sprintf("-- Total Tables: %d\n", len(tables)))
	sb.WriteString(fmt.Sprintf("-- Exported At: %s\n", time.Now().Format("2006-01-02 15:04:05 MST")))
	sb.WriteString("-- -------------------------------------------------------------\n\n")
	sb.WriteString("SET statement_timeout = 0;\n")
	sb.WriteString("SET lock_timeout = 0;\n")
	sb.WriteString("SET client_encoding = 'UTF8';\n\n")

	for _, tbl := range tables {
		ddl, cols, err := generateTableDDL(ctx, conn, tbl)
		if err != nil {
			continue
		}
		sb.WriteString(ddl)

		if exportData {
			dataSQL, err := generateTableData(ctx, conn, tbl, cols)
			if err == nil {
				sb.WriteString(dataSQL)
			}
		}
	}

	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	a.logQuery(fmt.Sprintf("-- Exported database dump for %s (%d tables, Data=%v)", dbName, len(tables), exportData), durationMs, "SUCCESS", "")

	return sb.String(), nil
}

// ImportSQLScript executes a multi-statement SQL script against the selected database.
func (a *App) ImportSQLScript(config ConnectionConfig, dbName string, sqlContent string) (ImportResult, error) {
	start := time.Now()
	res := ImportResult{
		StatementsExecuted: 0,
		Success:            false,
	}

	trimmed := strings.TrimSpace(sqlContent)
	if trimmed == "" {
		res.ErrorMessage = "SQL script is empty"
		return res, fmt.Errorf("SQL script is empty")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	conn, err := a.getPostgresConn(ctx, config, dbName)
	if err != nil {
		res.DurationMs = float64(time.Since(start).Microseconds()) / 1000.0
		res.ErrorMessage = fmt.Sprintf("Connection failed: %v", err)
		return res, err
	}
	defer conn.Close(ctx)

	statements := splitSQLStatements(trimmed)
	if len(statements) == 0 {
		statements = []string{trimmed}
	}

	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		_, execErr := conn.Exec(ctx, stmt)
		if execErr != nil {
			res.DurationMs = float64(time.Since(start).Microseconds()) / 1000.0
			res.ErrorMessage = fmt.Sprintf("Error executing statement #%d: %v", res.StatementsExecuted+1, execErr)
			a.logQuery(stmt, res.DurationMs, "ERROR", execErr.Error())
			return res, fmt.Errorf("statement execution failed: %w", execErr)
		}
		res.StatementsExecuted++
	}

	res.Success = true
	res.DurationMs = float64(time.Since(start).Microseconds()) / 1000.0

	a.logQuery(fmt.Sprintf("-- Imported SQL Script (%d statements executed)", res.StatementsExecuted), res.DurationMs, "SUCCESS", "")

	return res, nil
}

// SaveSQLDumpDialog opens a native save file dialog and saves the SQL content to disk.
func (a *App) SaveSQLDumpDialog(defaultFilename string, content string) (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application context is not initialized")
	}

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
		Title:           "Save SQL Dump",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "SQL Files (*.sql)",
				Pattern:     "*.sql",
			},
			{
				DisplayName: "All Files (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		// User cancelled dialog
		return "", nil
	}

	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return filePath, nil
}

// ExplainQuery executes EXPLAIN or EXPLAIN ANALYZE on a query and returns the structured plan and text output.
func (a *App) ExplainQuery(config ConnectionConfig, dbName string, query string, analyze bool) (ExplainPlanResult, error) {
	var result ExplainPlanResult

	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return result, fmt.Errorf("query is empty")
	}

	// Remove trailing semicolons from single query statement
	trimmed = strings.TrimRight(trimmed, "; \t\r\n")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	conn, err := a.getPostgresConn(ctx, config, dbName)
	if err != nil {
		return result, fmt.Errorf("failed to connect to database %s: %w", dbName, err)
	}
	defer conn.Close(ctx)

	start := time.Now()

	// 1. Fetch JSON Plan
	var explainJSONStmt string
	if analyze {
		explainJSONStmt = fmt.Sprintf("EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) %s", trimmed)
	} else {
		explainJSONStmt = fmt.Sprintf("EXPLAIN (FORMAT JSON) %s", trimmed)
	}

	var rawPlanAny any
	err = conn.QueryRow(ctx, explainJSONStmt).Scan(&rawPlanAny)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		a.logQuery(explainJSONStmt, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("failed to execute explain query: %w", err)
	}

	// Convert raw plan to JSON string
	var planJSONStr string
	switch p := rawPlanAny.(type) {
	case string:
		planJSONStr = p
	case []byte:
		planJSONStr = string(p)
	default:
		b, err := json.Marshal(p)
		if err == nil {
			planJSONStr = string(b)
		} else {
			planJSONStr = fmt.Sprintf("%v", p)
		}
	}
	result.PlanJSON = planJSONStr

	// 2. Parse top-level metrics from JSON Plan
	var planData []map[string]any
	if err := json.Unmarshal([]byte(planJSONStr), &planData); err == nil && len(planData) > 0 {
		top := planData[0]
		if pt, ok := top["Planning Time"].(float64); ok {
			result.PlanningTime = pt
		}
		if et, ok := top["Execution Time"].(float64); ok {
			result.ExecutionTime = et
		}
		if planObj, ok := top["Plan"].(map[string]any); ok {
			if tc, ok := planObj["Total Cost"].(float64); ok {
				result.TotalCost = tc
			}
		}
	}

	// 3. Fetch TEXT Plan for RawOutput
	var explainTextStmt string
	if analyze {
		explainTextStmt = fmt.Sprintf("EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) %s", trimmed)
	} else {
		explainTextStmt = fmt.Sprintf("EXPLAIN %s", trimmed)
	}

	textRows, textErr := conn.Query(ctx, explainTextStmt)
	if textErr == nil {
		var lines []string
		for textRows.Next() {
			var line string
			if err := textRows.Scan(&line); err == nil {
				lines = append(lines, line)
			}
		}
		textRows.Close()
		result.RawOutput = strings.Join(lines, "\n")
	} else {
		result.RawOutput = planJSONStr
	}

	a.logQuery(explainJSONStmt, durationMs, "SUCCESS", "")

	return result, nil
}
