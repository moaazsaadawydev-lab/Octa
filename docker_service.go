package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
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

// DockerService manages Docker engine interactions via Hybrid SDK + CLI Fallback
type DockerService struct {
	ctx          context.Context
	cli          *client.Client
	mu           sync.Mutex
	logStreams   map[string]context.CancelFunc
	execSessions map[string]*execSession
}

func NewDockerService() *DockerService {
	return &DockerService{
		logStreams:   make(map[string]context.CancelFunc),
		execSessions: make(map[string]*execSession),
	}
}

func (s *DockerService) SetContext(ctx context.Context) {
	s.ctx = ctx
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

	if runtime.GOOS == "windows" {
		opts = append(opts, client.WithHost("npipe:////./pipe/docker_engine"))
	}

	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed creating docker client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	ping, err := cli.Ping(ctx)
	if err != nil {
		_ = cli.Close()
		return nil, fmt.Errorf("docker daemon ping failed: %w", err)
	}

	println("[DEBUG DockerService] Connected successfully! Docker API Version:", ping.APIVersion)
	s.cli = cli
	return s.cli, nil
}

// checkDockerCliAvailable verifies if the local Docker CLI is functional
func (s *DockerService) checkDockerCliAvailable() (bool, string) {
	cmd := exec.Command("docker", "version", "--format", "{{.Server.Version}}")
	out, err := cmd.Output()
	if err == nil && len(strings.TrimSpace(string(out))) > 0 {
		return true, strings.TrimSpace(string(out))
	}
	return false, ""
}

// CheckDockerAvailability / CheckConnection tests connection via SDK or CLI fallback
func (s *DockerService) CheckDockerAvailability() (bool, string) {
	println("[DEBUG DockerService] CheckConnection / CheckDockerAvailability invoked from Frontend!")

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

type rawDockerCLIContainer struct {
	ID        string `json:"ID"`
	Names     string `json:"Names"`
	Image     string `json:"Image"`
	Command   string `json:"Command"`
	CreatedAt string `json:"CreatedAt"`
	State     string `json:"State"`
	Status    string `json:"Status"`
	Ports     string `json:"Ports"`
	Labels    string `json:"Labels"`
	Size      string `json:"Size"`
}

func parseDockerCLILabels(labelsStr string) map[string]string {
	res := make(map[string]string)
	if labelsStr == "" {
		return res
	}
	parts := strings.Split(labelsStr, ",")
	for _, p := range parts {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) == 2 {
			res[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return res
}

func parseDockerCLIPorts(portsRaw string) []DockerPortMapping {
	var result []DockerPortMapping
	if portsRaw == "" {
		return result
	}
	parts := strings.Split(portsRaw, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, DockerPortMapping{
				Formatted: part,
			})
		}
	}
	return result
}

// listContainersViaCLI executes docker ps with JSON formatting
func (s *DockerService) listContainersViaCLI(onlyRunning bool) ([]DockerProjectGroup, error) {
	args := []string{"ps", "--format", "{{json .}}"}
	if !onlyRunning {
		args = append(args, "-a")
	}

	cmd := exec.Command("docker", args...)
	out, err := cmd.Output()
	if err != nil {
		println("[DEBUG DockerService] CLI listContainers error:", err.Error())
		return nil, fmt.Errorf("failed to query containers via CLI: %w", err)
	}

	var containers []DockerContainer
	lines := bytes.Split(out, []byte("\n"))
	for _, line := range lines {
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		var raw rawDockerCLIContainer
		if err := json.Unmarshal(line, &raw); err != nil {
			continue
		}

		labels := parseDockerCLILabels(raw.Labels)
		projectName := labels["com.docker.compose.project"]
		if projectName == "" {
			projectName = "Standalone Containers"
		}
		serviceName := labels["com.docker.compose.service"]
		if serviceName == "" {
			serviceName = raw.Names
		}

		c := DockerContainer{
			ID:        raw.ID,
			Name:      raw.Names,
			Image:     raw.Image,
			Command:   raw.Command,
			CreatedAt: raw.CreatedAt,
			State:     strings.ToLower(raw.State),
			Status:    raw.Status,
			Ports:     parseDockerCLIPorts(raw.Ports),
			PortsRaw:  raw.Ports,
			Project:   projectName,
			Service:   serviceName,
			Size:      raw.Size,
		}
		containers = append(containers, c)
	}

	// Group by project
	groupsMap := make(map[string]*DockerProjectGroup)
	for _, c := range containers {
		group, exists := groupsMap[c.Project]
		if !exists {
			group = &DockerProjectGroup{
				Project:    c.Project,
				Containers: []DockerContainer{},
			}
			groupsMap[c.Project] = group
		}
		group.Containers = append(group.Containers, c)
		group.TotalContainers++
		if c.State == "running" {
			group.RunningContainers++
		}
	}

	var result []DockerProjectGroup
	for _, g := range groupsMap {
		result = append(result, *g)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Project == "Standalone Containers" {
			return false
		}
		if result[j].Project == "Standalone Containers" {
			return true
		}
		return result[i].Project < result[j].Project
	})

	println(fmt.Sprintf("[DEBUG DockerService] Retrieved %d groups (%d containers) via CLI fallback", len(result), len(containers)))
	return result, nil
}

