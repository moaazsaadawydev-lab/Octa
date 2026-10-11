package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type queryRunner interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// ExecuteRawQuery executes SQL queries, maintaining session and transaction state per editor tab.
func (s *DBService) ExecuteRawQuery(config ConnectionConfig, dbName string, sqlQuery string, tabID string) ([]QueryResult, error) {
	var results []QueryResult

	trimmedQuery := strings.TrimSpace(sqlQuery)
	if trimmedQuery == "" {
		return results, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	var runner queryRunner
	var tabSession *TabSession

	if tabID != "" && s.sessionMgr != nil {
		sess, err := s.sessionMgr.GetOrCreate(ctx, config, dbName, tabID)
		if err != nil {
			return results, fmt.Errorf("failed to acquire tab session: %w", err)
		}
		tabSession = sess
		runner = sess.Conn
	} else {
		pool, err := s.getPool(config, dbName)
		if err != nil {
			return results, fmt.Errorf("failed to get connection pool: %w", err)
		}
		runner = pool
	}

	statements := splitSQLStatements(trimmedQuery)

	for idx, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		if tabSession != nil {
			tabSession.DrainNotices()
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
		rows, err := runner.Query(ctx, stmt)
		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		qr.DurationMs = durationMs

		if err != nil {
			qr.Success = false
			errMsg := fmt.Sprintf("Statement %d error: %s", idx+1, err.Error())
			qr.ErrorMessage = errMsg
			qr.Error = errMsg
			if tabSession != nil {
				qr.TxStatus = tabSession.TxStatus()
				qr.Notices = tabSession.DrainNotices()
			} else {
				qr.TxStatus = "idle"
			}
			s.logQuery(stmt, durationMs, "ERROR", err.Error())
			results = append(results, qr)
			continue
		}

		fieldDescriptions := rows.FieldDescriptions()
		isSelect := len(fieldDescriptions) > 0
		qr.IsSelect = isSelect

		for _, fd := range fieldDescriptions {
			qr.Columns = append(qr.Columns, fd.Name)
		}

		for rows.Next() {
			vals, valErr := rows.Values()
			if valErr != nil {
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

		iterErr := rows.Err()
		tag := rows.CommandTag()
		rows.Close()

		if tabSession != nil {
			qr.TxStatus = tabSession.TxStatus()
			qr.Notices = tabSession.DrainNotices()
		} else {
			qr.TxStatus = "idle"
		}

		if iterErr != nil {
			qr.Success = false
			errMsg := fmt.Sprintf("Statement %d error: %s", idx+1, iterErr.Error())
			qr.ErrorMessage = errMsg
			qr.Error = errMsg
			s.logQuery(stmt, durationMs, "ERROR", iterErr.Error())
			results = append(results, qr)
			continue
		}

		qr.Success = true
		s.logQuery(stmt, durationMs, "SUCCESS", "")

		if isSelect {
			qr.RowCount = int64(len(qr.Rows))
			qr.RowsAffected = tag.RowsAffected()
			if qr.RowsAffected == 0 {
				qr.RowsAffected = qr.RowCount
			}
		} else {
			qr.RowCount = 0
			qr.RowsAffected = tag.RowsAffected()
		}

		results = append(results, qr)
	}

	return results, nil
}
