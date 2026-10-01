package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisService manages Redis connection pools, keyspace scanning, key CRUD, and TTL.
type RedisService struct {
	mu      sync.RWMutex
	clients map[string]*redis.Client
}

// NewRedisService creates a new RedisService.
func NewRedisService() *RedisService {
	return &RedisService{
		clients: make(map[string]*redis.Client),
	}
}

// CloseClients closes all open Redis client connections gracefully upon app shutdown.
func (s *RedisService) CloseClients() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for key, client := range s.clients {
		_ = client.Close()
		delete(s.clients, key)
	}
}

// getRedisClient returns an existing client from the pool or creates a new one with resource-friendly limits.
func (s *RedisService) getRedisClient(config RedisConnectionConfig) *redis.Client {
	s.mu.Lock()
	defer s.mu.Unlock()

	host := config.Host
	if host == "" {
		host = "127.0.0.1"
	}
	port := config.Port
	if port <= 0 {
		port = 6379
	}

	clientKey := fmt.Sprintf("%s:%d:%d:%s", host, port, config.DB, config.Username)
	if client, exists := s.clients[clientKey]; exists {
		return client
	}

	opts := &redis.Options{
		Addr:            fmt.Sprintf("%s:%d", host, port),
		Username:        config.Username,
		Password:        config.Password,
		DB:              config.DB,
		DialTimeout:     4 * time.Second,
		ReadTimeout:     5 * time.Second,
		WriteTimeout:    5 * time.Second,
		PoolSize:        4,
		MinIdleConns:    1,
		ConnMaxIdleTime: 2 * time.Minute,
	}

	if config.SSL {
		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
	}

	client := redis.NewClient(opts)
	s.clients[clientKey] = client
	return client
}

// ConnectRedis verifies connection and retrieves server telemetry info.
func (s *RedisService) ConnectRedis(config RedisConnectionConfig) (RedisConnectResult, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pong, err := client.Ping(ctx).Result()
	if err != nil {
		return RedisConnectResult{
			Success: false,
			Error:   fmt.Sprintf("Failed to connect to Redis: %v", err),
		}, nil
	}

	infoStr, err := client.Info(ctx).Result()
	if err != nil && pong == "" {
		return RedisConnectResult{
			Success: false,
			Error:   fmt.Sprintf("Connected but failed to get server info: %v", err),
		}, nil
	}

	serverInfo := parseRedisInfo(infoStr)
	dbSize, _ := client.DBSize(ctx).Result()
	serverInfo.TotalKeys = dbSize

	return RedisConnectResult{
		Success:    true,
		ServerInfo: serverInfo,
	}, nil
}

// parseRedisInfo parses the output of the Redis INFO command into RedisServerInfo.
func parseRedisInfo(info string) RedisServerInfo {
	result := RedisServerInfo{
		RawInfo: make(map[string]string),
	}

	lines := strings.Split(info, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			result.RawInfo[k] = v

			switch k {
			case "redis_version":
				result.RedisVersion = v
			case "connected_clients":
				if val, err := strconv.Atoi(v); err == nil {
					result.ConnectedClients = val
				}
			case "used_memory_human":
				result.UsedMemoryHuman = v
			case "uptime_in_days":
				if val, err := strconv.ParseInt(v, 10, 64); err == nil {
					result.UptimeInDays = val
				}
			}
		}
	}
	return result
}

// SaveRedisConnections writes saved Redis connections to disk.
func (s *RedisService) SaveRedisConnections(jsonData string) error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(appDir, 0755)
	filePath := filepath.Join(appDir, "redis_connections.json")

	trimmed := strings.TrimSpace(jsonData)
	if trimmed == "" {
		trimmed = "[]"
	}
	return os.WriteFile(filePath, []byte(trimmed), 0644)
}

// LoadRedisConnections loads saved Redis connection profiles from disk.
func (s *RedisService) LoadRedisConnections() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	filePath := filepath.Join(configDir, "octa", "redis_connections.json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
