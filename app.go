package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
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
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	IsNullable   bool    `json:"isNullable"`
	IsPrimaryKey bool    `json:"isPrimaryKey"`
	DefaultValue *string `json:"defaultValue"`
}

// TableDataResult holds paginated rows, columns, and timing information.
type TableDataResult struct {
	Columns    []string         `json:"columns"`
	Rows       []map[string]any `json:"rows"`
	TotalRows  int64            `json:"totalRows"`
	DurationMs float64          `json:"durationMs"`
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
    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
FROM information_schema.columns c
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

	var columns []TableColumn
	for rows.Next() {
		var colName, dataType, udtName, isNullableStr string
		var colDefault *string
		var isPk bool

		if err := rows.Scan(&colName, &dataType, &udtName, &isNullableStr, &colDefault, &isPk); err != nil {
			return nil, fmt.Errorf("failed to scan column schema: %w", err)
		}

		displayType := dataType
		if dataType == "USER-DEFINED" || dataType == "ARRAY" {
			displayType = udtName
		}

		columns = append(columns, TableColumn{
			Name:         colName,
			Type:         displayType,
			IsNullable:   isNullableStr == "YES",
			IsPrimaryKey: isPk,
			DefaultValue: colDefault,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("schema query iteration error: %w", err)
	}

	if columns == nil {
		columns = []TableColumn{}
	}
	return columns, nil
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
				switch v := val.(type) {
				case time.Time:
					rowMap[colName] = v.Format(time.RFC3339)
				case []byte:
					rowMap[colName] = string(v)
				default:
					rowMap[colName] = v
				}
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
