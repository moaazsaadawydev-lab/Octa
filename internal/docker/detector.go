package docker

import (
	"bytes"
	"fmt"
	"os"
	"runtime"
	"strings"

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

// DetectEngines discovers available Docker engines on the local host.
func DetectEngines() []EngineProvider {
	var providers []EngineProvider

	if runtime.GOOS == "windows" {
		// 1. Detect Windows Docker Desktop
		if isWindowsDockerInstalled() {
			providers = append(providers, EngineProvider{
				ID:    "windows",
				Label: "Docker Desktop (Windows)",
			})
		}

		// 2. Detect WSL2 Distributions with Docker installed
		cmd := executil.Command("wsl.exe", "-l", "-q")
		out, err := cmd.Output()
		if err == nil && len(out) > 0 {
			distros := CleanWSLOutput(out)
			for _, distro := range distros {
				// Ignore internal Docker Desktop helper distributions
				lower := strings.ToLower(distro)
				if strings.Contains(lower, "docker-desktop") {
					continue
				}

				if isWSLDistroHasDocker(distro) {
					providers = append(providers, EngineProvider{
						ID:     "wsl",
						Label:  fmt.Sprintf("WSL2 (%s)", distro),
						Distro: distro,
					})
				}
			}
		}

		// Fallback: If nothing was detected, provide default Windows Desktop entry
		if len(providers) == 0 {
			providers = append(providers, EngineProvider{
				ID:    "windows",
				Label: "Docker Desktop (Windows)",
			})
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
