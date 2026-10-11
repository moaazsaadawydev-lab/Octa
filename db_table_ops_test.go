package main

import (
	"context"
	"testing"
)

func TestDropTable(t *testing.T) {
	app := NewApp()
	config := getTestPostgresConfig()

	pool, err := app.dbService.getPool(config, config.Database)
	if err != nil {
		t.Skipf("Postgres not available, skipping TestDropTable: %v", err)
	}

	testTable := "test_drop_tbl_qa"
	_, err = pool.Exec(context.Background(), "CREATE TABLE IF NOT EXISTS "+testTable+" (id serial primary key, name text);")
	if err != nil {
		t.Skipf("Cannot create test table, skipping: %v", err)
	}

	// Drop table
	ok, err := app.DropTable(config, config.Database, testTable, false)
	if err != nil || !ok {
		t.Fatalf("expected DropTable to succeed, got ok=%v, err=%v", ok, err)
	}

	// Verify table no longer exists
	var exists bool
	err = pool.QueryRow(context.Background(), "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1);", testTable).Scan(&exists)
	if err != nil {
		t.Fatalf("failed to check table existence: %v", err)
	}
	if exists {
		t.Fatalf("expected table %s to be dropped, but it still exists", testTable)
	}
}
