package main

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DBService encapsulates PostgreSQL and multi-database connectivity using connection pools.
type DBService struct {
	ctx       context.Context
	mu        sync.RWMutex
	queryLogs []QueryLog
	poolsMu   sync.Mutex
	pools     map[string]*pgxpool.Pool
}

// NewDBService creates a new DBService.
func NewDBService() *DBService {
	return &DBService{
		queryLogs: make([]QueryLog, 0),
		pools:     make(map[string]*pgxpool.Pool),
	}
}

// SetContext sets the Wails runtime context.
func (s *DBService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// getPool returns an existing pool from cache or creates a new connection pool with resource-friendly limits.
func (s *DBService) getPool(config ConnectionConfig, dbName string) (*pgxpool.Pool, error) {
	s.poolsMu.Lock()
	defer s.poolsMu.Unlock()

	connStr := buildPostgresURLWithDB(config, dbName)
	if pool, exists := s.pools[connStr]; exists && pool != nil {
		return pool, nil
	}

	poolConfig, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid pool configuration: %w", err)
	}

	// Optimize resource usage: restrict max connections to 5 and release idle connections after 2 minutes
	poolConfig.MaxConns = 5
	poolConfig.MinConns = 1
	poolConfig.MaxConnIdleTime = 2 * time.Minute
	poolConfig.MaxConnLifetime = 15 * time.Minute
	poolConfig.ConnConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	if s.pools == nil {
		s.pools = make(map[string]*pgxpool.Pool)
	}
	s.pools[connStr] = pool
	return pool, nil
}

// ClosePools gracefully terminates all active connection pools.
func (s *DBService) ClosePools() {
	s.poolsMu.Lock()
	defer s.poolsMu.Unlock()

	for _, pool := range s.pools {
		if pool != nil {
			pool.Close()
		}
	}
	s.pools = make(map[string]*pgxpool.Pool)
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
