package ai

import (
	"context"
	"strings"
	"testing"
)

func TestTruncateTerminalBuffer(t *testing.T) {
	shortBuf := "Error: command not found: foo"
	if TruncateTerminalBuffer(shortBuf) != shortBuf {
		t.Errorf("Expected unchanged short buffer")
	}

	longBuf := strings.Repeat("A", 5000)
	truncated := TruncateTerminalBuffer(longBuf)
	if len(truncated) != maxTerminalBufferChars {
		t.Errorf("Expected length %d, got %d", maxTerminalBufferChars, len(truncated))
	}
}

func TestFormatTerminalSystemPrompt(t *testing.T) {
	prompt := FormatTerminalSystemPrompt("WSL Ubuntu")
	if !strings.Contains(prompt, "WSL Ubuntu") {
		t.Errorf("Expected prompt to contain shell type 'WSL Ubuntu'")
	}
	if !strings.Contains(prompt, "Ground Truth from Error Streams") {
		t.Errorf("Expected prompt to contain diagnostic rules")
	}
	if !strings.Contains(prompt, "CommandNotFoundException") {
		t.Errorf("Expected prompt to contain exception guidance")
	}

	defaultPrompt := FormatTerminalSystemPrompt("")
	if !strings.Contains(defaultPrompt, "PowerShell") {
		t.Errorf("Expected default prompt to contain 'PowerShell'")
	}
}

func TestExplainTerminalErrorValidation(t *testing.T) {
	ctx := context.Background()

	// Empty key
	_, err := ExplainTerminalError(ctx, "powershell", "some error", "", "gemini-2.5-flash")
	if err == nil {
		t.Errorf("Expected error for empty API key, got nil")
	}

	// Empty buffer
	_, err = ExplainTerminalError(ctx, "powershell", "   ", "valid_key", "gemini-2.5-flash")
	if err == nil {
		t.Errorf("Expected error for empty buffer, got nil")
	}
}

func TestAskAIFollowUpValidation(t *testing.T) {
	ctx := context.Background()

	// Empty key
	_, err := AskAIFollowUp(ctx, nil, "how to fix?", "", "gemini-2.5-flash")
	if err == nil {
		t.Errorf("Expected error for empty API key, got nil")
	}

	// Empty query
	_, err = AskAIFollowUp(ctx, nil, "   ", "valid_key", "gemini-2.5-flash")
	if err == nil {
		t.Errorf("Expected error for empty query, got nil")
	}
}
