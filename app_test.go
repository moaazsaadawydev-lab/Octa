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

func TestRowUpdatesValidation(t *testing.T) {
	app := NewApp()

	// Empty updates slice should succeed trivially
	ok, err := app.UpdateTableRows(ConnectionConfig{Type: "postgres"}, "testdb", "users", "id", []RowUpdate{})
	if err != nil || !ok {
		t.Errorf("Expected empty updates to return true and nil error, got ok=%v, err=%v", ok, err)
	}

	// Unsupported type should fail validation
	ok, err = app.UpdateTableRows(ConnectionConfig{Type: "invalid_type"}, "testdb", "users", "id", []RowUpdate{
		{RowID: "1", Column: "name", NewValue: "Alice"},
	})
	if ok || err == nil {
		t.Errorf("Expected invalid type to fail, got ok=%v", ok)
	}

	// Invalid connection params should fail
	badConfig := ConnectionConfig{
		Type: "postgres",
		Host: "127.0.0.1",
		Port: 59999,
	}
	ok, err = app.UpdateTableRows(badConfig, "testdb", "users", "id", []RowUpdate{
		{RowID: "1", Column: "name", NewValue: "Alice"},
	})
	if ok || err == nil {
		t.Errorf("Expected bad connection to fail, got ok=%v", ok)
	}

	// Enum inspection on invalid connection should fail gracefully
	enums, err := app.GetEnumValues(badConfig, "testdb", "user_role")
	if err == nil || enums != nil {
		t.Errorf("Expected GetEnumValues to fail on invalid connection, got enums=%v", enums)
	}
}

func TestUUIDFormatting(t *testing.T) {
	// 16-byte raw UUID
	rawBytes := [16]byte{0xa0, 0xee, 0xbc, 0x99, 0x9c, 0x0b, 0x4e, 0xf8, 0xbb, 0x6d, 0x6b, 0xb9, 0xbd, 0x38, 0x0a, 0x11}
	expectedUUID := "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

	// Test formatPostgresValue with [16]byte
	formatted := formatPostgresValue(rawBytes, 2950)
	if formatted != expectedUUID {
		t.Errorf("Expected UUID %s, got %v", expectedUUID, formatted)
	}

	// Test formatPostgresValue with []byte slice
	sliceBytes := []byte{0xa0, 0xee, 0xbc, 0x99, 0x9c, 0x0b, 0x4e, 0xf8, 0xbb, 0x6d, 0x6b, 0xb9, 0xbd, 0x38, 0x0a, 0x11}
	formattedSlice := formatPostgresValue(sliceBytes, 2950)
	if formattedSlice != expectedUUID {
		t.Errorf("Expected UUID %s, got %v", expectedUUID, formattedSlice)
	}

	// Test cleanRowID with JSON array representation
	jsonArrStr := "[160, 238, 188, 153, 156, 11, 78, 248, 187, 109, 107, 185, 189, 56, 10, 17]"
	cleaned := cleanRowID(jsonArrStr)
	if cleaned != expectedUUID {
		t.Errorf("Expected cleaned UUID %s, got %v", expectedUUID, cleaned)
	}

	// Test cleanRowID with valid string UUID
	cleanedStr := cleanRowID(expectedUUID)
	if cleanedStr != expectedUUID {
		t.Errorf("Expected cleaned UUID %s, got %v", expectedUUID, cleanedStr)
	}
}

func TestDeleteTableRowsAndTruncateValidation(t *testing.T) {
	app := NewApp()

	// Empty rowIds should return true trivially
	ok, err := app.DeleteTableRows(ConnectionConfig{Type: "postgres"}, "testdb", "users", "id", []string{})
	if err != nil || !ok {
		t.Errorf("Expected empty rowIds to succeed, got ok=%v, err=%v", ok, err)
	}

	// Invalid type should fail
	badTypeConfig := ConnectionConfig{Type: "invalid_db"}
	ok, err = app.DeleteTableRows(badTypeConfig, "testdb", "users", "id", []string{"1", "2"})
	if ok || err == nil {
		t.Errorf("Expected invalid type to fail DeleteTableRows")
	}

	ok, err = app.TruncateTable(badTypeConfig, "testdb", "users")
	if ok || err == nil {
		t.Errorf("Expected invalid type to fail TruncateTable")
	}

	// Bad connection params should fail
	badConnConfig := ConnectionConfig{
		Type: "postgres",
		Host: "127.0.0.1",
		Port: 59999,
	}
	ok, err = app.DeleteTableRows(badConnConfig, "testdb", "users", "id", []string{"1", "2"})
	if ok || err == nil {
		t.Errorf("Expected bad connection to fail DeleteTableRows")
	}

	ok, err = app.TruncateTable(badConnConfig, "testdb", "users")
	if ok || err == nil {
		t.Errorf("Expected bad connection to fail TruncateTable")
	}
}

