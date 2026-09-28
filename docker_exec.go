package main

import (
	"context"
	"fmt"
	"time"

	"github.com/docker/docker/api/types/container"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// StartContainer starts and attaches to an interactive shell session in a running container
func (s *DockerService) StartContainerExec(sessionID string, containerID string, cols int, rows int) error {
	// Close existing session with same ID if any
	_ = s.CloseContainerExec(sessionID)

	cli, err := s.initClient()
	if err != nil {
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
		return fmt.Errorf("failed to create exec instance: %w", err)
	}

	attachConfig := container.ExecAttachOptions{
		Tty: true,
	}

	resp, err := cli.ContainerExecAttach(ctx, execIDResp.ID, attachConfig)
	if err != nil {
		cancel()
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
