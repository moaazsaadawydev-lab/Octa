package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// DropTable drops a table from the specified database.
func (s *DBService) DropTable(config ConnectionConfig, dbName, tableName string, cascade bool) (bool, error) {
	pool, err := s.getPool(config, dbName)
	if err != nil {
		return false, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	safeTable := pgx.Identifier{tableName}.Sanitize()
	cascadeClause := ""
	if cascade {
		cascadeClause = " CASCADE"
	}
	query := fmt.Sprintf("DROP TABLE %s%s;", safeTable, cascadeClause)

	start := time.Now()
	_, err = pool.Exec(ctx, query)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		s.logQuery(query, durationMs, "ERROR", err.Error())
		return false, fmt.Errorf("failed to drop table %s: %w", tableName, err)
	}
	s.logQuery(query, durationMs, "SUCCESS", "")
	return true, nil
}
