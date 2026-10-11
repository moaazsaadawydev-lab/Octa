package main

import (
	"reflect"
	"testing"
)

func TestSplitSQLStatementsExtended(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "multiple simple statements",
			input:    "SELECT 1 AS a; SELECT 2 AS b;",
			expected: []string{"SELECT 1 AS a", "SELECT 2 AS b"},
		},
		{
			name:     "semicolon in single quotes",
			input:    "SELECT 'semi;colon' AS val; SELECT 2 AS b;",
			expected: []string{"SELECT 'semi;colon' AS val", "SELECT 2 AS b"},
		},
		{
			name:     "semicolon in escaped single quotes",
			input:    "SELECT 'it''s a; test' AS val; SELECT 2;",
			expected: []string{"SELECT 'it''s a; test' AS val", "SELECT 2"},
		},
		{
			name:     "semicolon in double quotes",
			input:    `SELECT 1 AS "my;col"; SELECT 2;`,
			expected: []string{`SELECT 1 AS "my;col"`, "SELECT 2"},
		},
		{
			name:     "semicolon in line comment",
			input:    "SELECT 1 AS a; -- this is a ; comment\nSELECT 2 AS b;",
			expected: []string{"SELECT 1 AS a", "-- this is a ; comment\nSELECT 2 AS b"},
		},
		{
			name:     "semicolon in block comment",
			input:    "SELECT 1 AS a; /* another ; comment */ SELECT 2 AS b;",
			expected: []string{"SELECT 1 AS a", "/* another ; comment */ SELECT 2 AS b"},
		},
		{
			name:     "semicolon in dollar quote",
			input:    "CREATE FUNCTION foo() RETURNS void AS $$ BEGIN; SELECT 1; END; $$ LANGUAGE plpgsql; SELECT 2;",
			expected: []string{
				"CREATE FUNCTION foo() RETURNS void AS $$ BEGIN; SELECT 1; END; $$ LANGUAGE plpgsql",
				"SELECT 2",
			},
		},
		{
			name:     "trailing statement without semicolon",
			input:    "SELECT 1; SELECT 2",
			expected: []string{"SELECT 1", "SELECT 2"},
		},
		{
			name:     "empty queries",
			input:    "   ;; ;  ",
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitSQLStatements(tt.input)
			if len(got) == 0 && len(tt.expected) == 0 {
				return
			}
			if !reflect.DeepEqual(got, tt.expected) {
				t.Errorf("splitSQLStatements() mismatch:\ngot:  %#v\nwant: %#v", got, tt.expected)
			}
		})
	}
}

func TestLiveMultiStatement(t *testing.T) {
	app := NewApp()
	config := ConnectionConfig{
		Type:     "postgres",
		Host:     "127.0.0.1",
		Port:     5433,
		Database: "skillhub_users",
		Username: "postgres",
		Password: "postgres",
	}

	query := "SELECT\n  1 AS a;\n\nSELECT\n  2 AS b;"
	results, err := app.ExecuteRawQuery(config, "skillhub_users", query, "tab-test")
	if err != nil {
		t.Skipf("Skipping live integration test (Postgres not running): %v", err)
	}

	t.Logf("ExecuteRawQuery returned %d results", len(results))
	for i, r := range results {
		t.Logf("Result %d: stmt=%q, cols=%v, rows=%v, err=%q", i, r.Statement, r.Columns, r.Rows, r.Error)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
}
