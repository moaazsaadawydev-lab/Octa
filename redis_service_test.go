package main

import (
	"encoding/json"
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
