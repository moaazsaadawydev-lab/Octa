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
	maxTerminalBufferChars = 3500
	terminalAiTimeout      = 20 * time.Second
)

// ChatMessage represents a conversational turn between user and assistant.
type ChatMessage struct {
	Role    string `json:"role"` // "user" or "model" / "assistant"
	Content string `json:"content"`
}

// AIExplanationResponse packages the initial diagnosis along with the target shell.
type AIExplanationResponse struct {
	Explanation string `json:"explanation"`
	ShellType   string `json:"shell_type"`
}

// FormatTerminalSystemPrompt builds the system prompt tailored to the active shell environment.
func FormatTerminalSystemPrompt(shellType string) string {
	shell := strings.TrimSpace(shellType)
	if shell == "" {
		shell = "PowerShell"
	}
	return fmt.Sprintf(`You are an expert DevOps and Systems Engineer diagnosing terminal errors in Octa.
Current Shell: %s

Follow these strict diagnostic rules:
1. Ground Truth from Error Streams:
   - Always read the exact error identifier, CategoryInfo, and Exception type (e.g., CommandNotFoundException, ItemNotFoundException, UnauthorizedAccessException, ParameterBindingException).
   - If an error states 'ObjectNotFound' or 'CommandNotFoundException', diagnose it strictly as a MISSING FILE, INCORRECT PATH, or UNINSTALLED BINARY. Do NOT speculate about script dot-sourcing or runtime mechanics if the file itself does not exist.
   - For Bash/WSL: Prioritize exit codes, 'No such file or directory', 'command not found', and permission denied strings.

2. Structure Each Diagnosed Error:
   For every failed command:
   - Identify the exact command that failed.
   - Root Cause: 1-2 clear, factual sentences explaining the specific failure identified in the output.
   - Suggested Fix: The precise command(s) to verify path existence, install dependencies, or fix syntax. Wrap suggested commands in executable markdown code blocks.

3. Conciseness & Directness:
   - No conversational filler, greetings, or boilerplate assumptions.
   - Separate multiple errors cleanly using markdown headers (### Error 1, ### Error 2).`, shell)
}

// TruncateTerminalBuffer keeps only the tail end of the terminal buffer up to maxTerminalBufferChars,
// truncating older head lines to preserve the latest error traces intact.
func TruncateTerminalBuffer(buffer string) string {
	s := strings.TrimSpace(buffer)
	if len(s) > maxTerminalBufferChars {
		tail := s[len(s)-maxTerminalBufferChars:]
		// Align to the next line break if reasonably close to prevent sliced lines
		if idx := strings.Index(tail, "\n"); idx != -1 && idx < 80 {
			tail = tail[idx+1:]
		}
		return tail
	}
	return s
}

// ExplainTerminalError analyzes recent terminal output and returns an AI explanation.
func ExplainTerminalError(
	ctx context.Context,
	shellType string,
	terminalOutput string,
	apiKey string,
	model string,
) (*AIExplanationResponse, error) {
	key := strings.TrimSpace(apiKey)
	if key == "" {
		return nil, errors.New("Gemini API key is not configured. Please set it in Settings -> AI Engine.")
	}

	trimmedOutput := TruncateTerminalBuffer(terminalOutput)
	if trimmedOutput == "" {
		return nil, errors.New("terminal buffer is empty; cannot diagnose error")
	}

	systemPrompt := FormatTerminalSystemPrompt(shellType)
	userPrompt := fmt.Sprintf("Here is the recent terminal output containing the error:\n\n```terminal\n%s\n```\n\nPlease diagnose why this failed and provide the exact fix.", trimmedOutput)

	contents := []GeminiContent{
		{
			Role:  "user",
			Parts: []GeminiPingPart{{Text: userPrompt}},
		},
	}

	explanation, err := executeGeminiChatRequest(ctx, key, model, systemPrompt, contents, 0.2, 600)
	if err != nil {
		return nil, err
	}

	return &AIExplanationResponse{
		Explanation: explanation,
		ShellType:   shellType,
	}, nil
}

// AskAIFollowUp handles follow-up inquiries while maintaining conversational context.
func AskAIFollowUp(
	ctx context.Context,
	conversationHistory []ChatMessage,
	userQuery string,
	apiKey string,
	model string,
) (string, error) {
	key := strings.TrimSpace(apiKey)
	if key == "" {
		return "", errors.New("Gemini API key is not configured. Please set it in Settings -> AI Engine.")
	}

	query := strings.TrimSpace(userQuery)
	if query == "" {
		return "", errors.New("query cannot be empty")
	}

	var contents []GeminiContent
	for _, msg := range conversationHistory {
		role := "user"
		if msg.Role == "model" || msg.Role == "assistant" {
			role = "model"
		}
		contents = append(contents, GeminiContent{
			Role:  role,
			Parts: []GeminiPingPart{{Text: msg.Content}},
		})
	}

	// Append current user question
	contents = append(contents, GeminiContent{
		Role:  "user",
		Parts: []GeminiPingPart{{Text: query}},
	})

	systemPrompt := `You are an expert DevOps and CLI debugging assistant inside the Octa developer tool. Continue helping the user resolve their terminal error. Be direct, concise, and provide exact commands in markdown code blocks.`

	return executeGeminiChatRequest(ctx, key, model, systemPrompt, contents, 0.2, 600)
}

// executeGeminiChatRequest sends a multi-turn or single-turn request to Gemini.
func executeGeminiChatRequest(
	ctx context.Context,
	apiKey string,
	model string,
	systemPrompt string,
	contents []GeminiContent,
	temperature float64,
	maxTokens int,
) (string, error) {
	selectedModel := NormalizeModel(model)
	endpointUrl := fmt.Sprintf("%s/%s:generateContent?key=%s", geminiApiBaseUrl, selectedModel, apiKey)

	reqPayload := GeminiGenerateRequest{
		SystemInstruction: &GeminiContent{
			Parts: []GeminiPingPart{{Text: systemPrompt}},
		},
		Contents: contents,
		GenerationConfig: GeminiConfig{
			Temperature:     temperature,
			MaxOutputTokens: maxTokens,
		},
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return "", fmt.Errorf("failed to encode AI request: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, terminalAiTimeout)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(reqCtx, http.MethodPost, endpointUrl, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to initialize HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: terminalAiTimeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		if errors.Is(reqCtx.Err(), context.DeadlineExceeded) {
			return "", errors.New("network timeout: Gemini API did not respond in time")
		}
		return "", fmt.Errorf("network error reaching Gemini API: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))

	var genResp GeminiGenerateResponse
	if err := json.Unmarshal(respBytes, &genResp); err != nil {
		return "", fmt.Errorf("failed to parse AI response: %w", err)
	}

	if genResp.Error != nil && genResp.Error.Message != "" {
		return "", fmt.Errorf("Gemini error: %s", sanitizeMessage(genResp.Error.Message, apiKey))
	}

	if len(genResp.Candidates) == 0 || len(genResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("Gemini returned an empty response")
	}

	return strings.TrimSpace(genResp.Candidates[0].Content.Parts[0].Text), nil
}
