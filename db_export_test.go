package main

import (
	"strings"
	"testing"
)

func TestSQLExportAndImportValidation(t *testing.T) {
	app := NewApp()
	config := ConnectionConfig{Type: "invalid_engine", Host: "localhost", Port: 5432}

	_, err := app.ExportTableSQL(config, "testdb", "users", true)
	if err == nil {
		t.Errorf("Expected error for invalid database engine in ExportTableSQL")
	}

	_, err = app.ExportDatabaseSQL(config, "testdb", false)
	if err == nil {
		t.Errorf("Expected error for invalid database engine in ExportDatabaseSQL")
	}

	importRes, err := app.ImportSQLScript(config, "testdb", "")
	if err != nil {
		t.Errorf("Empty script should not return Go error: %v", err)
	}
	if !importRes.Success || importRes.StatementsExecuted != 0 {
		t.Errorf("Expected success with 0 executed statements for empty import, got %+v", importRes)
	}
}

func TestExplainQueryValidation(t *testing.T) {
	app := NewApp()
	config := ConnectionConfig{Type: "postgres", Host: "localhost", Port: 5432}

	_, err := app.ExplainQuery(config, "testdb", "", false)
	if err == nil {
		t.Errorf("Expected error when sqlQuery is empty")
	}
}

func TestSqlQueriesDataPersistence(t *testing.T) {
	app := NewApp()
	orig, _ := app.LoadSqlQueriesData()
	t.Cleanup(func() {
		_ = app.SaveSqlQueriesData(orig)
	})

	testJSON := `[{"id":"q1","name":"All Users","query":"SELECT * FROM users","type":"query"}]`
	if err := app.SaveSqlQueriesData(testJSON); err != nil {
		t.Fatalf("Failed to save SQL queries data: %v", err)
	}

	loaded, err := app.LoadSqlQueriesData()
	if err != nil {
		t.Fatalf("Failed to load SQL queries data: %v", err)
	}
	if strings.TrimSpace(loaded) != testJSON {
		t.Errorf("Loaded SQL queries mismatch: got %s, want %s", loaded, testJSON)
	}
}