// ListContainers queries and groups containers by Compose project (SDK + CLI fallback)
func (s *DockerService) ListContainers(onlyRunning bool) ([]DockerProjectGroup, error) {
	println(fmt.Sprintf("[DEBUG DockerService] ListContainers invoked from Frontend (onlyRunning: %v)", onlyRunning))

	cli, err := s.initClient()
	if err != nil {
		println("[DEBUG DockerService] SDK client unavailable, using CLI fallback...")
		return s.listContainersViaCLI(onlyRunning)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	listOpts := container.ListOptions{
		All: !onlyRunning,
	}

	rawList, err := cli.ContainerList(ctx, listOpts)
	if err != nil {
		println("[DEBUG DockerService] SDK ContainerList failed:", err.Error(), "- using CLI fallback...")
		return s.listContainersViaCLI(onlyRunning)
	}

	var containers []DockerContainer
	for _, raw := range rawList {
		containerName := ""
		if len(raw.Names) > 0 {
			containerName = strings.TrimPrefix(raw.Names[0], "/")
		}

		projectName := raw.Labels["com.docker.compose.project"]
		if projectName == "" {
			projectName = "Standalone Containers"
		}
		serviceName := raw.Labels["com.docker.compose.service"]
		if serviceName == "" {
			serviceName = containerName
		}

		var ports []DockerPortMapping
		var portStrings []string
		for _, p := range raw.Ports {
			formatted := ""
			if p.PublicPort > 0 {
				if p.IP != "" && p.IP != "0.0.0.0" && p.IP != "::" {
					formatted = fmt.Sprintf("%s:%d->%d/%s", p.IP, p.PublicPort, p.PrivatePort, p.Type)
				} else {
					formatted = fmt.Sprintf("%d->%d/%s", p.PublicPort, p.PrivatePort, p.Type)
				}
			} else {
				formatted = fmt.Sprintf("%d/%s", p.PrivatePort, p.Type)
			}
			ports = append(ports, DockerPortMapping{
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
				Formatted:   formatted,
			})
			portStrings = append(portStrings, formatted)
		}

		sizeStr := ""
		if raw.SizeRw > 0 {
			sizeStr = fmt.Sprintf("%d B", raw.SizeRw)
		}

		c := DockerContainer{
			ID:        raw.ID,
			Name:      containerName,
			Image:     raw.Image,
			Command:   raw.Command,
			CreatedAt: time.Unix(raw.Created, 0).Format("2006-01-02 15:04:05"),
			State:     strings.ToLower(raw.State),
			Status:    raw.Status,
			Ports:     ports,
			PortsRaw:  strings.Join(portStrings, ", "),
			Project:   projectName,
			Service:   serviceName,
			Size:      sizeStr,
		}
		containers = append(containers, c)
	}

	// Group by project
	groupsMap := make(map[string]*DockerProjectGroup)
	for _, c := range containers {
		group, exists := groupsMap[c.Project]
		if !exists {
			group = &DockerProjectGroup{
				Project:    c.Project,
				Containers: []DockerContainer{},
			}
			groupsMap[c.Project] = group
		}
		group.Containers = append(group.Containers, c)
		group.TotalContainers++
		if c.State == "running" {
			group.RunningContainers++
		}
	}

	var result []DockerProjectGroup
	for _, g := range groupsMap {
		result = append(result, *g)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Project == "Standalone Containers" {
			return false
		}
		if result[j].Project == "Standalone Containers" {
			return true
		}
		return result[i].Project < result[j].Project
	})

	println(fmt.Sprintf("[DEBUG DockerService] Retrieved %d groups (%d containers) via SDK", len(result), len(containers)))
	return result, nil
}

// StartContainer starts a container by ID
func (s *DockerService) StartContainer(containerID string) (bool, error) {
	println("[DEBUG DockerService] Starting container:", containerID)
	cli, err := s.initClient()
	if err == nil && cli != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := cli.ContainerStart(ctx, containerID, container.StartOptions{}); err == nil {
			return true, nil
		}
	}

	// Fallback to CLI
	cmd := exec.Command("docker", "start", containerID)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to start container %s: %s", containerID, strings.TrimSpace(string(out)))
	}
	return true, nil
}

