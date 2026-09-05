package settings

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

var (
	// ErrInvalidPath represents an error when a supplied path is invalid or outside allowed boundaries.
	ErrInvalidPath = errors.New("invalid file or directory path")
	// ErrSessionNotFound represents an error when a targeted session does not exist.
	ErrSessionNotFound = errors.New("target session not found")
	// ErrCachePurgeFailed represents a failure during application cache clearing.
	ErrCachePurgeFailed = errors.New("failed to purge application cache")
)

// SettingsService handles application-level preferences and cache purge operations.
type SettingsService struct {
	ctx context.Context
	mu  sync.RWMutex
}

// NewSettingsService creates a new SettingsService.
func NewSettingsService() *SettingsService {
	return &SettingsService{}
}

// SetContext assigns the Wails runtime context.
func (s *SettingsService) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

// ClearAppCache purges temporary logs, cached preview buffers, and scratch files.
func (s *SettingsService) ClearAppCache() (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tmpDir := os.TempDir()
	// Target temporary files prefixed with octa
	matches, err := filepath.Glob(filepath.Join(tmpDir, "octa-*"))
	if err == nil {
		for _, m := range matches {
			_ = os.RemoveAll(m)
		}
	}

	fmt.Println("[DEBUG SettingsService] Cleared application temporary caches and scratch buffers.")
	return true, nil
}
