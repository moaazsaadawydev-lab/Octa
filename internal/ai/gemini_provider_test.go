package ai

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeModel(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", "gemini-3.5-flash"},
		{"   ", "gemini-3.5-flash"},
		{"gemini-2.5-pro", "gemini-2.5-pro"},
		{"models/gemini-2.5-flash", "gemini-2.5-flash"},
		{"  models/gemini-2.5-pro  ", "gemini-2.5-pro"},
	}

	for _, tc := range tests {
		res := NormalizeModel(tc.input)
		if res != tc.expected {
			t.Errorf("NormalizeModel(%q) = %q; expected %q", tc.input, res, tc.expected)
		}
	}
}

func TestSanitizeMessage(t *testing.T) {
	key := "AIzaSySecret12345"
	raw := "Error occurred with key AIzaSySecret12345 in request"
	sanitized := sanitizeMessage(raw, key)

	if sanitized != "Error occurred with key [REDACTED] in request" {
		t.Errorf("sanitizeMessage failed: %s", sanitized)
	}
}

func TestEmptyApiKey(t *testing.T) {
	res, err := TestGeminiConnection("", "gemini-2.5-flash")
	if res.Success || err == nil {
		t.Errorf("Expected failure for empty key, got success=%v, err=%v", res.Success, err)
	}
	if res.Message == "" {
		t.Errorf("Expected non-empty error message for empty key")
	}
}

func TestMockGeminiHandshake(t *testing.T) {
	// Test server responding to ping
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("key") == "valid_key" {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"candidates": [{"content": {"parts": [{"text": "pong"}]}}]}`))
			return
		}

		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(GeminiErrorResponse{
			Error: struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
				Status  string `json:"status"`
			}{
				Code:    400,
				Message: "API key not valid. Please pass a valid API key.",
				Status:  "INVALID_ARGUMENT",
			},
		})
	}))
	defer server.Close()
}

func TestFormatGeminiHTTPError(t *testing.T) {
	// 429 Resource Exhausted
	body429 := []byte(`{"error": {"code": 429, "message": "Quota exceeded. Please retry in 2h50m56s.", "status": "RESOURCE_EXHAUSTED"}}`)
	err429 := FormatGeminiHTTPError(429, body429, "gemini-2.5-flash", "AIzaSyTest")
	if err429 == nil || !strings.Contains(err429.Error(), "Quota Exceeded (429)") {
		t.Fatalf("Expected Quota Exceeded error message, got: %v", err429)
	}
	if !strings.Contains(err429.Error(), "gemini-2.5-flash") {
		t.Fatalf("Expected model name in error, got: %v", err429)
	}

	// 400 Bad Request
	body400 := []byte(`{"error": {"code": 400, "message": "API key not valid", "status": "INVALID_ARGUMENT"}}`)
	err400 := FormatGeminiHTTPError(400, body400, "gemini-2.5-flash", "AIzaSyTest")
	if err400 == nil || !strings.Contains(err400.Error(), "Invalid Gemini API Key") {
		t.Fatalf("Expected Invalid API Key message, got: %v", err400)
	}

	// 403 Forbidden
	body403 := []byte(`{"error": {"code": 403, "message": "Permission denied", "status": "PERMISSION_DENIED"}}`)
	err403 := FormatGeminiHTTPError(403, body403, "gemini-2.5-flash", "AIzaSyTest")
	if err403 == nil || !strings.Contains(err403.Error(), "Authentication Failed") {
		t.Fatalf("Expected Authentication Failed message, got: %v", err403)
	}

	// 404 Not Found
	body404 := []byte(`{"error": {"code": 404, "message": "models/unknown is not found", "status": "NOT_FOUND"}}`)
	err404 := FormatGeminiHTTPError(404, body404, "unknown", "AIzaSyTest")
	if err404 == nil || !strings.Contains(err404.Error(), "Model 'unknown' was not found") {
		t.Fatalf("Expected Model Not Found message, got: %v", err404)
	}
}
