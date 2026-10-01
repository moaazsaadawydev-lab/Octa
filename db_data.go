package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

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

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return result, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

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
	err = pool.QueryRow(ctx, countQuery, args...).Scan(&totalRows)
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
	rows, err := pool.Query(ctx, dataQuery, args...)
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

// UpdateTableRows updates cells in the database within a transaction.
func (s *DBService) UpdateTableRows(config ConnectionConfig, dbName, tableName, pkColumn string, updates []RowUpdate) (bool, error) {
	if len(updates) == 0 {
		return true, nil
	}
	if pkColumn == "" {
		return false, fmt.Errorf("primary key column is required for updates")
	}

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
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

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	safeTable := pgx.Identifier{tableName}.Sanitize()
	safePK := pgx.Identifier{pkColumn}.Sanitize()

	query := fmt.Sprintf("DELETE FROM %s WHERE %s = ANY($1);", safeTable, safePK)

	start := time.Now()
	_, err = pool.Exec(ctx, query, pkValues)
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
	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	safeTable := pgx.Identifier{tableName}.Sanitize()
	query := fmt.Sprintf("TRUNCATE TABLE %s CASCADE;", safeTable)

	start := time.Now()
	_, err = pool.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to truncate table %s: %w", tableName, err)
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}
