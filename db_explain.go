package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

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
		textExplainCmd += "ANALYZE "
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
