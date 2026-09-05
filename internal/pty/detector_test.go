package pty

import (
	"strings"
	"testing"
)

func TestCleanWSLOutputUTF16(t *testing.T) {
	// Simulated UTF-16LE bytes from wsl.exe -l -q
	utf16Data := []byte{
		'U', 0x00, 'b', 0x00, 'u', 0x00, 'n', 0x00, 't', 0x00, 'u', 0x00, '\r', 0x00, '\n', 0x00,
		'd', 0x00, 'e', 0x00, 'b', 0x00, 'i', 0x00, 'a', 0x00, 'n', 0x00, '\r', 0x00, '\n', 0x00,
	}

	distros := CleanWSLOutput(utf16Data)
	if len(distros) != 2 {
		t.Fatalf("Expected 2 distros, got %d: %v", len(distros), distros)
	}
	if distros[0] != "Ubuntu" {
		t.Errorf("Expected Ubuntu, got %s", distros[0])
	}
	if distros[1] != "debian" {
		t.Errorf("Expected debian, got %s", distros[1])
	}
}

func TestToWSLPath(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", "~"},
		{`C:\Users\moaaz`, "/mnt/c/Users/moaaz"},
		{`D:\Moaz\Projects`, "/mnt/d/Moaz/Projects"},
		{`E:\`, "/mnt/e"},
	}

	for _, tc := range tests {
		result := ToWSLPath(tc.input)
		if result != tc.expected {
			t.Errorf("ToWSLPath(%q) = %q; expected %q", tc.input, result, tc.expected)
		}
	}
}

func TestDetectAvailableShells(t *testing.T) {
	shells := DetectAvailableShells()
	if len(shells) == 0 {
		t.Fatalf("Expected at least 1 shell detected, got 0")
	}

	hasPowerShell := false
	for _, sh := range shells {
		t.Logf("Detected shell: ID=%s, Name=%s, Path=%s, Distro=%s", sh.ID, sh.Name, sh.Path, sh.Distro)
		if sh.ID == "powershell" || sh.ID == "pwsh" {
			hasPowerShell = true
		}
	}

	if !hasPowerShell {
		t.Errorf("Expected PowerShell to be detected")
	}
}

func TestResolveShellCommand(t *testing.T) {
	available := []ShellInfo{
		{ID: "powershell", Name: "PowerShell", Path: `C:\Windows\System32\powershell.exe`},
		{ID: "cmd", Name: "Command Prompt", Path: `C:\Windows\System32\cmd.exe`},
		{ID: "git-bash", Name: "Git Bash", Path: `C:\Program Files\Git\bin\bash.exe`},
		{ID: "wsl", Name: "WSL (Ubuntu)", Path: "wsl.exe", Distro: "Ubuntu"},
		{ID: "wsl_debian", Name: "WSL: Debian", Path: "wsl.exe", Distro: "Debian"},
	}

	// 1. Default (empty) -> PowerShell
	cmd := ResolveShellCommand("", `C:\work`, available)
	if !strings.Contains(cmd, "powershell") {
		t.Errorf("Expected powershell, got %q", cmd)
	}

	// 2. WSL primary
	cmd = ResolveShellCommand("wsl", `C:\work`, available)
	if cmd != `wsl.exe --cd "C:\work" -d Ubuntu` {
		t.Errorf("Expected wsl.exe with --cd and -d Ubuntu, got %q", cmd)
	}

	// 3. WSL specific distro
	cmd = ResolveShellCommand("wsl_debian", `D:\app`, available)
	if cmd != `wsl.exe --cd "D:\app" -d Debian` {
		t.Errorf("Expected wsl.exe with --cd and -d Debian, got %q", cmd)
	}

	// 4. Git Bash
	cmd = ResolveShellCommand("git-bash", `C:\work`, available)
	if !strings.Contains(cmd, "--login -i") {
		t.Errorf("Expected git-bash login flag, got %q", cmd)
	}
}
