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

const aiReqTimeout = 15 * time.Second

const commitSystemInstruction = `You are an automated Git commit message generator for software engineering projects.
Analyze the provided Project Context, Recent Commits, File Stats, Git Diff, and Untracked Files to generate a clear conventional commit message.
Rules:
1. Return ONLY the commit message text.
2. Do NOT output markdown code fences, backticks, quotes, or conversational filler.
3. Use the Project Context to accurately identify components and domains (e.g. feat(api-gateway):, fix(auth):).
4. Mimic the naming style and conventions seen in the Recent Commits.
5. Format: A concise imperative subject line under 72 chars. Optionally add 1-2 brief bullet points if multiple distinct components changed.
6. Base the description strictly on actual code changes in the diff and untracked files without hallucinating features.
7. Always produce a complete, finished commit message without cutting off.`

type GeminiContent struct {
	Role  string           `json:"role,omitempty"`
	Parts []GeminiPingPart `json:"parts"`
}

type GeminiThinkingConfig struct {
	ThinkingBudget int `json:"thinkingBudget"`
}

type GeminiConfig struct {
	Temperature     float64               `json:"temperature"`
	MaxOutputTokens int                   `json:"maxOutputTokens"`
	ThinkingConfig  *GeminiThinkingConfig `json:"thinkingConfig,omitempty"`
}

type GeminiGenerateRequest struct {
	SystemInstruction *GeminiContent  `json:"systemInstruction,omitempty"`
	Contents          []GeminiContent `json:"contents"`
	GenerationConfig  GeminiConfig    `json:"generationConfig"`
}

type GeminiCandidate struct {
	Content struct {
		Parts []struct {
			Text    string `json:"text"`
			Thought bool   `json:"thought,omitempty"`
		} `json:"parts"`
	} `json:"content"`
	FinishReason string `json:"finishReason,omitempty"`
}

type GeminiGenerateResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
	Error      *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// PrepareGitDiffSummary extracts and preprocesses git diff, project context, history, and status for AI commit message generation.
func PrepareGitDiffSummary(ctx context.Context, repoPath string) (string, error) {
	if strings.TrimSpace(repoPath) == "" {
		return "", errors.New("repository path is required")
	}

	statusCmd := executil.CommandContext(ctx, "git", "-C", repoPath, "status", "--porcelain=v1", "-u")
	statusOut, err := statusCmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to read git status: %w", err)
	}

	statusSummary := strings.TrimSpace(string(statusOut))
	if statusSummary == "" {
		return "", errors.New("no changes found to generate a commit message")
	}

	stagedCmd := executil.CommandContext(ctx, "git", "-C", repoPath, "diff", "--cached", "--no-color", "--", ".", ":(exclude)*lock*", ":(exclude)go.sum", ":(exclude)*.octa")
	diffOut, _ := stagedCmd.Output()
	diffText := strings.TrimSpace(string(diffOut))

	if diffText == "" {
		unstagedCmd := executil.CommandContext(ctx, "git", "-C", repoPath, "diff", "--no-color", "--", ".", ":(exclude)*lock*", ":(exclude)go.sum", ":(exclude)*.octa")
		diffOut, _ = unstagedCmd.Output()
		diffText = strings.TrimSpace(string(diffOut))
	}

	if len(diffText) > defaultMaxDiffChars {
		diffText = diffText[:defaultMaxDiffChars] + "\n... [diff truncated for brevity]"
	}

	meta := ExtractProjectMetadata(repoPath)
	branch := ExtractBranchName(ctx, repoPath)
	recentCommits := ExtractRecentCommits(ctx, repoPath, 6)
	diffStat := ExtractDiffStat(ctx, repoPath)
	untracked := ExtractUntrackedSummary(repoPath, statusSummary, 5)

	var sb strings.Builder
	sb.WriteString("=== PROJECT CONTEXT ===\n")
	if meta.Name != "" {
		sb.WriteString("Project: " + meta.Name + "\n")
	}
	if meta.Description != "" {
		sb.WriteString("Description: " + meta.Description + "\n")
	}
	if branch != "" {
		sb.WriteString("Branch: " + branch + "\n")
	}

	if len(recentCommits) > 0 {
		sb.WriteString("\n=== RECENT REPO COMMITS (Follow this convention & style) ===\n")
		for _, msg := range recentCommits {
			sb.WriteString("- " + msg + "\n")
		}
	}

	if diffStat != "" {
		sb.WriteString("\n=== FILE MODIFICATION STATS ===\n" + diffStat + "\n")
	}

	sb.WriteString("\n=== GIT STATUS ===\n" + statusSummary)

	if untracked != "" {
		sb.WriteString("\n\n=== NEW / UNTRACKED FILES ===\n" + untracked)
	}

	if diffText != "" {
		sb.WriteString("\n\n=== GIT DIFF ===\n" + diffText)
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
	return strings.TrimSpace(strings.Trim(s, "`\"'"))
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

	endpointUrl := fmt.Sprintf("%s/%s:generateContent?key=%s", geminiApiBaseUrl, NormalizeModel(model), key)
	reqPayload := GeminiGenerateRequest{
		SystemInstruction: &GeminiContent{Parts: []GeminiPingPart{{Text: commitSystemInstruction}}},
		Contents:          []GeminiContent{{Role: "user", Parts: []GeminiPingPart{{Text: diffSummary}}}},
		GenerationConfig: GeminiConfig{
			Temperature:     0.2,
			MaxOutputTokens: 600,
			ThinkingConfig:  &GeminiThinkingConfig{ThinkingBudget: 0},
		},
	}

	respBytes, err := sendCommitRequest(ctx, endpointUrl, reqPayload, model, key)
	if err != nil && strings.Contains(err.Error(), "thinkingConfig") {
		reqPayload.GenerationConfig.ThinkingConfig = nil
		respBytes, err = sendCommitRequest(ctx, endpointUrl, reqPayload, model, key)
	}
	if err != nil {
		return "", err
	}

	var genResp GeminiGenerateResponse
	if err := json.Unmarshal(respBytes, &genResp); err != nil {
		return "", fmt.Errorf("failed to parse AI response: %w", err)
	}
	if genResp.Error != nil && genResp.Error.Message != "" {
		return "", FormatGeminiHTTPError(genResp.Error.Code, respBytes, NormalizeModel(model), key)
	}
	if len(genResp.Candidates) == 0 || len(genResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("Gemini returned empty response")
	}

	var sb strings.Builder
	for _, p := range genResp.Candidates[0].Content.Parts {
		if !p.Thought && p.Text != "" {
			sb.WriteString(p.Text)
		}
	}
	raw := sb.String()
	if raw == "" {
		raw = genResp.Candidates[0].Content.Parts[0].Text
	}
	return CleanCommitMessage(raw), nil
}

func sendCommitRequest(ctx context.Context, endpoint string, reqPayload GeminiGenerateRequest, model string, key string) ([]byte, error) {
	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: aiReqTimeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nil, errors.New("network timeout: Gemini API did not respond in time")
		}
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode >= 400 {
		return data, FormatGeminiHTTPError(resp.StatusCode, data, NormalizeModel(model), key)
	}
	return data, nil
}
