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

// DBService encapsulates PostgreSQL and multi-database connectivity, schema queries, raw queries, and logging.
type DBService struct {
	ctx       context.Context
	mu        sync.RWMutex
	queryLogs []QueryLog
}

// NewDBService creates a new DBService.
func NewDBService() *DBService {
	return &DBService{
		queryLogs: make([]QueryLog, 0),
	}
}

// SetContext sets the Wails runtime context.
func (s *DBService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// logQuery records an executed query in the internal query logs.
func (s *DBService) logQuery(query string, durationMs float64, status string, errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	log := QueryLog{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().Format("2006-01-02 15:04:05.000"),
		Query:      query,
		DurationMs: durationMs,
		Status:     status,
		Error:      errMsg,
	}

	s.queryLogs = append(s.queryLogs, log)
	if len(s.queryLogs) > 200 {
		s.queryLogs = s.queryLogs[len(s.queryLogs)-200:]
	}
}

// GetQueryLogs retrieves query execution logs.
func (s *DBService) GetQueryLogs() ([]QueryLog, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	logsCopy := make([]QueryLog, len(s.queryLogs))
	copy(logsCopy, s.queryLogs)
	return logsCopy, nil
}

// ClearQueryLogs clears all buffered query logs.
func (s *DBService) ClearQueryLogs() (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.queryLogs = make([]QueryLog, 0)
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

func getConnectionsFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	if err = os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "connections.json"), nil
}

func getSqlQueriesDataFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	if err = os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "sql_queries.json"), nil
}

// SaveSqlQueriesData writes the SQL queries and folders tree JSON data to disk.
func (s *DBService) SaveSqlQueriesData(jsonData string) error {
	filePath, err := getSqlQueriesDataFilePath()
	if err != nil {
		return fmt.Errorf("failed to get SQL queries data file path: %w", err)
	}

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}

	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadSqlQueriesData reads the saved SQL queries JSON data from disk.
func (s *DBService) LoadSqlQueriesData() (string, error) {
	filePath, err := getSqlQueriesDataFilePath()
	if err != nil {
		return "", fmt.Errorf("failed to get SQL queries data file path: %w", err)
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read SQL queries data: %w", err)
	}

	return string(data), nil
}

// TestConnection tests whether a connection can be established.
func (s *DBService) TestConnection(config ConnectionConfig) (bool, string) {
	if config.Type == "" {
		config.Type = "postgres"
	}

	if config.Type != "postgres" {
		return false, fmt.Sprintf("Unsupported database engine: %s", config.Type)
	}

	connStr := buildPostgresURL(config)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Sprintf("Invalid connection string: %v", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Sprintf("Connection failed: %v", err)
	}
	defer conn.Close(ctx)

	err = conn.Ping(ctx)
	if err != nil {
		return false, fmt.Sprintf("Ping failed: %v", err)
	}

	return true, "Connection successful"
}

// SaveConnection saves a connection profile.
func (s *DBService) SaveConnection(config ConnectionConfig) (bool, string) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return false, fmt.Sprintf("Failed to get config directory: %v", err)
	}

	var connections []ConnectionConfig
	if _, err := os.Stat(filePath); err == nil {
		data, err := os.ReadFile(filePath)
		if err == nil {
			_ = json.Unmarshal(data, &connections)
		}
	}

	if config.ID == "" {
		config.ID = uuid.New().String()
	}

	found := false
	for i, c := range connections {
		if c.ID == config.ID {
			connections[i] = config
			found = true
			break
		}
	}
	if !found {
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

// GetSavedConnections reads and returns saved connection profiles.
func (s *DBService) GetSavedConnections() ([]ConnectionConfig, error) {
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
func (s *DBService) GetDatabases(config ConnectionConfig) ([]string, error) {
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
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query databases: %w", err)
	}
	defer rows.Close()

	s.logQuery(query, durationMs, "SUCCESS", "")

	var databases []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			databases = append(databases, name)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading database names: %w", err)
	}

	return databases, nil
}

// DeleteConnection removes a saved connection profile.
func (s *DBService) DeleteConnection(id string) (bool, error) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return false, err
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return false, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return false, err
	}

	var connections []ConnectionConfig
	if err := json.Unmarshal(data, &connections); err != nil {
		return false, err
	}

	filtered := make([]ConnectionConfig, 0, len(connections))
	for _, c := range connections {
		if c.ID != id {
			filtered = append(filtered, c)
		}
	}

	newData, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return false, err
	}

	if err := os.WriteFile(filePath, newData, 0644); err != nil {
		return false, err
	}

	return true, nil
}

