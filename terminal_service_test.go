package main

import (
	"testing"
	"time"
)

func TestTerminalServiceLifecycle(t *testing.T) {
	service := NewTerminalService()
	sessionID := "test-session-1"

	// 1. Start Terminal Session with default shell
	err := service.StartTerminalSession(sessionID, "", 100, 30, "")
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

func TestGetAvailableShellsAndMultiShellLaunch(t *testing.T) {
	service := NewTerminalService()
	shells := service.GetAvailableShells()

	if len(shells) == 0 {
		t.Fatalf("Expected at least 1 available shell on Windows system, got 0")
	}

	hasPowerShell := false
	for _, sh := range shells {
		t.Logf("Found shell: ID=%s, Name=%s, Path=%s", sh.ID, sh.Name, sh.Path)
		if sh.ID == "powershell" || sh.ID == "pwsh" {
			hasPowerShell = true
		}
	}

	if !hasPowerShell {
		t.Errorf("Expected PowerShell to be detected on Windows host")
	}

	// Test starting a session with Command Prompt (cmd)
	cmdSessID := "test-cmd-session"
	err := service.StartTerminalSession(cmdSessID, "", 80, 25, "cmd")
	if err != nil {
		t.Fatalf("Failed to start cmd session: %v", err)
	}
	time.Sleep(300 * time.Millisecond)
	_ = service.CloseTerminalSession(cmdSessID)

	// Test starting a session with git-bash if available
	var hasGitBash bool
	for _, sh := range shells {
		if sh.ID == "git-bash" {
			hasGitBash = true
			break
		}
	}

	if hasGitBash {
		bashSessID := "test-bash-session"
		err := service.StartTerminalSession(bashSessID, "", 80, 25, "git-bash")
		if err != nil {
			t.Fatalf("Failed to start git-bash session: %v", err)
		}
		time.Sleep(300 * time.Millisecond)
		_ = service.CloseTerminalSession(bashSessID)
	}

	// Test starting a session with WSL if available
	var hasWSL bool
	for _, sh := range shells {
		if sh.ID == "wsl" || sh.Distro != "" {
			hasWSL = true
			break
		}
	}

	if hasWSL {
		wslSessID := "test-wsl-session"
		err := service.StartTerminalSession(wslSessID, "", 80, 25, "wsl")
		if err != nil {
			t.Fatalf("Failed to start WSL session: %v", err)
		}
		time.Sleep(300 * time.Millisecond)
		_ = service.CloseTerminalSession(wslSessID)
	}
}

