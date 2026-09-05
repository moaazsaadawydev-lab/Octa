package docker

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"octa/internal/executil"
)

// EngineService handles lifecycle operations for the Docker daemon/desktop.
type EngineService struct {
	ctx          context.Context
	mu           sync.Mutex
	activeEngine string // "windows" | "wsl"
	activeDistro string // e.g. "Ubuntu"
}

// NewEngineService creates a new EngineService instance.
func NewEngineService() *EngineService {
	storedEngine, storedDistro := LoadStoredEngine()
	if storedEngine == "" {
		storedEngine = "windows"
	}
	return &EngineService{
		activeEngine: storedEngine,
		activeDistro: storedDistro,
	}
}

// SetContext sets the application context.
func (s *EngineService) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

// SetActiveEngine configures the current active engine provider.
func (s *EngineService) SetActiveEngine(engineID string, distro string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if engineID != "" {
		s.activeEngine = engineID
	}
	s.activeDistro = distro
	SaveStoredEngine(s.activeEngine, s.activeDistro)
}


// GetActiveEngine returns the currently selected engine and distro.
func (s *EngineService) GetActiveEngine() (string, string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	engine := s.activeEngine
	if engine == "" {
		engine = "windows"
	}
	return engine, s.activeDistro
}

// GetDetectedEngines returns detected providers on the host.
func (s *EngineService) GetDetectedEngines() []EngineProvider {
	return DetectEngines()
}

// getWindowsDockerCandidates returns potential filepaths for Docker Desktop executable.
func getWindowsDockerCandidates() []string {
	var candidates []string

	addCandidate := func(p string) {
		if p == "" {
			return
		}
		for _, existing := range candidates {
			if existing == p {
				return
			}
		}
		candidates = append(candidates, p)
	}

	addCandidate(`C:\Program Files\Docker\Docker\Docker Desktop.exe`)

	if pf := os.Getenv("ProgramFiles"); pf != "" {
		addCandidate(filepath.Join(pf, "Docker", "Docker", "Docker Desktop.exe"))
	}
	if pfx86 := os.Getenv("ProgramFiles(x86)"); pfx86 != "" {
		addCandidate(filepath.Join(pfx86, "Docker", "Docker", "Docker Desktop.exe"))
	}
	if localAppData := os.Getenv("LocalAppData"); localAppData != "" {
		addCandidate(filepath.Join(localAppData, "Programs", "Docker", "Docker", "Docker Desktop.exe"))
	}

	return candidates
}

// startWindowsDocker starts Docker Desktop in detached mode on Windows.
func (s *EngineService) startWindowsDocker() error {
	candidates := getWindowsDockerCandidates()
	for _, path := range candidates {
		if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
			cmd := exec.Command(path)
			cmd.SysProcAttr = executil.GetSysProcAttr()
			if err := cmd.Start(); err != nil {
				return fmt.Errorf("failed to launch Docker Desktop at '%s': %w", path, err)
			}
			go func() { _ = cmd.Process.Release() }()
			return nil
		}
	}

	// Fallback: Attempt starting the Docker Windows service
	serviceCmd := executil.Command("net", "start", "com.docker.service")
	if err := serviceCmd.Start(); err == nil {
		go func() { _ = serviceCmd.Process.Release() }()
		return nil
	}

	return fmt.Errorf("Docker Desktop executable not found in standard locations")
}

// StartDockerEngine attempts to launch the specified or active Docker engine.
func (s *EngineService) StartDockerEngine(engineID string, distro string) error {
	s.mu.Lock()
	if engineID == "" {
		engineID = s.activeEngine
	}
	if distro == "" {
		distro = s.activeDistro
	}
	s.mu.Unlock()

	if engineID == "wsl" {
		if distro == "" {
			distro = "Ubuntu"
		}
		cmd := executil.Command("wsl.exe", "-d", distro, "-u", "root", "service", "docker", "start")
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("failed to start Docker in WSL (%s): %w", distro, err)
		}
		go func() { _ = cmd.Process.Release() }()
		return nil
	}

	switch runtime.GOOS {
	case "windows":
		return s.startWindowsDocker()
	case "darwin":
		cmd := exec.Command("open", "-a", "Docker")
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("failed to start Docker on macOS: %w", err)
		}
		go func() { _ = cmd.Process.Release() }()
		return nil
	case "linux":
		cmd := executil.Command("systemctl", "start", "docker")
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("failed to start docker service on Linux: %w", err)
		}
		go func() { _ = cmd.Process.Release() }()
		return nil
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// checkWSLDockerStatus tests connectivity to Docker running in WSL2.
func (s *EngineService) checkWSLDockerStatus(distro string) bool {
	// 1. Fast TCP connection probe
	conn, err := net.DialTimeout("tcp", "127.0.0.1:2375", 1*time.Second)
	if err == nil {
		_ = conn.Close()
		return true
	}

	// 2. Fallback: check via WSL command
	if distro == "" {
		distro = "Ubuntu"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := executil.CommandContext(ctx, "wsl.exe", "-d", distro, "docker", "info")
	return cmd.Run() == nil
}

// CheckDockerStatus checks if the targeted or active Docker daemon is responsive within 2 seconds.
func (s *EngineService) CheckDockerStatus(engineID string) (bool, error) {
	s.mu.Lock()
	if engineID == "" {
		engineID = s.activeEngine
	}
	distro := s.activeDistro
	s.mu.Unlock()

	if engineID == "wsl" {
		if s.checkWSLDockerStatus(distro) {
			return true, nil
		}
		return false, nil
	}

	// Windows or default engine check
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cmd := executil.CommandContext(ctx, "docker", "info")
	if err := cmd.Run(); err != nil {
		return false, nil
	}

	return true, nil
}
