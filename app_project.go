package main

// ============================================================================
// PROJECT DOMAIN (Delegated to ProjectService)
// ============================================================================

func (a *App) CreateProjectFileDialog(defaultName string) (ProjectFileResult, error) {
	return a.projectService.CreateProjectFileDialog(defaultName)
}
func (a *App) OpenProjectFileDialog() (ProjectFileResult, error) {
	return a.projectService.OpenProjectFileDialog()
}
func (a *App) ReadProjectFile(filePath string) (ProjectFileResult, error) {
	return a.projectService.ReadProjectFile(filePath)
}
func (a *App) SaveProjectFile(filePath string, jsonData string) (bool, error) {
	return a.projectService.SaveProjectFile(filePath, jsonData)
}
func (a *App) CloseProjectConnections() (bool, error) {
	a.dbService.ClosePools()
	a.terminalService.CloseAllTerminalSessions()
	a.dockerService.StopAllLogStreams()
	return a.projectService.CloseProjectConnections()
}
func (a *App) WipeLegacyStorage() (bool, error) {
	return a.projectService.WipeLegacyStorage()
}
