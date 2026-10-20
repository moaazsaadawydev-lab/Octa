package main

import (
	"bufio"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

type SearchMatch struct {
	Line     int    `json:"line"`
	Column   int    `json:"column"`
	LineText string `json:"lineText"`
	MatchLen int    `json:"matchLen"`
}

type FileSearchResult struct {
	FilePath string        `json:"filePath"`
	RelPath  string        `json:"relPath"`
	FileName string        `json:"fileName"`
	Matches  []SearchMatch `json:"matches"`
}

type ProjectSearchResult struct {
	Query        string             `json:"query"`
	TotalMatches int                `json:"totalMatches"`
	Files        []FileSearchResult `json:"files"`
}

var ignoredSearchDirs = map[string]bool{
	"node_modules":  true,
	".git":          true,
	".nx":           true,
	".cache":        true,
	"dist":          true,
	"build":         true,
	"tmp":           true,
	"temp":          true,
	"coverage":      true,
	".next":         true,
	".nuxt":         true,
	".turbo":        true,
	".idea":         true,
	".vscode":       true,
	"vendor":        true,
	"bin":           true,
	"obj":           true,
	"target":        true,
	".gradle":       true,
	"__pycache__":    true,
	".pytest_cache": true,
	".mypy_cache":   true,
	".venv":         true,
	"venv":          true,
	"env":           true,
	".yarn":         true,
	".pnpm-store":   true,
}

var ignoredSearchExts = map[string]bool{
	".exe": true, ".dll": true, ".so": true, ".dylib": true, ".bin": true,
	".zip": true, ".tar": true, ".gz": true, ".7z": true, ".rar": true,
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".webp": true,
	".ico": true, ".svg": true, ".mp4": true, ".mp3": true, ".wav": true,
	".pdf": true, ".woff": true, ".woff2": true, ".ttf": true, ".eot": true,
	".lock": true,
}

var ignoredSearchExactFiles = map[string]bool{
	"package-lock.json": true,
	"yarn.lock":         true,
	"pnpm-lock.yaml":    true,
}

func (s *EditorService) SearchProjectContent(projectRoot, query string, caseSensitive bool, maxResults int) (*ProjectSearchResult, error) {
	cleanRoot := filepath.Clean(projectRoot)
	if cleanRoot == "" || cleanRoot == "." || strings.TrimSpace(query) == "" {
		return &ProjectSearchResult{Query: query, Files: []FileSearchResult{}}, nil
	}
	if maxResults <= 0 {
		maxResults = 500
	}

	searchTarget := query
	if !caseSensitive {
		searchTarget = strings.ToLower(query)
	}

	result := &ProjectSearchResult{
		Query: query,
		Files: make([]FileSearchResult, 0),
	}

	totalFound := 0

	err := filepath.WalkDir(cleanRoot, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil
		}
		name := d.Name()
		if d.IsDir() {
			if path != cleanRoot && (ignoredSearchDirs[name] || strings.HasPrefix(name, ".")) {
				return filepath.SkipDir
			}
			return nil
		}

		if totalFound >= maxResults {
			return filepath.SkipAll
		}

		if ignoredSearchExactFiles[name] {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(name))
		if ignoredSearchExts[ext] {
			return nil
		}

		info, err := d.Info()
		if err != nil || info.Size() > 2*1024*1024 || info.Size() == 0 {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer f.Close()

		var fileMatches []SearchMatch
		scanner := bufio.NewScanner(f)
		buf := make([]byte, 64*1024)
		scanner.Buffer(buf, 1024*1024)

		lineNum := 0
		for scanner.Scan() {
			lineNum++
			line := scanner.Text()
			lineCompare := line
			if !caseSensitive {
				lineCompare = strings.ToLower(line)
			}

			startIdx := 0
			for {
				idx := strings.Index(lineCompare[startIdx:], searchTarget)
				if idx < 0 {
					break
				}
				matchCol := startIdx + idx

				trimmed := strings.TrimSpace(line)
				if len(trimmed) > 160 {
					trimmed = trimmed[:160] + "..."
				}

				fileMatches = append(fileMatches, SearchMatch{
					Line:     lineNum,
					Column:   matchCol + 1,
					LineText: trimmed,
					MatchLen: len(query),
				})
				totalFound++
				if totalFound >= maxResults {
					break
				}
				startIdx = matchCol + len(searchTarget)
			}
			if totalFound >= maxResults {
				break
			}
		}

		if len(fileMatches) > 0 {
			rel, _ := filepath.Rel(cleanRoot, path)
			result.Files = append(result.Files, FileSearchResult{
				FilePath: filepath.ToSlash(path),
				RelPath:  filepath.ToSlash(rel),
				FileName: name,
				Matches:  fileMatches,
			})
		}

		return nil
	})

	result.TotalMatches = totalFound
	return result, err
}
