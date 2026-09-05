package ai

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// DefaultGeminiModel is the default selected model when none is configured.
const DefaultGeminiModel = "gemini-2.5-flash"

// AIConfig represents the persisted AI engine preferences.
type AIConfig struct {
	GeminiApiKey        string `json:"gemini_api_key"`
	GeminiSelectedModel string `json:"gemini_selected_model"`
}

// getAIConfigFilePath returns the absolute path to ai_settings.json.
func getAIConfigFilePath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	dir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "ai_settings.json")
}

// LoadAIConfig reads the persisted AI configuration from disk.
func LoadAIConfig() (AIConfig, error) {
	filePath := getAIConfigFilePath()
	data, err := os.ReadFile(filePath)
	if err != nil {
		return AIConfig{
			GeminiSelectedModel: DefaultGeminiModel,
		}, nil
	}

	var cfg AIConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return AIConfig{
			GeminiSelectedModel: DefaultGeminiModel,
		}, err
	}

	if cfg.GeminiSelectedModel == "" {
		cfg.GeminiSelectedModel = DefaultGeminiModel
	}

	return cfg, nil
}

// SaveAIConfig writes the AI configuration to disk.
func SaveAIConfig(cfg AIConfig) error {
	filePath := getAIConfigFilePath()
	if cfg.GeminiSelectedModel == "" {
		cfg.GeminiSelectedModel = DefaultGeminiModel
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, data, 0644)
}
