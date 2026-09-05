package main

// ============================================================================
// TERMINAL DOMAIN (Delegated to TerminalService)
// ============================================================================

func (a *App) GetAvailableShells() []ShellInfo {
	return a.terminalService.GetAvailableShells()
}
func (a *App) StartTerminalSession(sessionID string, workDir string, cols int, rows int, shellPath string) error {
	return a.terminalService.StartTerminalSession(sessionID, workDir, cols, rows, shellPath)
}
func (a *App) CreateTerminalSession(sessionID string, workDir string, cols int, rows int, shellPath string) error {
	return a.terminalService.StartTerminalSession(sessionID, workDir, cols, rows, shellPath)
}
func (a *App) WriteTerminalSession(sessionID string, data string) error {
	return a.terminalService.WriteTerminalSession(sessionID, data)
}
func (a *App) ResizeTerminalSession(sessionID string, cols int, rows int) error {
	return a.terminalService.ResizeTerminalSession(sessionID, cols, rows)
}
func (a *App) CloseTerminalSession(sessionID string) error {
	return a.terminalService.CloseTerminalSession(sessionID)
}
