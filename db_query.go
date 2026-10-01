package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ExecuteRawQuery executes SQL queries, handling multiple semicolon-separated statements.
func (s *DBService) ExecuteRawQuery(config ConnectionConfig, dbName string, sqlQuery string) ([]QueryResult, error) {
	var results []QueryResult

	trimmedQuery := strings.TrimSpace(sqlQuery)
	if trimmedQuery == "" {
		return results, nil
	}

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return results, fmt.Errorf("failed to get connection pool: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

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
		rows, err := pool.Query(ctx, stmt)
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		qr.DurationMs = durationMs

		if err != nil {
			tag, execErr := pool.Exec(ctx, stmt)
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

// ExplainQuery generates query execution plan via EXPLAIN (FORMAT JSON, ANALYZE).
func (s *DBService) ExplainQuery(config ConnectionConfig, dbName, sqlQuery string, analyze bool) (ExplainPlanResult, error) {
	var result ExplainPlanResult

	trimmed := strings.TrimSpace(sqlQuery)
	if trimmed == "" {
		return result, fmt.Errorf("query cannot be empty")
	}

	pool, err := s.getPool(config, dbName)
	if err != nil {
		return result, fmt.Errorf("invalid connection: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	explainCmd := "EXPLAIN (FORMAT JSON"
	if analyze {
		explainCmd += ", ANALYZE, BUFFERS, VERBOSE"
	}
	explainCmd += ") " + trimmed

	start := time.Now()
	var jsonOutput string
	err = pool.QueryRow(ctx, explainCmd).Scan(&jsonOutput)
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

	rows, err := pool.Query(ctx, textExplainCmd)
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
