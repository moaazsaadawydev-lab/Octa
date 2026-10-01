package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"octa/internal/executil"
)

// InitRepoOptions specifies advanced repository initialization options
type InitRepoOptions struct {
	Path          string `json:"path"`
	AddGitignore  bool   `json:"addGitignore"`
	GitignoreType string `json:"gitignoreType"` // "Node", "Go", "Python", "General"
	AddReadme     bool   `json:"addReadme"`
	RepoName      string `json:"repoName"`
}

// gitCommand creates an exec.Cmd with suppressed console window on Windows
func gitCommand(args ...string) *exec.Cmd {
	return executil.Command("git", args...)
}

// GitService handles native Git commands via host CLI and watches the active repo
type GitService struct {
	ctx         context.Context
	mu          sync.Mutex
	watcher     *fsnotify.Watcher
	stopWatcher chan struct{}
	currentRepo string
}

func NewGitService() *GitService {
	return &GitService{}
}

func (s *GitService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *GitService) Startup(ctx context.Context) {
	s.ctx = ctx
}

// StartAutoWatch starts debounced filesystem monitoring for the active repository
func (s *GitService) StartAutoWatch(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.stopAutoWatchInternal()

	if repoPath == "" {
		return nil
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	s.watcher = watcher
	s.stopWatcher = make(chan struct{})
	s.currentRepo = repoPath

	// Add root directory and immediate code directories (exclude noise dirs)
	_ = filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil || !info.IsDir() {
			return nil
		}
		name := info.Name()
		if name == ".git" || name == "node_modules" || name == "dist" || name == "build" || name == ".next" || name == "vendor" || name == ".octa" || name == "tmp" || name == "bin" {
			return filepath.SkipDir
		}
		_ = watcher.Add(path)
		return nil
	})

	go func(stopCh chan struct{}, w *fsnotify.Watcher, targetRepo string) {
		var debounceTimer *time.Timer
		var timerMu sync.Mutex

		for {
			select {
			case <-stopCh:
				return
			case event, ok := <-w.Events:
				if !ok {
					return
				}

				// Check for newly created directories and dynamically add them
				if event.Op&fsnotify.Create != 0 {
					if fi, statErr := os.Stat(event.Name); statErr == nil && fi.IsDir() {
						name := fi.Name()
						if name != ".git" && name != "node_modules" && name != "dist" && name != "build" && name != ".next" {
							_ = w.Add(event.Name)
						}
					}
				}

				// Ignore noise operations and internal .git changes
				if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Remove|fsnotify.Rename) != 0 {
					if strings.Contains(event.Name, ".git") {
						continue
					}

					timerMu.Lock()
					if debounceTimer != nil {
						debounceTimer.Stop()
					}
					debounceTimer = time.AfterFunc(300*time.Millisecond, func() {
						if s.ctx != nil {
							wailsRuntime.EventsEmit(s.ctx, "git:status:changed", targetRepo)
						}
					})
					timerMu.Unlock()
				}
			case _, ok := <-w.Errors:
				if !ok {
					return
				}
			}
		}
	}(s.stopWatcher, watcher, repoPath)

	return nil
}

func (s *GitService) stopAutoWatchInternal() {
	if s.stopWatcher != nil {
		close(s.stopWatcher)
		s.stopWatcher = nil
	}
	if s.watcher != nil {
		_ = s.watcher.Close()
		s.watcher = nil
	}
	s.currentRepo = ""
}

// StopAutoWatch stops any running repository file system watcher
func (s *GitService) StopAutoWatch() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stopAutoWatchInternal()
}

// OpenRepositoryDialog opens native directory picker and verifies if it is a git repo
func (s *GitService) OpenRepositoryDialog() (string, error) {
	if s.ctx == nil {
		return "", fmt.Errorf("app context not initialized")
	}

	selectedDir, err := wailsRuntime.OpenDirectoryDialog(s.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Git Repository Directory",
	})
	if err != nil {
		return "", err
	}
	if selectedDir == "" {
		return "", nil // User cancelled
	}

	return selectedDir, nil
}

// IsGitRepository checks whether a target path is an existing git repository
func (s *GitService) IsGitRepository(repoPath string) bool {
	if repoPath == "" {
		return false
	}
	gitDir := filepath.Join(repoPath, ".git")
	info, err := os.Stat(gitDir)
	if err == nil && info.IsDir() {
		return true
	}

	// Fallback to git rev-parse check
	checkCmd := gitCommand("-C", repoPath, "rev-parse", "--is-inside-work-tree")
	out, cErr := checkCmd.Output()
	return cErr == nil && strings.TrimSpace(string(out)) == "true"
}

// InitializeRepositoryWithOptions creates a new repo with custom .gitignore and README.md
func (s *GitService) InitializeRepositoryWithOptions(opts InitRepoOptions) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if opts.Path == "" {
		return fmt.Errorf("repository path cannot be empty")
	}

	// 1. Run git init
	cmd := gitCommand("-C", opts.Path, "init")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git init failed: %s", strings.TrimSpace(string(out)))
	}

	// 2. Add .gitignore if requested
	if opts.AddGitignore {
		var gitignoreContent string
		switch opts.GitignoreType {
		case "Go":
			gitignoreContent = "bin/\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\nvendor/\n.env\n"
		case "Python":
			gitignoreContent = "__pycache__/\n*.py[cod]\n*$py.class\n*.so\n.Python\nbuild/\ndist/\n.env\nvenv/\nENV/\n"
		case "General":
			gitignoreContent = ".env\n*.log\n.DS_Store\nThumbs.db\ntmp/\n"
		default: // "Node"
			gitignoreContent = "node_modules/\ndist/\nbuild/\n.env\n.env.local\n*.log\n.DS_Store\ncoverage/\n"
		}

		gitignorePath := filepath.Join(opts.Path, ".gitignore")
		// Only create if .gitignore doesn't already exist
		if _, statErr := os.Stat(gitignorePath); os.IsNotExist(statErr) {
			_ = os.WriteFile(gitignorePath, []byte(gitignoreContent), 0644)
		}
	}

	// 3. Add README.md if requested
	if opts.AddReadme {
		readmePath := filepath.Join(opts.Path, "README.md")
		if _, statErr := os.Stat(readmePath); os.IsNotExist(statErr) {
			repoTitle := opts.RepoName
			if repoTitle == "" {
				repoTitle = filepath.Base(opts.Path)
			}
			readmeContent := fmt.Sprintf("# %s\n\nProject initialized via Octa.\n", repoTitle)
			_ = os.WriteFile(readmePath, []byte(readmeContent), 0644)
		}
	}

	return nil
}

// InitRepository runs git init in the target directory
func (s *GitService) InitRepository(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := gitCommand("-C", repoPath, "init")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to init git repository: %s", strings.TrimSpace(string(out)))
	}
	return nil
}
