package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestProjectFileLifecycle(t *testing.T) {
	app := NewApp()

	tmpDir := os.TempDir()
	projFile := filepath.Join(tmpDir, "test_workspace_refactor.octa")
	defer os.Remove(projFile)

	sampleProject := ProjectWorkspace{
		SchemaVersion: 1,
		ID:            "octa-test-123",
		Name:          "Test Refactored Workspace",
		CreatedAt:     "2026-09-01T00:00:00Z",
		UpdatedAt:     "2026-09-01T00:00:00Z",
		Databases: []ConnectionConfig{
			{
				ID:       "conn-1",
				Name:     "Local Postgres",
				Host:     "localhost",
				Port:     5432,
				Database: "postgres",
			},
		},
		SqlQueries: []any{
			map[string]any{"id": "q1", "name": "Find All Users", "type": "query"},
		},
		Redis: []RedisConnectionConfig{
			{
				ID:   "redis-1",
				Name: "Dev Cache",
				Host: "127.0.0.1",
				Port: 6379,
			},
		},
		HttpClient: ProjectHttpClient{
			Collections:         []any{},
			Environments:        []any{},
			GlobalVariables:     []any{},
			ActiveEnvironmentID: "",
		},
	}

	jsonBytes, err := json.Marshal(sampleProject)
	if err != nil {
		t.Fatalf("Failed to serialize sample project: %v", err)
	}

	saved, err := app.SaveProjectFile(projFile, string(jsonBytes))
	if err != nil || !saved {
		t.Fatalf("SaveProjectFile failed: %v", err)
	}

	res, err := app.ReadProjectFile(projFile)
	if err != nil {
		t.Fatalf("ReadProjectFile error: %v", err)
	}
	if res.Project == nil {
		t.Fatalf("Expected Project struct, got nil. Error: %s", res.Error)
	}

	if res.Project.Name != "Test Refactored Workspace" {
		t.Errorf("Project Name mismatch: got %s, want %s", res.Project.Name, "Test Refactored Workspace")
	}
	if len(res.Project.Databases) != 1 || res.Project.Databases[0].Name != "Local Postgres" {
		t.Errorf("Databases mismatch: %+v", res.Project.Databases)
	}
	if len(res.Project.Redis) != 1 || res.Project.Redis[0].Name != "Dev Cache" {
		t.Errorf("Redis mismatch: %+v", res.Project.Redis)
	}

	closed, err := app.CloseProjectConnections()
	if err != nil || !closed {
		t.Errorf("CloseProjectConnections failed")
	}
}
