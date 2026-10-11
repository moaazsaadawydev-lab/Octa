package main

import (
	"strings"
	"testing"
)

func getTestPostgresConfig() ConnectionConfig {
	return ConnectionConfig{
		Type:     "postgres",
		Host:     "127.0.0.1",
		Port:     5433,
		Database: "skillhub_users",
		Username: "postgres",
		Password: "postgres",
	}
}

// Acceptance Test A: Same Run: BEGIN; INSERT; ROLLBACK; SELECT -> count = 0
func TestAcceptanceTestA_SameRunBeginRollback(t *testing.T) {
	app := NewApp()
	config := getTestPostgresConfig()
	tabID := "tab-test-a"
	defer app.CloseTabSession(tabID)

	// Ensure users table exists with test columns
	setupSQL := `CREATE TABLE IF NOT EXISTS users_qa_test (
		id SERIAL PRIMARY KEY,
		username VARCHAR(100) NOT NULL,
		email VARCHAR(100) NOT NULL
	);`
	_, err := app.ExecuteRawQuery(config, "skillhub_users", setupSQL, tabID)
	if err != nil {
		t.Skipf("PostgreSQL not available or setup failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = app.ExecuteRawQuery(config, "skillhub_users", "DROP TABLE IF EXISTS users_qa_test CASCADE;", tabID)
	})

	testSQL := `
	BEGIN;
	INSERT INTO users_qa_test (username, email) VALUES ('qa_tx_a', 'qa_tx_a@example.com');
	ROLLBACK;
	SELECT count(*) AS cnt FROM users_qa_test WHERE username = 'qa_tx_a';
	`
	results, err := app.ExecuteRawQuery(config, "skillhub_users", testSQL, tabID)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if len(results) != 4 {
		t.Fatalf("Expected 4 results, got %d", len(results))
	}

	lastRes := results[3]
	if len(lastRes.Rows) == 0 {
		t.Fatalf("Expected at least 1 row in count result")
	}
	cnt := lastRes.Rows[0]["cnt"]
	if cnt != int64(0) && cnt != "0" && cnt != 0 {
		t.Fatalf("Expected count = 0 after ROLLBACK, got %v (%T)", cnt, cnt)
	}
}

// Acceptance Test B: Multi-Run same tab: Run 1 BEGIN; INSERT; -> Run 2 SELECT -> 1; Run 3 ROLLBACK; -> 0
func TestAcceptanceTestB_MultiRunSameTabTransaction(t *testing.T) {
	app := NewApp()
	config := getTestPostgresConfig()
	tabID := "tab-test-b"
	defer app.CloseTabSession(tabID)

	_, err := app.ExecuteRawQuery(config, "skillhub_users", "CREATE TABLE IF NOT EXISTS users_qa_test (id SERIAL PRIMARY KEY, username VARCHAR(100), email VARCHAR(100));", tabID)
	if err != nil {
		t.Skipf("Postgres setup failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = app.ExecuteRawQuery(config, "skillhub_users", "DROP TABLE IF EXISTS users_qa_test CASCADE;", tabID)
	})

	// Run 1: BEGIN; INSERT;
	run1, err := app.ExecuteRawQuery(config, "skillhub_users", "BEGIN;\nINSERT INTO users_qa_test (username, email) VALUES ('qa_tx_b', 'b@example.com');", tabID)
	if err != nil {
		t.Fatalf("Run 1 failed: %v", err)
	}
	if len(run1) != 2 || run1[1].TxStatus != "in_tx" {
		t.Fatalf("Expected Run 1 to leave transaction in_tx, got: %+v", run1)
	}

	// Run 2: SELECT count(*) (same tab) -> sees uncommitted row
	run2, err := app.ExecuteRawQuery(config, "skillhub_users", "SELECT count(*) AS cnt FROM users_qa_test WHERE username = 'qa_tx_b';", tabID)
	if err != nil {
		t.Fatalf("Run 2 failed: %v", err)
	}
	if len(run2) == 0 || run2[0].Rows[0]["cnt"] != int64(1) {
		t.Fatalf("Expected Run 2 to see uncommitted row (cnt=1), got: %+v", run2)
	}

	// Run 3: ROLLBACK; SELECT count(*) -> count = 0
	run3, err := app.ExecuteRawQuery(config, "skillhub_users", "ROLLBACK;\nSELECT count(*) AS cnt FROM users_qa_test WHERE username = 'qa_tx_b';", tabID)
	if err != nil {
		t.Fatalf("Run 3 failed: %v", err)
	}
	if len(run3) != 2 || run3[0].TxStatus != "idle" || run3[1].Rows[0]["cnt"] != int64(0) {
		t.Fatalf("Expected Run 3 count = 0 and txStatus idle, got: %+v", run3)
	}
}