func TestSplitSQLStatements(t *testing.T) {
	// Test basic semicolon separation
	raw := `SELECT 1; SELECT 2; SELECT 3;`
	stmts := splitSQLStatements(raw)
	if len(stmts) != 3 {
		t.Fatalf("Expected 3 statements, got %d", len(stmts))
	}
	if stmts[0] != "SELECT 1" || stmts[1] != "SELECT 2" || stmts[2] != "SELECT 3" {
		t.Errorf("Unexpected statements: %v", stmts)
	}

	// Test semicolons inside single quotes
	rawQuotes := `SELECT 'hello; world' AS greeting; INSERT INTO logs VALUES ('quote with ; inside');`
	stmtsQuotes := splitSQLStatements(rawQuotes)
	if len(stmtsQuotes) != 2 {
		t.Fatalf("Expected 2 statements, got %d", len(stmtsQuotes))
	}

	// Test dollar-quoted strings ($$ and $tag$)
	rawDollar := `CREATE OR REPLACE FUNCTION test_func() RETURNS void AS $$
BEGIN
    SELECT 1;
    INSERT INTO tbl VALUES (2);
END;
$$ LANGUAGE plpgsql; SELECT 42;`
	stmtsDollar := splitSQLStatements(rawDollar)
	if len(stmtsDollar) != 2 {
		t.Fatalf("Expected 2 statements with dollar quotes, got %d: %v", len(stmtsDollar), stmtsDollar)
	}

	// Test comments with semicolons
	rawComments := `-- comment with ; semicolon
SELECT 100; /* block comment with ; semicolon */ SELECT 200;`
	stmtsComments := splitSQLStatements(rawComments)
	if len(stmtsComments) != 2 {
		t.Fatalf("Expected 2 statements with comments, got %d: %v", len(stmtsComments), stmtsComments)
	}
}

func TestExecuteRawQueryValidation(t *testing.T) {
	app := NewApp()

	// Empty SQL query returns empty slice
	res, err := app.ExecuteRawQuery(ConnectionConfig{Type: "postgres"}, "testdb", "")
	if err != nil || len(res) != 0 {
		t.Errorf("Expected empty result for empty query, got res=%v, err=%v", res, err)
	}

	// Invalid database type should fail
	badTypeConfig := ConnectionConfig{Type: "mongo_db"}
	res, err = app.ExecuteRawQuery(badTypeConfig, "testdb", "SELECT 1;")
	if err == nil {
		t.Errorf("Expected invalid DB type to return error")
	}

	// Invalid connection params should return error
	badConnConfig := ConnectionConfig{
		Type: "postgres",
		Host: "127.0.0.1",
		Port: 59999,
	}
	res, err = app.ExecuteRawQuery(badConnConfig, "testdb", "SELECT 1;")
	if err == nil {
		t.Errorf("Expected connection error on unreachable host")
	}
}

func TestGetDatabaseSchemaDetailsValidation(t *testing.T) {
	app := NewApp()

	// Invalid DB type should fail
	badTypeConfig := ConnectionConfig{Type: "invalid_type"}
	_, err := app.GetDatabaseSchemaDetails(badTypeConfig, "testdb")
	if err == nil {
		t.Errorf("Expected invalid DB type to fail GetDatabaseSchemaDetails")
	}

	// Unreachable host should return error
	badConnConfig := ConnectionConfig{
		Type: "postgres",
		Host: "127.0.0.1",
		Port: 59999,
	}
	_, err = app.GetDatabaseSchemaDetails(badConnConfig, "testdb")
	if err == nil {
		t.Errorf("Expected unreachable host to return error")
	}
}
