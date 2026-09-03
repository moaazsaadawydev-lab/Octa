package main

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// GitFileChange describes a modified, staged, untracked, or deleted file
type GitFileChange struct {
	Path    string `json:"path"`
	OldPath string `json:"oldPath,omitempty"`
	Status  string `json:"status"` // "modified", "added", "deleted", "untracked", "renamed"
	Staged  bool   `json:"staged"`
}

// GitStatusResult contains the complete status of the active repository
type GitStatusResult struct {
	IsRepo         bool            `json:"isRepo"`
	RepoPath       string          `json:"repoPath"`
	Branch         string          `json:"branch"`
	Upstream       string          `json:"upstream"`
	Ahead          int             `json:"ahead"`
	Behind         int             `json:"behind"`
	StagedFiles    []GitFileChange `json:"stagedFiles"`
	UnstagedFiles  []GitFileChange `json:"unstagedFiles"`
	UntrackedFiles []GitFileChange `json:"untrackedFiles"`
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
		println("[DEBUG GitWatcher] Failed to create fsnotify watcher:", err.Error())
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

	println("[DEBUG GitWatcher] Started watching repo path:", repoPath)

	go func(stopCh chan struct{}, w *fsnotify.Watcher, targetRepo string) {
		var debounceTimer *time.Timer
		var timerMu sync.Mutex

		for {
			select {
			case <-stopCh:
				println("[DEBUG GitWatcher] Stop signal received for repo:", targetRepo)
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
							println("[DEBUG GitWatcher] Emitting git:status:changed for:", targetRepo)
							wailsRuntime.EventsEmit(s.ctx, "git:status:changed", targetRepo)
						}
					})
					timerMu.Unlock()
				}
			case err, ok := <-w.Errors:
				if !ok {
					return
				}
				println("[DEBUG GitWatcher Error]:", err.Error())
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
	println("[DEBUG GitService] OpenRepositoryDialog invoked from Frontend")
	if s.ctx == nil {
		println("[DEBUG GitService] Error: app context is nil")
		return "", fmt.Errorf("app context not initialized")
	}

	selectedDir, err := wailsRuntime.OpenDirectoryDialog(s.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Git Repository Directory",
	})
	if err != nil {
		println("[DEBUG GitService] OpenDirectoryDialog error:", err.Error())
		return "", err
	}
	if selectedDir == "" {
		println("[DEBUG GitService] OpenDirectoryDialog cancelled by user")
		return "", nil // User cancelled
	}

	println("[DEBUG GitService] User selected path:", selectedDir)
	return selectedDir, nil
}

// InitRepository runs git init in the target directory
func (s *GitService) InitRepository(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	println("[DEBUG GitService] InitRepository invoked for path:", repoPath)
	cmd := exec.Command("git", "-C", repoPath, "init")
	out, err := cmd.CombinedOutput()
	if err != nil {
		println("[DEBUG GitService] InitRepository error:", string(out))
		return fmt.Errorf("failed to init git repository: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// GetRepoStatus gathers branch, upstream tracking, ahead/behind count, and changes
func (s *GitService) GetRepoStatus(repoPath string) (*GitStatusResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	res := &GitStatusResult{
		IsRepo:         false,
		RepoPath:       repoPath,
		StagedFiles:    []GitFileChange{},
		UnstagedFiles:  []GitFileChange{},
		UntrackedFiles: []GitFileChange{},
	}

	if repoPath == "" {
		return res, nil
	}

	// Verify if inside a git work tree
	checkCmd := exec.Command("git", "-C", repoPath, "rev-parse", "--is-inside-work-tree")
	if out, err := checkCmd.Output(); err != nil || strings.TrimSpace(string(out)) != "true" {
		return res, nil
	}
	res.IsRepo = true

	// Refresh Git's index cache so reverted file timestamps don't trigger false positives
	refreshCmd := exec.Command("git", "-C", repoPath, "update-index", "-q", "--refresh")
	_ = refreshCmd.Run() // Silent run; exit code non-zero if worktree has changes, which is expected

	// Get current branch
	branchCmd := exec.Command("git", "-C", repoPath, "branch", "--show-current")
	if out, err := branchCmd.Output(); err == nil {
		res.Branch = strings.TrimSpace(string(out))
	}
	if res.Branch == "" {
		// Try short HEAD for detached state
		headCmd := exec.Command("git", "-C", repoPath, "rev-parse", "--short", "HEAD")
		if out, err := headCmd.Output(); err == nil {
			res.Branch = "HEAD (" + strings.TrimSpace(string(out)) + ")"
		} else {
			res.Branch = "main"
		}
	}

	// Get upstream branch
	upstreamCmd := exec.Command("git", "-C", repoPath, "rev-parse", "--abbrev-ref", "@{u}")
	if out, err := upstreamCmd.Output(); err == nil {
		res.Upstream = strings.TrimSpace(string(out))
	}

	// Get ahead / behind count if upstream exists
	if res.Upstream != "" {
		countCmd := exec.Command("git", "-C", repoPath, "rev-list", "--left-right", "--count", "HEAD...@{u}")
		if out, err := countCmd.Output(); err == nil {
			parts := strings.Fields(strings.TrimSpace(string(out)))
			if len(parts) >= 2 {
				ahead, _ := strconv.Atoi(parts[0])
				behind, _ := strconv.Atoi(parts[1])
				res.Ahead = ahead
				res.Behind = behind
			}
		}
	}

	// Parse porcelain status
	statusCmd := exec.Command("git", "-C", repoPath, "status", "--porcelain=v1", "-u")
	out, err := statusCmd.Output()
	if err != nil {
		return res, nil
	}

	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 4 {
			continue
		}

		x := line[0]
		y := line[1]
		filePath := strings.TrimSpace(line[3:])

		// Untracked files (??)
		if x == '?' && y == '?' {
			res.UntrackedFiles = append(res.UntrackedFiles, GitFileChange{
				Path:   filePath,
				Status: "untracked",
				Staged: false,
			})
			continue
		}

		// Staged changes (X index)
		if x != ' ' && x != '?' {
			status := "modified"
			switch x {
			case 'A':
				status = "added"
			case 'M':
				status = "modified"
			case 'D':
				status = "deleted"
			case 'R':
				status = "renamed"
			}
			res.StagedFiles = append(res.StagedFiles, GitFileChange{
				Path:   filePath,
				Status: status,
				Staged: true,
			})
		}

		// Unstaged changes (Y index)
		if y != ' ' && y != '?' {
			status := "modified"
			switch y {
			case 'M':
				status = "modified"
			case 'D':
				status = "deleted"
			case 'A':
				status = "added"
			}
			res.UnstagedFiles = append(res.UnstagedFiles, GitFileChange{
				Path:   filePath,
				Status: status,
				Staged: false,
			})
		}
	}

	return res, nil
}

// GetFileDiff returns unified diff for a staged, modified, or untracked file
func (s *GitService) GetFileDiff(repoPath string, filePath string, staged bool) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if repoPath == "" || filePath == "" {
		return "", fmt.Errorf("invalid path parameters")
	}

	var cmd *exec.Cmd
	if staged {
		cmd = exec.Command("git", "-C", repoPath, "diff", "--staged", "--", filePath)
	} else {
		cmd = exec.Command("git", "-C", repoPath, "diff", "--", filePath)
	}

	out, err := cmd.Output()
	if err == nil && len(out) > 0 {
		return string(out), nil
	}

	// If empty diff, test if untracked new file on disk
	fullPath := filepath.Join(repoPath, filePath)
	if data, readErr := os.ReadFile(fullPath); readErr == nil {
		lines := strings.Split(string(data), "\n")
		var diffBuilder strings.Builder
		diffBuilder.WriteString(fmt.Sprintf("--- /dev/null\n+++ b/%s\n@@ -0,0 +1,%d @@\n", filePath, len(lines)))
		for _, l := range lines {
			diffBuilder.WriteString("+" + l + "\n")
		}
		return diffBuilder.String(), nil
	}

	return string(out), nil
}

// StageFile stages a single file
func (s *GitService) StageFile(repoPath string, filePath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "add", "--", filePath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stage file %s: %s", filePath, strings.TrimSpace(string(out)))
	}
	return nil
}

