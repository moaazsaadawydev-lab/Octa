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

// getRedisClient returns an existing client from the pool or creates a new one.
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
		Addr:         fmt.Sprintf("%s:%d", host, port),
		Username:     config.Username,
		Password:     config.Password,
		DB:           config.DB,
		DialTimeout:  4 * time.Second,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
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

// ScanRedisKeys safely scans keys in the current DB matching the given pattern using non-blocking SCAN.
func (s *RedisService) ScanRedisKeys(config RedisConnectionConfig, pattern string, cursor uint64, count int64) (RedisScanResult, error) {
	if pattern == "" {
		pattern = "*"
	}
	if count <= 0 {
		count = 500
	}

	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	keys, nextCursor, err := client.Scan(ctx, cursor, pattern, count).Result()
	if err != nil {
		return RedisScanResult{}, fmt.Errorf("scan failed: %w", err)
	}

	pipe := client.Pipeline()
	typeCmds := make(map[string]*redis.StatusCmd)
	ttlCmds := make(map[string]*redis.DurationCmd)
	memoryCmds := make(map[string]*redis.IntCmd)

	for _, k := range keys {
		typeCmds[k] = pipe.Type(ctx, k)
		ttlCmds[k] = pipe.TTL(ctx, k)
		memoryCmds[k] = pipe.MemoryUsage(ctx, k)
	}

	_, _ = pipe.Exec(ctx)

	keyInfos := make([]RedisKeyInfo, 0, len(keys))
	for _, k := range keys {
		kType := "string"
		if cmd, ok := typeCmds[k]; ok && cmd.Err() == nil {
			kType = cmd.Val()
		}

		var ttlSec int64 = -1
		if cmd, ok := ttlCmds[k]; ok && cmd.Err() == nil {
			d := cmd.Val()
			if d == -1*time.Second {
				ttlSec = -1
			} else if d == -2*time.Second {
				ttlSec = -2
			} else {
				ttlSec = int64(d.Seconds())
			}
		}

		var memUsage int64 = 0
		if cmd, ok := memoryCmds[k]; ok && cmd.Err() == nil {
			memUsage = cmd.Val()
		}

		keyInfos = append(keyInfos, RedisKeyInfo{
			Key:         k,
			Type:        kType,
			TTL:         ttlSec,
			MemoryUsage: memUsage,
		})
	}

	return RedisScanResult{
		Keys:       keyInfos,
		NextCursor: nextCursor,
	}, nil
}

// GetRedisKeyDetails inspects a single key, returning structured values and telemetry.
func (s *RedisService) GetRedisKeyDetails(config RedisConnectionConfig, key string) (RedisKeyDetail, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	kType, err := client.Type(ctx, key).Result()
	if err != nil {
		return RedisKeyDetail{}, fmt.Errorf("failed to get key type: %w", err)
	}
	if kType == "none" {
		return RedisKeyDetail{}, fmt.Errorf("key '%s' does not exist", key)
	}

	ttlVal, _ := client.TTL(ctx, key).Result()
	var ttlSec int64 = -1
	if ttlVal == -1*time.Second {
		ttlSec = -1
	} else if ttlVal == -2*time.Second {
		ttlSec = -2
	} else {
		ttlSec = int64(ttlVal.Seconds())
	}

	memUsage, _ := client.MemoryUsage(ctx, key).Result()

	detail := RedisKeyDetail{
		Key:         key,
		Type:        kType,
		TTL:         ttlSec,
		MemoryUsage: memUsage,
	}

	switch kType {
	case "string":
		val, err := client.Get(ctx, key).Result()
		if err == nil {
			detail.StringValue = val
		}
	case "hash":
		valMap, err := client.HGetAll(ctx, key).Result()
		if err == nil {
			detail.HashValue = valMap
		}
	case "list":
		valList, err := client.LRange(ctx, key, 0, 999).Result()
		if err == nil {
			detail.ListValue = valList
		}
	case "set":
		valSet, err := client.SMembers(ctx, key).Result()
		if err == nil {
			detail.SetValue = valSet
		}
	case "zset":
		valZSet, err := client.ZRangeWithScores(ctx, key, 0, 999).Result()
		if err == nil {
			zmembers := make([]ZSetMember, len(valZSet))
			for i, zm := range valZSet {
				zmembers[i] = ZSetMember{
					Member: fmt.Sprintf("%v", zm.Member),
					Score:  zm.Score,
				}
			}
			detail.ZSetValue = zmembers
		}
	}

	return detail, nil
}

