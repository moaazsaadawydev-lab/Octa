package pty

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"octa/internal/executil"
)

// ShellInfo describes an available command shell on the host system.
type ShellInfo struct {
	ID     string   `json:"id"`               // "powershell", "cmd", "git-bash", "pwsh", "wsl", "wsl_<distro>"
	Name   string   `json:"name"`             // "PowerShell", "Command Prompt", "Git Bash", "WSL (Ubuntu)"
	Path   string   `json:"path"`             // executable path e.g. "wsl.exe"
	Distro string   `json:"distro,omitempty"` // e.g. "Ubuntu"
	Args   []string `json:"args,omitempty"`   // e.g. ["-d", "Ubuntu"]
}

// CleanWSLOutput decodes UTF-16LE output from wsl.exe into clean string slice.
func CleanWSLOutput(output []byte) []string {
	var text string
	if bytes.Contains(output, []byte{0}) {
		runes := make([]rune, 0, len(output)/2)
		for i := 0; i < len(output)-1; i += 2 {
			r := rune(output[i]) | (rune(output[i+1]) << 8)
			if r != 0 && r != '\r' {
				runes = append(runes, r)
			}
		}
		text = string(runes)
	} else {
		text = strings.ReplaceAll(string(output), "\r", "")
	}

	rawLines := strings.Split(text, "\n")
	var lines []string
	for _, l := range rawLines {
		trimmed := strings.TrimSpace(l)
		if trimmed != "" {
			lines = append(lines, trimmed)
		}
	}
	return lines
}

// DetectAvailableShells detects installed Windows shells and WSL distributions on the host.
func DetectAvailableShells() []ShellInfo {
	var shells []ShellInfo
	seen := make(map[string]bool)

	sysRoot := os.Getenv("SystemRoot")
	if sysRoot == "" {
		sysRoot = `C:\Windows`
	}

	// 1. PowerShell (Windows PowerShell)
	defaultPsPath := filepath.Join(sysRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
	if stat, err := os.Stat(defaultPsPath); err == nil && !stat.IsDir() {
		shells = append(shells, ShellInfo{
			ID:   "powershell",
			Name: "PowerShell",
			Path: defaultPsPath,
		})
		seen["powershell"] = true
	} else if p, err := exec.LookPath("powershell.exe"); err == nil && p != "" {
		shells = append(shells, ShellInfo{
			ID:   "powershell",
			Name: "PowerShell",
			Path: p,
		})
		seen["powershell"] = true
	}

	// 2. PowerShell Core (pwsh.exe) if installed
	if pwshPath, err := exec.LookPath("pwsh.exe"); err == nil && pwshPath != "" {
		shells = append(shells, ShellInfo{
			ID:   "pwsh",
			Name: "PowerShell Core",
			Path: pwshPath,
		})
		seen["pwsh"] = true
	}

	// 3. Command Prompt (CMD)
	comspec := os.Getenv("COMSPEC")
	if comspec != "" {
		if stat, err := os.Stat(comspec); err == nil && !stat.IsDir() {
			shells = append(shells, ShellInfo{
				ID:   "cmd",
				Name: "Command Prompt",
				Path: comspec,
			})
			seen["cmd"] = true
		}
	}
	if !seen["cmd"] {
		cmdPath := filepath.Join(sysRoot, "System32", "cmd.exe")
		if stat, err := os.Stat(cmdPath); err == nil && !stat.IsDir() {
			shells = append(shells, ShellInfo{
				ID:   "cmd",
				Name: "Command Prompt",
				Path: cmdPath,
			})
			seen["cmd"] = true
		}
	}

	// 4. Git Bash
	detectGitBash(&shells)

	// 5. WSL Distributions (Ubuntu, Debian, etc.)
	detectWSLDistros(&shells)

	return shells
}

// detectGitBash locates standard Git for Windows bash.exe installations.
func detectGitBash(shells *[]ShellInfo) {
	candidates := []string{
		`C:\Program Files\Git\bin\bash.exe`,
		`C:\Program Files (x86)\Git\bin\bash.exe`,
	}
	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		candidates = append(candidates, filepath.Join(localAppData, "Programs", "Git", "bin", "bash.exe"))
	}
	if progFiles := os.Getenv("ProgramFiles"); progFiles != "" {
		candidates = append(candidates, filepath.Join(progFiles, "Git", "bin", "bash.exe"))
	}

	for _, p := range candidates {
		if stat, err := os.Stat(p); err == nil && !stat.IsDir() {
			*shells = append(*shells, ShellInfo{
				ID:   "git-bash",
				Name: "Git Bash",
				Path: p,
			})
			return
		}
	}

	if p, err := exec.LookPath("bash.exe"); err == nil && p != "" {
		if !strings.Contains(strings.ToLower(p), "system32") {
			*shells = append(*shells, ShellInfo{
				ID:   "git-bash",
				Name: "Git Bash",
				Path: p,
			})
		}
	}
}

// detectWSLDistros discovers active WSL distributions and appends them as shell profiles.
func detectWSLDistros(shells *[]ShellInfo) {
	if runtime.GOOS != "windows" {
		return
	}

	cmd := executil.Command("wsl.exe", "-l", "-q")
	out, err := cmd.Output()
	if err != nil || len(out) == 0 {
		return
	}

	distros := CleanWSLOutput(out)
	var validDistros []string
	for _, d := range distros {
		lower := strings.ToLower(d)
		if strings.Contains(lower, "docker-desktop") {
			continue
		}
		validDistros = append(validDistros, d)
	}

	if len(validDistros) == 0 {
		return
	}

	// Primary WSL distro alias
	primary := validDistros[0]
	*shells = append(*shells, ShellInfo{
		ID:     "wsl",
		Name:   fmt.Sprintf("WSL (%s)", primary),
		Path:   "wsl.exe",
		Distro: primary,
		Args:   []string{"-d", primary},
	})

	// Register any additional distros if present
	for i, d := range validDistros {
		if i == 0 && len(validDistros) == 1 {
			continue
		}
		*shells = append(*shells, ShellInfo{
			ID:     fmt.Sprintf("wsl_%s", strings.ToLower(d)),
			Name:   fmt.Sprintf("WSL: %s", d),
			Path:   "wsl.exe",
			Distro: d,
			Args:   []string{"-d", d},
		})
	}
}