// Acceptance Test C: Two tabs: Tab A uncommitted row invisible in Tab B. After COMMIT in A, B sees it.
func TestAcceptanceTestC_TwoTabsIsolation(t *testing.T) {
	app := NewApp()
	config := getTestPostgresConfig()
	tabA := "tab-test-c-1"
	tabB := "tab-test-c-2"
	defer app.CloseTabSession(tabA)
	defer app.CloseTabSession(tabB)

	_, err := app.ExecuteRawQuery(config, "skillhub_users", "CREATE TABLE IF NOT EXISTS users_qa_test (id SERIAL PRIMARY KEY, username VARCHAR(100), email VARCHAR(100));", tabA)
	if err != nil {
		t.Skipf("Postgres setup failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = app.ExecuteRawQuery(config, "skillhub_users", "DROP TABLE IF EXISTS users_qa_test CASCADE;", tabA)
	})

	// Tab A: BEGIN; INSERT;
	_, err = app.ExecuteRawQuery(config, "skillhub_users", "BEGIN;\nINSERT INTO users_qa_test (username, email) VALUES ('qa_tx_c', 'c@example.com');", tabA)
	if err != nil {
		t.Fatalf("Tab A insert failed: %v", err)
	}

	// Tab B: SELECT -> should NOT see Tab A uncommitted row (cnt = 0)
	resB1, err := app.ExecuteRawQuery(config, "skillhub_users", "SELECT count(*) AS cnt FROM users_qa_test WHERE username = 'qa_tx_c';", tabB)
	if err != nil {
		t.Fatalf("Tab B query failed: %v", err)
	}
	if len(resB1) == 0 || resB1[0].Rows[0]["cnt"] != int64(0) {
		t.Fatalf("Tab B should NOT see uncommitted row, got: %+v", resB1)
	}

	// Tab A: COMMIT;
	_, err = app.ExecuteRawQuery(config, "skillhub_users", "COMMIT;", tabA)
	if err != nil {
		t.Fatalf("Tab A commit failed: %v", err)
	}

	// Tab B: SELECT -> now sees committed row (cnt = 1)
	resB2, err := app.ExecuteRawQuery(config, "skillhub_users", "SELECT count(*) AS cnt FROM users_qa_test WHERE username = 'qa_tx_c';", tabB)
	if err != nil {
		t.Fatalf("Tab B query after commit failed: %v", err)
	}
	if len(resB2) == 0 || resB2[0].Rows[0]["cnt"] != int64(1) {
		t.Fatalf("Tab B should see committed row (cnt=1), got: %+v", resB2)
	}

	// Cleanup
	_, _ = app.ExecuteRawQuery(config, "skillhub_users", "DELETE FROM users_qa_test WHERE username = 'qa_tx_c';", tabA)
}

// Acceptance Test D: SET timezone = 'Asia/Tokyo'; SHOW timezone; in separate Runs, same tab -> persists
func TestAcceptanceTestD_SessionStatePersists(t *testing.T) {
	app := NewApp()
	config := getTestPostgresConfig()
	tabID := "tab-test-d"
	defer app.CloseTabSession(tabID)

	_, err := app.ExecuteRawQuery(config, "skillhub_users", "SET timezone = 'Asia/Tokyo';", tabID)
	if err != nil {
		t.Skipf("Postgres setup failed: %v", err)
	}

	res, err := app.ExecuteRawQuery(config, "skillhub_users", "SHOW timezone;", tabID)
	if err != nil {
		t.Fatalf("SHOW timezone failed: %v", err)
	}
	if len(res) == 0 || len(res[0].Rows) == 0 {
		t.Fatalf("Expected timezone result, got empty")
	}
	tzVal := res[0].Rows[0]["TimeZone"]
	if tzVal == nil {
		tzVal = res[0].Rows[0]["timezone"]
	}
	if tzVal != "Asia/Tokyo" {
		t.Fatalf("Expected timezone 'Asia/Tokyo', got: %v", tzVal)
	}
}

// Acceptance Test E: ROLLBACK; with no open transaction -> WARNING shown in console / notices
func TestAcceptanceTestE_RollbackNoticeWarning(t *testing.T) {
	app := NewApp()
	config := getTestPostgresConfig()
	tabID := "tab-test-e"
	defer app.CloseTabSession(tabID)

	res, err := app.ExecuteRawQuery(config, "skillhub_users", "ROLLBACK;", tabID)
	if err != nil {
		t.Skipf("Postgres setup failed: %v", err)
	}
	if len(res) == 0 {
		t.Fatalf("Expected result for ROLLBACK")
	}
	foundWarning := false
	for _, notice := range res[0].Notices {
		if strings.Contains(strings.ToLower(notice), "no transaction in progress") {
			foundWarning = true
			break
		}
	}
	if !foundWarning {
		t.Fatalf("Expected notice 'no transaction in progress', got notices: %v", res[0].Notices)
	}
}
