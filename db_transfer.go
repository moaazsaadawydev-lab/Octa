package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

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

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

// ExportTableSQL exports DDL schema and optionally INSERT data statements.
func (s *DBService) ExportTableSQL(config ConnectionConfig, dbName, tableName string, includeData bool) (string, error) {
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

	pool, err := s.getPool(config, dbName)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("Invalid connection: %v", err)
		return result, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
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
