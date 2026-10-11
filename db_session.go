package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// TabSession maintains a dedicated PostgreSQL connection and transaction state for a single editor tab.
type TabSession struct {
	TabID     string
	Conn      *pgx.Conn
	ConfigKey string
	LastUsed  time.Time
	Notices   []string
	mu        sync.Mutex
}

// DrainNotices returns and clears buffered server notices/warnings for the session.
func (s *TabSession) DrainNotices() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.Notices) == 0 {
		return nil
	}
	res := make([]string, len(s.Notices))
	copy(res, s.Notices)
	s.Notices = make([]string, 0)
	return res
}

// TxStatus checks the PostgreSQL ReadyForQuery status ('T'=in_tx, 'E'=in_tx_error, 'I'=idle).
func (s *TabSession) TxStatus() string {
	if s.Conn == nil || s.Conn.IsClosed() {
		return "idle"
	}
	switch s.Conn.PgConn().TxStatus() {
	case 'T':
		return "in_tx"
	case 'E':
		return "in_tx_error"
	default:
		return "idle"
	}
}

// TabSessionManager manages tab-scoped dedicated PostgreSQL sessions.
type TabSessionManager struct {
	mu       sync.Mutex
	sessions map[string]*TabSession
}

// NewTabSessionManager instantiates a TabSessionManager.
func NewTabSessionManager() *TabSessionManager {
	return &TabSessionManager{
		sessions: make(map[string]*TabSession),
	}
}

// GetOrCreate returns an existing dedicated session or initiates a new connection for the given tab.
func (m *TabSessionManager) GetOrCreate(ctx context.Context, config ConnectionConfig, dbName string, tabID string) (*TabSession, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	connStr := buildPostgresURLWithDB(config, dbName)
	key := fmt.Sprintf("%s|%s", connStr, tabID)

	if sess, exists := m.sessions[tabID]; exists && sess.Conn != nil && !sess.Conn.IsClosed() {
		if sess.ConfigKey == key {
			pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			defer cancel()
			if err := sess.Conn.Ping(pingCtx); err == nil {
				sess.LastUsed = time.Now()
				return sess, nil
			}
		}
		// Connection changed or dead: close old session
		m.closeSingleSession(sess)
		delete(m.sessions, tabID)
	}

	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("invalid tab connection config: %w", err)
	}

	sess := &TabSession{
		TabID:     tabID,
		ConfigKey: key,
		LastUsed:  time.Now(),
		Notices:   make([]string, 0),
	}

	connConfig.OnNotice = func(_ *pgconn.PgConn, notice *pgconn.Notice) {
		sess.mu.Lock()
		defer sess.mu.Unlock()
		msg := fmt.Sprintf("%s: %s", notice.Severity, notice.Message)
		sess.Notices = append(sess.Notices, msg)
	}

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to open tab dedicated connection: %w", err)
	}

	sess.Conn = conn
	m.sessions[tabID] = sess
	return sess, nil
}

// closeSingleSession executes a ROLLBACK if in a transaction, then closes the connection.
func (m *TabSessionManager) closeSingleSession(sess *TabSession) {
	if sess == nil || sess.Conn == nil || sess.Conn.IsClosed() {
		return
	}
	status := sess.Conn.PgConn().TxStatus()
	if status == 'T' || status == 'E' {
		rbCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		_, _ = sess.Conn.Exec(rbCtx, "ROLLBACK")
		cancel()
	}
	_ = sess.Conn.Close(context.Background())
}

// CloseSession closes the session for a given tab, rolling back any uncommitted transaction.
func (m *TabSessionManager) CloseSession(tabID string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess, exists := m.sessions[tabID]
	if !exists {
		return true, nil
	}
	delete(m.sessions, tabID)
	m.closeSingleSession(sess)
	return true, nil
}

// CloseAll rolls back and terminates all active tab sessions.
func (m *TabSessionManager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for tabID, sess := range m.sessions {
		m.closeSingleSession(sess)
		delete(m.sessions, tabID)
	}
}