// CreateRedisKey creates a new key with specified type, payload, and optional TTL.
func (s *RedisService) CreateRedisKey(config RedisConnectionConfig, key string, keyType string, payload any, ttlSeconds int64) (bool, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	var exp time.Duration = 0
	if ttlSeconds > 0 {
		exp = time.Duration(ttlSeconds) * time.Second
	}

	switch strings.ToLower(keyType) {
	case "string":
		strVal := fmt.Sprintf("%v", payload)
		err := client.Set(ctx, key, strVal, exp).Err()
		if err != nil {
			return false, err
		}
	case "hash":
		m, ok := payload.(map[string]any)
		if !ok {
			mStr, okStr := payload.(map[string]string)
			if okStr {
				m = make(map[string]any)
				for k, v := range mStr {
					m[k] = v
				}
			} else {
				return false, fmt.Errorf("hash payload must be a map")
			}
		}
		if len(m) == 0 {
			m["_empty"] = ""
		}
		err := client.HSet(ctx, key, m).Err()
		if err != nil {
			return false, err
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	case "list":
		items, ok := payload.([]any)
		if !ok {
			strItems, okStr := payload.([]string)
			if okStr {
				items = make([]any, len(strItems))
				for i, v := range strItems {
					items[i] = v
				}
			} else {
				return false, fmt.Errorf("list payload must be an array")
			}
		}
		if len(items) == 0 {
			items = []any{"new_item"}
		}
		client.Del(ctx, key)
		err := client.RPush(ctx, key, items...).Err()
		if err != nil {
			return false, err
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	case "set":
		items, ok := payload.([]any)
		if !ok {
			strItems, okStr := payload.([]string)
			if okStr {
				items = make([]any, len(strItems))
				for i, v := range strItems {
					items[i] = v
				}
			} else {
				return false, fmt.Errorf("set payload must be an array")
			}
		}
		if len(items) == 0 {
			items = []any{"member1"}
		}
		client.Del(ctx, key)
		err := client.SAdd(ctx, key, items...).Err()
		if err != nil {
			return false, err
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	case "zset":
		client.Del(ctx, key)
		zmembers := []redis.Z{
			{Score: 1, Member: "member1"},
		}
		err := client.ZAdd(ctx, key, zmembers...).Err()
		if err != nil {
			return false, err
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	default:
		return false, fmt.Errorf("unsupported redis key type: %s", keyType)
	}

	return true, nil
}

// UpdateRedisKey updates the content of an existing key.
func (s *RedisService) UpdateRedisKey(config RedisConnectionConfig, key string, keyType string, payload any, ttlSeconds int64) (bool, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	var exp time.Duration = 0
	if ttlSeconds > 0 {
		exp = time.Duration(ttlSeconds) * time.Second
	}

	switch strings.ToLower(keyType) {
	case "string":
		strVal := fmt.Sprintf("%v", payload)
		err := client.Set(ctx, key, strVal, exp).Err()
		if err != nil {
			return false, err
		}
	case "hash":
		m, ok := payload.(map[string]any)
		if !ok {
			mStr, okStr := payload.(map[string]string)
			if okStr {
				m = make(map[string]any)
				for k, v := range mStr {
					m[k] = v
				}
			} else {
				return false, fmt.Errorf("hash payload must be a key-value map")
			}
		}
		client.Del(ctx, key)
		if len(m) > 0 {
			err := client.HSet(ctx, key, m).Err()
			if err != nil {
				return false, err
			}
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	case "list":
		items, ok := payload.([]any)
		if !ok {
			strItems, okStr := payload.([]string)
			if okStr {
				items = make([]any, len(strItems))
				for i, v := range strItems {
					items[i] = v
				}
			} else {
				return false, fmt.Errorf("list payload must be an array")
			}
		}
		client.Del(ctx, key)
		if len(items) > 0 {
			err := client.RPush(ctx, key, items...).Err()
			if err != nil {
				return false, err
			}
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	case "set":
		items, ok := payload.([]any)
		if !ok {
			strItems, okStr := payload.([]string)
			if okStr {
				items = make([]any, len(strItems))
				for i, v := range strItems {
					items[i] = v
				}
			} else {
				return false, fmt.Errorf("set payload must be an array")
			}
		}
		client.Del(ctx, key)
		if len(items) > 0 {
			err := client.SAdd(ctx, key, items...).Err()
			if err != nil {
				return false, err
			}
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	case "zset":
		rawItems, ok := payload.([]any)
		if !ok {
			return false, fmt.Errorf("zset payload must be an array of objects")
		}
		zmembers := make([]redis.Z, 0, len(rawItems))
		for _, item := range rawItems {
			if m, ok := item.(map[string]any); ok {
				score := 0.0
				if sVal, exists := m["score"]; exists {
					switch s := sVal.(type) {
					case float64:
						score = s
					case int:
						score = float64(s)
					}
				}
				member := fmt.Sprintf("%v", m["member"])
				zmembers = append(zmembers, redis.Z{Score: score, Member: member})
			}
		}
		client.Del(ctx, key)
		if len(zmembers) > 0 {
			err := client.ZAdd(ctx, key, zmembers...).Err()
			if err != nil {
				return false, err
			}
		}
		if exp > 0 {
			client.Expire(ctx, key, exp)
		}
	default:
		return false, fmt.Errorf("unsupported key type: %s", keyType)
	}

	return true, nil
}

// DeleteRedisKey removes a key from the database.
func (s *RedisService) DeleteRedisKey(config RedisConnectionConfig, key string) (bool, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := client.Del(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return res > 0, nil
}

// DeleteRedisKeysBatch removes multiple keys in a single atomic batch command.
func (s *RedisService) DeleteRedisKeysBatch(config RedisConnectionConfig, keys []string) (int64, error) {
	if len(keys) == 0 {
		return 0, nil
	}

	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	res, err := client.Del(ctx, keys...).Result()
	if err != nil {
		return 0, err
	}
	return res, nil
}

// SetRedisTTL updates the expiration TTL (or makes it persistent if ttlSeconds <= -1).
func (s *RedisService) SetRedisTTL(config RedisConnectionConfig, key string, ttlSeconds int64) (bool, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if ttlSeconds <= -1 {
		return client.Persist(ctx, key).Result()
	}

	return client.Expire(ctx, key, time.Duration(ttlSeconds)*time.Second).Result()
}

// FlushRedisDB flushes all keys from the current DB.
func (s *RedisService) FlushRedisDB(config RedisConnectionConfig) (bool, error) {
	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	res, err := client.FlushDB(ctx).Result()
	if err != nil {
		return false, err
	}
	return res == "OK", nil
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

// parseRedisCommandLine splits a CLI-style command line into individual arguments,
// respecting single/double quoted strings with spaces and escape sequences.
func parseRedisCommandLine(commandLine string) ([]any, error) {
	var args []any
	var current strings.Builder
	inQuotes := false
	quoteChar := byte(0)
	escaped := false

	trimmed := strings.TrimSpace(commandLine)
	if trimmed == "" {
		return nil, nil
	}

	for i := 0; i < len(trimmed); i++ {
		c := trimmed[i]

		if escaped {
			current.WriteByte(c)
			escaped = false
			continue
		}

		if c == '\\' {
			escaped = true
			continue
		}

		if inQuotes {
			if c == quoteChar {
				inQuotes = false
				quoteChar = 0
			} else {
				current.WriteByte(c)
			}
		} else {
			if c == '"' || c == '\'' {
				inQuotes = true
				quoteChar = c
			} else if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
				if current.Len() > 0 {
					args = append(args, current.String())
					current.Reset()
				}
			} else {
				current.WriteByte(c)
			}
		}
	}

	if current.Len() > 0 {
		args = append(args, current.String())
	}

	if inQuotes {
		return nil, fmt.Errorf("unclosed quote (%c) in command", quoteChar)
	}

	return args, nil
}

// formatRedisCommandOutput converts raw Redis results into structured type tags and human-readable CLI formats.
func formatRedisCommandOutput(val any, cmdName string) (string, string) {
	if val == nil {
		return "nil", "(nil)"
	}

	switch v := val.(type) {
	case string:
		if v == "OK" || v == "PONG" || v == "QUEUED" {
			return "status", v
		}
		if strings.HasPrefix(v, "# ") || strings.Contains(v, "\r\n") || strings.Contains(v, "\n") {
			return "string", v
		}
		return "string", fmt.Sprintf("%q", v)

	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "integer", fmt.Sprintf("(integer) %v", v)

	case float32, float64:
		return "float", fmt.Sprintf("%v", v)

	case bool:
		if v {
			return "integer", "(integer) 1"
		}
		return "integer", "(integer) 0"

	case []any:
		if len(v) == 0 {
			return "slice", "(empty array)"
		}
		var lines []string
		for i, item := range v {
			if strItem, ok := item.(string); ok {
				lines = append(lines, fmt.Sprintf("%d) %q", i+1, strItem))
			} else if item == nil {
				lines = append(lines, fmt.Sprintf("%d) (nil)", i+1))
			} else {
				lines = append(lines, fmt.Sprintf("%d) %v", i+1, item))
			}
		}
		return "slice", strings.Join(lines, "\n")

	case []string:
		if len(v) == 0 {
			return "slice", "(empty array)"
		}
		var lines []string
		for i, item := range v {
			lines = append(lines, fmt.Sprintf("%d) %q", i+1, item))
		}
		return "slice", strings.Join(lines, "\n")

	case map[string]string:
		if len(v) == 0 {
			return "map", "(empty hash)"
		}
		var lines []string
		idx := 1
		for k, valStr := range v {
			lines = append(lines, fmt.Sprintf("%d) %q\n%d) %q", idx, k, idx+1, valStr))
			idx += 2
		}
		return "map", strings.Join(lines, "\n")

	case map[string]any:
		if len(v) == 0 {
			return "map", "(empty map)"
		}
		var lines []string
		idx := 1
		for k, valAny := range v {
			lines = append(lines, fmt.Sprintf("%d) %q\n%d) %v", idx, k, idx+1, valAny))
			idx += 2
		}
		return "map", strings.Join(lines, "\n")

	default:
		return "string", fmt.Sprintf("%v", v)
	}
}

// ExecuteRedisCommand parses and executes a dynamic CLI-style Redis command.
func (s *RedisService) ExecuteRedisCommand(config RedisConnectionConfig, commandLine string) (RedisCommandResult, error) {
	trimmed := strings.TrimSpace(commandLine)
	if trimmed == "" {
		return RedisCommandResult{
			ResultType: "null",
			Formatted:  "",
			DurationMs: 0,
			Command:    commandLine,
		}, nil
	}

	args, err := parseRedisCommandLine(trimmed)
	if err != nil {
		return RedisCommandResult{
			ResultType: "error",
			Error:      err.Error(),
			Formatted:  fmt.Sprintf("(error) %s", err.Error()),
			DurationMs: 0,
			Command:    commandLine,
		}, nil
	}

	if len(args) == 0 {
		return RedisCommandResult{
			ResultType: "null",
			Formatted:  "",
			DurationMs: 0,
			Command:    commandLine,
		}, nil
	}

	client := s.getRedisClient(config)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cmdName := strings.ToUpper(fmt.Sprintf("%v", args[0]))

	start := time.Now()
	res, err := client.Do(ctx, args...).Result()
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0

	if err != nil {
		if err == redis.Nil {
			return RedisCommandResult{
				RawOutput:  nil,
				ResultType: "nil",
				Formatted:  "(nil)",
				DurationMs: durationMs,
				Command:    commandLine,
			}, nil
		}
		return RedisCommandResult{
			RawOutput:  nil,
			ResultType: "error",
			Error:      err.Error(),
			Formatted:  fmt.Sprintf("(error) %s", err.Error()),
			DurationMs: durationMs,
			Command:    commandLine,
		}, nil
	}

	resultType, formatted := formatRedisCommandOutput(res, cmdName)

	return RedisCommandResult{
		RawOutput:  res,
		Formatted:  formatted,
		ResultType: resultType,
		DurationMs: durationMs,
		Command:    commandLine,
	}, nil
}
