package ai

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"octa/internal/executil"
)

const (
	defaultMaxDiffChars = 25000
)

// ProjectMetadata contains high-level information identifying a software repository.
type ProjectMetadata struct {
	Name        string
	Description string
}

// ExtractProjectMetadata attempts to discover the project name and summary from configuration files or README.
func ExtractProjectMetadata(repoPath string) ProjectMetadata {
	meta := ProjectMetadata{}

	// 1. Check package.json
	pkgPath := filepath.Join(repoPath, "package.json")
	if data, err := os.ReadFile(pkgPath); err == nil {
		var pkg struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if json.Unmarshal(data, &pkg) == nil {
			meta.Name = pkg.Name
			meta.Description = pkg.Description
		}
	}

	// 2. Fallback to go.mod if name empty
	if meta.Name == "" {
		goModPath := filepath.Join(repoPath, "go.mod")
		if data, err := os.ReadFile(goModPath); err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "module ") {
					meta.Name = strings.TrimSpace(strings.TrimPrefix(line, "module"))
					break
				}
			}
		}
	}

	// 3. Fallback to folder name if name still empty
	if meta.Name == "" {
		meta.Name = filepath.Base(repoPath)
	}

	// 4. Check README.md for description if empty
	if meta.Description == "" {
		for _, name := range []string{"README.md", "readme.md", "README", "readme"} {
			readmePath := filepath.Join(repoPath, name)
			if file, err := os.Open(readmePath); err == nil {
				defer file.Close()
				scanner := bufio.NewScanner(file)
				var lines []string
				for scanner.Scan() && len(lines) < 6 {
					text := strings.TrimSpace(scanner.Text())
					if text != "" && !strings.HasPrefix(text, "#") && !strings.HasPrefix(text, "!") && !strings.HasPrefix(text, "[") {
						lines = append(lines, text)
					}
				}
				if len(lines) > 0 {
					meta.Description = strings.Join(lines, " ")
					if len(meta.Description) > 300 {
						meta.Description = meta.Description[:300] + "..."
					}
				}
				break
			}
		}
	}

	return meta
}

// ExtractBranchName reads the current git branch name.
func ExtractBranchName(ctx context.Context, repoPath string) string {
	cmd := executil.CommandContext(ctx, "git", "-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	branch := strings.TrimSpace(string(out))
	if branch == "HEAD" {
		return ""
	}
	return branch
}

// ExtractRecentCommits reads up to N recent commit message titles for style matching.
func ExtractRecentCommits(ctx context.Context, repoPath string, limit int) []string {
	if limit <= 0 {
		limit = 5
	}
	cmd := executil.CommandContext(ctx, "git", "-C", repoPath, "log", fmt.Sprintf("-n%d", limit), "--pretty=format:%s")
	out, err := cmd.Output()
	if err != nil {
		return nil
	}
	var commits []string
	for _, line := range strings.Split(string(out), "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			commits = append(commits, trimmed)
		}
	}
	return commits
}

// ExtractDiffStat returns git diff --stat for a clean overview of affected files and lines.
func ExtractDiffStat(ctx context.Context, repoPath string) string {
	// Staged first
	cmd := executil.CommandContext(ctx, "git", "-C", repoPath, "diff", "--cached", "--stat", "--", ".", ":(exclude)*lock*", ":(exclude)go.sum", ":(exclude)*.octa")
	out, err := cmd.Output()
	stat := strings.TrimSpace(string(out))
	if stat != "" {
		return stat
	}
	// Fallback to unstaged
	cmd = executil.CommandContext(ctx, "git", "-C", repoPath, "diff", "--stat", "--", ".", ":(exclude)*lock*", ":(exclude)go.sum", ":(exclude)*.octa")
	out, err = cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func isNoisePath(relPath string) bool {
	lower := strings.ToLower(relPath)
	if strings.HasSuffix(lower, ".octa") || strings.Contains(lower, ".octa/") || strings.Contains(lower, ".octa\\") {
		return true
	}
	for _, ext := range []string{".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".exe", ".dll", ".zip", ".tar.gz", ".lock"} {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

// ExtractUntrackedSummary reads outlines of untracked code files to give AI full visibility of newly created components.
func ExtractUntrackedSummary(repoPath string, statusSummary string, maxFiles int) string {
	if maxFiles <= 0 {
		maxFiles = 5
	}
	var untracked []string
	for _, line := range strings.Split(statusSummary, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "?? ") {
			p := strings.Trim(strings.TrimSpace(strings.TrimPrefix(line, "?? ")), "\"")
			if p != "" && !isNoisePath(p) {
				untracked = append(untracked, p)
			}
		}
	}
	if len(untracked) == 0 {
		return ""
	}

	var sb strings.Builder
	inspected := 0
	for _, rel := range untracked {
		full := filepath.Join(repoPath, rel)
		info, err := os.Stat(full)
		if err != nil || info.IsDir() || info.Size() > 64*1024 {
			continue
		}
		f, err := os.Open(full)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		var lines []string
		for scanner.Scan() && len(lines) < 60 {
			lines = append(lines, scanner.Text())
		}
		_ = f.Close()

		if len(lines) > 0 {
			sb.WriteString(fmt.Sprintf("\n--- NEW UNTRACKED FILE: %s ---\n", rel))
			sb.WriteString(strings.Join(lines, "\n") + "\n")
			inspected++
			if inspected >= maxFiles {
				break
			}
		}
	}

	if len(untracked) > inspected {
		remaining := untracked[inspected:]
		if len(remaining) > 0 {
			sb.WriteString(fmt.Sprintf("\nAdditional untracked files: %s\n", strings.Join(remaining, ", ")))
		}
	}

	return strings.TrimSpace(sb.String())
}

