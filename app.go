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

// GetTableData retrieves paginated table rows and logs the query execution.
func (a *App) GetTableData(config ConnectionConfig, dbName string, tableName string, limit int, offset int) (TableDataResult, error) {
	var result TableDataResult
	result.Columns = []string{}
	result.Rows = []map[string]any{}

	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

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

	// 1. Get total row count
	countQuery := fmt.Sprintf(`SELECT count(*) FROM %q;`, tableName)
	startCount := time.Now()
	var totalRows int64
	if err := conn.QueryRow(ctx, countQuery).Scan(&totalRows); err != nil {
		durationMs := float64(time.Since(startCount).Microseconds()) / 1000.0
		a.logQuery(countQuery, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("failed to count rows: %w", err)
	}
	result.TotalRows = totalRows

	// 2. Fetch paginated data rows
	dataQuery := fmt.Sprintf(`SELECT * FROM %q LIMIT %d OFFSET %d;`, tableName, limit, offset)
	start := time.Now()
	rows, err := conn.Query(ctx, dataQuery)
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
