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
	"github.com/jackc/pgx/v5"
)

func getConnectionsFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	if err = os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "connections.json"), nil
}

func getSqlQueriesDataFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	if err = os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "sql_queries.json"), nil
}

// SaveSqlQueriesData writes the SQL queries and folders tree JSON data to disk.
func (s *DBService) SaveSqlQueriesData(jsonData string) error {
	filePath, err := getSqlQueriesDataFilePath()
	if err != nil {
		return fmt.Errorf("failed to get SQL queries data file path: %w", err)
	}

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}

	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadSqlQueriesData reads the saved SQL queries JSON data from disk.
func (s *DBService) LoadSqlQueriesData() (string, error) {
	filePath, err := getSqlQueriesDataFilePath()
	if err != nil {
		return "", fmt.Errorf("failed to get SQL queries data file path: %w", err)
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read SQL queries data: %w", err)
	}

	return string(data), nil
}

// TestConnection tests whether a connection can be established.
func (s *DBService) TestConnection(config ConnectionConfig) (bool, string) {
	if config.Type == "" {
		config.Type = "postgres"
	}

	if config.Type != "postgres" {
		return false, fmt.Sprintf("Unsupported database engine: %s", config.Type)
	}

	connStr := buildPostgresURL(config)
	connConfig, err := pgx.ParseConfig(connStr)
	if err != nil {
		return false, fmt.Sprintf("Invalid connection string: %v", err)
	}
	connConfig.ConnectTimeout = 5 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, connConfig)
	if err != nil {
		return false, fmt.Sprintf("Connection failed: %v", err)
	}
	defer conn.Close(ctx)

	err = conn.Ping(ctx)
	if err != nil {
		return false, fmt.Sprintf("Ping failed: %v", err)
	}

	return true, "Connection successful"
}

// SaveConnection saves a connection profile.
func (s *DBService) SaveConnection(config ConnectionConfig) (bool, string) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return false, fmt.Sprintf("Failed to get config directory: %v", err)
	}

	var connections []ConnectionConfig
	if _, err := os.Stat(filePath); err == nil {
		data, err := os.ReadFile(filePath)
		if err == nil {
			_ = json.Unmarshal(data, &connections)
		}
	}

	if config.ID == "" {
		config.ID = uuid.New().String()
	}

	found := false
	for i, c := range connections {
		if c.ID == config.ID {
			connections[i] = config
			found = true
			break
		}
	}
	if !found {
		connections = append(connections, config)
	}

	data, err := json.MarshalIndent(connections, "", "  ")
	if err != nil {
		return false, fmt.Sprintf("Failed to serialize connections: %v", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return false, fmt.Sprintf("Failed to write connections file: %v", err)
	}

	return true, "Connection saved successfully"
}

// GetSavedConnections reads and returns saved connection profiles.
func (s *DBService) GetSavedConnections() ([]ConnectionConfig, error) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return []ConnectionConfig{}, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var connections []ConnectionConfig
	if err := json.Unmarshal(data, &connections); err != nil {
		return []ConnectionConfig{}, nil
	}

	if connections == nil {
		connections = []ConnectionConfig{}
	}
	return connections, nil
}

// DeleteConnection removes a saved connection profile.
func (s *DBService) DeleteConnection(id string) (bool, error) {
	filePath, err := getConnectionsFilePath()
	if err != nil {
		return false, err
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return false, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return false, err
	}

	var connections []ConnectionConfig
	if err := json.Unmarshal(data, &connections); err != nil {
		return false, err
	}

	filtered := make([]ConnectionConfig, 0, len(connections))
	for _, c := range connections {
		if c.ID != id {
			filtered = append(filtered, c)
		}
	}

	newData, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return false, err
	}

	if err := os.WriteFile(filePath, newData, 0644); err != nil {
		return false, err
	}

	return true, nil
}