// GetTables queries all user tables in public and active schemas.
func (s *DBService) GetTables(config ConnectionConfig, dbName string) ([]string, error) {
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

	query := `SELECT table_name 
	          FROM information_schema.tables 
	          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
	          ORDER BY table_name;`

	start := time.Now()
	rows, err := conn.Query(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	s.logQuery(query, durationMs, "SUCCESS", "")

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			tables = append(tables, name)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading table names: %w", err)
	}

	return tables, nil
}

// GetTableSchema queries column definitions, types, nullability, defaults, and primary keys.
func (s *DBService) GetTableSchema(config ConnectionConfig, dbName string, tableName string) ([]TableColumn, error) {
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

	colQuery := `SELECT column_name, data_type, udt_name, is_nullable, column_default
	              FROM information_schema.columns
	              WHERE table_schema = 'public' AND table_name = $1
	              ORDER BY ordinal_position;`

	start := time.Now()
	rows, err := conn.Query(ctx, colQuery, tableName)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(fmt.Sprintf("%s (table: %s)", colQuery, tableName), durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query table schema: %w", err)
	}
	defer rows.Close()

	s.logQuery(fmt.Sprintf("%s (table: %s)", colQuery, tableName), durationMs, "SUCCESS", "")

	pkQuery := `SELECT kcu.column_name
	             FROM information_schema.table_constraints tc
	             JOIN information_schema.key_column_usage kcu
	               ON tc.constraint_name = kcu.constraint_name
	               AND tc.table_schema = kcu.table_schema
	             WHERE tc.constraint_type = 'PRIMARY KEY'
	               AND tc.table_schema = 'public'
	               AND tc.table_name = $1;`

	pkRows, err := conn.Query(ctx, pkQuery, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to query primary keys: %w", err)
	}
	defer pkRows.Close()

	pkSet := make(map[string]bool)
	for pkRows.Next() {
		var pkCol string
		if err := pkRows.Scan(&pkCol); err == nil {
			pkSet[pkCol] = true
		}
	}

	var columns []TableColumn
	for rows.Next() {
		var colName, dataType, udtName, isNullableStr string
		var colDefault *string

		if err := rows.Scan(&colName, &dataType, &udtName, &isNullableStr, &colDefault); err == nil {
			isPK := pkSet[colName]
			isNullable := strings.EqualFold(isNullableStr, "YES")

			displayType := dataType
			if strings.EqualFold(dataType, "USER-DEFINED") {
				displayType = udtName
			}

			columns = append(columns, TableColumn{
				Name:         colName,
				Type:         displayType,
				DataType:     displayType,
				IsNullable:   isNullable,
				IsPrimaryKey: isPK,
				IsForeignKey: false,
				DefaultValue: colDefault,
			})
		}
	}

	for i, col := range columns {
		enumVals, err := s.GetEnumValues(config, dbName, col.Type)
		if err == nil && len(enumVals) > 0 {
			columns[i].EnumValues = enumVals
		}
	}

	return columns, nil
}

