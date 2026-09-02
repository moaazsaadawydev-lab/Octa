package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/UserExistsError/conpty"
	"github.com/google/uuid"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// TerminalSession encapsulates an active Windows ConPTY pseudo-console process.
type TerminalSession struct {
	ID              string
	InstanceID      string
	Cpty            *conpty.ConPty
	WorkDir         string
	CreatedAt       time.Time
	closed          bool
	closedByService bool
	mu              sync.Mutex
}

// TerminalService manages multiple concurrent ConPTY sessions.
type TerminalService struct {
	ctx      context.Context
	sessions map[string]*TerminalSession
	mu       sync.RWMutex
}

// NewTerminalService constructs a new TerminalService.
func NewTerminalService() *TerminalService {
	return &TerminalService{
		sessions: make(map[string]*TerminalSession),
	}
}

// SetContext assigns the Wails context for event emission.
func (s *TerminalService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// StartTerminalSession initializes a new ConPTY session with powershell.exe.
func (s *TerminalService) StartTerminalSession(sessionID string, workDir string, cols int, rows int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If session already exists, mark as closedByService and close old handles cleanly
	if old, exists := s.sessions[sessionID]; exists {
		old.mu.Lock()
		old.closedByService = true
		if !old.closed && old.Cpty != nil {
			_ = old.Cpty.Close()
			old.closed = true
		}
		old.mu.Unlock()
		delete(s.sessions, sessionID)
	}

	// Validate working directory; fall back safely to user home dir if non-existent
	targetWorkDir := workDir
	if targetWorkDir == "" {
		homeDir, err := os.UserHomeDir()
		if err == nil && homeDir != "" {
			targetWorkDir = homeDir
		} else {
			cwd, _ := os.Getwd()
			targetWorkDir = cwd
		}
	} else {
		stat, err := os.Stat(targetWorkDir)
		if err != nil || !stat.IsDir() {
			homeDir, _ := os.UserHomeDir()
			if homeDir != "" {
				targetWorkDir = homeDir
			} else {
				cwd, _ := os.Getwd()
				targetWorkDir = cwd
			}
		}
	}

	// Default dimensions
	if cols <= 0 {
		cols = 120
	}
	if rows <= 0 {
		rows = 30
	}

	// Resolve powershell.exe path
	psExe := "powershell.exe"
	if p, err := exec.LookPath("powershell.exe"); err == nil && p != "" {
		psExe = p
	}

	// Spawn persistent interactive powershell with -NoLogo
	cmdLine := fmt.Sprintf(`"%s" -NoLogo`, psExe)
	instanceID := uuid.NewString()

	fmt.Printf("[DEBUG TerminalService] Starting ConPTY session %s [%s] (workDir: %s, cols: %d, rows: %d)\n", sessionID, instanceID[:8], targetWorkDir, cols, rows)

	// Start ConPTY
	cpty, err := conpty.Start(
		cmdLine,
		conpty.ConPtyDimensions(cols, rows),
		conpty.ConPtyWorkDir(targetWorkDir),
	)
	if err != nil {
		fmt.Printf("[DEBUG TerminalService ERROR] Failed to start ConPTY: %v\n", err)
		return fmt.Errorf("failed to start ConPTY powershell: %w", err)
	}

	session := &TerminalSession{
		ID:              sessionID,
		InstanceID:      instanceID,
		Cpty:            cpty,
		WorkDir:         targetWorkDir,
		CreatedAt:       time.Now(),
		closed:          false,
		closedByService: false,
	}

	s.sessions[sessionID] = session

	// Launch background reader goroutine
	go s.readLoop(session)

	return nil
}

// readLoop continuously reads from ConPTY and emits data events to the frontend.
func (s *TerminalService) readLoop(session *TerminalSession) {
	buf := make([]byte, 8192)

	for {
		session.mu.Lock()
		if session.closed {
			session.mu.Unlock()
			break
		}
		session.mu.Unlock()

		n, err := session.Cpty.Read(buf)
		if n > 0 {
			chunk := string(buf[:n])
			if s.ctx != nil {
				wailsRuntime.EventsEmit(s.ctx, "terminal:data:"+session.ID, chunk)
			}
		}

		if err != nil {
			if err != io.EOF {
				session.mu.Lock()
				isClosedByService := session.closedByService
				session.mu.Unlock()
				if !isClosedByService {
					fmt.Printf("[DEBUG TerminalService] Read ended for session %s: %v\n", session.ID, err)
				}
			}
			break
		}
	}

	session.mu.Lock()
	wasClosedByService := session.closedByService
	session.closed = true
	session.mu.Unlock()

	s.mu.Lock()
	if cur, exists := s.sessions[session.ID]; exists && cur.InstanceID == session.InstanceID {
		delete(s.sessions, session.ID)
	}
	s.mu.Unlock()

	// Only emit exit event if process exited naturally and was not closed by service
	if !wasClosedByService && s.ctx != nil {
		wailsRuntime.EventsEmit(s.ctx, "terminal:exit:"+session.ID, nil)
	}
}

// WriteTerminalSession writes user input data into the ConPTY stdin stream.
func (s *TerminalService) WriteTerminalSession(sessionID string, data string) error {
	s.mu.RLock()
	session, exists := s.sessions[sessionID]
	s.mu.RUnlock()

	if !exists || session == nil {
		return fmt.Errorf("terminal session %s not found", sessionID)
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	if session.closed || session.Cpty == nil {
		return fmt.Errorf("terminal session %s is closed", sessionID)
	}

	_, err := session.Cpty.Write([]byte(data))
	if err != nil {
		fmt.Printf("[DEBUG TerminalService Write Error]: %v\n", err)
		return fmt.Errorf("failed to write to terminal session: %w", err)
	}

	return nil
}

// ResizeTerminalSession dynamically updates the ConPTY columns and rows.
func (s *TerminalService) ResizeTerminalSession(sessionID string, cols int, rows int) error {
	if cols <= 0 || rows <= 0 {
		return fmt.Errorf("invalid terminal dimensions: cols=%d, rows=%d", cols, rows)
	}

	s.mu.RLock()
	session, exists := s.sessions[sessionID]
	s.mu.RUnlock()

	if !exists || session == nil {
		return fmt.Errorf("terminal session %s not found", sessionID)
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	if session.closed || session.Cpty == nil {
		return fmt.Errorf("terminal session %s is closed", sessionID)
	}

	err := session.Cpty.Resize(cols, rows)
	if err != nil {
		return fmt.Errorf("failed to resize terminal: %w", err)
	}

	return nil
}

// CloseTerminalSession terminates the ConPTY process and frees resources.
func (s *TerminalService) CloseTerminalSession(sessionID string) error {
	s.mu.Lock()
	session, exists := s.sessions[sessionID]
	if exists {
		delete(s.sessions, sessionID)
	}
	s.mu.Unlock()

	if !exists || session == nil {
		return nil
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	session.closedByService = true
	if !session.closed && session.Cpty != nil {
		session.closed = true
		_ = session.Cpty.Close()
	}

	return nil
}

// CloseAllTerminalSessions cleanly shuts down all active terminal sessions.
func (s *TerminalService) CloseAllTerminalSessions() {
	s.mu.Lock()
	active := make([]*TerminalSession, 0, len(s.sessions))
	for _, sess := range s.sessions {
		active = append(active, sess)
	}
	s.sessions = make(map[string]*TerminalSession)
	s.mu.Unlock()

	for _, sess := range active {
		sess.mu.Lock()
		sess.closedByService = true
		if !sess.closed && sess.Cpty != nil {
			sess.closed = true
			_ = sess.Cpty.Close()
		}
		sess.mu.Unlock()
	}
}
