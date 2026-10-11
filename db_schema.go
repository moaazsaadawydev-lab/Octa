package main

import (
	"context"
	"fmt"
	"strings"
	"time"
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
	    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
	    CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_foreign_key
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
	LEFT JOIN (
	    SELECT kcu.column_name
	    FROM information_schema.table_constraints tc
	    JOIN information_schema.key_column_usage kcu
	      ON tc.constraint_name = kcu.constraint_name
	      AND tc.table_schema = kcu.table_schema
	    WHERE tc.constraint_type = 'FOREIGN KEY'
	      AND tc.table_schema = 'public'
	      AND tc.table_name = $1
	) fk ON c.column_name = fk.column_name
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
		var isPK, isFK bool

		if err := rows.Scan(&colName, &dataType, &udtName, &isNullableStr, &colDefault, &isPK, &isFK); err == nil {
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
				IsForeignKey: isFK,
				DefaultValue: colDefault,
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating table columns: %w", err)
	}

	return columns, nil
}