// UnstageFile unstages a single file
func (s *GitService) UnstageFile(repoPath string, filePath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "restore", "--staged", "--", filePath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback for older git: git reset HEAD -- filePath
		fallback := exec.Command("git", "-C", repoPath, "reset", "HEAD", "--", filePath)
		if _, fErr := fallback.CombinedOutput(); fErr != nil {
			return fmt.Errorf("failed to unstage file %s: %s", filePath, strings.TrimSpace(string(out)))
		}
	}
	return nil
}

// StageAll stages all changed and untracked files
func (s *GitService) StageAll(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "add", "-A")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stage all files: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// UnstageAll unstages all staged files
func (s *GitService) UnstageAll(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "restore", "--staged", ".")
	out, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback: git reset HEAD
		fallback := exec.Command("git", "-C", repoPath, "reset", "HEAD")
		if _, fErr := fallback.CombinedOutput(); fErr != nil {
			return fmt.Errorf("failed to unstage all files: %s", strings.TrimSpace(string(out)))
		}
	}
	return nil
}

// CommitChanges commits staged changes with a commit message
func (s *GitService) CommitChanges(repoPath string, message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	trimmed := strings.TrimSpace(message)
	if trimmed == "" {
		return fmt.Errorf("commit message cannot be empty")
	}

	cmd := exec.Command("git", "-C", repoPath, "commit", "-m", trimmed)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to commit changes: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// PushChanges pushes commits to remote tracking branch
func (s *GitService) PushChanges(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "push")
	out, err := cmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(out))
		// If no upstream is set, check current branch and push with -u origin <branch>
		if strings.Contains(outStr, "no upstream branch") || strings.Contains(outStr, "--set-upstream") {
			branchCmd := exec.Command("git", "-C", repoPath, "branch", "--show-current")
			branchOut, bErr := branchCmd.Output()
			if bErr == nil && len(strings.TrimSpace(string(branchOut))) > 0 {
				branch := strings.TrimSpace(string(branchOut))
				pushUpstreamCmd := exec.Command("git", "-C", repoPath, "push", "-u", "origin", branch)
				uOut, uErr := pushUpstreamCmd.CombinedOutput()
				if uErr != nil {
					return fmt.Errorf("failed to push changes: %s", strings.TrimSpace(string(uOut)))
				}
				return nil
			}
		}
		return fmt.Errorf("failed to push changes: %s", outStr)
	}
	return nil
}

// PullChanges pulls changes from remote
func (s *GitService) PullChanges(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "pull")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to pull changes: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// FetchChanges fetches metadata from remote
func (s *GitService) FetchChanges(repoPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cmd := exec.Command("git", "-C", repoPath, "fetch")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to fetch changes: %s", strings.TrimSpace(string(out)))
	}
	return nil
}
