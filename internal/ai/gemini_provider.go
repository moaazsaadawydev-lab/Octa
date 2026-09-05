package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	geminiApiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models"
	handshakeTimeout = 10 * time.Second
)

// ConnectionResult represents the structured outcome of an API handshake.
type ConnectionResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// GeminiPingPart represents a text fragment in content generation.
type GeminiPingPart struct {
	Text string `json:"text"`
}

// GeminiPingContent represents content sent in generateContent.
type GeminiPingContent struct {
	Parts []GeminiPingPart `json:"parts"`
}

// GeminiGenerationConfig limits output tokens for ping verification.
type GeminiGenerationConfig struct {
	MaxOutputTokens int `json:"maxOutputTokens"`
}

// GeminiPingRequest is the minimal dry-run body to verify credentials and model.
type GeminiPingRequest struct {
	Contents         []GeminiPingContent    `json:"contents"`
	GenerationConfig GeminiGenerationConfig `json:"generationConfig"`
}

// GeminiErrorResponse parses the standard Google API error envelope.
type GeminiErrorResponse struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error"`
}

// NormalizeModel ensures the model identifier is clean without duplicate prefixes.
func NormalizeModel(model string) string {
	m := strings.TrimSpace(model)
	if m == "" {
		return DefaultGeminiModel
	}
	m = strings.TrimPrefix(m, "models/")
	return m
}

// TestGeminiConnection performs a minimal handshake request to validate the API key and model.
func TestGeminiConnection(apiKey string, model string) (*ConnectionResult, error) {
	key := strings.TrimSpace(apiKey)
	if key == "" {
		return &ConnectionResult{
			Success: false,
			Message: "API Key is required. Please enter a valid key.",
		}, errors.New("empty api key")
	}

	selectedModel := NormalizeModel(model)

	// Construct minimal verification request
	pingReq := GeminiPingRequest{
		Contents: []GeminiPingContent{
			{
				Parts: []GeminiPingPart{{Text: "ping"}},
			},
		},
		GenerationConfig: GeminiGenerationConfig{
			MaxOutputTokens: 5,
		},
	}

	bodyBytes, err := json.Marshal(pingReq)
	if err != nil {
		return &ConnectionResult{
			Success: false,
			Message: "Failed to encode request payload",
		}, err
	}

	endpointUrl := fmt.Sprintf("%s/%s:generateContent?key=%s", geminiApiBaseUrl, selectedModel, key)

	ctx, cancel := context.WithTimeout(context.Background(), handshakeTimeout)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointUrl, bytes.NewReader(bodyBytes))
	if err != nil {
		return &ConnectionResult{
			Success: false,
			Message: "Failed to initialize HTTP request",
		}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Log with redacted API key for safety
	redactedUrl := fmt.Sprintf("%s/%s:generateContent?key=[REDACTED]", geminiApiBaseUrl, selectedModel)
	fmt.Printf("[AI Service] Executing Gemini handshake to %s\n", redactedUrl)

	client := &http.Client{Timeout: handshakeTimeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return &ConnectionResult{
				Success: false,
				Message: "Network timeout: Google Gemini API did not respond within 10s.",
			}, ctx.Err()
		}
		return &ConnectionResult{
			Success: false,
			Message: fmt.Sprintf("Network error: Unable to reach Google API (%v)", err),
		}, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 16*1024))

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return &ConnectionResult{
			Success: true,
			Message: "Connected (Handshake Successful)",
		}, nil
	}

	// Categorize HTTP errors
	var errResp GeminiErrorResponse
	_ = json.Unmarshal(respBody, &errResp)
	errMsg := strings.TrimSpace(errResp.Error.Message)

	var friendlyMsg string
	switch resp.StatusCode {
	case http.StatusBadRequest:
		if strings.Contains(strings.ToLower(errMsg), "api key") {
			friendlyMsg = "Invalid API Key: Please verify your Gemini credentials."
		} else {
			friendlyMsg = fmt.Sprintf("Bad Request (400): %s", sanitizeMessage(errMsg, key))
		}
	case http.StatusUnauthorized, http.StatusForbidden:
		friendlyMsg = "Authentication failed: Invalid or unauthorized API Key."
	case http.StatusNotFound:
		friendlyMsg = fmt.Sprintf("Model not found: '%s' is not available for this API key.", selectedModel)
	case http.StatusTooManyRequests:
		friendlyMsg = "Quota exceeded: Rate limit or billing quota reached on this API key."
	case http.StatusInternalServerError, http.StatusServiceUnavailable:
		friendlyMsg = fmt.Sprintf("Gemini service temporarily unavailable (HTTP %d).", resp.StatusCode)
	default:
		if errMsg != "" {
			friendlyMsg = fmt.Sprintf("Connection failed (HTTP %d): %s", resp.StatusCode, sanitizeMessage(errMsg, key))
		} else {
			friendlyMsg = fmt.Sprintf("Connection failed with HTTP status %d.", resp.StatusCode)
		}
	}

	return &ConnectionResult{
		Success: false,
		Message: friendlyMsg,
	}, nil
}

// sanitizeMessage ensures any accidental presence of the raw key in error text is purged.
func sanitizeMessage(msg string, apiKey string) string {
	if apiKey == "" || msg == "" {
		return msg
	}
	return strings.ReplaceAll(msg, apiKey, "[REDACTED]")
}
