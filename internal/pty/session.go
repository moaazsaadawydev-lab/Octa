package pty

import (
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/UserExistsError/conpty"
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