// StopContainer stops a container by ID
func (s *DockerService) StopContainer(containerID string) (bool, error) {
	println("[DEBUG DockerService] Stopping container:", containerID)
	cli, err := s.initClient()
	if err == nil && cli != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		timeout := 10
		if err := cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err == nil {
			return true, nil
		}
	}

	// Fallback to CLI
	cmd := exec.Command("docker", "stop", containerID)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to stop container %s: %s", containerID, strings.TrimSpace(string(out)))
	}
	return true, nil
}

// RestartContainer restarts a container by ID
func (s *DockerService) RestartContainer(containerID string) (bool, error) {
	println("[DEBUG DockerService] Restarting container:", containerID)
	cli, err := s.initClient()
	if err == nil && cli != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		timeout := 10
		if err := cli.ContainerRestart(ctx, containerID, container.StopOptions{Timeout: &timeout}); err == nil {
			return true, nil
		}
	}

	// Fallback to CLI
	cmd := exec.Command("docker", "restart", containerID)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to restart container %s: %s", containerID, strings.TrimSpace(string(out)))
	}
	return true, nil
}

// RemoveContainer removes a container by ID
func (s *DockerService) RemoveContainer(containerID string, force bool) (bool, error) {
	println("[DEBUG DockerService] Removing container:", containerID)
	cli, err := s.initClient()
	if err == nil && cli != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		removeOpts := container.RemoveOptions{
			Force:         force,
			RemoveVolumes: true,
		}
		if err := cli.ContainerRemove(ctx, containerID, removeOpts); err == nil {
			return true, nil
		}
	}

	// Fallback to CLI
	args := []string{"rm"}
	if force {
		args = append(args, "-f")
	}
	args = append(args, containerID)

	cmd := exec.Command("docker", args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to remove container %s: %s", containerID, strings.TrimSpace(string(out)))
	}
	return true, nil
}

// StartLogStream streams container stdout/stderr logs over Wails events
func (s *DockerService) StartLogStream(containerID string) error {
	s.mu.Lock()
	if cancel, exists := s.logStreams[containerID]; exists {
		cancel()
		delete(s.logStreams, containerID)
	}

	ctx, cancel := context.WithCancel(context.Background())
	s.logStreams[containerID] = cancel
	s.mu.Unlock()

	go func() {
		defer func() {
			s.mu.Lock()
			delete(s.logStreams, containerID)
			s.mu.Unlock()
		}()

		// Try SDK logs first
		cli, err := s.initClient()
		if err == nil && cli != nil {
			logOpts := container.LogsOptions{
				ShowStdout: true,
				ShowStderr: true,
				Follow:     true,
				Tail:       "250",
				Timestamps: false,
			}

			reader, err := cli.ContainerLogs(ctx, containerID, logOpts)
			if err == nil {
				defer reader.Close()
				stdoutReader, stdoutWriter := io.Pipe()

				go func() {
					defer stdoutWriter.Close()
					_, _ = stdcopy.StdCopy(stdoutWriter, stdoutWriter, reader)
				}()

				scanner := bufio.NewScanner(stdoutReader)
				for scanner.Scan() {
					select {
					case <-ctx.Done():
						return
					default:
						line := scanner.Text()
						if s.ctx != nil {
							wailsRuntime.EventsEmit(s.ctx, "docker:logs:"+containerID, line+"\n")
						}
					}
				}
				return
			}
		}

		// Fallback to CLI streaming
		cmd := exec.CommandContext(ctx, "docker", "logs", "--tail", "250", "-f", containerID)
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			if s.ctx != nil {
				wailsRuntime.EventsEmit(s.ctx, "docker:logs:"+containerID, fmt.Sprintf("[Error]: %v\n", err))
			}
			return
		}
		cmd.Stderr = cmd.Stdout

		if err := cmd.Start(); err != nil {
			if s.ctx != nil {
				wailsRuntime.EventsEmit(s.ctx, "docker:logs:"+containerID, fmt.Sprintf("[Error starting logs]: %v\n", err))
			}
			return
		}

		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			select {
			case <-ctx.Done():
				_ = cmd.Process.Kill()
				return
			default:
				line := scanner.Text()
				if s.ctx != nil {
					wailsRuntime.EventsEmit(s.ctx, "docker:logs:"+containerID, line+"\n")
				}
			}
		}

		_ = cmd.Wait()
	}()

	return nil
}

// StopLogStream stops live log streaming for a specific container
func (s *DockerService) StopLogStream(containerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if cancel, exists := s.logStreams[containerID]; exists {
		cancel()
		delete(s.logStreams, containerID)
	}
	return nil
}

// StopAllLogStreams terminates all active log stream goroutines
func (s *DockerService) StopAllLogStreams() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, cancel := range s.logStreams {
		cancel()
		delete(s.logStreams, id)
	}
}

