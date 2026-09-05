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

	"octa/internal/executil"
)

const (
	maxDiffChars = 3500
	aiReqTimeout = 15 * time.Second
)

const commitSystemInstruction = `You are an automated Git commit message generator.
Analyze the provided Git diff summary and generate a clear conventional commit message.
Rules:
1. Return ONLY the commit message text.
2. Do NOT output markdown code fences, backticks, quotes, or explanatory filler.
3. Format: A concise imperative subject line (e.g. feat:, fix:, refactor:, chore:) under 72 chars. Optionally add 1-2 brief bullet points if multiple distinct components changed.
4. Base the description strictly on the provided diff content without inventing changes.`

// GeminiContent represents structured message content.
type GeminiContent struct {
	Role  string           `json:"role,omitempty"`
	Parts []GeminiPingPart `json:"parts"`
}

// GeminiConfig sets generation hyper-parameters.
type GeminiConfig struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
}

// GeminiGenerateRequest is the full payload sent to Gemini API.
type GeminiGenerateRequest struct {
	SystemInstruction *GeminiContent  `json:"systemInstruction,omitempty"`
	Contents          []GeminiContent `json:"contents"`
	GenerationConfig  GeminiConfig    `json:"generationConfig"`
}

// GeminiCandidate holds the LLM text output.
type GeminiCandidate struct {
	Content struct {
		Parts []struct {
			Text string `json:"text"`
		} `json:"parts"`
	} `json:"content"`
}

// GeminiGenerateResponse unmarshals the generateContent API response.
type GeminiGenerateResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
	Error      *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// PrepareGitDiffSummary extracts and preprocesses git diff and status for AI commit message generation.
func PrepareGitDiffSummary(ctx context.Context, repoPath string) (string, error) {
	if strings.TrimSpace(repoPath) == "" {
		return "", errors.New("repository path is required")
	}

	// 1. Get porcelain status
	statusCmd := executil.CommandContext(ctx, "git", "-C", repoPath, "status", "--porcelain")
	statusOut, err := statusCmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to read git status: %w", err)
	}

	statusSummary := strings.TrimSpace(string(statusOut))
	if statusSummary == "" {
		return "", errors.New("no changes found to generate a commit message")
	}

	// 2. Read staged changes first (excluding lockfiles)
	stagedCmd := executil.CommandContext(ctx, "git", "-C", repoPath, "diff", "--cached", "--no-color", "--", ".", ":(exclude)*lock*", ":(exclude)go.sum")
	diffOut, _ := stagedCmd.Output()
	diffText := strings.TrimSpace(string(diffOut))

	// 3. Fallback to unstaged changes if no staged changes
	if diffText == "" {
		unstagedCmd := executil.CommandContext(ctx, "git", "-C", repoPath, "diff", "--no-color", "--", ".", ":(exclude)*lock*", ":(exclude)go.sum")
		diffOut, _ = unstagedCmd.Output()
		diffText = strings.TrimSpace(string(diffOut))
	}

	// 4. Truncate diff text if larger than maxDiffChars
	if len(diffText) > maxDiffChars {
		diffText = diffText[:maxDiffChars] + "\n... [diff truncated for brevity]"
	}

	var sb strings.Builder
	sb.WriteString("File status:\n")
	sb.WriteString(statusSummary)
	if diffText != "" {
		sb.WriteString("\n\nGit diff:\n")
		sb.WriteString(diffText)
	}

	return sb.String(), nil
}

// CleanCommitMessage sanitizes output from the model to guarantee pure commit message text.
func CleanCommitMessage(raw string) string {
	s := strings.TrimSpace(raw)
	if strings.HasPrefix(s, "```") {
		lines := strings.Split(s, "\n")
		if len(lines) > 2 && strings.HasPrefix(lines[len(lines)-1], "```") {
			s = strings.Join(lines[1:len(lines)-1], "\n")
		} else if len(lines) > 1 {
			s = strings.Join(lines[1:], "\n")
		}
	}
	s = strings.Trim(s, "`\"'")
	return strings.TrimSpace(s)
}

// GenerateCommitMessage inspects the git working tree and generates a conventional commit message.
func GenerateCommitMessage(repoPath string, apiKey string, model string) (string, error) {
	key := strings.TrimSpace(apiKey)
	if key == "" {
		return "", errors.New("Gemini API key is not configured. Please set it in Settings -> AI Engine.")
	}

	ctx, cancel := context.WithTimeout(context.Background(), aiReqTimeout)
	defer cancel()

	diffSummary, err := PrepareGitDiffSummary(ctx, repoPath)
	if err != nil {
		return "", err
	}

	selectedModel := NormalizeModel(model)
	endpointUrl := fmt.Sprintf("%s/%s:generateContent?key=%s", geminiApiBaseUrl, selectedModel, key)

	reqPayload := GeminiGenerateRequest{
		SystemInstruction: &GeminiContent{
			Parts: []GeminiPingPart{{Text: commitSystemInstruction}},
		},
		Contents: []GeminiContent{
			{
				Role:  "user",
				Parts: []GeminiPingPart{{Text: diffSummary}},
			},
		},
		GenerationConfig: GeminiConfig{
			Temperature:     0.2,
			MaxOutputTokens: 120,
		},
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return "", fmt.Errorf("failed to encode AI request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointUrl, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: aiReqTimeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
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
		return "", fmt.Errorf("Gemini error: %s", sanitizeMessage(genResp.Error.Message, key))
	}

	if len(genResp.Candidates) == 0 || len(genResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("Gemini returned empty response")
	}

	rawMsg := genResp.Candidates[0].Content.Parts[0].Text
	return CleanCommitMessage(rawMsg), nil
}
