package docker

import (
	"context"
	"testing"
)

func TestNewEngineService(t *testing.T) {
	svc := NewEngineService()
	if svc == nil {
		t.Fatal("expected NewEngineService() to return non-nil")
	}
	svc.SetContext(context.Background())
}

func TestGetWindowsDockerCandidates(t *testing.T) {
	candidates := getWindowsDockerCandidates()
	if len(candidates) == 0 {
		t.Fatal("expected at least one default candidate path")
	}

	foundDefault := false
	for _, c := range candidates {
		if c == `C:\Program Files\Docker\Docker\Docker Desktop.exe` {
			foundDefault = true
			break
		}
	}

	if !foundDefault {
		t.Fatalf("expected candidate list to contain default path, got %v", candidates)
	}
}

func TestEngineStateAndDetectedEngines(t *testing.T) {
	svc := NewEngineService()
	svc.SetActiveEngine("wsl", "Ubuntu")
	engine, distro := svc.GetActiveEngine()
	if engine != "wsl" || distro != "Ubuntu" {
		t.Fatalf("expected wsl/Ubuntu, got %s/%s", engine, distro)
	}

	engines := svc.GetDetectedEngines()
	if len(engines) == 0 {
		t.Fatal("expected at least one engine from GetDetectedEngines()")
	}
}

func TestCheckDockerStatusTimeout(t *testing.T) {
	svc := NewEngineService()
	// Test Windows status check
	responsiveWin, err := svc.CheckDockerStatus("windows")
	if err != nil {
		t.Fatalf("unexpected error from CheckDockerStatus(windows): %v", err)
	}
	t.Logf("CheckDockerStatus(windows) returned: %v", responsiveWin)

	// Test WSL status check
	responsiveWSL, err := svc.CheckDockerStatus("wsl")
	if err != nil {
		t.Fatalf("unexpected error from CheckDockerStatus(wsl): %v", err)
	}
	t.Logf("CheckDockerStatus(wsl) returned: %v", responsiveWSL)
}
