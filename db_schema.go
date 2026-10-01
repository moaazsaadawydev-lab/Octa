package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// GetDatabases connects to PostgreSQL and returns non-template databases.
func (s *DBService) GetDatabases(config ConnectionConfig) ([]string, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	pool, err := s.getPool(config, config.Database)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
	start := time.Now()
	rows, err := pool.Query(ctx, query)
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

// GetTables queries all user tables in public and active schemas.
func (s *DBService) GetTables(config ConnectionConfig, dbName string) ([]string, error) {
	if config.Type == "" {
		config.Type = "postgres"
	}
	if config.Type != "postgres" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := `SELECT table_name 
	          FROM information_schema.tables 
	          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
	          ORDER BY table_name;`

	start := time.Now()
	rows, err := pool.Query(ctx, query)
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

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	colQuery := `SELECT 
	    c.column_name, 
	    c.data_type, 
	    c.udt_name, 
	    c.is_nullable, 
	    c.column_default,
	    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
	FROM information_schema.columns c
	LEFT JOIN (
	    SELECT kcu.column_name
	    FROM information_schema.table_constraints tc
	    JOIN information_schema.key_column_usage kcu
	      ON tc.constraint_name = kcu.constraint_name
	      AND tc.table_schema = kcu.table_schema
	    WHERE tc.constraint_type = 'PRIMARY KEY'
	      AND tc.table_schema = 'public'
	      AND tc.table_name = $1
	) pk ON c.column_name = pk.column_name
	WHERE c.table_schema = 'public' AND c.table_name = $1
	ORDER BY c.ordinal_position;`

	start := time.Now()
	rows, err := pool.Query(ctx, colQuery, tableName)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(fmt.Sprintf("%s (table: %s)", colQuery, tableName), durationMs, "ERROR", err.Error())
		return nil, fmt.Errorf("failed to query table schema: %w", err)
	}
	defer rows.Close()

	s.logQuery(fmt.Sprintf("%s (table: %s)", colQuery, tableName), durationMs, "SUCCESS", "")

	var columns []TableColumn
	for rows.Next() {
		var colName, dataType, udtName, isNullableStr string
		var colDefault *string
		var isPK bool

		if err := rows.Scan(&colName, &dataType, &udtName, &isNullableStr, &colDefault, &isPK); err == nil {
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

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating table columns: %w", err)
	}

	return columns, nil
}

// AddColumn adds a new column to a table.
func (s *DBService) AddColumn(config ConnectionConfig, dbName, tableName, colName, colType string, isNullable bool) (bool, error) {
	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safeCol := pgx.Identifier{colName}.Sanitize()

	nullClause := "NULL"
	if !isNullable {
		nullClause = "NOT NULL"
	}

	query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s %s;", safeTable, safeCol, colType, nullClause)
	start := time.Now()
	_, err = pool.Exec(ctx, query)
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
	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safeCol := pgx.Identifier{colName}.Sanitize()

	query := fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s;", safeTable, safeCol)
	start := time.Now()
	_, err = pool.Exec(ctx, query)
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
	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safeOld := pgx.Identifier{oldName}.Sanitize()
	safeNew := pgx.Identifier{newName}.Sanitize()

	query := fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s;", safeTable, safeOld, safeNew)
	start := time.Now()
	_, err = pool.Exec(ctx, query)
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
	pool, err := s.getPool(config, dbName)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `SELECT e.enumlabel
	          FROM pg_type t
	          JOIN pg_enum e ON t.oid = e.enumtypid
	          WHERE t.typname = $1
	          ORDER BY e.enumsortorder;`

	rows, err := pool.Query(ctx, query, typeName)
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
