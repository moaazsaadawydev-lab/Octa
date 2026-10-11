package docker

import (
	"bytes"
	"fmt"
	"net"
	"os"
	"runtime"
	"strings"
	"time"

	"octa/internal/executil"
)

// EngineProvider represents a detected Docker engine provider on the host machine.
type EngineProvider struct {
	ID     string `json:"id"`               // "windows" | "wsl"
	Label  string `json:"label"`            // e.g. "Docker Desktop (Windows)" or "WSL2 (Ubuntu)"
	Distro string `json:"distro,omitempty"` // e.g. "Ubuntu"
}

// CleanWSLOutput decodes UTF-16LE output from wsl.exe into clean string slice.
func CleanWSLOutput(output []byte) []string {
	var text string
	if bytes.Contains(output, []byte{0}) {
		// UTF-16LE: decode characters skipping zero bytes
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

// isWSLDistroHasDocker checks if docker is installed inside the specified WSL distribution.
func isWSLDistroHasDocker(distro string) bool {
	cmd := executil.Command("wsl.exe", "-d", distro, "which", "docker")
	out, err := cmd.Output()
	if err == nil && len(strings.TrimSpace(string(out))) > 0 {
		return true
	}
	return false
}

// isWindowsDockerInstalled checks if Docker Desktop binary is present on Windows.
func isWindowsDockerInstalled() bool {
	candidates := getWindowsDockerCandidates()
	for _, path := range candidates {
		if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
			return true
		}
	}
	// Check named pipe existence
	if fi, err := os.Stat(`\\.\pipe\docker_engine`); err == nil && !fi.IsDir() {
		return true
	}
	if fi, err := os.Stat(`\\.\pipe\dockerDesktopLinuxEngine`); err == nil && !fi.IsDir() {
		return true
	}
	return false
}

// isWSLDockerRunning quickly checks if the WSL Docker daemon is responsive on localhost port 2375.
func isWSLDockerRunning() bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:2375", 500*time.Millisecond)
	if err == nil {
		_ = conn.Close()
		return true
	}
	return false
}

// DetectEngines discovers available Docker engines on the local host.
func DetectEngines() []EngineProvider {
	var providers []EngineProvider

	if runtime.GOOS == "windows" {
		var wslProviders []EngineProvider
		var winProviders []EngineProvider

		// 1. Detect WSL2 Distributions with Docker installed
		cmd := executil.Command("wsl.exe", "-l", "-q")
		out, err := cmd.Output()
		if err == nil && len(out) > 0 {
			distros := CleanWSLOutput(out)
			for _, distro := range distros {
				lower := strings.ToLower(distro)
				if strings.Contains(lower, "docker-desktop") {
					continue
				}
				if isWSLDistroHasDocker(distro) {
					wslProviders = append(wslProviders, EngineProvider{
						ID:     "wsl",
						Label:  fmt.Sprintf("WSL2 (%s)", distro),
						Distro: distro,
					})
				}
			}
		}

		// 2. Windows Docker Desktop entry
		winProviders = append(winProviders, EngineProvider{
			ID:    "windows",
			Label: "Docker Desktop (Windows)",
		})

		// Prioritization:
		// If WSL Docker is actively running or Windows Docker Desktop is not installed,
		// list WSL distros first. Otherwise list Windows Desktop first.
		wslActive := isWSLDockerRunning()
		winInstalled := isWindowsDockerInstalled()

		if (wslActive || !winInstalled) && len(wslProviders) > 0 {
			providers = append(providers, wslProviders...)
			providers = append(providers, winProviders...)
		} else {
			providers = append(providers, winProviders...)
			providers = append(providers, wslProviders...)
		}

		return providers
	}

	// Non-Windows (macOS/Linux)
	providers = append(providers, EngineProvider{
		ID:    "windows",
		Label: "Docker Daemon (Local)",
	})
	return providers
}
