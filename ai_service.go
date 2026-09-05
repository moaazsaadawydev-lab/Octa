package main

import (
	"context"
	"errors"
	"strings"
	"sync"

	"octa/internal/ai"
)

// AIService manages AI engine configurations and connectivity verification.
type AIService struct {
	ctx context.Context
	mu  sync.RWMutex
}

// NewAIService constructs an AIService instance.
func NewAIService() *AIService {
	return &AIService{}
}

// SetContext sets the Wails runtime context.
func (s *AIService) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

// TestGeminiConnection runs an online handshake against the Gemini API to verify the key and model.
func (s *AIService) TestGeminiConnection(apiKey string, model string) (*ai.ConnectionResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := strings.TrimSpace(apiKey)
	if key == "" {
		// Attempt fallback to stored key
		stored, err := ai.LoadAIConfig()
		if err == nil && stored.GeminiApiKey != "" {
			key = stored.GeminiApiKey
		}
	}

	if key == "" {
		return &ai.ConnectionResult{
			Success: false,
			Message: "API Key is required. Please provide a valid Gemini API key.",
		}, errors.New("empty api key")
	}

	selectedModel := strings.TrimSpace(model)
	if selectedModel == "" {
		selectedModel = ai.DefaultGeminiModel
	}

	return ai.TestGeminiConnection(key, selectedModel)
}

// SaveAISettings persists the API key and selected model to local storage.
func (s *AIService) SaveAISettings(apiKey string, model string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	selectedModel := strings.TrimSpace(model)
	if selectedModel == "" {
		selectedModel = ai.DefaultGeminiModel
	}

	cfg := ai.AIConfig{
		GeminiApiKey:        strings.TrimSpace(apiKey),
		GeminiSelectedModel: selectedModel,
	}

	if err := ai.SaveAIConfig(cfg); err != nil {
		return false, err
	}
	return true, nil
}

// GetAISettings retrieves the currently stored AI engine configuration.
func (s *AIService) GetAISettings() (ai.AIConfig, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return ai.LoadAIConfig()
}

// GenerateCommitMessage inspects working directory git diff and queries Gemini for a conventional commit message.
func (s *AIService) GenerateCommitMessage(repoPath string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cfg, err := ai.LoadAIConfig()
	if err != nil || strings.TrimSpace(cfg.GeminiApiKey) == "" {
		return "", errors.New("Gemini API key is not configured. Please set it in Settings -> AI Engine.")
	}

	model := cfg.GeminiSelectedModel
	if strings.TrimSpace(model) == "" {
		model = ai.DefaultGeminiModel
	}

	return ai.GenerateCommitMessage(repoPath, cfg.GeminiApiKey, model)
}

