package main

import (
	"context"

	"octa/internal/pty"
)

// ShellInfo is an alias to pty.ShellInfo for backward compatibility.
type ShellInfo = pty.ShellInfo

// TerminalSession is an alias to pty.TerminalSession for backward compatibility.
type TerminalSession = pty.TerminalSession

// TerminalService delegates ConPTY session management to the internal/pty package.
type TerminalService struct {
	inner *pty.TerminalService
}

// NewTerminalService constructs a new TerminalService backed by internal/pty.
func NewTerminalService() *TerminalService {
	return &TerminalService{
		inner: pty.NewTerminalService(),
	}
}

// SetContext assigns the Wails context for event emission.
func (s *TerminalService) SetContext(ctx context.Context) {
	s.inner.SetContext(ctx)
}

// GetAvailableShells detects installed host shells.
func (s *TerminalService) GetAvailableShells() []ShellInfo {
	return s.inner.GetAvailableShells()
}

// StartTerminalSession initializes a new ConPTY session with the specified shell.
func (s *TerminalService) StartTerminalSession(sessionID string, workDir string, cols int, rows int, shellPath string) error {
	return s.inner.StartTerminalSession(sessionID, workDir, cols, rows, shellPath)
}

// WriteTerminalSession writes user input data into the ConPTY stdin stream.
func (s *TerminalService) WriteTerminalSession(sessionID string, data string) error {
	return s.inner.WriteTerminalSession(sessionID, data)
}

// ResizeTerminalSession dynamically updates the ConPTY dimensions.
func (s *TerminalService) ResizeTerminalSession(sessionID string, cols int, rows int) error {
	return s.inner.ResizeTerminalSession(sessionID, cols, rows)
}

// CloseTerminalSession terminates the ConPTY process and frees resources.
func (s *TerminalService) CloseTerminalSession(sessionID string) error {
	return s.inner.CloseTerminalSession(sessionID)
}

// CloseAllTerminalSessions cleanly shuts down all active terminal sessions.
func (s *TerminalService) CloseAllTerminalSessions() {
	s.inner.CloseAllTerminalSessions()
}
