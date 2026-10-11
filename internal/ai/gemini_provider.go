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

	friendlyErr := FormatGeminiHTTPError(resp.StatusCode, respBody, selectedModel, key)
	return &ConnectionResult{
		Success: false,
		Message: friendlyErr.Error(),
	}, nil
}

// FormatGeminiHTTPError formats an HTTP error response from Gemini into a clean, human-friendly error.
func FormatGeminiHTTPError(statusCode int, body []byte, model string, apiKey string) error {
	var errResp GeminiErrorResponse
	_ = json.Unmarshal(body, &errResp)
	errMsg := strings.TrimSpace(errResp.Error.Message)
	cleanErr := sanitizeMessage(errMsg, apiKey)

	switch statusCode {
	case http.StatusTooManyRequests:
		retryNotice := ""
		lower := strings.ToLower(cleanErr)
		if strings.Contains(lower, "retry in") {
			idx := strings.Index(lower, "retry in")
			if idx != -1 {
				sub := cleanErr[idx:]
				end := strings.IndexAny(sub, ".\n\r")
				if end != -1 {
					retryNotice = fmt.Sprintf(" (%s)", strings.TrimSpace(sub[:end]))
				} else {
					retryNotice = fmt.Sprintf(" (%s)", strings.TrimSpace(sub))
				}
			}
		}
		return fmt.Errorf("Gemini Quota Exceeded (429): You have reached the request limit for model '%s'%s. Please switch to another model (e.g. gemini-3.5-flash) in Settings -> AI Engine, or try again later.", model, retryNotice)

	case http.StatusBadRequest:
		if strings.Contains(strings.ToLower(cleanErr), "api key") {
			return errors.New("Invalid Gemini API Key: Please verify your credentials in Settings -> AI Engine.")
		}
		if cleanErr != "" {
			return fmt.Errorf("Gemini Request Error (400): %s", cleanErr)
		}
		return errors.New("Bad request (HTTP 400) sent to Gemini API.")

	case http.StatusUnauthorized, http.StatusForbidden:
		return errors.New("Authentication Failed (403): Gemini API key is invalid or unauthorized. Please verify it in Settings -> AI Engine.")

	case http.StatusNotFound:
		return fmt.Errorf("Model '%s' was not found or is unavailable for your Gemini account. Try selecting gemini-3.5-flash in Settings -> AI Engine.", model)

	case http.StatusInternalServerError, http.StatusServiceUnavailable:
		return fmt.Errorf("Google Gemini servers are temporarily unavailable (HTTP %d). Please try again in a few moments.", statusCode)

	default:
		if cleanErr != "" {
			return fmt.Errorf("Gemini API error (HTTP %d): %s", statusCode, cleanErr)
		}
		return fmt.Errorf("Gemini API request failed with HTTP status %d.", statusCode)
	}
}

// sanitizeMessage ensures any accidental presence of the raw key in error text is purged.
func sanitizeMessage(msg string, apiKey string) string {
	if apiKey == "" || msg == "" {
		return msg
	}
	return strings.ReplaceAll(msg, apiKey, "[REDACTED]")
}
