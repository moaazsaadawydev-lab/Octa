package main

import (
	"testing"
	"time"
)

func TestTerminalServiceLifecycle(t *testing.T) {
	service := NewTerminalService()
	sessionID := "test-session-1"

	// 1. Start Terminal Session
	err := service.StartTerminalSession(sessionID, "", 100, 30)
	if err != nil {
		t.Fatalf("Failed to start terminal session: %v", err)
	}

	// 2. Resize Terminal Session
	err = service.ResizeTerminalSession(sessionID, 120, 35)
	if err != nil {
		t.Errorf("Failed to resize terminal session: %v", err)
	}

	// 3. Write input to Terminal Session
	err = service.WriteTerminalSession(sessionID, "Get-Process -Id $PID\r\n")
	if err != nil {
		t.Errorf("Failed to write to terminal session: %v", err)
	}

	// Allow some time for execution
	time.Sleep(500 * time.Millisecond)

	// 4. Close Terminal Session
	err = service.CloseTerminalSession(sessionID)
	if err != nil {
		t.Errorf("Failed to close terminal session: %v", err)
	}

	// 5. Verify writing to closed session errors
	err = service.WriteTerminalSession(sessionID, "exit\r\n")
	if err == nil {
		t.Errorf("Expected error writing to closed session, got nil")
	}
}
