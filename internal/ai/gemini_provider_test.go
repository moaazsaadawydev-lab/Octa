package ai

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNormalizeModel(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", "gemini-2.5-flash"},
		{"   ", "gemini-2.5-flash"},
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
