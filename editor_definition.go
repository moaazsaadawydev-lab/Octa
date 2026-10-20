package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// DefinitionLocation represents a resolved jump target in a file
type DefinitionLocation struct {
	FullPath string `json:"fullPath"`
	Line     int    `json:"line"`
	Column   int    `json:"column"`
}

// ResolveDefinition finds the file and line for cross-file code navigation
func (s *EditorService) ResolveDefinition(projectRoot, currentFilePath, word, lineContent string) (*DefinitionLocation, error) {
	cleanCurrent := filepath.Clean(currentFilePath)
	cleanRoot := filepath.Clean(projectRoot)
	currentDir := filepath.Dir(cleanCurrent)
	ext := strings.ToLower(filepath.Ext(cleanCurrent))
	isPython := ext == ".py"

	// 1. Direct click on import path string (e.g. './app.controller' or 'service')
	quotedPath := extractQuotedString(lineContent, word)
	if quotedPath != "" {
		resolved := resolvePathCandidate(cleanRoot, currentDir, quotedPath, isPython)
		if resolved != "" {
			return &DefinitionLocation{FullPath: filepath.ToSlash(resolved), Line: 1, Column: 1}, nil
		}
	}

	// 2. Scan current file for import statements mentioning the symbol
	specifier := findImportSpecifierForWord(cleanCurrent, word, isPython)
	if specifier != "" {
		targetFile := resolvePathCandidate(cleanRoot, currentDir, specifier, isPython)
		if targetFile != "" {
			if !isPython {
				finalFile, line, col := followReExports(targetFile, word, 0)
				return &DefinitionLocation{FullPath: filepath.ToSlash(finalFile), Line: line, Column: col}, nil
			}
			line, col := findSymbolLineInFile(targetFile, word, isPython)
			return &DefinitionLocation{FullPath: filepath.ToSlash(targetFile), Line: line, Column: col}, nil
		}
	}

	// 3. Fallback: check if symbol is defined in current file
	currLine, currCol := findSymbolLineInFile(cleanCurrent, word, isPython)
	if currLine > 0 {
		return &DefinitionLocation{FullPath: filepath.ToSlash(cleanCurrent), Line: currLine, Column: currCol}, nil
	}

	// 4. Fallback: check if symbol corresponds to a sibling file
	siblingCandidate := findSiblingFileForSymbol(currentDir, word, isPython)
	if siblingCandidate != "" {
		line, col := findSymbolLineInFile(siblingCandidate, word, isPython)
		return &DefinitionLocation{FullPath: filepath.ToSlash(siblingCandidate), Line: line, Column: col}, nil
	}

	return nil, nil
}

func extractQuotedString(line, word string) string {
	re := regexp.MustCompile(`['"]([^'"]+)['"]`)
	matches := re.FindAllStringSubmatch(line, -1)
	for _, m := range matches {
		if len(m) >= 2 && (m[1] == word || strings.Contains(m[1], word) || strings.Contains(word, m[1])) {
			return m[1]
		}
	}
	return ""
}

func findImportSpecifierForWord(filePath, word string, isPython bool) string {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ""
	}
	content := string(data)

	if !isPython {
		if spec := findMultilineImportSpecifier(content, word); spec != "" {
			return spec
		}
	} else {
		escapedWord := regexp.QuoteMeta(word)
		rePyFrom := regexp.MustCompile(`from\s+([.\w]+)\s+import\s+.*\b` + escapedWord + `\b`)
		if m := rePyFrom.FindStringSubmatch(content); len(m) >= 2 {
			return m[1]
		}
		rePyImport := regexp.MustCompile(`import\s+([.\w]+)(?:\s+as\s+\b` + escapedWord + `\b)?`)
		if m := rePyImport.FindStringSubmatch(content); len(m) >= 2 {
			return m[1]
		}
	}
	return ""
}

func resolvePathCandidate(root, currentDir, specifier string, isPython bool) string {
	if isPython {
		return resolvePythonModule(root, currentDir, specifier)
	}
	return resolveJSModule(root, currentDir, specifier)
}

func resolveJSModule(root, currentDir, specifier string) string {
	// First: Check tsconfig path mappings (monorepos, @scope/...)
	if tsResolved := resolveTSConfigPath(root, specifier); tsResolved != "" {
		return tsResolved
	}

	var bases []string
	if strings.HasPrefix(specifier, "./") || strings.HasPrefix(specifier, "../") {
		bases = append(bases, filepath.Join(currentDir, specifier))
	} else if strings.HasPrefix(specifier, "@/") {
		trimmed := strings.TrimPrefix(specifier, "@/")
		bases = append(bases, filepath.Join(root, "src", trimmed), filepath.Join(root, trimmed))
	} else {
		bases = append(bases, filepath.Join(currentDir, specifier), filepath.Join(root, specifier), filepath.Join(root, "src", specifier), filepath.Join(root, "libs", specifier))
	}

	exts := []string{"", ".ts", ".tsx", ".js", ".jsx", ".d.ts", ".mjs", ".cjs"}
	indexFiles := []string{"index.ts", "index.tsx", "index.js", "index.jsx"}

	for _, b := range bases {
		for _, ext := range exts {
			candidate := b + ext
			if stat, err := os.Stat(candidate); err == nil && !stat.IsDir() {
				return candidate
			}
		}
		for _, idx := range indexFiles {
			candidate := filepath.Join(b, idx)
			if stat, err := os.Stat(candidate); err == nil && !stat.IsDir() {
				return candidate
			}
		}
	}
	return ""
}

func resolvePythonModule(root, currentDir, specifier string) string {
	dots := 0
	for dots < len(specifier) && specifier[dots] == '.' {
		dots++
	}

	baseDir := currentDir
	for i := 1; i < dots; i++ {
		baseDir = filepath.Dir(baseDir)
	}

	rem := strings.TrimPrefix(specifier, strings.Repeat(".", dots))
	relSub := strings.ReplaceAll(rem, ".", string(filepath.Separator))

	var candidates []string
	if dots > 0 {
		candidates = append(candidates, filepath.Join(baseDir, relSub))
	} else {
		candidates = append(candidates, filepath.Join(root, relSub), filepath.Join(currentDir, relSub))
	}

	for _, c := range candidates {
		if stat, err := os.Stat(c + ".py"); err == nil && !stat.IsDir() {
			return c + ".py"
		}
		initFile := filepath.Join(c, "__init__.py")
		if stat, err := os.Stat(initFile); err == nil && !stat.IsDir() {
			return initFile
		}
	}
	return ""
}

func findSymbolLineInFile(targetFile, word string, isPython bool) (int, int) {
	data, err := os.ReadFile(targetFile)
	if err != nil {
		return 1, 1
	}
	line, col := findSymbolLineInContent(string(data), word, isPython)
	if line > 0 {
		return line, col
	}
	return 1, 1
}

func findSiblingFileForSymbol(dir, word string, isPython bool) string {
	ext := ".ts"
	if isPython {
		ext = ".py"
	}
	re := regexp.MustCompile(`([a-z0-9])([A-Z])`)
	kebab := strings.ToLower(re.ReplaceAllString(word, `${1}-${2}`))
	snake := strings.ToLower(re.ReplaceAllString(word, `${1}_${2}`))
	for _, c := range []string{word + ext, strings.ToLower(word) + ext, kebab + ext, snake + ext} {
		p := filepath.Join(dir, c)
		if stat, err := os.Stat(p); err == nil && !stat.IsDir() {
			return p
		}
	}
	return ""
}
