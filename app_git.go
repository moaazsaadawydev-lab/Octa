package main

// ============================================================================
// SOURCE CONTROL / GIT DOMAIN (Delegated to GitService)
// ============================================================================

func (a *App) OpenRepositoryDialog() (string, error) {
	return a.gitService.OpenRepositoryDialog()
}
func (a *App) InitRepository(repoPath string) error {
	return a.gitService.InitRepository(repoPath)
}
func (a *App) GetRepoStatus(repoPath string) (*GitStatusResult, error) {
	return a.gitService.GetRepoStatus(repoPath)
}
func (a *App) GetFileDiff(repoPath string, filePath string, staged bool) (string, error) {
	return a.gitService.GetFileDiff(repoPath, filePath, staged)
}
func (a *App) StageFile(repoPath string, filePath string) error {
	return a.gitService.StageFile(repoPath, filePath)
}
func (a *App) UnstageFile(repoPath string, filePath string) error {
	return a.gitService.UnstageFile(repoPath, filePath)
}
func (a *App) StageAll(repoPath string) error {
	return a.gitService.StageAll(repoPath)
}
func (a *App) UnstageAll(repoPath string) error {
	return a.gitService.UnstageAll(repoPath)
}
func (a *App) CommitChanges(repoPath string, message string) error {
	return a.gitService.CommitChanges(repoPath, message)
}
func (a *App) PushChanges(repoPath string) error {
	return a.gitService.PushChanges(repoPath)
}
func (a *App) PullChanges(repoPath string) error {
	return a.gitService.PullChanges(repoPath)
}
func (a *App) FetchChanges(repoPath string) error {
	return a.gitService.FetchChanges(repoPath)
}
func (a *App) StartAutoWatch(repoPath string) error {
	return a.gitService.StartAutoWatch(repoPath)
}
func (a *App) StopAutoWatch() {
	a.gitService.StopAutoWatch()
}
func (a *App) IsGitRepository(repoPath string) bool {
	return a.gitService.IsGitRepository(repoPath)
}
func (a *App) InitializeRepositoryWithOptions(opts InitRepoOptions) error {
	return a.gitService.InitializeRepositoryWithOptions(opts)
}
