package main

import (
	"os"
	"testing"
)

func TestConnectionConfigPersistence(t *testing.T) {
	// Setup temporary config directory
	tmpDir, err := os.MkdirTemp("", "devcockpit-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Set user config dir override for testing
	t.Setenv("APPDATA", tmpDir)
	t.Setenv("XDG_CONFIG_HOME", tmpDir)
	t.Setenv("USERPROFILE", tmpDir)

	app := NewApp()

	// Initial saved connections should be empty
	conns, err := app.GetSavedConnections()
	if err != nil {
		t.Fatalf("GetSavedConnections returned error: %v", err)
	}
	if len(conns) != 0 {
		t.Fatalf("Expected 0 connections, got %d", len(conns))
	}

	// Test URL builder
	config := ConnectionConfig{
		ID:       "test-id-1",
		Name:     "Test Postgres",
		Type:     "postgres",
		Host:     "localhost",
		Port:     5432,
		Database: "testdb",
		Username: "postgres",
		Password: "secret-password!@#",
		SSL:      false,
	}

	url := buildPostgresURL(config)
	if url == "" {
		t.Fatalf("Expected non-empty URL")
	}

	// Test invalid connection returns false and error message
	invalidConfig := ConnectionConfig{
		Type:     "postgres",
		Host:     "127.0.0.1",
		Port:     59999, // Unused port
		Database: "nonexistent",
		Username: "none",
		Password: "bad",
	}
	ok, msg := app.TestConnection(invalidConfig)
	if ok {
		t.Errorf("Expected TestConnection to fail on invalid port, got ok=true")
	}
	if msg == "" {
		t.Errorf("Expected error message on connection failure")
	}

	// Verify DeleteConnection
	delOk, delErr := app.DeleteConnection("nonexistent-id")
	if delErr != nil {
		t.Errorf("DeleteConnection returned unexpected error: %v", delErr)
	}
	if !delOk {
		t.Errorf("DeleteConnection expected true")
	}
}

func TestQueryLogging(t *testing.T) {
	app := NewApp()

	// Initial logs should be empty
	logs, err := app.GetQueryLogs()
	if err != nil {
		t.Fatalf("GetQueryLogs returned error: %v", err)
	}
	if len(logs) != 0 {
		t.Fatalf("Expected 0 logs initially, got %d", len(logs))
	}

	// Log some queries
	app.logQuery("SELECT * FROM users;", 14.5, "SUCCESS", "")
	app.logQuery("ALTER TABLE users ADD COLUMN age INT;", 22.1, "SUCCESS", "")
	app.logQuery("SELECT * FROM invalid_table;", 5.2, "ERROR", "relation does not exist")

	logs, err = app.GetQueryLogs()
	if err != nil {
		t.Fatalf("GetQueryLogs returned error: %v", err)
	}
	if len(logs) != 3 {
		t.Fatalf("Expected 3 logs, got %d", len(logs))
	}

	if logs[0].Query != "SELECT * FROM users;" || logs[0].Status != "SUCCESS" {
		t.Errorf("Unexpected first log content: %+v", logs[0])
	}
	if logs[2].Status != "ERROR" || logs[2].Error != "relation does not exist" {
		t.Errorf("Unexpected third log content: %+v", logs[2])
	}

	// Test ClearQueryLogs
	cleared, err := app.ClearQueryLogs()
	if err != nil || !cleared {
		t.Fatalf("ClearQueryLogs failed: %v", err)
	}

	logs, err = app.GetQueryLogs()
	if err != nil {
		t.Fatalf("GetQueryLogs returned error: %v", err)
	}
	if len(logs) != 0 {
		t.Fatalf("Expected 0 logs after clear, got %d", len(logs))
	}
}
