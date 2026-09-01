package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

func TestRedisConnectionsPersistence(t *testing.T) {
	app := NewApp()

	sampleConfigs := []RedisConnectionConfig{
		{
			ID:   "redis-1",
			Name: "Local Redis",
			Host: "127.0.0.1",
			Port: 6379,
			DB:   0,
		},
	}

	dataBytes, _ := json.Marshal(sampleConfigs)
	err := app.SaveRedisConnections(string(dataBytes))
	if err != nil {
		t.Fatalf("SaveRedisConnections failed: %v", err)
	}

	loaded, err := app.LoadRedisConnections()
	if err != nil {
		t.Fatalf("LoadRedisConnections failed: %v", err)
	}

	if !strings.Contains(loaded, "Local Redis") {
		t.Errorf("Expected loaded Redis config to contain 'Local Redis', got: %s", loaded)
	}
}

func TestParseRedisCommandLine(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{
			input:    `SET test:user "Octa Admin" EX 60`,
			expected: []string{"SET", "test:user", "Octa Admin", "EX", "60"},
		},
		{
			input:    `HSET my_hash field1 'Value with spaces' field2 123`,
			expected: []string{"HSET", "my_hash", "field1", "Value with spaces", "field2", "123"},
		},
		{
			input:    `LPUSH mylist item1 "item 2" item3`,
			expected: []string{"LPUSH", "mylist", "item1", "item 2", "item3"},
		},
		{
			input:    `KEYS *`,
			expected: []string{"KEYS", "*"},
		},
		{
			input:    `LRANGE mylist 0 -1`,
			expected: []string{"LRANGE", "mylist", "0", "-1"},
		},
		{
			input:    `HGETALL user:profile`,
			expected: []string{"HGETALL", "user:profile"},
		},
	}

	for _, tt := range tests {
		args, err := parseRedisCommandLine(tt.input)
		if err != nil {
			t.Fatalf("parseRedisCommandLine(%q) unexpected error: %v", tt.input, err)
		}
		if len(args) != len(tt.expected) {
			t.Fatalf("parseRedisCommandLine(%q) expected %d args, got %d: %v", tt.input, len(tt.expected), len(args), args)
		}
		for i, exp := range tt.expected {
			if fmt.Sprintf("%v", args[i]) != exp {
				t.Errorf("parseRedisCommandLine(%q) arg[%d] = %v; want %v", tt.input, i, args[i], exp)
			}
		}
	}
}

func TestFormatRedisCommandOutput(t *testing.T) {
	// Status
	resType, formatted := formatRedisCommandOutput("OK", "SET")
	if resType != "status" || formatted != "OK" {
		t.Errorf("Expected status OK, got type=%s formatted=%s", resType, formatted)
	}

	// Integer
	resType, formatted = formatRedisCommandOutput(int64(42), "INCR")
	if resType != "integer" || formatted != "(integer) 42" {
		t.Errorf("Expected integer 42, got type=%s formatted=%s", resType, formatted)
	}

	// Slice
	sliceVal := []any{"apple", "banana", "cherry"}
	resType, formatted = formatRedisCommandOutput(sliceVal, "LRANGE")
	if resType != "slice" || !strings.Contains(formatted, `1) "apple"`) {
		t.Errorf("Expected slice format, got type=%s formatted=%s", resType, formatted)
	}

	// Map
	mapVal := map[string]string{"name": "Moaz", "role": "admin"}
	resType, formatted = formatRedisCommandOutput(mapVal, "HGETALL")
	if resType != "map" || !strings.Contains(formatted, `"name"`) {
		t.Errorf("Expected map format, got type=%s formatted=%s", resType, formatted)
	}
}
