package ai

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExtractProjectMetadata(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "octa-meta-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// 1. Initially empty -> falls back to folder name
	meta := ExtractProjectMetadata(tempDir)
	if meta.Name != filepath.Base(tempDir) {
		t.Errorf("Expected fallback name %q, got %q", filepath.Base(tempDir), meta.Name)
	}

	// 2. Add package.json
	pkgContent := `{"name": "my-awesome-app", "description": "Desktop developer toolbox"}`
	_ = os.WriteFile(filepath.Join(tempDir, "package.json"), []byte(pkgContent), 0644)

	meta = ExtractProjectMetadata(tempDir)
	if meta.Name != "my-awesome-app" {
		t.Errorf("Expected name 'my-awesome-app', got %q", meta.Name)
	}
	if meta.Description != "Desktop developer toolbox" {
		t.Errorf("Expected description 'Desktop developer toolbox', got %q", meta.Description)
	}
}

func TestExtractProjectMetadataGoMod(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "octa-gomod-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	goModContent := "module github.com/user/octa\n\ngo 1.23.0\n"
	_ = os.WriteFile(filepath.Join(tempDir, "go.mod"), []byte(goModContent), 0644)
	readmeContent := "# Octa\n\nA modern desktop application for database management."
	_ = os.WriteFile(filepath.Join(tempDir, "README.md"), []byte(readmeContent), 0644)

	meta := ExtractProjectMetadata(tempDir)
	if meta.Name != "github.com/user/octa" {
		t.Errorf("Expected name 'github.com/user/octa', got %q", meta.Name)
	}
	if meta.Description != "A modern desktop application for database management." {
		t.Errorf("Expected description to match README content, got %q", meta.Description)
	}
}

func TestGitContextCurrentRepo(t *testing.T) {
	ctx := context.Background()
	// Current repository is a git repo
	branch := ExtractBranchName(ctx, ".")
	if branch == "" {
		t.Logf("Branch is empty or detached HEAD (acceptable in CI/submodule)")
	}

	commits := ExtractRecentCommits(ctx, ".", 3)
	if len(commits) == 0 {
		t.Logf("No commits found or shallow clone")
	}

	stat := ExtractDiffStat(ctx, ".")
	_ = stat
}

func TestIsNoisePath(t *testing.T) {
	if !isNoisePath("project.octa") {
		t.Errorf("Expected project.octa to be noise")
	}
	if !isNoisePath("path/to/icon.png") {
		t.Errorf("Expected icon.png to be noise")
	}
	if !isNoisePath("package-lock.json.lock") {
		t.Errorf("Expected .lock to be noise")
	}
	if isNoisePath("src/media/media.controller.ts") {
		t.Errorf("media.controller.ts should not be noise")
	}
}

func TestExtractUntrackedSummary(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "octa-untracked-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	filePath := filepath.Join(tempDir, "service.ts")
	_ = os.WriteFile(filePath, []byte("export class Service {}\n"), 0644)

	status := "?? service.ts\n?? ignored.octa\n"
	summary := ExtractUntrackedSummary(tempDir, status, 3)

	if !strings.Contains(summary, "service.ts") {
		t.Errorf("Expected service.ts in untracked summary, got: %s", summary)
	}
	if strings.Contains(summary, "ignored.octa") {
		t.Errorf("Did not expect ignored.octa in summary")
	}
}

