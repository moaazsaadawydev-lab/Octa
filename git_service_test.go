package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGitServiceLifecycle(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "git-test-repo-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	gitService := NewGitService()

	// 1. Check non-git repo status
	status, err := gitService.GetRepoStatus(tmpDir)
	if err != nil {
		t.Fatalf("GetRepoStatus error on empty dir: %v", err)
	}
	if status.IsRepo {
		t.Errorf("Expected IsRepo to be false on empty dir")
	}

	// 2. Init repo
	if err := gitService.InitRepository(tmpDir); err != nil {
		t.Fatalf("InitRepository failed: %v", err)
	}

	status, err = gitService.GetRepoStatus(tmpDir)
	if err != nil {
		t.Fatalf("GetRepoStatus error after init: %v", err)
	}
	if !status.IsRepo {
		t.Errorf("Expected IsRepo to be true after init")
	}

	// 3. Create a test file
	testFile := filepath.Join(tmpDir, "hello.txt")
	if err := os.WriteFile(testFile, []byte("Hello Git\n"), 0644); err != nil {
		t.Fatalf("Failed writing test file: %v", err)
	}

	status, err = gitService.GetRepoStatus(tmpDir)
	if err != nil {
		t.Fatalf("GetRepoStatus error: %v", err)
	}
	if len(status.UntrackedFiles) == 0 {
		t.Errorf("Expected 1 untracked file, got 0")
	}

	// 4. Stage file
	if err := gitService.StageFile(tmpDir, "hello.txt"); err != nil {
		t.Fatalf("StageFile failed: %v", err)
	}

	status, err = gitService.GetRepoStatus(tmpDir)
	if err != nil {
		t.Fatalf("GetRepoStatus error: %v", err)
	}
	if len(status.StagedFiles) == 0 {
		t.Errorf("Expected 1 staged file, got 0")
	}

	// 5. Unstage file
	if err := gitService.UnstageFile(tmpDir, "hello.txt"); err != nil {
		t.Fatalf("UnstageFile failed: %v", err)
	}

	status, err = gitService.GetRepoStatus(tmpDir)
	if err != nil {
		t.Fatalf("GetRepoStatus error: %v", err)
	}
	if len(status.StagedFiles) != 0 {
		t.Errorf("Expected 0 staged files after unstage, got %d", len(status.StagedFiles))
	}

	// 6. Stage all and Commit
	if err := gitService.StageAll(tmpDir); err != nil {
		t.Fatalf("StageAll failed: %v", err)
	}

	// Configure local user for commit test in temp repo
	_ = gitService.CommitChanges(tmpDir, "Initial test commit")

	// 7. AutoWatch Start and Stop
	if err := gitService.StartAutoWatch(tmpDir); err != nil {
		t.Fatalf("StartAutoWatch failed: %v", err)
	}
	gitService.StopAutoWatch()
}

