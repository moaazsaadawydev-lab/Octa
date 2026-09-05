package pty

import (
	"fmt"
	"path/filepath"
	"strings"
)

// ToWSLPath maps a Windows path (e.g. D:\Projects\App) to a Linux WSL path (/mnt/d/Projects/App).
func ToWSLPath(winPath string) string {
	if winPath == "" {
		return "~"
	}
	cleaned := filepath.Clean(winPath)
	if len(cleaned) >= 2 && cleaned[1] == ':' {
		drive := strings.ToLower(string(cleaned[0]))
		rest := filepath.ToSlash(cleaned[2:])
		rest = strings.Trim(rest, "/")
		if rest != "" {
			return fmt.Sprintf("/mnt/%s/%s", drive, rest)
		}
		return fmt.Sprintf("/mnt/%s", drive)
	}
	return filepath.ToSlash(cleaned)
}


// FormatCommandLine formats CLI arguments for launching shells in ConPTY.
func FormatCommandLine(exePath string) string {
	lower := strings.ToLower(filepath.Base(exePath))
	if strings.Contains(lower, "bash") {
		return fmt.Sprintf(`"%s" --login -i`, exePath)
	}
	if strings.Contains(lower, "cmd") {
		return fmt.Sprintf(`"%s"`, exePath)
	}
	if strings.Contains(lower, "pwsh") || strings.Contains(lower, "powershell") {
		return fmt.Sprintf(`"%s" -NoLogo`, exePath)
	}
	return fmt.Sprintf(`"%s"`, exePath)
}

// ResolveShellCommand translates a requested shell ID or path and workDir into a ConPTY command line.
func ResolveShellCommand(shellReq string, workDir string, available []ShellInfo) string {
	reqTrimmed := strings.TrimSpace(shellReq)
	reqLower := strings.ToLower(reqTrimmed)

	// If empty request, default to powershell or first available
	if reqLower == "" {
		for _, sh := range available {
			if sh.ID == "powershell" {
				return FormatCommandLine(sh.Path)
			}
		}
		if len(available) > 0 {
			return FormatCommandLine(available[0].Path)
		}
		return `powershell.exe -NoLogo`
	}

	// Check WSL matches
	if reqLower == "wsl" || strings.HasPrefix(reqLower, "wsl_") || strings.HasPrefix(reqLower, "wsl.exe") {
		var targetDistro string
		for _, sh := range available {
			if strings.EqualFold(sh.ID, reqLower) && sh.Distro != "" {
				targetDistro = sh.Distro
				break
			}
		}
		if targetDistro == "" {
			for _, sh := range available {
				if sh.Distro != "" {
					targetDistro = sh.Distro
					break
				}
			}
		}

		if targetDistro != "" {
			if workDir != "" {
				return fmt.Sprintf(`wsl.exe --cd "%s" -d %s`, workDir, targetDistro)
			}
			return fmt.Sprintf(`wsl.exe -d %s`, targetDistro)
		}

		if workDir != "" {
			return fmt.Sprintf(`wsl.exe --cd "%s"`, workDir)
		}
		return `wsl.exe`
	}

	// Match other shells by ID
	for _, sh := range available {
		if strings.EqualFold(sh.ID, reqLower) {
			return FormatCommandLine(sh.Path)
		}
	}

	// Match by Path
	for _, sh := range available {
		if strings.EqualFold(sh.Path, reqTrimmed) {
			return FormatCommandLine(sh.Path)
		}
	}

	return FormatCommandLine(reqTrimmed)
}
