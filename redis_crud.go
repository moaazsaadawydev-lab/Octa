package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

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