// GetTableData queries data with sorting, pagination, and filtering.
func (s *DBService) GetTableData(config ConnectionConfig, dbName string, tableName string, options DataQueryOptions) (TableDataResult, error) {
	result := TableDataResult{
		Columns: []string{},
		Rows:    []map[string]any{},
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

	page := options.Page
	if page < 1 {
		page = 1
	}
	pageSize := options.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	whereClause := ""
	var args []any
	argIndex := 1

	if options.FilterColumn != "" && options.FilterOp != "" {
		safeCol := pgx.Identifier{options.FilterColumn}.Sanitize()
		switch options.FilterOp {
		case "equals":
			whereClause = fmt.Sprintf(" WHERE %s = $%d", safeCol, argIndex)
			args = append(args, options.FilterValue)
			argIndex++
		case "contains":
			whereClause = fmt.Sprintf(" WHERE %s::text ILIKE $%d", safeCol, argIndex)
			args = append(args, "%"+options.FilterValue+"%")
			argIndex++
		case "starts_with":
			whereClause = fmt.Sprintf(" WHERE %s::text ILIKE $%d", safeCol, argIndex)
			args = append(args, options.FilterValue+"%")
			argIndex++
		case "gt":
			whereClause = fmt.Sprintf(" WHERE %s > $%d", safeCol, argIndex)
			args = append(args, options.FilterValue)
			argIndex++
		case "lt":
			whereClause = fmt.Sprintf(" WHERE %s < $%d", safeCol, argIndex)
			args = append(args, options.FilterValue)
			argIndex++
		case "gte":
			whereClause = fmt.Sprintf(" WHERE %s >= $%d", safeCol, argIndex)
			args = append(args, options.FilterValue)
			argIndex++
		case "lte":
			whereClause = fmt.Sprintf(" WHERE %s <= $%d", safeCol, argIndex)
			args = append(args, options.FilterValue)
			argIndex++
		case "is_null":
			whereClause = fmt.Sprintf(" WHERE %s IS NULL", safeCol)
		case "is_not_null":
			whereClause = fmt.Sprintf(" WHERE %s IS NOT NULL", safeCol)
		}
	}

	sanitizedTable := pgx.Identifier{tableName}.Sanitize()

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s%s;", sanitizedTable, whereClause)
	var totalRows int64
	err = conn.QueryRow(ctx, countQuery, args...).Scan(&totalRows)
	if err != nil {
		return result, fmt.Errorf("failed to get row count: %w", err)
	}
	result.TotalRows = totalRows

	orderClause := ""
	if options.SortColumn != "" {
		safeSortCol := pgx.Identifier{options.SortColumn}.Sanitize()
		direction := "ASC"
		if strings.EqualFold(options.SortOrder, "DESC") {
			direction = "DESC"
		}
		orderClause = fmt.Sprintf(" ORDER BY %s %s", safeSortCol, direction)
	}

	dataQuery := fmt.Sprintf("SELECT * FROM %s%s%s LIMIT %d OFFSET %d;", sanitizedTable, whereClause, orderClause, pageSize, offset)

	start := time.Now()
	rows, err := conn.Query(ctx, dataQuery, args...)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	result.DurationMs = durationMs

	if err != nil {
		s.logQuery(dataQuery, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("failed to query table data: %w", err)
	}
	defer rows.Close()

	s.logQuery(dataQuery, durationMs, "SUCCESS", "")

	fieldDescriptions := rows.FieldDescriptions()
	for _, fd := range fieldDescriptions {
		result.Columns = append(result.Columns, fd.Name)
	}

	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			continue
		}

		rowMap := make(map[string]any)
		for i, fd := range fieldDescriptions {
			val := vals[i]
			if val == nil {
				rowMap[fd.Name] = nil
			} else {
				switch v := val.(type) {
				case []byte:
					rowMap[fd.Name] = string(v)
				case [16]byte:
					u, _ := uuid.FromBytes(v[:])
					rowMap[fd.Name] = u.String()
				case time.Time:
					rowMap[fd.Name] = v.Format(time.RFC3339)
				default:
					rowMap[fd.Name] = v
				}
			}
		}
		result.Rows = append(result.Rows, rowMap)
	}

	return result, nil
}

// AddColumn adds a new column to a table.
func (s *DBService) AddColumn(config ConnectionConfig, dbName, tableName, colName, colType string, isNullable bool) (bool, error) {
	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, err
	}
	defer conn.Close(ctx)

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safeCol := pgx.Identifier{colName}.Sanitize()

	nullClause := "NULL"
	if !isNullable {
		nullClause = "NOT NULL"
	}

	query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s %s;", safeTable, safeCol, colType, nullClause)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, err
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// DropColumn removes a column from a table.
func (s *DBService) DropColumn(config ConnectionConfig, dbName, tableName, colName string) (bool, error) {
	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, err
	}
	defer conn.Close(ctx)

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safeCol := pgx.Identifier{colName}.Sanitize()

	query := fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s;", safeTable, safeCol)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, err
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// RenameColumn renames a column.
func (s *DBService) RenameColumn(config ConnectionConfig, dbName, tableName, oldName, newName string) (bool, error) {
	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, err
	}
	defer conn.Close(ctx)

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safeOld := pgx.Identifier{oldName}.Sanitize()
	safeNew := pgx.Identifier{newName}.Sanitize()

	query := fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s;", safeTable, safeOld, safeNew)
	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, err
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// GetEnumValues queries allowed values for an enum type.
func (s *DBService) GetEnumValues(config ConnectionConfig, dbName, typeName string) ([]string, error) {
	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, err
	}
	defer conn.Close(ctx)

	query := `SELECT e.enumlabel
	          FROM pg_type t
	          JOIN pg_enum e ON t.oid = e.enumtypid
	          WHERE t.typname = $1
	          ORDER BY e.enumsortorder;`

	rows, err := conn.Query(ctx, query, typeName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var enums []string
	for rows.Next() {
		var val string
		if err := rows.Scan(&val); err == nil {
			enums = append(enums, val)
		}
	}
	return enums, nil
}

