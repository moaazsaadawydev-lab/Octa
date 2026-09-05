package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
)

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
	cmd := s.dockerCommand("start", containerID)
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
	cmd := s.dockerCommand("stop", containerID)
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
	cmd := s.dockerCommand("restart", containerID)
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

	cmd := s.dockerCommand(args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("failed to remove container %s: %s", containerID, strings.TrimSpace(string(out)))
	}
	return true, nil
}
