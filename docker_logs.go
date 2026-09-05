package main

import (
	"bufio"
	"context"
	"fmt"
	"io"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/pkg/stdcopy"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

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
		cmd := s.dockerCommandContext(ctx, "logs", "--tail", "250", "-f", containerID)
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