// UpdateTableRows updates cells in the database.
func (s *DBService) UpdateTableRows(config ConnectionConfig, dbName, tableName, pkColumn string, updates []RowUpdate) (bool, error) {
	if len(updates) == 0 {
		return true, nil
	}
	if pkColumn == "" {
		return false, fmt.Errorf("primary key column is required for updates")
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, err
	}
	defer conn.Close(ctx)

	tx, err := conn.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safePK := pgx.Identifier{pkColumn}.Sanitize()

	for _, upd := range updates {
		safeCol := pgx.Identifier{upd.Column}.Sanitize()
		query := fmt.Sprintf("UPDATE %s SET %s = $1 WHERE %s = $2;", safeTable, safeCol, safePK)

		start := time.Now()
		_, err := tx.Exec(ctx, query, upd.NewValue, upd.PrimaryKeyValue)
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0

		if err != nil {
			s.logQuery(query, durationMs, "ERROR", err.Error())
			return false, fmt.Errorf("failed to update row (%v = %v): %w", upd.Column, upd.NewValue, err)
		}
		s.logQuery(query, durationMs, "SUCCESS", "")
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

// DeleteTableRows deletes rows by their primary key values.
func (s *DBService) DeleteTableRows(config ConnectionConfig, dbName, tableName, pkColumn string, pkValues []string) (bool, error) {
	if len(pkValues) == 0 {
		return true, nil
	}
	if pkColumn == "" {
		return false, fmt.Errorf("primary key column is required for delete")
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, err
	}
	defer conn.Close(ctx)

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safePK := pgx.Identifier{pkColumn}.Sanitize()

	query := fmt.Sprintf("DELETE FROM %s WHERE %s = ANY($1);", safeTable, safePK)

	start := time.Now()
	_, err = conn.Exec(ctx, query, pkValues)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to delete rows: %w", err)
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// TruncateTable empties all data from a table.
func (s *DBService) TruncateTable(config ConnectionConfig, dbName, tableName string) (bool, error) {
	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, err
	}
	defer conn.Close(ctx)

	safeTable := pgx.Identifier{tableName}.Sanitize()
	query := fmt.Sprintf("TRUNCATE TABLE %s CASCADE;", safeTable)

	start := time.Now()
	_, err = conn.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to truncate table %s: %w", tableName, err)
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}

// ExecuteRawQuery executes SQL queries, handling multiple semicolon-separated statements.
func (s *DBService) ExecuteRawQuery(config ConnectionConfig, dbName string, sqlQuery string) ([]QueryResult, error) {
	var results []QueryResult

	trimmedQuery := strings.TrimSpace(sqlQuery)
	if trimmedQuery == "" {
		return results, nil
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return results, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return results, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	statements := splitSQLStatements(trimmedQuery)

	for idx, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		qr := QueryResult{
			QueryIndex:   idx,
			Statement:    stmt,
			Columns:      []string{},
			Rows:         []map[string]any{},
			RowsAffected: 0,
			RowCount:     0,
			IsSelect:     false,
		}

		start := time.Now()
		rows, err := conn.Query(ctx, stmt)
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		qr.DurationMs = durationMs

		if err != nil {
			tag, execErr := conn.Exec(ctx, stmt)
			if execErr != nil {
				qr.Success = false
				qr.ErrorMessage = execErr.Error()
				qr.Error = execErr.Error()
				s.logQuery(stmt, durationMs, "ERROR", execErr.Error())
			} else {
				qr.Success = true
				qr.RowCount = tag.RowsAffected()
				qr.RowsAffected = tag.RowsAffected()
				s.logQuery(stmt, durationMs, "SUCCESS", "")
			}
			results = append(results, qr)
			continue
		}

		qr.Success = true
		qr.IsSelect = true
		s.logQuery(stmt, durationMs, "SUCCESS", "")

		fieldDescriptions := rows.FieldDescriptions()
		for _, fd := range fieldDescriptions {
			qr.Columns = append(qr.Columns, fd.Name)
		}

		for rows.Next() {
			vals, err := rows.Values()
			if err != nil {
				continue
			}

			rowMap := make(map[string]any)
			for i, fd := range fieldDescriptions {
				val := vals[i]
				if val == nil {
					rowMap[fd.Name] = nil
				} else {
					switch v := val.(type) {
					case []byte:
						rowMap[fd.Name] = string(v)
					case [16]byte:
						u, _ := uuid.FromBytes(v[:])
						rowMap[fd.Name] = u.String()
					case time.Time:
						rowMap[fd.Name] = v.Format(time.RFC3339)
					default:
						rowMap[fd.Name] = v
					}
				}
			}
			qr.Rows = append(qr.Rows, rowMap)
		}
		rows.Close()
		qr.RowCount = int64(len(qr.Rows))
		qr.RowsAffected = int64(len(qr.Rows))
		results = append(results, qr)
	}

	return results, nil
}

// splitSQLStatements splits SQL by semicolons, respecting quotes and comments.
func splitSQLStatements(sql string) []string {
	var statements []string
	var current strings.Builder

	inSingleQuote := false
	inDoubleQuote := false
	inLineComment := false
	inBlockComment := false

	runes := []rune(sql)
	n := len(runes)

	for i := 0; i < n; i++ {
		r := runes[i]
		var next rune
		if i+1 < n {
			next = runes[i+1]
		}

		if inLineComment {
			current.WriteRune(r)
			if r == '\n' {
				inLineComment = false
			}
			continue
		}

		if inBlockComment {
			current.WriteRune(r)
			if r == '*' && next == '/' {
				current.WriteRune(next)
				i++
				inBlockComment = false
			}
			continue
		}

		if inSingleQuote {
			current.WriteRune(r)
			if r == '\'' {
				if next == '\'' {
					current.WriteRune(next)
					i++
				} else {
					inSingleQuote = false
				}
			}
			continue
		}

		if inDoubleQuote {
			current.WriteRune(r)
			if r == '"' {
				inDoubleQuote = false
			}
			continue
		}

		if r == '-' && next == '-' {
			current.WriteRune(r)
			current.WriteRune(next)
			i++
			inLineComment = true
			continue
		}
		if r == '/' && next == '*' {
			current.WriteRune(r)
			current.WriteRune(next)
			i++
			inBlockComment = true
			continue
		}

		if r == '\'' {
			inSingleQuote = true
			current.WriteRune(r)
			continue
		}
		if r == '"' {
			inDoubleQuote = true
			current.WriteRune(r)
			continue
		}

		if r == ';' {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			continue
		}

		current.WriteRune(r)
	}

	trailing := strings.TrimSpace(current.String())
	if trailing != "" {
		statements = append(statements, trailing)
	}

	return statements
}

// GetDatabaseSchemaDetails inspects tables, columns, PKs, row counts, and foreign key relations for ERD.
func (s *DBService) GetDatabaseSchemaDetails(config ConnectionConfig, dbName string) (DatabaseSchema, error) {
	var schema DatabaseSchema
	schema.Tables = []TableSchema{}
	schema.Relationships = []ForeignKeyRelationship{}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return schema, fmt.Errorf("invalid connection configuration: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return schema, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	tables, err := s.GetTables(config, dbName)
	if err != nil {
		return schema, err
	}

	for _, tbl := range tables {
		cols, err := s.GetTableSchema(config, dbName, tbl)
		if err != nil {
			continue
		}

		var pks []string
		for _, c := range cols {
			if c.IsPrimaryKey {
				pks = append(pks, c.Name)
			}
		}

		var rowCount int64
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s;", pgx.Identifier{tbl}.Sanitize())
		_ = conn.QueryRow(ctx, countQuery).Scan(&rowCount)

		schema.Tables = append(schema.Tables, TableSchema{
			Name:        tbl,
			Columns:     cols,
			PrimaryKeys: pks,
			RowCount:    rowCount,
		})
	}

	fkQuery := `SELECT
	    tc.constraint_name,
	    kcu.table_name AS source_table,
	    kcu.column_name AS source_column,
	    ccu.table_name AS target_table,
	    ccu.column_name AS target_column
	FROM information_schema.table_constraints AS tc
	JOIN information_schema.key_column_usage AS kcu
	  ON tc.constraint_name = kcu.constraint_name
	  AND tc.table_schema = kcu.table_schema
	JOIN information_schema.constraint_column_usage AS ccu
	  ON ccu.constraint_name = tc.constraint_name
	  AND ccu.table_schema = tc.table_schema
	WHERE tc.constraint_type = 'FOREIGN KEY'
	  AND tc.table_schema = 'public';`

	start := time.Now()
	fkRows, err := conn.Query(ctx, fkQuery)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err == nil {
		s.logQuery(fkQuery, durationMs, "SUCCESS", "")
		defer fkRows.Close()
		for fkRows.Next() {
			var rel ForeignKeyRelationship
			if err := fkRows.Scan(&rel.ConstraintName, &rel.SourceTable, &rel.SourceColumn, &rel.TargetTable, &rel.TargetColumn); err == nil {
				schema.Relationships = append(schema.Relationships, rel)
			}
		}
	} else {
		s.logQuery(fkQuery, durationMs, "ERROR", err.Error())
	}

	return schema, nil
}

// ExportTableSQL exports DDL schema and optionally INSERT data statements.
func (s *DBService) ExportTableSQL(config ConnectionConfig, dbName, tableName string, includeData bool) (string, error) {
	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return "", err
	}
	defer conn.Close(ctx)

	cols, err := s.GetTableSchema(config, dbName, tableName)
	if err != nil {
		return "", err
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("-- Table: %s\n", tableName))
	sb.WriteString(fmt.Sprintf("-- Exported on: %s\n\n", time.Now().Format(time.RFC3339)))

	sb.WriteString(fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (\n", pgx.Identifier{tableName}.Sanitize()))
	var colDefs []string
	var pks []string

	for _, col := range cols {
		def := fmt.Sprintf("    %s %s", pgx.Identifier{col.Name}.Sanitize(), col.Type)
		if !col.IsNullable {
			def += " NOT NULL"
		}
		if col.DefaultValue != nil {
			def += fmt.Sprintf(" DEFAULT %s", *col.DefaultValue)
		}
		colDefs = append(colDefs, def)

		if col.IsPrimaryKey {
			pks = append(pks, pgx.Identifier{col.Name}.Sanitize())
		}
	}

	if len(pks) > 0 {
		colDefs = append(colDefs, fmt.Sprintf("    PRIMARY KEY (%s)", strings.Join(pks, ", ")))
	}

	sb.WriteString(strings.Join(colDefs, ",\n"))
	sb.WriteString("\n);\n\n")

	if includeData {
		dataResult, err := s.GetTableData(config, dbName, tableName, DataQueryOptions{
			Page:     1,
			PageSize: 10000,
		})
		if err == nil && len(dataResult.Rows) > 0 {
			sb.WriteString(fmt.Sprintf("-- Data for %s (%d rows)\n", tableName, len(dataResult.Rows)))
			sanitizedCols := make([]string, len(dataResult.Columns))
			for i, c := range dataResult.Columns {
				sanitizedCols[i] = pgx.Identifier{c}.Sanitize()
			}

			colList := strings.Join(sanitizedCols, ", ")

			for _, row := range dataResult.Rows {
				var valList []string
				for _, c := range dataResult.Columns {
					v := row[c]
					valList = append(valList, formatSQLValue(v))
				}
				sb.WriteString(fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s);\n",
					pgx.Identifier{tableName}.Sanitize(),
					colList,
					strings.Join(valList, ", "),
				))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String(), nil
}

func formatSQLValue(v any) string {
	if v == nil {
		return "NULL"
	}
	switch val := v.(type) {
	case string:
		escaped := strings.ReplaceAll(val, "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	case bool:
		if val {
			return "TRUE"
		}
		return "FALSE"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", val)
	case float32, float64:
		return fmt.Sprintf("%v", val)
	default:
		escaped := strings.ReplaceAll(fmt.Sprintf("%v", val), "'", "''")
		return fmt.Sprintf("'%s'", escaped)
	}
}

// ExportDatabaseSQL exports entire database schema and optionally data.
func (s *DBService) ExportDatabaseSQL(config ConnectionConfig, dbName string, includeData bool) (string, error) {
	tables, err := s.GetTables(config, dbName)
	if err != nil {
		return "", err
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("-- Database Export: %s\n", dbName))
	sb.WriteString(fmt.Sprintf("-- Generated on: %s\n\n", time.Now().Format(time.RFC3339)))

	for _, tbl := range tables {
		tblSQL, err := s.ExportTableSQL(config, dbName, tbl, includeData)
		if err != nil {
			continue
		}
		sb.WriteString(tblSQL)
		sb.WriteString("\n-- -----------------------------------------------------\n\n")
	}

	return sb.String(), nil
}

// ImportSQLScript imports a raw SQL script.
func (s *DBService) ImportSQLScript(config ConnectionConfig, dbName string, scriptContent string) (ImportResult, error) {
	result := ImportResult{
		Success:            false,
		StatementsExecuted: 0,
	}

	statements := splitSQLStatements(scriptContent)
	if len(statements) == 0 {
		result.Success = true
		return result, nil
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("Invalid connection: %v", err)
		return result, err
	}
	connConfig.ConnectTimeout = 10 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("Connection failed: %v", err)
		return result, err
	}
	defer conn.Close(ctx)

	tx, err := conn.Begin(ctx)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("Failed to start transaction: %v", err)
		return result, err
	}
	defer tx.Rollback(ctx)

	start := time.Now()
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		_, err := tx.Exec(ctx, stmt)
		if err != nil {
			result.ErrorMessage = fmt.Sprintf("Error executing '%s...': %v", truncateString(stmt, 50), err)
			return result, nil
		}
		result.StatementsExecuted++
	}

	if err := tx.Commit(ctx); err != nil {
		result.ErrorMessage = fmt.Sprintf("Failed to commit transaction: %v", err)
		return result, nil
	}

	result.DurationMs = float64(time.Since(start).Microseconds()) / 1000.0
	result.Success = true
	return result, nil
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

// SaveSQLDumpDialog opens a native save dialog and saves SQL content to disk.
func (s *DBService) SaveSQLDumpDialog(defaultFileName string, content string) (string, error) {
	savePath, err := runtime.SaveFileDialog(s.ctx, runtime.SaveDialogOptions{
		Title:           "Save SQL Dump",
		DefaultFilename: defaultFileName,
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
	if savePath == "" {
		return "", nil
	}

	err = os.WriteFile(savePath, []byte(content), 0644)
	if err != nil {
		return "", err
	}

	return savePath, nil
}

// ExplainQuery generates query execution plan via EXPLAIN (FORMAT JSON, ANALYZE).
func (s *DBService) ExplainQuery(config ConnectionConfig, dbName, sqlQuery string, analyze bool) (ExplainPlanResult, error) {
	var result ExplainPlanResult

	trimmed := strings.TrimSpace(sqlQuery)
	if trimmed == "" {
		return result, fmt.Errorf("query cannot be empty")
	}

	connStr := buildPostgresURLWithDB(config, dbName)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return result, fmt.Errorf("invalid connection: %w", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return result, fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close(ctx)

	explainCmd := "EXPLAIN (FORMAT JSON"
	if analyze {
		explainCmd += ", ANALYZE, BUFFERS, VERBOSE"
	}
	explainCmd += ") " + trimmed

	start := time.Now()
	var jsonOutput string
	err = conn.QueryRow(ctx, explainCmd).Scan(&jsonOutput)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(explainCmd, durationMs, "ERROR", err.Error())
		return result, fmt.Errorf("EXPLAIN query failed: %w", err)
	}
	s.logQuery(explainCmd, durationMs, "SUCCESS", "")

	result.PlanJSON = jsonOutput

	var parsed []map[string]any
	if err := json.Unmarshal([]byte(jsonOutput), &parsed); err == nil && len(parsed) > 0 {
		if rootPlan, ok := parsed[0]["Plan"].(map[string]any); ok {
			if cost, ok := rootPlan["Total Cost"].(float64); ok {
				result.TotalCost = cost
			}
		}
		if pTime, ok := parsed[0]["Planning Time"].(float64); ok {
			result.PlanningTime = pTime
		}
		if eTime, ok := parsed[0]["Execution Time"].(float64); ok {
			result.ExecutionTime = eTime
		}
	}

	textExplainCmd := "EXPLAIN "
	if analyze {
		textExplainCmd = "EXPLAIN ANALYZE "
	}
	textExplainCmd += trimmed

	rows, err := conn.Query(ctx, textExplainCmd)
	if err == nil {
		defer rows.Close()
		var textLines []string
		for rows.Next() {
			var line string
			if err := rows.Scan(&line); err == nil {
				textLines = append(textLines, line)
			}
		}
		result.RawOutput = strings.Join(textLines, "\n")
	}

	return result, nil
}
