package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

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
