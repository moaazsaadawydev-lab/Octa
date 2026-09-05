package main

import (
	"octa/internal/ai"
)

// ============================================================================
// SETTINGS & CACHE DOMAIN (Delegated to SettingsService)
// ============================================================================

func (a *App) ClearAppCache() (bool, error) {
	return a.settingsService.ClearAppCache()
}

// ============================================================================
// AI DOMAIN (Delegated to AIService)
// ============================================================================

func (a *App) TestGeminiConnection(apiKey string, model string) (*ai.ConnectionResult, error) {
	return a.aiService.TestGeminiConnection(apiKey, model)
}

func (a *App) SaveAISettings(apiKey string, model string) (bool, error) {
	return a.aiService.SaveAISettings(apiKey, model)
}

func (a *App) GetAISettings() (ai.AIConfig, error) {
	return a.aiService.GetAISettings()
}

func (a *App) GenerateCommitMessage(repoPath string) (string, error) {
	return a.aiService.GenerateCommitMessage(repoPath)
}