// ============================================================================
// INTERACTIVE CONTAINER EXEC TERMINAL (docker exec -it)
// ============================================================================

// StartContainerExec creates and attaches to an interactive shell session in a running container
func (s *DockerService) StartContainerExec(sessionID string, containerID string, cols int, rows int) error {
	println(fmt.Sprintf("[DEBUG DockerService] StartContainerExec invoked for session %s (container: %s, %dx%d)", sessionID, containerID, cols, rows))

	// Close existing session with same ID if any
	_ = s.CloseContainerExec(sessionID)

	cli, err := s.initClient()
	if err != nil {
		println("[DEBUG DockerService] StartContainerExec SDK init error:", err.Error())
		return fmt.Errorf("failed to connect to Docker engine: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	execConfig := container.ExecOptions{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          []string{"sh", "-c", "command -v bash >/dev/null 2>&1 && exec bash || exec sh"},
	}

	execIDResp, err := cli.ContainerExecCreate(ctx, containerID, execConfig)
	if err != nil {
		cancel()
		println("[DEBUG DockerService] ContainerExecCreate error:", err.Error())
		return fmt.Errorf("failed to create exec instance: %w", err)
	}

	attachConfig := container.ExecAttachOptions{
		Tty: true,
	}

	resp, err := cli.ContainerExecAttach(ctx, execIDResp.ID, attachConfig)
	if err != nil {
		cancel()
		println("[DEBUG DockerService] ContainerExecAttach error:", err.Error())
		return fmt.Errorf("failed to attach to exec instance: %w", err)
	}

	sess := &execSession{
		sessionID:   sessionID,
		containerID: containerID,
		execID:      execIDResp.ID,
		conn:        resp.Conn,
		cancel:      cancel,
	}

	s.mu.Lock()
	s.execSessions[sessionID] = sess
	s.mu.Unlock()

	// Initial resize
	if cols > 0 && rows > 0 {
		_ = cli.ContainerExecResize(ctx, execIDResp.ID, container.ResizeOptions{
			Height: uint(rows),
			Width:  uint(cols),
		})
	}

	// Reader goroutine
	go func() {
		defer func() {
			resp.Close()
			s.mu.Lock()
			delete(s.execSessions, sessionID)
			s.mu.Unlock()
			println("[DEBUG DockerService] Exec reader terminated for session:", sessionID)
		}()

		buf := make([]byte, 4096)
		for {
			n, err := resp.Reader.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				if s.ctx != nil {
					wailsRuntime.EventsEmit(s.ctx, "docker:exec:data:"+sessionID, chunk)
				}
			}
			if err != nil {
				if err != io.EOF && !strings.Contains(err.Error(), "closed") && !strings.Contains(err.Error(), "use of closed network connection") {
					println("[DEBUG DockerService] Exec read ended for", sessionID, ":", err.Error())
				}
				return
			}
		}
	}()

	return nil
}

// WriteContainerExec sends keyboard / stdin data to the active exec session
func (s *DockerService) WriteContainerExec(sessionID string, data string) error {
	s.mu.Lock()
	sess, exists := s.execSessions[sessionID]
	s.mu.Unlock()

	if !exists || sess == nil || sess.conn == nil {
		return nil
	}

	_, err := sess.conn.Write([]byte(data))
	return err
}

// ResizeContainerExec updates the TTY columns and rows of the exec session
func (s *DockerService) ResizeContainerExec(sessionID string, cols int, rows int) error {
	s.mu.Lock()
	sess, exists := s.execSessions[sessionID]
	cli := s.cli
	s.mu.Unlock()

	if !exists || sess == nil || cli == nil || cols <= 0 || rows <= 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return cli.ContainerExecResize(ctx, sess.execID, container.ResizeOptions{
		Height: uint(rows),
		Width:  uint(cols),
	})
}

// CloseContainerExec closes the interactive exec session and releases resources
func (s *DockerService) CloseContainerExec(sessionID string) error {
	s.mu.Lock()
	sess, exists := s.execSessions[sessionID]
	if exists {
		delete(s.execSessions, sessionID)
	}
	s.mu.Unlock()

	if exists && sess != nil {
		println("[DEBUG DockerService] Closing exec session:", sessionID)
		if sess.cancel != nil {
			sess.cancel()
		}
		if sess.conn != nil {
			_ = sess.conn.Close()
		}
	}
	return nil
}

// StopAllExecSessions terminates all active container exec sessions
func (s *DockerService) StopAllExecSessions() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, sess := range s.execSessions {
		if sess.cancel != nil {
			sess.cancel()
		}
		if sess.conn != nil {
			_ = sess.conn.Close()
		}
		delete(s.execSessions, id)
	}
}
