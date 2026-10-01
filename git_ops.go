package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// GetFileDiff returns unified diff for a staged, modified, or untracked file
func (s *GitService) GetFileDiff(repoPath string, filePath string, staged bool) (string, error) {
	if repoPath == "" || filePath == "" {
		return "", fmt.Errorf("invalid path parameters")
	}

	var cmd *exec.Cmd
	if staged {
		cmd = gitCommand("-C", repoPath, "diff", "--staged", "--", filePath)
	} else {
		cmd = gitCommand("-C", repoPath, "diff", "--", filePath)
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
	cmd := gitCommand("-C", repoPath, "add", "--", filePath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stage file %s: %s", filePath, strings.TrimSpace(string(out)))
	}
	return nil
}

// UnstageFile unstages a single file
func (s *GitService) UnstageFile(repoPath string, filePath string) error {
	cmd := gitCommand("-C", repoPath, "restore", "--staged", "--", filePath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback for older git: git reset HEAD -- filePath
		fallback := gitCommand("-C", repoPath, "reset", "HEAD", "--", filePath)
		if _, fErr := fallback.CombinedOutput(); fErr != nil {
			return fmt.Errorf("failed to unstage file %s: %s", filePath, strings.TrimSpace(string(out)))
		}
	}
	return nil
}

// StageAll stages all changed and untracked files
func (s *GitService) StageAll(repoPath string) error {
	cmd := gitCommand("-C", repoPath, "add", "-A")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stage all files: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// UnstageAll unstages all staged files
func (s *GitService) UnstageAll(repoPath string) error {
	cmd := gitCommand("-C", repoPath, "restore", "--staged", ".")
	out, err := cmd.CombinedOutput()
	if err != nil {
		// Fallback: git reset HEAD
		fallback := gitCommand("-C", repoPath, "reset", "HEAD")
		if _, fErr := fallback.CombinedOutput(); fErr != nil {
			return fmt.Errorf("failed to unstage all files: %s", strings.TrimSpace(string(out)))
		}
	}
	return nil
}

// CommitChanges commits staged changes with a commit message
func (s *GitService) CommitChanges(repoPath string, message string) error {
	trimmed := strings.TrimSpace(message)
	if trimmed == "" {
		return fmt.Errorf("commit message cannot be empty")
	}

	cmd := gitCommand("-C", repoPath, "commit", "-m", trimmed)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to commit changes: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// PushChanges pushes commits to remote tracking branch
func (s *GitService) PushChanges(repoPath string) error {
	cmd := gitCommand("-C", repoPath, "push")
	out, err := cmd.CombinedOutput()
	if err != nil {
		outStr := strings.TrimSpace(string(out))
		// If no upstream is set, check current branch and push with -u origin <branch>
		if strings.Contains(outStr, "no upstream branch") || strings.Contains(outStr, "--set-upstream") {
			branchCmd := gitCommand("-C", repoPath, "branch", "--show-current")
			branchOut, bErr := branchCmd.Output()
			if bErr == nil && len(strings.TrimSpace(string(branchOut))) > 0 {
				branch := strings.TrimSpace(string(branchOut))
				pushUpstreamCmd := gitCommand("-C", repoPath, "push", "-u", "origin", branch)
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
	cmd := gitCommand("-C", repoPath, "pull")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to pull changes: %s", strings.TrimSpace(string(out)))
	}
	return nil
}

// FetchChanges fetches metadata from remote
func (s *GitService) FetchChanges(repoPath string) error {
	cmd := gitCommand("-C", repoPath, "fetch")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to fetch changes: %s", strings.TrimSpace(string(out)))
	}
	return nil
}
