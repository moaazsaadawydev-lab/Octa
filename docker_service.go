package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/client"

	"octa/internal/docker"
	"octa/internal/executil"
)

// DockerPortMapping represents an exposed or forwarded port
type DockerPortMapping struct {
	PrivatePort uint16 `json:"privatePort"`
	PublicPort  uint16 `json:"publicPort,omitempty"`
	Type        string `json:"type"`
	Formatted   string `json:"formatted"`
}

// DockerContainer represents a single container entity
type DockerContainer struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Image     string              `json:"image"`
	Command   string              `json:"command"`
	CreatedAt string              `json:"createdAt"`
	State     string              `json:"state"`     // "running", "exited", "paused", "restarting"
	Status    string              `json:"status"`    // e.g. "Up 28 hours (healthy)", "Exited (0)"
	Ports     []DockerPortMapping `json:"ports"`
	PortsRaw  string              `json:"portsRaw"`
	Project   string              `json:"project"`   // Compose project or "Standalone Containers"
	Service   string              `json:"service"`   // Compose service name or container name
	Size      string              `json:"size"`
}

// DockerProjectGroup groups containers by Docker Compose project
type DockerProjectGroup struct {
	Project           string            `json:"project"`
	TotalContainers   int               `json:"totalContainers"`
	RunningContainers int               `json:"runningContainers"`
	Containers        []DockerContainer `json:"containers"`
}

// execSession tracks an active interactive exec session inside a container
type execSession struct {
	sessionID   string
	containerID string
	execID      string
	conn        io.WriteCloser
	cancel      context.CancelFunc
}

// dockerCommand creates an exec.Cmd with suppressed console window on Windows
func (s *DockerService) dockerCommand(args ...string) *exec.Cmd {
	cmd := executil.Command("docker", args...)
	s.mu.Lock()
	engine := s.activeEngine
	s.mu.Unlock()
	if engine == "wsl" {
		cmd.Env = append(os.Environ(), "DOCKER_HOST=tcp://127.0.0.1:2375")
	}
	return cmd
}

// dockerCommandContext creates a context-bound exec.Cmd with suppressed console window on Windows
func (s *DockerService) dockerCommandContext(ctx context.Context, args ...string) *exec.Cmd {
	cmd := executil.CommandContext(ctx, "docker", args...)
	s.mu.Lock()
	engine := s.activeEngine
	s.mu.Unlock()
	if engine == "wsl" {
		cmd.Env = append(os.Environ(), "DOCKER_HOST=tcp://127.0.0.1:2375")
	}
	return cmd
}

// DockerService manages Docker engine interactions via Hybrid SDK + CLI Fallback
type DockerService struct {
	ctx          context.Context
	cli          *client.Client
	mu           sync.Mutex
	logStreams   map[string]context.CancelFunc
	execSessions map[string]*execSession
	activeEngine string // "windows" | "wsl"
	activeDistro string // e.g. "Ubuntu"
}

// NewDockerService creates a new DockerService restoring the persisted engine.
func NewDockerService() *DockerService {
	storedEngine, storedDistro := docker.LoadStoredEngine()
	if storedEngine == "" {
		storedEngine = "windows"
	}
	return &DockerService{
		logStreams:   make(map[string]context.CancelFunc),
		execSessions: make(map[string]*execSession),
		activeEngine: storedEngine,
		activeDistro: storedDistro,
	}
}

// SetContext sets the Wails runtime context.
func (s *DockerService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// SetDockerEngine switches the active Docker Engine provider and invalidates existing client.
func (s *DockerService) SetDockerEngine(engineID string, distro string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.activeEngine != engineID || s.activeDistro != distro {
		s.activeEngine = engineID
		s.activeDistro = distro
		docker.SaveStoredEngine(engineID, distro)
		if s.cli != nil {
			_ = s.cli.Close()
			s.cli = nil
		}
	}
}

// initClient creates or reuses a Docker client with explicit API version negotiation
func (s *DockerService) initClient() (*client.Client, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If already initialized and responding, reuse client
	if s.cli != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()
		if _, err := s.cli.Ping(ctx); err == nil {
			return s.cli, nil
		}
		_ = s.cli.Close()
		s.cli = nil
	}

	opts := []client.Opt{
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	}

	if s.activeEngine == "wsl" {
		opts = append(opts, client.WithHost("tcp://127.0.0.1:2375"))
	} else if runtime.GOOS == "windows" {
		opts = append(opts, client.WithHost("npipe:////./pipe/docker_engine"))
	}

	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed creating docker client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	ping, err := cli.Ping(ctx)
	if err != nil && runtime.GOOS == "windows" && s.activeEngine != "wsl" {
		// Fallback for Docker Desktop Linux Engine pipe
		fallbackOpts := []client.Opt{
			client.FromEnv,
			client.WithAPIVersionNegotiation(),
			client.WithHost("npipe:////./pipe/dockerDesktopLinuxEngine"),
		}
		if fallbackCli, fallbackErr := client.NewClientWithOpts(fallbackOpts...); fallbackErr == nil {
			if fallbackPing, pErr := fallbackCli.Ping(ctx); pErr == nil {
				_ = cli.Close()
				cli = fallbackCli
				ping = fallbackPing
				err = nil
			} else {
				_ = fallbackCli.Close()
			}
		}
	}

	if err != nil {
		_ = cli.Close()
		return nil, fmt.Errorf("docker daemon ping failed: %w", err)
	}

	println("[DEBUG DockerService] Connected successfully! Engine:", s.activeEngine, "Docker API Version:", ping.APIVersion)
	s.cli = cli
	return s.cli, nil
}

// checkDockerCliAvailable verifies if the local Docker CLI is functional
func (s *DockerService) checkDockerCliAvailable() (bool, string) {
	cmd := s.dockerCommand("version", "--format", "{{.Server.Version}}")
	out, err := cmd.Output()
	if err == nil && len(strings.TrimSpace(string(out))) > 0 {
		return true, strings.TrimSpace(string(out))
	}
	return false, ""
}

// CheckDockerAvailability / CheckConnection tests connection via SDK or CLI fallback
func (s *DockerService) CheckDockerAvailability() (bool, string) {
	println("[DEBUG DockerService] CheckConnection / CheckDockerAvailability invoked from Frontend! ActiveEngine:", s.activeEngine)

	cli, err := s.initClient()
	if err == nil && cli != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if ping, pingErr := cli.Ping(ctx); pingErr == nil {
			return true, ping.APIVersion
		}
	}

	if err != nil {
		println("[DEBUG DockerService] Docker SDK init error:", err.Error(), "- testing CLI fallback...")
	}

	if available, ver := s.checkDockerCliAvailable(); available {
		println("[DEBUG DockerService] Fallback: Docker CLI is available and working! Server Version:", ver)
		return true, ver
	}

	errMsg := "Docker daemon is not responding"
	if err != nil {
		errMsg = err.Error()
	}
	println("[DEBUG DockerService] Docker connection check failed:", errMsg)
	return false, errMsg
}
