package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// FileNode represents a file or directory in the project tree
type FileNode struct {
	Name      string     `json:"name"`
	Path      string     `json:"path"`     // Relative path from project root
	FullPath  string     `json:"fullPath"` // Absolute path on disk
	IsDir     bool       `json:"isDir"`
	Extension string     `json:"extension"`
	Size      int64      `json:"size"`
	Children  []FileNode `json:"children,omitempty"`
}

// EditorService provides file system operations for the Code Editor workspace
type EditorService struct {
	ctx context.Context
}

// NewEditorService creates a new EditorService
func NewEditorService() *EditorService {
	return &EditorService{}
}

// SetContext assigns the Wails application context
func (s *EditorService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

var ignoredDirs = map[string]bool{
	".git":         true,
	"node_modules": true,
	".next":        true,
	"dist":         true,
	"build":        true,
	".turbo":       true,
	".cache":       true,
	"vendor":       true,
	"bin":          true,
	"obj":          true,
	"target":       true,
	".idea":        true,
	".vscode":      true,
}

// GetFileTree reads the directory structure up to maxDepth
func (s *EditorService) GetFileTree(rootPath string, maxDepth int) ([]FileNode, error) {
	if rootPath == "" {
		return nil, fmt.Errorf("root path is required")
	}
	cleanRoot := filepath.Clean(rootPath)
	if _, err := os.Stat(cleanRoot); err != nil {
		return nil, fmt.Errorf("directory not found: %w", err)
	}

	if maxDepth <= 0 {
		maxDepth = 5
	}

	return s.readTreeLevel(cleanRoot, cleanRoot, 0, maxDepth)
}

func (s *EditorService) readTreeLevel(root, current string, depth, maxDepth int) ([]FileNode, error) {
	if depth >= maxDepth {
		return nil, nil
	}

	entries, err := os.ReadDir(current)
	if err != nil {
		return nil, err
	}

	var nodes []FileNode
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() && ignoredDirs[name] {
			continue
		}

		fullPath := filepath.Join(current, name)
		relPath, _ := filepath.Rel(root, fullPath)
		relPath = filepath.ToSlash(relPath)

		node := FileNode{
			Name:      name,
			Path:      relPath,
			FullPath:  filepath.ToSlash(fullPath),
			IsDir:     entry.IsDir(),
			Extension: strings.ToLower(strings.TrimPrefix(filepath.Ext(name), ".")),
		}

		if info, err := entry.Info(); err == nil {
			node.Size = info.Size()
		}

		if entry.IsDir() {
			children, _ := s.readTreeLevel(root, fullPath, depth+1, maxDepth)
			node.Children = children
		}

		nodes = append(nodes, node)
	}

	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].IsDir != nodes[j].IsDir {
			return nodes[i].IsDir
		}
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})

	return nodes, nil
}

// ReadFile loads text file contents
func (s *EditorService) ReadFile(fullPath string) (string, error) {
	cleanPath := filepath.Clean(fullPath)
	info, err := os.Stat(cleanPath)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		return "", fmt.Errorf("path is a directory")
	}
	if info.Size() > 5*1024*1024 {
		return "", fmt.Errorf("file exceeds 5MB size limit")
	}

	data, err := os.ReadFile(cleanPath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SaveFile writes content to disk
func (s *EditorService) SaveFile(fullPath, content string) error {
	cleanPath := filepath.Clean(fullPath)
	dir := filepath.Dir(cleanPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(cleanPath, []byte(content), 0644)
}

// CreateFile creates a new empty file
func (s *EditorService) CreateFile(fullPath string) error {
	cleanPath := filepath.Clean(fullPath)
	dir := filepath.Dir(cleanPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	f, err := os.OpenFile(cleanPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	return f.Close()
}

// CreateFolder creates a directory
func (s *EditorService) CreateFolder(fullPath string) error {
	return os.MkdirAll(filepath.Clean(fullPath), 0755)
}

// DeleteEntry removes file or directory
func (s *EditorService) DeleteEntry(fullPath string) error {
	return os.RemoveAll(filepath.Clean(fullPath))
}

// RenameEntry renames or moves a file/directory
func (s *EditorService) RenameEntry(oldPath, newPath string) error {
	return os.Rename(filepath.Clean(oldPath), filepath.Clean(newPath))
}

// GetGitOriginalFile retrieves HEAD file content for Git diff comparisons
func (s *EditorService) GetGitOriginalFile(repoPath, relPath string) (string, error) {
	if repoPath == "" || relPath == "" {
		return "", fmt.Errorf("repo path and file path are required")
	}
	gitRelPath := filepath.ToSlash(relPath)
	cmd := gitCommand("-C", repoPath, "show", "HEAD:"+gitRelPath)
	out, err := cmd.Output()
	if err != nil {
		return "", nil // file might be newly added or untracked
	}
	return string(out), nil
}

// OpenDirectoryDialog prompts the user to select any project folder
func (s *EditorService) OpenDirectoryDialog() (string, error) {
	if s.ctx == nil {
		return "", fmt.Errorf("app context not initialized")
	}
	selected, err := wailsRuntime.OpenDirectoryDialog(s.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Open Project Folder in Octa Editor",
	})
	if err != nil {
		return "", err
	}
	return selected, nil
}
