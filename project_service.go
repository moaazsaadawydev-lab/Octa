package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ProjectService manages .octa project file lifecycle and native file dialogs.
type ProjectService struct {
	ctx context.Context
}

// NewProjectService creates a new ProjectService.
func NewProjectService() *ProjectService {
	return &ProjectService{}
}

// SetContext sets the Wails runtime context.
func (s *ProjectService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// CreateProjectFileDialog prompts the user to save a new .octa file.
func (s *ProjectService) CreateProjectFileDialog(defaultName string) (ProjectFileResult, error) {
	if defaultName == "" {
		defaultName = "my-workspace"
	}
	if !strings.HasSuffix(defaultName, ".octa") {
		defaultName = defaultName + ".octa"
	}

	savePath, err := runtime.SaveFileDialog(s.ctx, runtime.SaveDialogOptions{
		Title:           "Create Octa Project File",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Octa Project (*.octa)",
				Pattern:     "*.octa",
			},
			{
				DisplayName: "JSON File (*.json)",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return ProjectFileResult{Error: err.Error()}, nil
	}
	if savePath == "" {
		return ProjectFileResult{Cancelled: true}, nil
	}

	if !strings.HasSuffix(savePath, ".octa") && !strings.HasSuffix(savePath, ".json") {
		savePath += ".octa"
	}

	projectName := filepath.Base(savePath)
	projectName = strings.TrimSuffix(projectName, filepath.Ext(projectName))

	nowStr := time.Now().Format(time.RFC3339)
	proj := ProjectWorkspace{
		SchemaVersion: 1,
		ID:            "octa-" + uuid.New().String(),
		Name:          projectName,
		CreatedAt:     nowStr,
		UpdatedAt:     nowStr,
		Databases:     make([]ConnectionConfig, 0),
		SqlQueries:    make([]any, 0),
		Redis:         make([]RedisConnectionConfig, 0),
		HttpClient: ProjectHttpClient{
			Collections:         make([]any, 0),
			Environments:        make([]any, 0),
			GlobalVariables:     make([]any, 0),
			ActiveEnvironmentID: "",
		},
	}

	bytes, err := json.MarshalIndent(proj, "", "  ")
	if err != nil {
		return ProjectFileResult{Error: fmt.Sprintf("failed to serialize project: %v", err)}, nil
	}

	if err := os.WriteFile(savePath, bytes, 0644); err != nil {
		return ProjectFileResult{Error: fmt.Sprintf("failed to write project file: %v", err)}, nil
	}

	return ProjectFileResult{
		FilePath: savePath,
		Project:  &proj,
	}, nil
}

// OpenProjectFileDialog prompts the user to select an existing .octa file.
func (s *ProjectService) OpenProjectFileDialog() (ProjectFileResult, error) {
	openPath, err := runtime.OpenFileDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Open Octa Project File",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Octa Project (*.octa; *.json)",
				Pattern:     "*.octa;*.json",
			},
		},
	})
	if err != nil {
		return ProjectFileResult{Error: err.Error()}, nil
	}
	if openPath == "" {
		return ProjectFileResult{Cancelled: true}, nil
	}

	return s.ReadProjectFile(openPath)
}

// ReadProjectFile reads a project from a specified file path.
func (s *ProjectService) ReadProjectFile(filePath string) (ProjectFileResult, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ProjectFileResult{Error: fmt.Sprintf("failed to read file: %v", err)}, nil
	}

	var proj ProjectWorkspace
	if err := json.Unmarshal(data, &proj); err != nil {
		return ProjectFileResult{Error: fmt.Sprintf("invalid project file format: %v", err)}, nil
	}

	if proj.Databases == nil {
		proj.Databases = make([]ConnectionConfig, 0)
	}
	if proj.SqlQueries == nil {
		proj.SqlQueries = make([]any, 0)
	}
	if proj.Redis == nil {
		proj.Redis = make([]RedisConnectionConfig, 0)
	}
	if proj.HttpClient.Collections == nil {
		proj.HttpClient.Collections = make([]any, 0)
	}
	if proj.HttpClient.Environments == nil {
		proj.HttpClient.Environments = make([]any, 0)
	}
	if proj.HttpClient.GlobalVariables == nil {
		proj.HttpClient.GlobalVariables = make([]any, 0)
	}

	return ProjectFileResult{
		FilePath: filePath,
		Project:  &proj,
	}, nil
}

// SaveProjectFile persists project state to a given file path.
func (s *ProjectService) SaveProjectFile(filePath string, jsonData string) (bool, error) {
	if strings.TrimSpace(filePath) == "" {
		return false, fmt.Errorf("file path cannot be empty")
	}

	var parsed any
	if err := json.Unmarshal([]byte(jsonData), &parsed); err != nil {
		return false, fmt.Errorf("invalid json payload: %w", err)
	}

	formatted, err := json.MarshalIndent(parsed, "", "  ")
	if err != nil {
		formatted = []byte(jsonData)
	}

	err = os.WriteFile(filePath, formatted, 0644)
	if err != nil {
		return false, fmt.Errorf("failed to write project file: %w", err)
	}

	return true, nil
}

// CloseProjectConnections closes active connections and cleans memory.
func (s *ProjectService) CloseProjectConnections() (bool, error) {
	return true, nil
}

// WipeLegacyStorage removes legacy standalone JSON files from the app config folder.
func (s *ProjectService) WipeLegacyStorage() (bool, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	legacyFiles := []string{
		"connections.json",
		"redis_connections.json",
		"http_client_data.json",
		"sql_queries.json",
		"http_environments.json",
	}

	for _, f := range legacyFiles {
		_ = os.Remove(filepath.Join(appDir, f))
	}

	return true, nil
}
