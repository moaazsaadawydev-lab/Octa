package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

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
