package ai

import (
	"context"
	"strings"
	"testing"
)

func TestCleanCommitMessage(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			"feat(git): add commit ai",
			"feat(git): add commit ai",
		},
		{
			"```\nfix(auth): resolve token refresh issue\n```",
			"fix(auth): resolve token refresh issue",
		},
		{
			"```markdown\nrefactor: simplify hook\n```",
			"refactor: simplify hook",
		},
		{
			"\"chore: update dependencies\"",
			"chore: update dependencies",
		},
		{
			"`feat: support markdown`",
			"feat: support markdown",
		},
		{
			"  feat: trimmed commit  \n\n",
			"feat: trimmed commit",
		},
	}

	for _, tc := range tests {
		got := CleanCommitMessage(tc.input)
		if got != tc.expected {
			t.Errorf("CleanCommitMessage(%q) = %q; expected %q", tc.input, got, tc.expected)
		}
	}
}

func TestPrepareGitDiffSummaryValidation(t *testing.T) {
	ctx := context.Background()
	_, err := PrepareGitDiffSummary(ctx, "")
	if err == nil {
		t.Errorf("Expected error for empty repo path, got nil")
	}

	_, err = PrepareGitDiffSummary(ctx, "C:\\non_existent_folder_xyz_123")
	if err == nil {
		t.Errorf("Expected error for non-existent repo path, got nil")
	}
}

func TestGenerateCommitMessageEmptyKey(t *testing.T) {
	_, err := GenerateCommitMessage(".", "", "gemini-2.5-flash")
	if err == nil {
		t.Errorf("Expected error for empty API key, got nil")
	}
	if !strings.Contains(err.Error(), "Gemini API key is not configured") {
		t.Errorf("Unexpected error message: %v", err)
	}
}
