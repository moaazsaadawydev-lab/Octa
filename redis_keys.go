package main

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

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
