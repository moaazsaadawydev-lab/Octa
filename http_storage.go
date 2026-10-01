package main

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// SelectFilesDialog opens native file picker allowing multiple file selection.
func (s *HTTPService) SelectFilesDialog() ([]SelectedFileMeta, error) {
	paths, err := runtime.OpenMultipleFilesDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select File(s) for Multipart Upload",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open file dialog: %w", err)
	}

	var results []SelectedFileMeta
	for _, p := range paths {
		if p == "" {
			continue
		}
		info, err := os.Stat(p)
		if err != nil {
			continue
		}

		name := filepath.Base(p)
		size := info.Size()

		fileBytes, err := os.ReadFile(p)
		var b64 string
		if err == nil && len(fileBytes) > 0 {
			b64 = base64.StdEncoding.EncodeToString(fileBytes)
		}

		mimeType := detectMimeType(name, fileBytes)

		results = append(results, SelectedFileMeta{
			Name:        name,
			Path:        p,
			Size:        size,
			Base64Data:  b64,
			ContentType: mimeType,
		})
	}

	return results, nil
}

// SaveHttpClientData persists legacy HTTP collections data.
func (s *HTTPService) SaveHttpClientData(jsonData string) error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(appDir, 0755)
	filePath := filepath.Join(appDir, "http_client_data.json")

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}
	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadHttpClientData loads legacy HTTP collections data.
func (s *HTTPService) LoadHttpClientData() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	filePath := filepath.Join(configDir, "octa", "http_client_data.json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SaveEnvironmentsData persists legacy environments data.
func (s *HTTPService) SaveEnvironmentsData(jsonData string) error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(appDir, 0755)
	filePath := filepath.Join(appDir, "http_environments.json")

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}
	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadEnvironmentsData loads legacy environments data.
func (s *HTTPService) LoadEnvironmentsData() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	filePath := filepath.Join(configDir, "octa", "http_environments.json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
