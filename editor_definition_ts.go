package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type tsConfigPaths struct {
	CompilerOptions struct {
		BaseURL string              `json:"baseUrl"`
		Paths   map[string][]string `json:"paths"`
	} `json:"compilerOptions"`
}

func loadTSConfigPaths(root string) (string, map[string][]string) {
	candidates := []string{
		filepath.Join(root, "tsconfig.base.json"),
		filepath.Join(root, "tsconfig.json"),
	}
	for _, c := range candidates {
		data, err := os.ReadFile(c)
		if err != nil {
			continue
		}
		clean := stripJSONComments(string(data))
		var cfg tsConfigPaths
		if err := json.Unmarshal([]byte(clean), &cfg); err == nil && len(cfg.CompilerOptions.Paths) > 0 {
			baseURL := cfg.CompilerOptions.BaseURL
			if baseURL == "" {
				baseURL = "."
			}
			return filepath.Join(root, baseURL), cfg.CompilerOptions.Paths
		}
	}
	return root, nil
}

func stripJSONComments(content string) string {
	reBlock := regexp.MustCompile(`/\*[\s\S]*?\*/`)
	content = reBlock.ReplaceAllString(content, "")
	reLine := regexp.MustCompile(`(?m)//.*$`)
	return reLine.ReplaceAllString(content, "")
}

func resolveTSConfigPath(root, specifier string) string {
	baseDir, paths := loadTSConfigPaths(root)
	if paths == nil {
		return ""
	}

	if targets, ok := paths[specifier]; ok {
		for _, t := range targets {
			cand := filepath.Join(baseDir, t)
			if stat, err := os.Stat(cand); err == nil && !stat.IsDir() {
				return cand
			}
		}
	}

	for pattern, targets := range paths {
		if strings.HasSuffix(pattern, "/*") {
			prefix := strings.TrimSuffix(pattern, "/*")
			if strings.HasPrefix(specifier, prefix+"/") {
				sub := strings.TrimPrefix(specifier, prefix+"/")
				for _, t := range targets {
					tSub := strings.Replace(t, "*", sub, 1)
					cand := filepath.Join(baseDir, tSub)
					if stat, err := os.Stat(cand); err == nil && !stat.IsDir() {
						return cand
					}
					for _, ext := range []string{".ts", ".tsx", ".js", ".jsx"} {
						if stat, err := os.Stat(cand + ext); err == nil && !stat.IsDir() {
							return cand + ext
						}
					}
				}
			}
		}
	}
	return ""
}

func findMultilineImportSpecifier(content, word string) string {
	escaped := regexp.QuoteMeta(word)
	reNamed := regexp.MustCompile(`(?s)import\s*\{[^}]*\b` + escaped + `\b[^}]*\}\s*from\s*['"]([^'"]+)['"]`)
	if m := reNamed.FindStringSubmatch(content); len(m) >= 2 {
		return m[1]
	}
	reDefault := regexp.MustCompile(`(?s)import\s+\b` + escaped + `\b\s+from\s*['"]([^'"]+)['"]`)
	if m := reDefault.FindStringSubmatch(content); len(m) >= 2 {
		return m[1]
	}
	reStar := regexp.MustCompile(`(?s)import\s*\*\s*as\s+\b` + escaped + `\b\s*from\s*['"]([^'"]+)['"]`)
	if m := reStar.FindStringSubmatch(content); len(m) >= 2 {
		return m[1]
	}
	reReq := regexp.MustCompile(`(?s)(?:const|let|var)\s*(?:\{[^}]*\b` + escaped + `\b[^}]*\}|\b` + escaped + `\b)\s*=\s*require\(['"]([^'"]+)['"]\)`)
	if m := reReq.FindStringSubmatch(content); len(m) >= 2 {
		return m[1]
	}
	return ""
}

func followReExports(targetFile, word string, depth int) (string, int, int) {
	if depth > 3 {
		return targetFile, 1, 1
	}

	data, err := os.ReadFile(targetFile)
	if err != nil {
		return targetFile, 1, 1
	}
	content := string(data)

	line, col := findSymbolLineInContent(content, word, false)
	if line > 0 {
		return targetFile, line, col
	}

	dir := filepath.Dir(targetFile)
	reStarExport := regexp.MustCompile(`export\s*\*\s*from\s*['"]([^'"]+)['"]`)
	matches := reStarExport.FindAllStringSubmatch(content, -1)
	for _, m := range matches {
		if len(m) >= 2 {
			subPath := resolveJSModule(dir, dir, m[1])
			if subPath != "" {
				resFile, l, c := followReExports(subPath, word, depth+1)
				if l > 0 && resFile != "" {
					return resFile, l, c
				}
			}
		}
	}
	return targetFile, 1, 1
}

func findSymbolLineInContent(content, word string, isPython bool) (int, int) {
	escaped := regexp.QuoteMeta(word)
	pat := regexp.MustCompile(`(?:export\s+(?:default\s+)?)?(?:class|function|const|let|var|interface|type|enum)\s+\b` + escaped + `\b`)
	if isPython {
		pat = regexp.MustCompile(`(?:class|def)\s+\b` + escaped + `\b|^` + escaped + `\s*=`)
	}

	lines := strings.Split(content, "\n")
	for i, line := range lines {
		if pat.MatchString(line) {
			col := strings.Index(line, word)
			if col < 0 {
				col = 0
			}
			return i + 1, col + 1
		}
	}
	return 0, 0
}
