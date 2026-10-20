package main

// GetFileTree retrieves directory tree structure for the code editor
func (a *App) GetFileTree(rootPath string, maxDepth int) ([]FileNode, error) {
	return a.editorService.GetFileTree(rootPath, maxDepth)
}

// ReadEditorFile reads file content for the code editor
func (a *App) ReadEditorFile(fullPath string) (string, error) {
	return a.editorService.ReadFile(fullPath)
}

// SaveEditorFile persists file content from the code editor
func (a *App) SaveEditorFile(fullPath, content string) error {
	return a.editorService.SaveFile(fullPath, content)
}

// CreateEditorFile creates a new empty file
func (a *App) CreateEditorFile(fullPath string) error {
	return a.editorService.CreateFile(fullPath)
}

// CreateEditorFolder creates a new folder
func (a *App) CreateEditorFolder(fullPath string) error {
	return a.editorService.CreateFolder(fullPath)
}

// DeleteEditorEntry deletes a file or directory
func (a *App) DeleteEditorEntry(fullPath string) error {
	return a.editorService.DeleteEntry(fullPath)
}

// RenameEditorEntry renames a file or directory
func (a *App) RenameEditorEntry(oldPath, newPath string) error {
	return a.editorService.RenameEntry(oldPath, newPath)
}

// GetGitOriginalFile gets HEAD content of a file for diff viewer
func (a *App) GetGitOriginalFile(repoPath, relPath string) (string, error) {
	return a.editorService.GetGitOriginalFile(repoPath, relPath)
}

// OpenEditorDirectoryDialog opens native directory picker
func (a *App) OpenEditorDirectoryDialog() (string, error) {
	return a.editorService.OpenDirectoryDialog()
}

// ResolveEditorDefinition locates cross-file symbol definitions for the editor
func (a *App) ResolveEditorDefinition(projectRoot, currentFilePath, word, lineContent string) (*DefinitionLocation, error) {
	return a.editorService.ResolveDefinition(projectRoot, currentFilePath, word, lineContent)
}

// SearchProjectContent searches for text across project files (excluding node_modules, cache, dist)
func (a *App) SearchProjectContent(projectRoot, query string, caseSensitive bool, maxResults int) (*ProjectSearchResult, error) {
	return a.editorService.SearchProjectContent(projectRoot, query, caseSensitive, maxResults)
}
