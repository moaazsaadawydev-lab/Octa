package docker

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// StoredEngineConfig represents the serialized Docker engine selection.
type StoredEngineConfig struct {
	Engine string `json:"engine"`
	Distro string `json:"distro"`
}

// getEngineConfigFilePath resolves the local path to docker_engine.json.
func getEngineConfigFilePath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	dir := filepath.Join(configDir, "octa")
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "docker_engine.json")
}

// LoadStoredEngine reads the persisted engine provider and distro from disk.
func LoadStoredEngine() (string, string) {
	filePath := getEngineConfigFilePath()
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", ""
	}
	var cfg StoredEngineConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return "", ""
	}
	return cfg.Engine, cfg.Distro
}

// SaveStoredEngine persists the active engine provider and distro to disk.
func SaveStoredEngine(engine string, distro string) {
	filePath := getEngineConfigFilePath()
	cfg := StoredEngineConfig{
		Engine: engine,
		Distro: distro,
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err == nil {
		_ = os.WriteFile(filePath, data, 0644)
	}
}
