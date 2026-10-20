package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSearchProjectContent(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "octa-search-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	srcDir := filepath.Join(tmpDir, "src")
	_ = os.MkdirAll(srcDir, 0755)
	nodeModulesDir := filepath.Join(tmpDir, "node_modules", "some-pkg")
	_ = os.MkdirAll(nodeModulesDir, 0755)
	nxDir := filepath.Join(tmpDir, ".nx", "cache")
	_ = os.MkdirAll(nxDir, 0755)

	// Valid project file
	serviceFile := filepath.Join(srcDir, "users.service.ts")
	_ = os.WriteFile(serviceFile, []byte("export class UsersService {\n  findUser(id: string) {\n    return 'Found User';\n  }\n}\n"), 0644)

	// File inside node_modules that should be ignored
	ignoredFile1 := filepath.Join(nodeModulesDir, "index.js")
	_ = os.WriteFile(ignoredFile1, []byte("export class UsersService {}\n"), 0644)

	// File inside .nx cache that should be ignored
	ignoredFile2 := filepath.Join(nxDir, "cached.js")
	_ = os.WriteFile(ignoredFile2, []byte("UsersService cache content\n"), 0644)

	svc := NewEditorService()

	// 1. Search for "UsersService"
	res, err := svc.SearchProjectContent(tmpDir, "UsersService", false, 50)
	if err != nil {
		t.Fatalf("SearchProjectContent failed: %v", err)
	}

	if res.TotalMatches != 1 {
		t.Errorf("Expected exactly 1 match (excluding node_modules and .nx), got %d", res.TotalMatches)
	}
	if len(res.Files) != 1 {
		t.Fatalf("Expected 1 file match, got %d", len(res.Files))
	}
	if res.Files[0].FileName != "users.service.ts" {
		t.Errorf("Expected match in users.service.ts, got %s", res.Files[0].FileName)
	}
	if res.Files[0].Matches[0].Line != 1 {
		t.Errorf("Expected line 1, got %d", res.Files[0].Matches[0].Line)
	}

	// 2. Case sensitive search
	resCase, err := svc.SearchProjectContent(tmpDir, "usersservice", true, 50)
	if err != nil {
		t.Fatalf("SearchProjectContent case sensitive failed: %v", err)
	}
	if resCase.TotalMatches != 0 {
		t.Errorf("Expected 0 matches for case-sensitive mismatch, got %d", resCase.TotalMatches)
	}
}
