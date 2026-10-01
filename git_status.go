package main

import (
	"bufio"
	"bytes"
	"strconv"
	"strings"
)

// GitFileChange describes a modified, staged, untracked, or deleted file
type GitFileChange struct {
	Path    string `json:"path"`
	OldPath string `json:"oldPath,omitempty"`
	Status  string `json:"status"` // "modified", "added", "deleted", "untracked", "renamed"
	Staged  bool   `json:"staged"`
}

// GitStatusResult contains the complete status of the active repository
type GitStatusResult struct {
	IsRepo         bool            `json:"isRepo"`
	RepoPath       string          `json:"repoPath"`
	Branch         string          `json:"branch"`
	Upstream       string          `json:"upstream"`
	Ahead          int             `json:"ahead"`
	Behind         int             `json:"behind"`
	StagedFiles    []GitFileChange `json:"stagedFiles"`
	UnstagedFiles  []GitFileChange `json:"unstagedFiles"`
	UntrackedFiles []GitFileChange `json:"untrackedFiles"`
}

// GetRepoStatus gathers branch, upstream tracking, ahead/behind count, and changes in a single fast command
func (s *GitService) GetRepoStatus(repoPath string) (*GitStatusResult, error) {
	res := &GitStatusResult{
		IsRepo:         false,
		RepoPath:       repoPath,
		StagedFiles:    []GitFileChange{},
		UnstagedFiles:  []GitFileChange{},
		UntrackedFiles: []GitFileChange{},
	}

	if repoPath == "" {
		return res, nil
	}

	statusCmd := gitCommand("-C", repoPath, "status", "--porcelain=v1", "-b", "-u")
	out, err := statusCmd.Output()
	if err != nil {
		return res, nil
	}
	res.IsRepo = true

	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 3 {
			continue
		}

		// Header line: ## <branch>...<upstream> [ahead X, behind Y]
		if strings.HasPrefix(line, "## ") {
			header := strings.TrimPrefix(line, "## ")
			if strings.HasPrefix(header, "No commits yet on ") {
				res.Branch = strings.TrimPrefix(header, "No commits yet on ")
				continue
			}
			if strings.HasPrefix(header, "Initial commit on ") {
				res.Branch = strings.TrimPrefix(header, "Initial commit on ")
				continue
			}
			if strings.HasPrefix(header, "HEAD (no branch)") {
				res.Branch = "HEAD (detached)"
				continue
			}

			branchPart := header
			bracketIdx := strings.Index(header, "[")
			if bracketIdx != -1 {
				branchPart = strings.TrimSpace(header[:bracketIdx])
				meta := strings.Trim(header[bracketIdx:], "[] ")
				for _, item := range strings.Split(meta, ",") {
					item = strings.TrimSpace(item)
					if strings.HasPrefix(item, "ahead ") {
						res.Ahead, _ = strconv.Atoi(strings.TrimPrefix(item, "ahead "))
					} else if strings.HasPrefix(item, "behind ") {
						res.Behind, _ = strconv.Atoi(strings.TrimPrefix(item, "behind "))
					}
				}
			}

			if dotIdx := strings.Index(branchPart, "..."); dotIdx != -1 {
				res.Branch = branchPart[:dotIdx]
				res.Upstream = branchPart[dotIdx+3:]
			} else {
				res.Branch = branchPart
			}
			continue
		}

		if len(line) < 4 {
			continue
		}

		x := line[0]
		y := line[1]
		filePath := strings.TrimSpace(line[3:])

		// Untracked files (??)
		if x == '?' && y == '?' {
			res.UntrackedFiles = append(res.UntrackedFiles, GitFileChange{
				Path:   filePath,
				Status: "untracked",
				Staged: false,
			})
			continue
		}

		// Staged changes (X index)
		if x != ' ' && x != '?' {
			status := "modified"
			switch x {
			case 'A':
				status = "added"
			case 'M':
				status = "modified"
			case 'D':
				status = "deleted"
			case 'R':
				status = "renamed"
			}
			res.StagedFiles = append(res.StagedFiles, GitFileChange{
				Path:   filePath,
				Status: status,
				Staged: true,
			})
		}

		// Unstaged changes (Y index)
		if y != ' ' && y != '?' {
			status := "modified"
			switch y {
			case 'M':
				status = "modified"
			case 'D':
				status = "deleted"
			case 'A':
				status = "added"
			}
			res.UnstagedFiles = append(res.UnstagedFiles, GitFileChange{
				Path:   filePath,
				Status: status,
				Staged: false,
			})
		}
	}

	if res.Branch == "" {
		res.Branch = "main"
	}

	return res, nil
}
